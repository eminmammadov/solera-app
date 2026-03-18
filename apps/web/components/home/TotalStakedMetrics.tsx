"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { RefreshCw } from "lucide-react"
import { useMarketData } from "@/store/market/use-market-data"
import { fetchWalletUserMetrics } from "@/lib/user/user-analytics"
import { useFeedbackToast } from "@/hooks/use-feedback-toast"
import { WALLET_USER_SESSION_CHANGED_EVENT } from "@/lib/wallet/wallet-user-session-events"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { resolveRaSymbol } from "@/lib/ra/ra-runtime"

/**
 * Centralized static text content for TotalStakedMetrics component.
 */
const TOTAL_STAKED_TEXT = {
  title: "Total Staked",
  stakePrefix: "Stake",
  syncAriaLabel: "Sync data",
  syncBtn: "Sync"
} as const

export function TotalStakedMetrics() {
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [totalStakedUsd, setTotalStakedUsd] = useState<number | null>(null)
  const [activeStakePositions, setActiveStakePositions] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const requestInFlightRef = useRef(false)
  const { liveRaPrice } = useMarketData()
  const { settings: raRuntime } = useRaRuntimeSettings()
  const raSymbol = resolveRaSymbol(raRuntime)

  useFeedbackToast({
    scope: "home-total-staked",
    error: loadError,
    errorTitle: "Total Staked Metrics",
    errorDedupeMs: 120_000,
  })

  const resolveRaPrice = useMemo(() => {
    if (liveRaPrice > 0) return liveRaPrice
    return null
  }, [liveRaPrice])

  const estimatedStakedRa = useMemo(() => {
    if (totalStakedUsd === null || totalStakedUsd <= 0) return 0
    if (!resolveRaPrice || resolveRaPrice <= 0) return null
    return totalStakedUsd / resolveRaPrice
  }, [resolveRaPrice, totalStakedUsd])

  const loadMetrics = useCallback(async (force = false) => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true
    setIsSyncing(true)
    try {
      const metrics = await fetchWalletUserMetrics(force)
      setTotalStakedUsd(metrics.totalStakedAmountUsd)
      setActiveStakePositions(metrics.activeStakePositions)
      setLoadError(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load staking metrics."
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
        <span className="text-[12px] text-neutral-300 mb-1 block">{TOTAL_STAKED_TEXT.title}</span>
        {isInitialLoading ? (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 sm:h-8 w-24 rounded bg-neutral-800 animate-pulse" />
            </div>
            <div className="h-3 w-20 rounded bg-neutral-800 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                ${(totalStakedUsd ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-neutral-400">
              {TOTAL_STAKED_TEXT.stakePrefix}{" "}
              {estimatedStakedRa === null
                ? "--"
                : estimatedStakedRa.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
              {raSymbol}
              {activeStakePositions !== null ? ` • ${activeStakePositions} active` : ""}
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
          aria-label={TOTAL_STAKED_TEXT.syncAriaLabel}
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-white' : ''}`} />
          <span className="text-[9px] font-medium uppercase tracking-wider">{TOTAL_STAKED_TEXT.syncBtn}</span>
        </button>
      </div>
    </div>
  )
}
