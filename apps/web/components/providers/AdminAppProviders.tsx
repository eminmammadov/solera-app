"use client"

import type { ReactNode } from "react"
import { AdminSolanaProvider } from "@/components/providers/AdminSolanaProvider"
import { GlobalErrorListener } from "@/components/system/GlobalErrorListener"
import { ToastViewport } from "@/components/system/ToastViewport"

export function AdminAppProviders({ children }: { children: ReactNode }) {
  return (
    <AdminSolanaProvider>
      {children}
      <GlobalErrorListener />
      <ToastViewport />
    </AdminSolanaProvider>
  )
}
