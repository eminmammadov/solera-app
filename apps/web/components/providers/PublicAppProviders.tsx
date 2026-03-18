"use client"

import type { ReactNode } from "react"
import { SolanaProvider } from "@/components/providers/SolanaProvider"
import { Cookies } from "@/components/system/Cookies"
import { GlobalErrorListener } from "@/components/system/GlobalErrorListener"
import { ToastViewport } from "@/components/system/ToastViewport"
import { FirstPopup } from "@/components/modals/FirstPopup"
import { StakeModal } from "@/components/modals/StakeModal"

export function PublicAppProviders({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider>
      {children}
      <GlobalErrorListener />
      <Cookies />
      <FirstPopup />
      <StakeModal />
      <ToastViewport />
    </SolanaProvider>
  )
}
