"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/primitives/Card"
import { ArrowUpRight, Coins, ShieldCheck, TrendingUp, Users, Info } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { HowItWorksModal } from "@/components/modals/HowItWorksModal"
import { useStakeModal } from "@/store/ui/use-stake-modal"
import { useMarketData } from "@/store/market/use-market-data"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { resolveRaName, resolveRaSymbol } from "@/lib/ra/ra-runtime"

/**
 * Centralized static text content for StakingOverview component.
 */
const STAKING_OVERVIEW_TEXT = {
  title: "Staking 2.0",
  btnHowItWorks: "How it works",
  btnStakeNow: "Stake Now",
  stats: {
    tvlLabel: "TVL",
    tvlTrendDesc: "this week",
    stakersLabel: "Active Stakers",
    stakersTrendDesc: "this week",
    apyLabel: "Avg. APR",
    apyDesc: "Across all pools",
    rewardsLabel: "Total Rewards",
    rewardsDesc: "In the last 30 days"
  }
} as const

export function StakingOverview() {
  const [showTooltip, setShowTooltip] = useState(false)
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { openModal } = useStakeModal()
  const {
    tokens,
    platformTvl,
    platformTvlChange,
    activeStakers,
    activeStakersChange,
    avgApy,
    totalRewards,
    hasFetchedTokens,
  } = useMarketData()
  const { settings: raRuntime } = useRaRuntimeSettings()
  const raSymbol = resolveRaSymbol(raRuntime)
  const raName = resolveRaName(raRuntime)
  const isStatsInitialLoading = !hasFetchedTokens
  const latestStakeableToken = useMemo(() => {
    const stakeable = tokens.filter((token) => token.ticker.toLowerCase() !== "ra")
    if (stakeable.length === 0) return null

    return [...stakeable].sort((a, b) => {
      const aTime = Number.isFinite(new Date(a.publishedAt).getTime())
        ? new Date(a.publishedAt).getTime()
        : 0
      const bTime = Number.isFinite(new Date(b.publishedAt).getTime())
        ? new Date(b.publishedAt).getTime()
        : 0
      return bTime - aTime
    })[0]
  }, [tokens])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#111111] border border-neutral-800 rounded-xl p-4">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">{STAKING_OVERVIEW_TEXT.title}</h1>
          <div className="flex items-start gap-2 relative" ref={tooltipRef}>
            <p className="text-sm text-neutral-400 line-clamp-2">
              {`You can stake the tokens listed on the platform. Staked tokens are converted into ${raSymbol} tokens through the system’s Swap Node infrastructure and are allocated to the user accordingly.`}
            </p>
            <button 
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-neutral-500 hover:text-white transition-colors mt-0.5 cursor-pointer shrink-0"
            >
              <Info className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-[320px] sm:w-[400px] bg-[#1a1a1a] border border-neutral-700 rounded-lg p-4 shadow-xl z-50 text-xs text-neutral-300 leading-relaxed"
                >
                  <p className="mb-2">
                    {`You can stake the tokens listed on the platform. Staked tokens are converted into ${raSymbol} tokens through the system’s Swap Node infrastructure and are allocated to the user accordingly.`}
                  </p>
                  <p>
                    {`${raName} (${raSymbol}) is designed on a system model that aims for stable and sustainable value growth. During the staking process, tokens are evaluated at a 1:1 price ratio. Once the staking period is completed, users can retrieve their earned ${raSymbol} tokens by performing a Claim transaction.`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <button 
            onClick={() => setIsHowItWorksOpen(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors border border-neutral-700 cursor-pointer"
          >
            {STAKING_OVERVIEW_TEXT.btnHowItWorks}
          </button>
          <button 
            onClick={() => {
              if (latestStakeableToken) {
                openModal(latestStakeableToken)
              }
            }}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            {STAKING_OVERVIEW_TEXT.btnStakeNow} <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-medium">{STAKING_OVERVIEW_TEXT.stats.tvlLabel}</p>
              {isStatsInitialLoading ? (
                <div className="mt-1 h-7 w-20 rounded bg-neutral-800 animate-pulse" />
              ) : (
                <h3 className="text-xl font-bold text-white">${(platformTvl / 1_000_000).toFixed(1)}M</h3>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-500 bg-green-500/10 w-fit px-2 py-1 rounded-md">
            <TrendingUp className="w-3 h-3" />
            {isStatsInitialLoading ? (
              <span className="block h-3 w-20 rounded bg-green-500/20 animate-pulse" />
            ) : (
              <span>+{platformTvlChange.toFixed(1)}% {STAKING_OVERVIEW_TEXT.stats.tvlTrendDesc}</span>
            )}
          </div>
        </Card>

        <Card className="p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-medium">{STAKING_OVERVIEW_TEXT.stats.stakersLabel}</p>
              {isStatsInitialLoading ? (
                <div className="mt-1 h-7 w-16 rounded bg-neutral-800 animate-pulse" />
              ) : (
                <h3 className="text-xl font-bold text-white">{activeStakers.toLocaleString()}</h3>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-500 bg-green-500/10 w-fit px-2 py-1 rounded-md">
            <TrendingUp className="w-3 h-3" />
            {isStatsInitialLoading ? (
              <span className="block h-3 w-20 rounded bg-green-500/20 animate-pulse" />
            ) : (
              <span>+{activeStakersChange.toFixed(1)}% {STAKING_OVERVIEW_TEXT.stats.stakersTrendDesc}</span>
            )}
          </div>
        </Card>

        <Card className="p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-medium">{STAKING_OVERVIEW_TEXT.stats.apyLabel}</p>
              {isStatsInitialLoading ? (
                <div className="mt-1 h-7 w-14 rounded bg-neutral-800 animate-pulse" />
              ) : (
                <h3 className="text-xl font-bold text-white">{avgApy.toFixed(1)}%</h3>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800 w-fit px-2 py-1 rounded-md">
            <span>{STAKING_OVERVIEW_TEXT.stats.apyDesc}</span>
          </div>
        </Card>

        <Card className="p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-medium">{STAKING_OVERVIEW_TEXT.stats.rewardsLabel}</p>
              {isStatsInitialLoading ? (
                <div className="mt-1 h-7 w-20 rounded bg-neutral-800 animate-pulse" />
              ) : (
                <h3 className="text-xl font-bold text-white">${(totalRewards / 1_000_000).toFixed(1)}M</h3>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800 w-fit px-2 py-1 rounded-md">
            <span>{STAKING_OVERVIEW_TEXT.stats.rewardsDesc}</span>
          </div>
        </Card>
      </div>

      <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} />
    </div>
  )
}
