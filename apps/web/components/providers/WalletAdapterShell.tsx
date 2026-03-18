"use client";

import React, { ReactNode, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletError } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useRuntimeSolanaNetwork } from "@/hooks/use-runtime-solana-network";
import { notifyError } from "@/lib/ui/ui-feedback";

interface WalletAdapterShellProps {
  children: ReactNode;
  autoConnect: boolean;
  errorScope: "wallet" | "admin-wallet";
}

const isIgnorableWalletError = (error: WalletError) => {
  const message = error.message.toLowerCase();
  return (
    message.includes("rejected") ||
    message.includes("declined") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  );
};

export function WalletAdapterShell({
  children,
  autoConnect,
  errorScope,
}: WalletAdapterShellProps) {
  const { endpoint } = useRuntimeSolanaNetwork();

  const handleWalletError = useCallback(
    (error: WalletError) => {
      if (isIgnorableWalletError(error)) return;

      notifyError({
        title: "Wallet Error",
        description: error.message || "Unexpected wallet adapter error.",
        dedupeKey: `${errorScope}:error:${error.message || "unknown"}`,
        dedupeMs: 10_000,
      });
    },
    [errorScope],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={autoConnect} onError={handleWalletError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
