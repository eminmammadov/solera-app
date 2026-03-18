"use client"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useShallow } from "zustand/react/shallow"
import { ClaimModal } from "@/components/modals/ClaimModal"
import { useUserData, type Stake } from "@/store/profile/use-user-data"
import { normalizeImageSrc } from "@/lib/ui/image-src"

const Countdown = ({ endTime, now }: { endTime: number; now: number }) => {
  const timeLeft = endTime - now

  if (timeLeft <= 0) {
    return <span className="text-green-500 font-medium">{ACTIVE_STAKINGS_TEXT.completed}</span>
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return (
    <span className="text-neutral-400 font-mono text-xs" suppressHydrationWarning>
      {days}d {hours.toString().padStart(2, '0')}h {minutes.toString().padStart(2, '0')}m {seconds.toString().padStart(2, '0')}s
    </span>
  )
}

/**
 * Centralized static texts for ActiveStakings component.
 */
const ACTIVE_STAKINGS_TEXT = {
  loading: "Loading...",
  completed: "Completed",
  title: "Active Stakings",
  emptyState: "No active stakings available yet.",
  columns: {
    pool: "Pool",
    staked: "Staked",
    apr: "APR",
    earned: "Earned",
    timeLeft: "Time Left",
    actions: "Actions"
  },
  claimBtn: "Claim",
  loadMoreBtn: "Load more"
} as const

export function ActiveStakings() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const [selectedStake, setSelectedStake] = useState<Stake | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const {
    activeStakings,
    refreshProfile,
    isProfileLoading,
    isProfileLoaded,
    profileError,
  } = useUserData(
    useShallow((state) => ({
      activeStakings: state.activeStakings,
      refreshProfile: state.refreshProfile,
      isProfileLoading: state.isProfileLoading,
      isProfileLoaded: state.isProfileLoaded,
      profileError: state.profileError,
    })),
  )
  const isProfileDataLoading =
    isProfileLoading || (!isProfileLoaded && !profileError)
  
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  // Sort stakings: latest positions first
  const sortedStakings = useMemo(() => {
    return [...activeStakings].sort((a, b) => {
      const startedAtDiff = b.startedAt - a.startedAt
      if (startedAtDiff !== 0) return startedAtDiff
      return b.endTime - a.endTime
    })
  }, [activeStakings])

  const visibleStakings = useMemo(() => {
    return sortedStakings.slice(0, visibleCount)
  }, [sortedStakings, visibleCount])
  const hasMore = visibleCount < sortedStakings.length

  return (
    <>
      {isExpanded && (
        <div className="h-full w-full rounded-xl border border-neutral-800/50 bg-[#111111]/50" />
      )}

      <motion.div
        layout
        className={`flex flex-col p-2 sm:p-3 bg-[#111111] rounded-xl border border-neutral-800 text-neutral-100 ${
          isExpanded
            ? "fixed inset-4 sm:inset-12 z-50 shadow-2xl"
            : "relative h-full w-full"
        }`}
        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
      >
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-[17px] font-medium text-white whitespace-nowrap">{ACTIVE_STAKINGS_TEXT.title}</h2>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      
        <div className="w-full overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-[11px] text-left whitespace-nowrap">
            <thead className="text-[10px] uppercase text-neutral-500 border-b border-neutral-800">
              <tr>
                <th className="pb-2 px-0 font-medium">{ACTIVE_STAKINGS_TEXT.columns.pool}</th>
                <th className="pb-2 px-0 font-medium text-right">{ACTIVE_STAKINGS_TEXT.columns.staked}</th>
                <th className="pb-2 px-0 font-medium text-right">{ACTIVE_STAKINGS_TEXT.columns.apr}</th>
                <th className="pb-2 px-0 font-medium text-right">{ACTIVE_STAKINGS_TEXT.columns.earned}</th>
                <th className="pb-2 px-0 font-medium text-right">{ACTIVE_STAKINGS_TEXT.columns.timeLeft}</th>
                <th className="pb-2 px-0 font-medium text-right">{ACTIVE_STAKINGS_TEXT.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isProfileDataLoading
                ? Array.from({ length: 12 }).map((_, index) => (
                    <tr
                      key={`staking-skeleton-${index}`}
                      className="border-b border-neutral-800/50 last:border-0"
                    >
                      <td className="py-1.5 px-0">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-neutral-800 animate-pulse shrink-0" />
                          <span className="h-3 w-28 rounded bg-neutral-800 animate-pulse" />
                        </div>
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-24 rounded bg-neutral-800 animate-pulse" />
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-10 rounded bg-neutral-800 animate-pulse" />
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-16 rounded bg-neutral-800 animate-pulse" />
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-20 rounded bg-neutral-800 animate-pulse" />
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-6 w-12 rounded bg-neutral-800 animate-pulse" />
                      </td>
                    </tr>
                  ))
                : sortedStakings.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-0 py-0">
                        <div className="flex min-h-[220px] items-center justify-center text-center text-[13px] text-neutral-500">
                          {ACTIVE_STAKINGS_TEXT.emptyState}
                        </div>
                      </td>
                    </tr>
                  )
                : visibleStakings.map((stake) => {
                      const isCompleted = stake.endTime - new Date().getTime() <= 0
                      const stakeLogoSrc = normalizeImageSrc(stake.logo)

                      return (
                        <tr key={stake.id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                          <td className="py-1.5 px-0">
                            <div className="flex items-center gap-2">
                              {stakeLogoSrc ? (
                                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                                  <Image src={stakeLogoSrc} alt={stake.name} width={20} height={20} className="object-cover" referrerPolicy="no-referrer" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden shrink-0 text-[9px] font-bold text-white uppercase">
                                  {stake.name.charAt(0)}
                                </div>
                              )}
                              <span className="font-semibold text-white">{stake.name}</span>
                              <span className="text-neutral-500 hidden sm:inline">{isCompleted ? ACTIVE_STAKINGS_TEXT.completed : stake.status}</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-0 text-right text-white">{stake.stakedAmount}</td>
                          <td className="py-1.5 px-0 text-right text-green-500">{stake.apr}</td>
                          <td className="py-1.5 px-0 text-right text-white">{stake.earned}</td>
                          <td className="py-1.5 px-0 text-right">
                            <Countdown endTime={stake.endTime} now={now} />
                          </td>
                          <td className="py-1.5 px-0 text-right">
                            <button
                              disabled={!isCompleted}
                              onClick={() => setSelectedStake(stake)}
                              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                                isCompleted
                                  ? "bg-white text-black hover:bg-neutral-200 cursor-pointer"
                                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                              }`}
                            >
                              {ACTIVE_STAKINGS_TEXT.claimBtn}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
            </tbody>
          </table>

          {!isProfileDataLoading && hasMore && (
            <div className="flex justify-center mt-2 mb-1">
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {ACTIVE_STAKINGS_TEXT.loadMoreBtn}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {selectedStake && (
        <ClaimModal 
          isOpen={!!selectedStake} 
          onClose={() => setSelectedStake(null)} 
          stake={selectedStake} 
          onClaimSuccess={() => {
            void refreshProfile()
          }}
        />
      )}
    </>
  )
}
