"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import {
  clearWalletSignatureSession,
  hasValidWalletSignatureSession,
  WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
} from "@/lib/wallet/wallet-signature-session";
import { emitWalletUserSessionChanged } from "@/lib/wallet/wallet-user-session-events";
import {
  checkWalletAccess,
  clearStoredWalletUserSession,
  endWalletUserSession,
  endWalletUserSessionWithBeacon,
  getStoredWalletUserSessionId,
  heartbeatWalletUserSession,
  logoutWalletAuth,
  type SessionApiError,
  startWalletUserSession,
} from "@/lib/user/user-analytics";
import { emitBlockedAccessNotice } from "@/lib/access/blocked-access-notice";
import { fetchPublicConnectEnabled } from "@/lib/public/system-public";
import { notifyWarning } from "@/lib/ui/ui-feedback";

const SESSION_HEARTBEAT_MS = 30_000;
const CONNECT_ENABLED_RECHECK_MS = 30_000;
const SESSION_REAUTH_MESSAGE =
  "Your secure session expired. Please sign again to continue.";
const CONNECT_DISABLED_MESSAGE =
  "Connections are temporarily disabled by the platform admin.";

interface ActiveWalletSession {
  walletAddress: string;
  sessionId: string;
}

export function UserSessionTracker() {
  const { connected, publicKey, disconnect } = useAdapterWallet();
  const router = useRouter();
  const pathname = usePathname();
  const walletAddress = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);
  const isProfileRoute = useMemo(
    () => pathname === "/profile" || pathname.startsWith("/profile/"),
    [pathname],
  );
  const [signatureRevision, setSignatureRevision] = useState(0);
  const activeSessionRef = useRef<ActiveWalletSession | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef(false);
  const isHandlingBlockedRef = useRef(false);
  const isHandlingConnectDisabledRef = useRef(false);
  const hadConnectedWalletRef = useRef(false);
  const observedWalletAddressRef = useRef<string | null>(null);
  const blockedNoticeWalletRef = useRef<string | null>(null);
  const sessionNoticeWalletRef = useRef<string | null>(null);
  const connectDisabledNoticeWalletRef = useRef<string | null>(null);

  const isBlockedErrorMessage = useCallback((message?: string | null) => {
    const normalized = message?.toLowerCase();
    if (!normalized) return false;
    return normalized.includes("blocked") || normalized.includes("block@solera.work");
  }, []);

  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const closeActiveSession = useCallback(
    async (reason: string) => {
      const current = activeSessionRef.current;
      const preserveAuth = reason === "unmount";

      if (!current) {
        clearHeartbeatTimer();
        if (!preserveAuth) {
          await logoutWalletAuth();
        }
        return;
      }

      activeSessionRef.current = null;
      clearHeartbeatTimer();
      await endWalletUserSession(current.walletAddress, current.sessionId, reason);
      emitWalletUserSessionChanged({
        walletAddress: current.walletAddress,
        sessionId: null,
        source: "session_end",
      });

      if (!preserveAuth) {
        await logoutWalletAuth();
      }
    },
    [clearHeartbeatTimer],
  );

  const forceBlockedLogout = useCallback(
    async (blockedWalletAddress: string, message?: string | null) => {
      if (isHandlingBlockedRef.current) return;
      isHandlingBlockedRef.current = true;

      try {
        await closeActiveSession("blocked");
        emitWalletUserSessionChanged({
          walletAddress: blockedWalletAddress,
          sessionId: null,
          source: "session_end",
        });
        if (blockedNoticeWalletRef.current !== blockedWalletAddress) {
          clearWalletSignatureSession(blockedWalletAddress);
          clearStoredWalletUserSession(blockedWalletAddress);
          emitBlockedAccessNotice(message);
          blockedNoticeWalletRef.current = blockedWalletAddress;
        }

        try {
          await disconnect();
        } catch {
          // Ignore wallet adapter disconnect failures and keep blocked state enforced in app.
        }

        if (pathname !== "/") {
          router.replace("/");
        }
      } finally {
        isHandlingBlockedRef.current = false;
      }
    },
    [closeActiveSession, disconnect, pathname, router],
  );

  const forceConnectDisabledLogout = useCallback(
    async (targetWalletAddress: string) => {
      if (isHandlingConnectDisabledRef.current) return;
      isHandlingConnectDisabledRef.current = true;

      try {
        await closeActiveSession("connect_disabled");
        emitWalletUserSessionChanged({
          walletAddress: targetWalletAddress,
          sessionId: null,
          source: "session_end",
        });
        clearWalletSignatureSession(targetWalletAddress);
        clearStoredWalletUserSession(targetWalletAddress);

        if (connectDisabledNoticeWalletRef.current !== targetWalletAddress) {
          notifyWarning({
            title: "Connections Disabled",
            description: CONNECT_DISABLED_MESSAGE,
            dedupeKey: `session:connect-disabled:${targetWalletAddress}`,
            dedupeMs: 15_000,
          });
          connectDisabledNoticeWalletRef.current = targetWalletAddress;
        }

        try {
          await disconnect();
        } catch {
          // Ignore adapter disconnect failures; route guard still blocks profile access.
        }

        if (pathname !== "/") {
          router.replace("/");
        }
      } finally {
        isHandlingConnectDisabledRef.current = false;
      }
    },
    [closeActiveSession, disconnect, pathname, router],
  );

  const forceSessionReauth = useCallback(
    async (address: string, message?: string | null) => {
      await closeActiveSession("auth_expired");
      emitWalletUserSessionChanged({
        walletAddress: address,
        sessionId: null,
        source: "session_end",
      });
      clearWalletSignatureSession(address);
      clearStoredWalletUserSession(address);

      if (sessionNoticeWalletRef.current !== address) {
        notifyWarning({
          title: "Session Expired",
          description: message?.trim() || SESSION_REAUTH_MESSAGE,
          dedupeKey: `session:expired:${address}`,
          dedupeMs: 15_000,
        });
        sessionNoticeWalletRef.current = address;
      }

      if (pathname === "/profile") {
        router.replace("/");
      }
    },
    [closeActiveSession, pathname, router],
  );

  const handleSessionError = useCallback(
    async (address: string, error: SessionApiError | null) => {
      if (!error) return false;

      if (error.type === "forbidden" && isBlockedErrorMessage(error.message)) {
        await forceBlockedLogout(address, error.message);
        return true;
      }

      if (error.type === "unauthorized") {
        await forceSessionReauth(address, error.message);
        return true;
      }

      return false;
    },
    [forceBlockedLogout, forceSessionReauth, isBlockedErrorMessage],
  );

  const ensureWalletAllowed = useCallback(
    async (address: string) => {
      const access = await checkWalletAccess(address);
      if (access && (!access.allowed || access.isBlocked)) {
        await forceBlockedLogout(address, access.message);
        return false;
      }

      return true;
    },
    [forceBlockedLogout],
  );

  const startHeartbeatLoop = useCallback(
    (initialSession: ActiveWalletSession) => {
      clearHeartbeatTimer();

      let trackedSessionId = initialSession.sessionId;

      heartbeatTimerRef.current = setInterval(() => {
        const current = activeSessionRef.current;
        if (
          !current ||
          current.walletAddress !== initialSession.walletAddress ||
          current.sessionId !== trackedSessionId
        ) {
          return;
        }

        void (async () => {
          const result = await heartbeatWalletUserSession(
            current.walletAddress,
            current.sessionId,
          );

          if (!result.success || !result.data?.sessionId) {
            const handled = await handleSessionError(
              current.walletAddress,
              result.error,
            );
            if (handled) return;

            void checkWalletAccess(current.walletAddress).then((access) => {
              const latest = activeSessionRef.current;
              if (
                !latest ||
                latest.walletAddress !== current.walletAddress ||
                latest.sessionId !== current.sessionId
              ) {
                return;
              }
              if (access && (!access.allowed || access.isBlocked)) {
                void forceBlockedLogout(current.walletAddress, access.message);
              }
            });
            return;
          }

          if (result.data.sessionId !== current.sessionId) {
            trackedSessionId = result.data.sessionId;
            activeSessionRef.current = {
              walletAddress: current.walletAddress,
              sessionId: result.data.sessionId,
            };
            emitWalletUserSessionChanged({
              walletAddress: current.walletAddress,
              sessionId: result.data.sessionId,
              source: "session_refresh",
            });
          }
        })();
      }, SESSION_HEARTBEAT_MS);
    },
    [clearHeartbeatTimer, forceBlockedLogout, handleSessionError],
  );

  useEffect(() => {
    const handler = () => {
      setSignatureRevision((value) => value + 1);
    };

    window.addEventListener(WALLET_SIGNATURE_SESSION_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(WALLET_SIGNATURE_SESSION_CHANGED_EVENT, handler);
    };
  }, []);

  useEffect(() => {
    const syncSession = async () => {
      if (isStartingRef.current) return;

      if (!connected || !walletAddress) {
        observedWalletAddressRef.current = null;
        blockedNoticeWalletRef.current = null;
        sessionNoticeWalletRef.current = null;
        connectDisabledNoticeWalletRef.current = null;

        const shouldProcessDisconnect =
          hadConnectedWalletRef.current || Boolean(activeSessionRef.current);
        hadConnectedWalletRef.current = false;

        if (shouldProcessDisconnect) {
          await closeActiveSession("disconnect");
        } else {
          clearHeartbeatTimer();
        }

        if (isProfileRoute) {
          router.replace("/");
        }
        return;
      }

      hadConnectedWalletRef.current = true;
      const previousWalletAddress = observedWalletAddressRef.current;
      if (
        previousWalletAddress &&
        previousWalletAddress !== walletAddress
      ) {
        clearStoredWalletUserSession(previousWalletAddress);
        await closeActiveSession("wallet_switch");
      }
      observedWalletAddressRef.current = walletAddress;

      const connectEnabled = await fetchPublicConnectEnabled();
      if (!connectEnabled) {
        await forceConnectDisabledLogout(walletAddress);
        return;
      }

      const isAllowed = await ensureWalletAllowed(walletAddress);
      if (!isAllowed) return;
      blockedNoticeWalletRef.current = null;

      const current = activeSessionRef.current;
      if (current?.walletAddress === walletAddress) {
        return;
      }

      if (!hasValidWalletSignatureSession(walletAddress)) {
        if (isProfileRoute) {
          router.replace("/");
        }
        return;
      }

      isStartingRef.current = true;
      try {
        let sessionId = getStoredWalletUserSessionId(walletAddress);
        if (!sessionId) {
          const started = await startWalletUserSession(walletAddress);
          if (!started.success || !started.data?.sessionId) {
            const handled = await handleSessionError(walletAddress, started.error);
            if (!handled) {
              clearStoredWalletUserSession(walletAddress);
            }
            return;
          }
          sessionId = started.data.sessionId;
        } else {
          const beat = await heartbeatWalletUserSession(walletAddress, sessionId);
          if (!beat.success || !beat.data?.sessionId) {
            const handled = await handleSessionError(walletAddress, beat.error);
            if (handled) return;

            const started = await startWalletUserSession(walletAddress);
            if (!started.success || !started.data?.sessionId) {
              const startedHandled = await handleSessionError(
                walletAddress,
                started.error,
              );
              if (!startedHandled) {
                clearStoredWalletUserSession(walletAddress);
              }
              return;
            }
            sessionId = started.data.sessionId;
          } else {
            sessionId = beat.data.sessionId;
          }
        }

        sessionNoticeWalletRef.current = null;
        const nextSession = { walletAddress, sessionId };
        activeSessionRef.current = nextSession;
        startHeartbeatLoop(nextSession);
        emitWalletUserSessionChanged({
          walletAddress,
          sessionId,
          source: "session_start",
        });
      } finally {
        isStartingRef.current = false;
      }
    };

    void syncSession();
  }, [
    connected,
    walletAddress,
    isProfileRoute,
    router,
    signatureRevision,
    clearHeartbeatTimer,
    closeActiveSession,
    startHeartbeatLoop,
    ensureWalletAllowed,
    forceConnectDisabledLogout,
    handleSessionError,
  ]);

  useEffect(() => {
    if (!connected || !walletAddress) return;

    let cancelled = false;

    const enforceConnectGate = async (force = false) => {
      const connectEnabled = await fetchPublicConnectEnabled(force);
      if (!connectEnabled && !cancelled) {
        await forceConnectDisabledLogout(walletAddress);
      }
    };

    void enforceConnectGate(false);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void enforceConnectGate(true);
    }, CONNECT_ENABLED_RECHECK_MS);

    const handleFocus = () => {
      void enforceConnectGate(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [connected, walletAddress, forceConnectDisabledLogout]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = activeSessionRef.current;
      if (!current) return;
      endWalletUserSessionWithBeacon(
        current.walletAddress,
        current.sessionId,
        "page_unload",
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(
    () => () => {
      void closeActiveSession("unmount");
    },
    [closeActiveSession],
  );

  return null;
}
