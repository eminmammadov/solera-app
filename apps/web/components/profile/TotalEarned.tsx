"use client"

import { Activity } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useUserData } from "@/store/profile/use-user-data"
import { useMarketData } from "@/store/market/use-market-data"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { resolveRaSymbol } from "@/lib/ra/ra-runtime"

/**
 * Centralized static texts for TotalEarned component.
 */
const TOTAL_EARNED_TEXT = {
  title: "Total Earned",
} as const

export function TotalEarned() {
  const {
    totalEarned,
    isProfileLoading,
    isProfileLoaded,
    profileError,
  } = useUserData(
    useShallow((state) => ({
      totalEarned: state.totalEarned,
      isProfileLoading: state.isProfileLoading,
      isProfileLoaded: state.isProfileLoaded,
      profileError: state.profileError,
    })),
  )
  const {
    liveRaPrice,
    hasFetchedTokens,
    isLoadingTokens,
  } = useMarketData(
    useShallow((state) => ({
      liveRaPrice: state.liveRaPrice,
      hasFetchedTokens: state.hasFetchedTokens,
      isLoadingTokens: state.isLoadingTokens,
    })),
  )
  const { settings: raRuntime } = useRaRuntimeSettings()
  const raSymbol = resolveRaSymbol(raRuntime)
  const isProfileDataLoading =
    isProfileLoading || (!isProfileLoaded && !profileError)
  const effectiveRaPrice =
    typeof liveRaPrice === "number" && Number.isFinite(liveRaPrice) && liveRaPrice > 0
      ? liveRaPrice
      : 0
  const isUsdValueLoading =
    isProfileDataLoading ||
    !hasFetchedTokens ||
    isLoadingTokens ||
    (totalEarned > 0 && effectiveRaPrice <= 0)
  const totalEarnedUsd = totalEarned * effectiveRaPrice

  return (
    <div className="h-full rounded-xl border border-neutral-800 bg-[#111111] p-4 sm:p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-green-500" />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-400 mb-1">{TOTAL_EARNED_TEXT.title}</p>
        {isUsdValueLoading ? (
          <div className="flex items-baseline gap-2">
            <span className="h-8 w-40 rounded bg-neutral-800 animate-pulse" />
            <span className="h-4 w-20 rounded bg-neutral-800 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <h3 className="text-2xl font-bold text-green-500">
              +{totalEarned.toLocaleString()} {raSymbol}
            </h3>
            <span className="text-sm text-neutral-500">
              ~$
              {totalEarnedUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
