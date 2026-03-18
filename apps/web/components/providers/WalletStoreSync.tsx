"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { useWallet } from "@/store/wallet/use-wallet";
import {
  clearWalletSignatureSession,
  hasValidWalletSignatureSession,
  WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
} from "@/lib/wallet/wallet-signature-session";
import { notifyInfo } from "@/lib/ui/ui-feedback";

const WALLET_TOAST_TEXT = {
  disconnectedTitle: "Wallet Disconnected",
  disconnectedDescription: "Wallet session closed.",
} as const;

const shortenWalletAddress = (walletAddress: string) =>
  `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

export function WalletStoreSync() {
  const { connected, publicKey } = useAdapterWallet();
  const { setConnection } = useWallet();
  const [signatureRevision, setSignatureRevision] = useState(0);
  const hasInitializedRef = useRef(false);
  const previousConnectedRef = useRef(false);
  const lastWalletAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSignatureSessionChange = () => {
      setSignatureRevision((value) => value + 1);
    };

    window.addEventListener(
      WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
      handleSignatureSessionChange,
    );

    return () => {
      window.removeEventListener(
        WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
        handleSignatureSessionChange,
      );
    };
  }, []);

  useEffect(() => {
    const currentWalletAddress = publicKey?.toBase58() ?? null;
    const previousWalletAddress = lastWalletAddressRef.current;
    const previousConnected = previousConnectedRef.current;

    // Force re-sign on explicit disconnect or wallet switch.
    if (previousWalletAddress && (!connected || previousWalletAddress !== currentWalletAddress)) {
      clearWalletSignatureSession(previousWalletAddress);
    }

    if (hasInitializedRef.current) {
      if (previousConnected && !connected) {
        const description = previousWalletAddress
          ? `${shortenWalletAddress(previousWalletAddress)} · ${WALLET_TOAST_TEXT.disconnectedDescription}`
          : WALLET_TOAST_TEXT.disconnectedDescription;

        notifyInfo({
          title: WALLET_TOAST_TEXT.disconnectedTitle,
          description,
          dedupeKey: `wallet:disconnected:${previousWalletAddress ?? "unknown"}`,
          dedupeMs: 2_000,
        });
      }
    } else {
      hasInitializedRef.current = true;
    }

    const hasSignedSession = currentWalletAddress
      ? hasValidWalletSignatureSession(currentWalletAddress)
      : false;
    const appConnected = connected && hasSignedSession;

    setConnection(appConnected, appConnected ? currentWalletAddress : null);
    previousConnectedRef.current = connected;
    lastWalletAddressRef.current = currentWalletAddress;
  }, [connected, publicKey, setConnection, signatureRevision]);

  return null;
}
