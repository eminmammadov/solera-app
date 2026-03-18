"use client";

import React, { FC, ReactNode } from "react";
import { PublicRuntimeSync } from "@/components/providers/PublicRuntimeSync";
import { WalletAdapterShell } from "@/components/providers/WalletAdapterShell";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  return (
    <WalletAdapterShell autoConnect errorScope="wallet">
      <PublicRuntimeSync />
      {children}
    </WalletAdapterShell>
  );
};
