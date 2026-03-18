"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import Image from "next/image"
import { useStakeModal } from "@/store/ui/use-stake-modal"
import { useMarketData } from "@/store/market/use-market-data"
import { normalizeImageSrc } from "@/lib/ui/image-src"

type WatchlistGroup = {
  category: string;
  limit: number;
};

/**
 * Centralized static text content for LatestListing component.
 */
const LATEST_LISTING_TEXT = {
  title: "Latest listing",
  emptyState: "No data available yet.",
  columns: {
    price: "Price",
    pct7d: "% 7d",
    pct3m: "% 3M"
  },
  categories: {
    memeTokens: "Meme tokens",
    assetTokens: "Asset tokens",
    partnerTokens: "Partner tokens"
  }
} as const

const watchlistCategories: WatchlistGroup[] = [
  { category: LATEST_LISTING_TEXT.categories.memeTokens, limit: 5 },
  { category: LATEST_LISTING_TEXT.categories.assetTokens, limit: 3 },
  { category: LATEST_LISTING_TEXT.categories.partnerTokens, limit: 3 }
]

export function LatestListing() {
  const { openModal } = useStakeModal()
  const { tokens, hasFetchedTokens } = useMarketData()
  const isInitialLoading = !hasFetchedTokens
  const latestStakeableToken = useMemo(() => {
    const stakeable = tokens.filter(
      (candidate) => candidate.ticker.toLowerCase() !== "ra",
    )
    if (stakeable.length === 0) return null
    return [...stakeable].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )[0]
  }, [tokens])

  return (
    <div className="flex h-full min-h-0 flex-col p-4 bg-[#111111] rounded-xl border border-neutral-800">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[17px] font-medium text-white">{LATEST_LISTING_TEXT.title}</h3>
        <div className="flex items-center gap-2 text-neutral-400">
          <button
            onClick={() => {
              if (!latestStakeableToken) return
              openModal(latestStakeableToken)
            }}
            disabled={!latestStakeableToken}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col space-y-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isInitialLoading ? (
          watchlistCategories.map((group) => (
            <div key={group.category}>
              <div className="flex items-center justify-between text-[10px] font-medium uppercase text-neutral-500 mb-1.5 tracking-wider pb-2 border-b border-neutral-800/50">
                <span>{group.category}</span>
                <div className="flex items-center gap-2 sm:gap-2 text-right">
                  <span className="w-[60px] sm:w-[70px]">{LATEST_LISTING_TEXT.columns.price}</span>
                  <span className="w-12 sm:w-14">{LATEST_LISTING_TEXT.columns.pct7d}</span>
                  <span className="w-12 sm:w-14">{LATEST_LISTING_TEXT.columns.pct3m}</span>
                </div>
              </div>
              <div>
                {Array.from({ length: group.limit }).map((_, index) => (
                  <div key={`${group.category}-skeleton-${index}`} className="flex items-center justify-between text-[11px] py-1.5 border-b border-neutral-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-neutral-800 animate-pulse shrink-0" />
                      <span className="h-3 w-12 rounded bg-neutral-800 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2 text-right">
                      <span className="h-3 w-[60px] sm:w-[70px] rounded bg-neutral-800 animate-pulse" />
                      <span className="h-3 w-12 sm:w-14 rounded bg-neutral-800 animate-pulse" />
                      <span className="h-3 w-12 sm:w-14 rounded bg-neutral-800 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : tokens.length === 0 ? (
          <div className="h-full min-h-[250px] flex items-center justify-center py-8 text-center text-[13px] text-neutral-500">
            {LATEST_LISTING_TEXT.emptyState}
          </div>
        ) : (
          watchlistCategories.map((group) => {
            const groupItems = tokens.filter(t => t.category === group.category);
            if (groupItems.length === 0) return null;

            return (
              <div key={group.category}>
                <div className="flex items-center justify-between text-[10px] font-medium uppercase text-neutral-500 mb-1.5 tracking-wider pb-2 border-b border-neutral-800/50">
                  <span>{group.category}</span>
                  <div className="flex items-center gap-2 sm:gap-2 text-right">
                    <span className="w-[60px] sm:w-[70px]">{LATEST_LISTING_TEXT.columns.price}</span>
                    <span className="w-12 sm:w-14">{LATEST_LISTING_TEXT.columns.pct7d}</span>
                    <span className="w-12 sm:w-14">{LATEST_LISTING_TEXT.columns.pct3m}</span>
                  </div>
                </div>
                <div>
                  {[...groupItems]
                    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                    .slice(0, group.limit)
                    .map((item, i) => {
                      const iconSrc = normalizeImageSrc(item.icon)
                      // Handle decimal coloring for price
                      let priceDisplay = <span className={item.priceColor || "text-white"}>{item.priceFormatted}</span>;

                      if (item.priceDecimalColor && item.priceFormatted.includes('.')) {
                        const [whole, decimal] = item.priceFormatted.split('.');
                        priceDisplay = (
                          <span>
                            <span className="text-white">{whole}.</span>
                            <span className={item.priceDecimalColor}>{decimal}</span>
                          </span>
                        );
                      }

                      return (
                        <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-neutral-800/50 last:border-0">
                          <div className="flex items-center gap-2">
                            {item.isImage && item.icon ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 overflow-hidden text-[9px] font-bold text-white">
                                {iconSrc ? (
                                  <Image
                                    src={iconSrc}
                                    alt={item.ticker}
                                    width={20}
                                    height={20}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  item.ticker.charAt(0)
                                )}
                              </div>
                            ) : item.isImage ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-[9px] font-bold text-white">
                                {item.ticker.charAt(0)}
                              </div>
                            ) : (
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${item.colorBg} text-[9px] font-bold text-white`}>
                                {item.icon === 'V' ? (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l8 16 8-16" /></svg>
                                ) : item.icon}
                              </div>
                            )}
                            <span className="text-neutral-200 font-semibold">{item.ticker}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-2 text-right">
                            <span className="w-[60px] sm:w-[70px] truncate">{priceDisplay}</span>
                            <span className={`w-12 sm:w-14 truncate ${item.stake7d >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{item.stake7d >= 0 ? '+' : ''}{item.stake7d}%</span>
                            <span className={`w-12 sm:w-14 truncate ${item.stake3m >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{item.stake3m >= 0 ? '+' : ''}{item.stake3m}%</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
