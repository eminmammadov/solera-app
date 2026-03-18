"use client";

import React, { FC, ReactNode } from "react";
import { WalletAdapterShell } from "@/components/providers/WalletAdapterShell";

interface AdminSolanaProviderProps {
  children: ReactNode;
}

export const AdminSolanaProvider: FC<AdminSolanaProviderProps> = ({ children }) => {
  return (
    <WalletAdapterShell autoConnect={false} errorScope="admin-wallet">
      {children}
    </WalletAdapterShell>
  );
};
