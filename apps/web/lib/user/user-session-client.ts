import { backendRoutes } from "@/lib/api/backend-routes";
import {
  buildPublicApiUrl,
  publicRequest,
  publicRequestJson,
} from "@/lib/api/public-api";
import { postSessionJson } from "@/lib/user/user-request";
import type {
  HeartbeatResult,
  SessionApiResult,
  StartSessionResult,
} from "@/lib/user/user-types";

const USER_SESSION_STORAGE_PREFIX = "solera_wallet_user_session";

interface WalletSessionStoragePayload {
  sessionId: string;
  sessionKey: string;
  startedAt: string;
}

interface WalletAuthNonceResponse {
  message?: string;
}

interface WalletAuthVerifyResponse {
  walletAddress?: string;
}

const buildSessionStorageKey = (walletAddress: string) =>
  `${USER_SESSION_STORAGE_PREFIX}:${walletAddress}`;

const readStoredSession = (
  walletAddress: string,
): WalletSessionStoragePayload | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(buildSessionStorageKey(walletAddress));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as WalletSessionStoragePayload;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.sessionKey !== "string" ||
      typeof parsed.startedAt !== "string"
    ) {
      localStorage.removeItem(buildSessionStorageKey(walletAddress));
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(buildSessionStorageKey(walletAddress));
    return null;
  }
};

const saveStoredSession = (
  walletAddress: string,
  payload: WalletSessionStoragePayload,
) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(buildSessionStorageKey(walletAddress), JSON.stringify(payload));
};

const createSessionKey = (walletAddress: string) => {
  const prefix = walletAddress.slice(0, 10);
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${randomPart}`.slice(0, 120);
};

export const clearStoredWalletUserSession = (walletAddress: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(buildSessionStorageKey(walletAddress));
};

export const requestWalletAuthNonce = async (
  walletAddress: string,
): Promise<string> => {
  const data = await publicRequestJson<WalletAuthNonceResponse>({
    path: backendRoutes.users.authNonce(walletAddress),
    fallbackMessage: "Failed to request wallet signature challenge.",
    cache: "no-store",
    credentials: "include",
    cacheTtlMs: 0,
    minIntervalMs: 0,
  });
  if (!data?.message || typeof data.message !== "string") {
    throw new Error("Wallet signature challenge is missing.");
  }
  return data.message;
};

export const verifyWalletAuthSignature = async (
  walletAddress: string,
  signature: string,
  message: string,
): Promise<WalletAuthVerifyResponse> =>
  publicRequestJson<WalletAuthVerifyResponse>({
    path: backendRoutes.users.authVerify,
    fallbackMessage: "Wallet signature verification failed.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, signature, message }),
    cache: "no-store",
    credentials: "include",
  });

export const logoutWalletAuth = async (): Promise<void> => {
  try {
    await publicRequest(backendRoutes.users.authLogout, {
      method: "POST",
      cache: "no-store",
      keepalive: true,
      credentials: "include",
    });
  } catch {
    // Best-effort cookie clear.
  }
};

export const startWalletUserSession = async (
  walletAddress: string,
): Promise<SessionApiResult<StartSessionResult>> => {
  const existing = readStoredSession(walletAddress);
  const sessionKey = existing?.sessionKey ?? createSessionKey(walletAddress);

  const response = await postSessionJson<
    StartSessionResult,
    { walletAddress: string; sessionKey: string }
  >(backendRoutes.users.sessionStart, { walletAddress, sessionKey });

  if (!response.success || !response.data?.sessionId) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  saveStoredSession(walletAddress, {
    sessionId: response.data.sessionId,
    sessionKey,
    startedAt: new Date().toISOString(),
  });

  return {
    success: true,
    data: {
      sessionId: response.data.sessionId,
      sessionKey,
    },
    error: null,
  };
};

export const heartbeatWalletUserSession = async (
  walletAddress: string,
  sessionId: string,
): Promise<SessionApiResult<HeartbeatResult>> => {
  const response = await postSessionJson<
    HeartbeatResult,
    { walletAddress: string; sessionId: string }
  >(backendRoutes.users.sessionHeartbeat, {
    walletAddress,
    sessionId,
  });

  if (!response.success || !response.data?.sessionId) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  if (response.data.replacedSession) {
    const existing = readStoredSession(walletAddress);
    saveStoredSession(walletAddress, {
      sessionId: response.data.sessionId,
      sessionKey: existing?.sessionKey ?? createSessionKey(walletAddress),
      startedAt: existing?.startedAt ?? new Date().toISOString(),
    });
  }

  return {
    success: true,
    data: response.data,
    error: null,
  };
};

export const endWalletUserSession = async (
  walletAddress: string,
  sessionId: string,
  reason = "disconnect",
): Promise<void> => {
  await postSessionJson(backendRoutes.users.sessionEnd, { walletAddress, sessionId, reason }, true);
  clearStoredWalletUserSession(walletAddress);
};

export const endWalletUserSessionWithBeacon = (
  walletAddress: string,
  sessionId: string,
  reason = "page_unload",
) => {
  if (typeof navigator === "undefined") return;

  const payload = JSON.stringify({ walletAddress, sessionId, reason });
  const blob = new Blob([payload], { type: "application/json" });
  navigator.sendBeacon(buildPublicApiUrl(backendRoutes.users.sessionEnd), blob);
  clearStoredWalletUserSession(walletAddress);
};

export const getStoredWalletUserSessionId = (walletAddress: string) =>
  readStoredSession(walletAddress)?.sessionId ?? null;
