"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Maximize2, Minimize2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useSolanaPortfolio } from "@/hooks/use-solana-portfolio"
import { useFeedbackToast } from "@/hooks/use-feedback-toast"
import { useShallow } from "zustand/react/shallow"
import { useUserData } from "@/store/profile/use-user-data"
import { useMarketData } from "@/store/market/use-market-data"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { useRuntimeSolanaNetwork } from "@/hooks/use-runtime-solana-network"
import {
  buildTrackedPortfolioTokens,
  type TrackedPortfolioToken,
} from "@/lib/portfolio/tracked-portfolio"
import {
  resolveRaLogoUrl,
  resolveRaMintForNetwork,
  resolveRaName,
  resolveRaSymbol,
} from "@/lib/ra/ra-runtime"

export const PORTFOLIO_TEXT = {
  title: "Portfolio",
  subtitle: "Your token balances",
  emptyState: "No tokens found"
} as const;

export function Portfolio() {
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    portfolio: chainPortfolio,
    isLoading,
    error,
    updatedAt: chainPortfolioUpdatedAt,
  } = useSolanaPortfolio()
  const { tokens: listedTokens, isLoadingTokens, hasFetchedTokens, liveRaPrice } = useMarketData()
  const { settings: raRuntime } = useRaRuntimeSettings()
  const { runtimeNetwork } = useRuntimeSolanaNetwork()
  const raSymbol = resolveRaSymbol(raRuntime)
  const raName = resolveRaName(raRuntime)
  const {
    isProfileLoading,
    isProfileLoaded,
    profileError,
    portfolio: profilePortfolio,
    profileUpdatedAt,
  } = useUserData(
    useShallow((state) => ({
      isProfileLoading: state.isProfileLoading,
      isProfileLoaded: state.isProfileLoaded,
      profileError: state.profileError,
      portfolio: state.portfolio,
      profileUpdatedAt: state.profileUpdatedAt,
    })),
  )

  useFeedbackToast({
    scope: "profile-portfolio",
    error,
    errorTitle: "Portfolio Sync Error",
    errorDedupeMs: 120_000,
  })

  const isUserProfileDataLoading =
    isProfileLoading || (!isProfileLoaded && !profileError)
  const isProfileDataLoading =
    !hasFetchedTokens ||
    isLoading ||
    isLoadingTokens ||
    isUserProfileDataLoading

  const displayTokens = useMemo(
    () =>
      buildTrackedPortfolioTokens({
        listedTokens,
        chainPortfolio,
        profilePortfolio,
        liveRaPrice,
        preferProfileAmounts: profileUpdatedAt >= chainPortfolioUpdatedAt,
        raMintAddress: resolveRaMintForNetwork(raRuntime, runtimeNetwork),
        raLogoUrl: resolveRaLogoUrl(raRuntime),
        raSymbol,
        raName,
      }),
    [
      chainPortfolio,
      chainPortfolioUpdatedAt,
      listedTokens,
      liveRaPrice,
      profilePortfolio,
      profileUpdatedAt,
      raName,
      raRuntime,
      raSymbol,
      runtimeNetwork,
    ],
  )
  const safeDisplayTokens = useMemo<TrackedPortfolioToken[]>(
    () =>
      displayTokens.filter(
        (token): token is TrackedPortfolioToken => token !== null,
      ),
    [displayTokens],
  )

  return (
    <>
      {isExpanded && (
        <div className="h-full w-full rounded-xl border border-neutral-800/50 bg-[#111111]/50" />
      )}

      <motion.div
        layout
        className={`flex flex-col rounded-xl border border-neutral-800 bg-[#111111] overflow-hidden ${isExpanded
          ? "fixed inset-4 sm:inset-12 z-50 shadow-2xl w-auto"
          : "h-full"
          }`}
        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
      >
        <div className="p-4 sm:p-6 border-b border-neutral-800/50">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">{PORTFOLIO_TEXT.title}</h3>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-1">{PORTFOLIO_TEXT.subtitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isProfileDataLoading &&
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`portfolio-skeleton-${index}`}
                className="flex items-center justify-between py-1.5 px-0 border-b border-neutral-800/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-neutral-800 animate-pulse shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-10 rounded bg-neutral-800 animate-pulse" />
                    <span className="h-3 w-20 rounded bg-neutral-800 animate-pulse hidden sm:inline-block" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-16 rounded bg-neutral-800 animate-pulse" />
                  <span className="h-3 w-12 rounded bg-neutral-800 animate-pulse" />
                </div>
              </div>
            ))}

          {!isProfileDataLoading &&
            safeDisplayTokens.map((token) => {
              const currentPrice = token.priceUsd;
              const isTokenValueLoading = token.amount > 0 && currentPrice <= 0

              return (
                <div
                  key={token.id}
                  className="flex items-center justify-between py-1.5 px-0 border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {token.isImage ? (
                        <div className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                          <Image src={token.logoUrl} alt={token.name} width={20} height={20} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className={`h-5 w-5 rounded-full ${token.colorBg || 'bg-neutral-700'} flex items-center justify-center overflow-hidden shrink-0 text-[10px] font-bold text-white uppercase`}>
                          {token.logoUrl === 'V' ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l8 16 8-16" /></svg>
                          ) : token.logoUrl?.charAt(0) || token.ticker.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-white">{token.ticker}</span>
                      <span className="text-[10px] text-neutral-500 hidden sm:inline">{token.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] text-white">
                        {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                    </div>
                    {isTokenValueLoading ? (
                      <span className="h-3 w-12 rounded bg-neutral-800 animate-pulse" />
                    ) : (
                      <span className="text-[11px] text-neutral-500 w-12 text-right">
                        ${(token.amount * currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

          {!isProfileDataLoading && safeDisplayTokens.length === 0 && !error && (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              {PORTFOLIO_TEXT.emptyState}
            </div>
          )}

          {!isProfileDataLoading && error && (
            <div className="flex items-center justify-center h-full text-red-500/80 text-sm">
              {error}
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
    </>
  )
}

