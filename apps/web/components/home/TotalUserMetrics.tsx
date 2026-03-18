"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { RefreshCw, Users } from "lucide-react"
import { fetchWalletUserMetrics } from "@/lib/user/user-analytics"
import { useFeedbackToast } from "@/hooks/use-feedback-toast"
import { WALLET_USER_SESSION_CHANGED_EVENT } from "@/lib/wallet/wallet-user-session-events"

/**
 * Centralized static text content for TotalUserMetrics component.
 */
const TOTAL_USER_TEXT = {
  title: "Total User",
  onlinePrefix: "Online",
  syncAriaLabel: "Sync data",
  syncBtn: "Sync"
} as const

export function TotalUserMetrics() {
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const requestInFlightRef = useRef(false)

  useFeedbackToast({
    scope: "home-total-users",
    error: loadError,
    errorTitle: "Total User Metrics",
    errorDedupeMs: 120_000,
  })

  const loadMetrics = useCallback(async (force = false) => {
    if (requestInFlightRef.current) return

    requestInFlightRef.current = true
    setIsSyncing(true)
    try {
      const metrics = await fetchWalletUserMetrics(force)
      setTotalUsers(metrics.totalUsers)
      setOnlineUsers(metrics.onlineUsers)
      setLoadError(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load user metrics."
      setLoadError(message)
    } finally {
      setIsInitialLoading(false)
      setIsSyncing(false)
      requestInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
    const interval = setInterval(() => {
      void loadMetrics()
    }, 300_000)
    const handleSessionChange = () => {
      window.setTimeout(() => {
        void loadMetrics(true)
      }, 350)
    }
    window.addEventListener(WALLET_USER_SESSION_CHANGED_EVENT, handleSessionChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener(
        WALLET_USER_SESSION_CHANGED_EVENT,
        handleSessionChange,
      )
    }
  }, [loadMetrics])

  return (
    <div className="relative flex flex-col p-3 sm:p-4 bg-[#111111] rounded-xl border border-neutral-800 w-full h-full justify-between overflow-hidden group">
      {/* Content */}
      <div className="relative z-10 flex flex-col items-start">
        <span className="text-[12px] text-neutral-300 mb-1 block">{TOTAL_USER_TEXT.title}</span>
        {isInitialLoading ? (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-neutral-800 animate-pulse" />
              <div className="h-7 sm:h-8 w-20 rounded bg-neutral-800 animate-pulse" />
            </div>
            <div className="h-3 w-16 rounded bg-neutral-800 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {(totalUsers ?? 0).toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-neutral-400">
              {TOTAL_USER_TEXT.onlinePrefix} {(onlineUsers ?? 0).toLocaleString()}
            </span>
            {loadError && (
              <span className="mt-1 text-[10px] text-red-300">{loadError}</span>
            )}
          </>
        )}
      </div>

      {/* Sync Button */}
      <div className="relative z-10 flex justify-start mt-4">
        <button 
          onClick={() => void loadMetrics(true)}
          disabled={isSyncing}
          className="p-1 rounded-md bg-neutral-800/50 hover:bg-neutral-700 border border-neutral-700/30 text-neutral-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          aria-label={TOTAL_USER_TEXT.syncAriaLabel}
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-white' : ''}`} />
          <span className="text-[9px] font-medium uppercase tracking-wider">{TOTAL_USER_TEXT.syncBtn}</span>
        </button>
      </div>
    </div>
  )
}
