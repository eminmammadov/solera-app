"use client"

import { useEffect } from "react"
import { useWallet } from "@/store/wallet/use-wallet"
import { useUserData } from "@/store/profile/use-user-data"
import { subscribeToRaRuntimeSettingsChanges } from "@/lib/ra/ra-runtime"
import {
  hasValidWalletSignatureSession,
  WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
} from "@/lib/wallet/wallet-signature-session"

const USER_PROFILE_REFRESH_MS = 45_000

export function UserDataSync() {
  const { isConnected, walletAddress } = useWallet()
  const loadProfile = useUserData((state) => state.loadProfile)
  const clearProfile = useUserData((state) => state.clearProfile)

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      clearProfile()
      return
    }

    if (!hasValidWalletSignatureSession(walletAddress)) {
      clearProfile()
      return
    }

    void loadProfile(walletAddress)
  }, [isConnected, walletAddress, loadProfile, clearProfile])

  useEffect(() => {
    if (!isConnected || !walletAddress) return

    const syncProfile = () => {
      if (document.visibilityState !== "visible") return
      if (!hasValidWalletSignatureSession(walletAddress)) {
        clearProfile()
        return
      }
      void loadProfile(walletAddress)
    }

    const timer = setInterval(() => {
      syncProfile()
    }, USER_PROFILE_REFRESH_MS)

    const handleVisibilityOrFocus = () => {
      syncProfile()
    }
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)

    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
    }
  }, [isConnected, walletAddress, loadProfile, clearProfile])

  useEffect(() => {
    if (!isConnected || !walletAddress) return

    const handleSignatureSessionChange = () => {
      if (!hasValidWalletSignatureSession(walletAddress)) {
        clearProfile()
        return
      }

      window.setTimeout(() => {
        void loadProfile(walletAddress)
      }, 700)
    }

    window.addEventListener(
      WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
      handleSignatureSessionChange,
    )
    return () => {
      window.removeEventListener(
        WALLET_SIGNATURE_SESSION_CHANGED_EVENT,
        handleSignatureSessionChange,
      )
    }
  }, [isConnected, walletAddress, loadProfile, clearProfile])

  useEffect(() => {
    if (!isConnected || !walletAddress) return

    return subscribeToRaRuntimeSettingsChanges(() => {
      if (!hasValidWalletSignatureSession(walletAddress)) {
        clearProfile()
        return
      }

      void loadProfile(walletAddress)
    })
  }, [isConnected, walletAddress, loadProfile, clearProfile])

  return null
}
