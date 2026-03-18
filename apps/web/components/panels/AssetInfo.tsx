"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ExternalLink, ChevronDown } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { useMarketData } from "@/store/market/use-market-data"
import { fetchOhlcFeaturedPair } from "@/lib/market/ohlc-client"
import { notifyWarning } from "@/lib/ui/ui-feedback"
import {
  buildDexScreenerPoolUrl,
  buildJupiterSwapUrl,
  buildRaydiumSwapUrl,
  buildSolscanTokenUrl,
} from "@/lib/external/external-links"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { useRuntimeSolanaNetwork } from "@/hooks/use-runtime-solana-network"
import {
  resolveRaConvertPoolForNetwork,
  resolveRaConvertQuoteMintForNetwork,
  resolveRaLogoUrl,
  resolveRaMintForNetwork,
  resolveRaName,
  resolveRaSymbol,
} from "@/lib/ra/ra-runtime"

const ASSET_INFO_TEXT = {
  platforms: {
    raydium: "Raydium",
    jupiter: "Jupiter",
    dexScreener: "DexScreener",
  },
  projectInfo: {
    name: "Solera",
    type: "SPL",
    network: "Staked on Solana",
  },
  currency: "USD",
  lastUpdatePrefix: "Last update ",
} as const
const FEATURED_PAIR_REFRESH_MS = 120_000

interface FeaturedPair {
  pairKey: string
  poolId: string
  baseMint: string
  quoteMint: string
  baseSymbol: string
  quoteSymbol: string
}

const formatPrice = (value: number) => {
  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (value >= 0.01) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }
  if (value >= 0.0001) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    })
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  })
}

const formatDeltaValue = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (abs >= 0.01) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }
  if (abs >= 0.0001) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    })
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  })
}

const formatPercent = (value: number) => {
  const abs = Math.abs(value)
  const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6
  return value.toFixed(decimals)
}

const formatUpdatedAt = (timestamp: string | null) => {
  if (!timestamp) return "..."
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "..."

  const month = date.toLocaleString("en-US", { month: "short" })
  const day = date.getDate()
  const timeString = date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  const offset = -date.getTimezoneOffset() / 60
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`
  return `${month} ${day} at ${timeString}, UTC ${offsetStr}`
}

export function AssetInfo() {
  const {
    tokens,
    liveRaPrice,
    liveRaPriceChange,
    liveRaUpdatedAt,
    hasFetchedTokens,
    isLoadingTokens,
  } = useMarketData()
  const { settings: raRuntime } = useRaRuntimeSettings()
  const { runtimeNetwork } = useRuntimeSolanaNetwork()
  const raSymbol = resolveRaSymbol(raRuntime)
  const raName = resolveRaName(raRuntime)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const fallbackFeaturedPair = useMemo<FeaturedPair>(
    () => ({
      pairKey: "RA_SOL",
      poolId: resolveRaConvertPoolForNetwork(raRuntime, runtimeNetwork),
      baseMint: resolveRaMintForNetwork(raRuntime, runtimeNetwork),
      quoteMint: resolveRaConvertQuoteMintForNetwork(raRuntime, runtimeNetwork),
      baseSymbol: raSymbol,
      quoteSymbol: "SOL",
    }),
    [raRuntime, raSymbol, runtimeNetwork],
  )
  const [featuredPair, setFeaturedPair] = useState<FeaturedPair | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const activeFeaturedPair = featuredPair ?? fallbackFeaturedPair

  const ticker = activeFeaturedPair.baseSymbol || fallbackFeaturedPair.baseSymbol
  const marketToken = tokens.find(
    (token) =>
      token.ticker.toLowerCase() === ticker.toLowerCase() ||
      token.mintAddress?.toLowerCase() === activeFeaturedPair.baseMint.toLowerCase(),
  )

  const hasLiveRaPrice = liveRaPrice > 0
  const activeRaMint = resolveRaMintForNetwork(raRuntime, runtimeNetwork).toLowerCase()
  const isRa =
    ticker.toUpperCase() === raSymbol ||
    ticker.toUpperCase() === "RA" ||
    activeFeaturedPair.baseMint.toLowerCase() === activeRaMint
  const assetPrice = isRa
    ? (hasLiveRaPrice ? liveRaPrice : null)
    : (marketToken && marketToken.price > 0 ? marketToken.price : null)
  const assetChange = isRa
    ? (hasLiveRaPrice ? liveRaPriceChange : null)
    : (marketToken && Number.isFinite(marketToken.chg24h) ? marketToken.chg24h : null)
  const assetPriceChange =
    assetPrice !== null && assetChange !== null
      ? assetPrice * (assetChange / 100)
      : 0
  const updatedLabel = formatUpdatedAt(liveRaUpdatedAt)
  const isInitialLoading =
    !hasFetchedTokens ||
    isLoadingTokens ||
    assetPrice === null ||
    assetChange === null

  const raydiumSwapUrl = buildRaydiumSwapUrl(
    activeFeaturedPair.quoteMint,
    activeFeaturedPair.baseMint,
  )
  const jupiterSwapUrl = buildJupiterSwapUrl(
    activeFeaturedPair.quoteMint,
    activeFeaturedPair.baseMint,
  )
  const dexScreenerUrl = buildDexScreenerPoolUrl(activeFeaturedPair.poolId)
  const solscanTokenUrl = buildSolscanTokenUrl(
    activeFeaturedPair.baseMint,
    runtimeNetwork,
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadFeaturedPair = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetchOhlcFeaturedPair()
        if (!isMounted || !res?.success || !res.pair) return

        setFeaturedPair({
          pairKey: res.pair.pairKey || fallbackFeaturedPair.pairKey,
          poolId: res.pair.poolId || fallbackFeaturedPair.poolId,
          baseMint: res.pair.baseMint || fallbackFeaturedPair.baseMint,
          quoteMint: res.pair.quoteMint || fallbackFeaturedPair.quoteMint,
          baseSymbol: res.pair.baseSymbol || fallbackFeaturedPair.baseSymbol,
          quoteSymbol: res.pair.quoteSymbol || fallbackFeaturedPair.quoteSymbol,
        })
      } catch {
        notifyWarning({
          title: "Asset Feed Delay",
          description: "Featured pair settings could not be refreshed.",
          dedupeKey: "asset-info-featured-pair",
          dedupeMs: 180_000,
        })
      }
    }

    void loadFeaturedPair()
    const intervalRef = window.setInterval(() => {
      void loadFeaturedPair()
    }, FEATURED_PAIR_REFRESH_MS)

    const handleVisibilityOrFocus = () => {
      void loadFeaturedPair()
    }
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)

    return () => {
      isMounted = false
      clearInterval(intervalRef)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
    }
  }, [fallbackFeaturedPair])

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#111111] rounded-xl border border-neutral-800 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden bg-neutral-800">
            {isRa ? (
              <Image
                src={resolveRaLogoUrl(raRuntime)}
                alt={`${ticker} Logo`}
                width={24}
                height={24}
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[10px] text-white font-medium">
                {ticker.slice(0, 2)}
              </span>
            )}
          </div>
          <span className="text-xl font-medium text-white">{isRa ? raSymbol : ticker}</span>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            title="Swap"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 py-1"
              >
                <a
                  href={raydiumSwapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] text-neutral-200 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-neutral-800/50 border border-neutral-700/50">
                    <Image
                      src="https://cryptologos.cc/logos/raydium-ray-logo.png"
                      alt="Raydium"
                      width={12}
                      height={12}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {ASSET_INFO_TEXT.platforms.raydium}
                </a>
                <a
                  href={jupiterSwapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] text-neutral-200 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-neutral-800/50 border border-neutral-700/50">
                    <Image
                      src="https://cryptologos.cc/logos/jupiter-ag-jup-logo.png"
                      alt="Jupiter"
                      width={12}
                      height={12}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {ASSET_INFO_TEXT.platforms.jupiter}
                </a>
                <a
                  href={dexScreenerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] text-neutral-200 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-neutral-800/50 border border-neutral-700/50">
                    <Image
                      src="https://cryptologos.cc/logos/lisk-lsk-logo.png"
                      alt="DexScreener"
                      width={12}
                      height={12}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {ASSET_INFO_TEXT.platforms.dexScreener}
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-center gap-1 text-sm text-neutral-200">
          <span>{isRa ? raName : ASSET_INFO_TEXT.projectInfo.name}</span>
          <a
            href={solscanTokenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-neutral-500 hover:text-white transition-colors" />
          </a>
          <span className="text-neutral-500">• {ASSET_INFO_TEXT.projectInfo.type}</span>
        </div>
        <div className="text-xs text-neutral-500">{ASSET_INFO_TEXT.projectInfo.network}</div>
      </div>

      <div className="flex flex-col mt-2">
        <div className="flex items-baseline gap-2">
          {isInitialLoading ? (
            <>
              <span className="h-10 w-44 rounded bg-neutral-800 animate-pulse" />
              <span className="h-4 w-10 rounded bg-neutral-800 animate-pulse" />
            </>
          ) : (
            <>
              <span className="text-4xl sm:text-[42px] leading-none font-normal text-white tracking-tight">
                {formatPrice(assetPrice)}
              </span>
              <span className="text-sm text-neutral-500 font-medium">{ASSET_INFO_TEXT.currency}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[15px] mt-2">
          {isInitialLoading ? (
            <span className="h-5 w-36 rounded bg-neutral-800 animate-pulse" />
          ) : (
            <span className={`${assetChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"} font-medium`}>
              {assetChange >= 0 ? "+" : ""}
              {formatDeltaValue(assetPriceChange)} (
              {assetChange >= 0 ? "+" : ""}
              {formatPercent(assetChange)}%)
            </span>
          )}
        </div>
        <div className="text-xs text-neutral-500 mt-1.5">
          {isInitialLoading ? (
            <span className="block h-3 w-48 rounded bg-neutral-800 animate-pulse" />
          ) : (
            `${ASSET_INFO_TEXT.lastUpdatePrefix}${updatedLabel}`
          )}
        </div>
      </div>
    </div>
  )
}
