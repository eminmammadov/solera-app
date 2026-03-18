"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Maximize2, Minimize2, ArrowUpDown, ArrowDown, ArrowUp, ExternalLink, Search, X } from "lucide-react"
import { Card } from "@/components/ui/primitives/Card"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { useStakeModal } from "@/store/ui/use-stake-modal"
import { useMarketData } from "@/store/market/use-market-data"
import { normalizeImageSrc } from "@/lib/ui/image-src"

type SortKey = 'price' | 'chg24h' | 'stake7d' | 'stake1m' | 'stake3m' | 'stake6m' | 'stake12m';

/**
 * Centralized static text content for TokenList component.
 */
const TOKEN_LIST_TEXT = {
  title: "Stake tokens",
  searchPlaceholder: "Search ticker...",
  categories: {
    all: "All",
    memeTokens: "Meme tokens",
    assetTokens: "Asset tokens",
    partnerTokens: "Partner tokens"
  },
  columns: {
    token: "Token",
    price: "Price",
    chg24h: "CHG % / 24h",
    stake7d: "% 7d",
    stake1m: "% 1M",
    stake3m: "% 3M",
    stake6m: "% 6M",
    stake12m: "% 12M"
  },
  currency: "USD",
  btnStake: "Stake",
  emptyStates: {
    noResults: "No results found",
    noData: "There is currently no data available."
  },
  btnLoadMore: "Load more"
} as const;

export function TokenList() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>(TOKEN_LIST_TEXT.categories.all)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(20)
  const { openModal } = useStakeModal()
  const { tokens, hasFetchedTokens } = useMarketData()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isInitialLoading = !hasFetchedTokens

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const categories = [Object.values(TOKEN_LIST_TEXT.categories)[0], Object.values(TOKEN_LIST_TEXT.categories)[1], Object.values(TOKEN_LIST_TEXT.categories)[2], Object.values(TOKEN_LIST_TEXT.categories)[3]]
  let filteredTokens = selectedCategory === TOKEN_LIST_TEXT.categories.all ? tokens : tokens.filter(t => t.category === selectedCategory)

  if (searchQuery) {
    const normalizedSearch = searchQuery.toLowerCase()
    filteredTokens = filteredTokens.filter(t => t.ticker.toLowerCase().includes(normalizedSearch))
  }

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    if (!sortConfig) {
      // Default sort by publishedAt descending (newest first)
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    }
    const aVal = a[sortConfig.key]
    const bVal = b[sortConfig.key]
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10)
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-white" /> : <ArrowDown className="h-3 w-3 text-white" />
    }
    return <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
  }

  return (
    <>
      {/* Placeholder to keep layout from collapsing when expanded */}
      {isExpanded && <div className="h-full w-full rounded-xl border border-neutral-800/50 bg-[#111111]/50" />}

      <motion.div
        layout
        className={`flex flex-col p-2 sm:p-3 bg-[#111111] rounded-xl border border-neutral-800 text-neutral-100 ${
          isExpanded 
            ? "fixed inset-4 sm:inset-12 z-50 shadow-2xl" 
            : "relative h-full w-full"
        }`}
        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
      >
        <motion.div layout className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="hidden sm:block text-[17px] font-medium text-white whitespace-nowrap">{TOKEN_LIST_TEXT.title}</h2>
            <div className="flex items-center gap-2 bg-neutral-800/50 rounded-full px-2 py-1.5 w-32 sm:w-48 border border-neutral-700/30 focus-within:border-neutral-500 transition-colors">
              <Search className="h-3 w-3 text-neutral-400 shrink-0" />
              <input 
                type="text" 
                placeholder={TOKEN_LIST_TEXT.searchPlaceholder} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[11px] text-white outline-none w-full placeholder:text-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-neutral-400">
            <Link href="/staking" className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
              <ExternalLink className="h-4 w-4" />
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button 
                className="flex items-center gap-2 px-2 py-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="text-xs">{selectedCategory}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-36 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50"
                  >
                    {categories.map(cat => (
                      <button
                        key={cat}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-800 transition-colors cursor-pointer ${selectedCategory === cat ? 'text-white bg-neutral-800/50' : 'text-neutral-400'}`}
                        onClick={() => {
                          setSelectedCategory(cat)
                          setIsDropdownOpen(false)
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700 ml-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>
        
        <motion.div layout className="w-full overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full text-[11px] text-left whitespace-nowrap">
          <thead className="text-[10px] uppercase text-neutral-500 border-b border-neutral-800">
            <tr>
              <th className="pb-2 px-0 font-medium">{TOKEN_LIST_TEXT.columns.token}</th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.price}
                  {renderSortIcon('price')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('chg24h')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.chg24h}
                  {renderSortIcon('chg24h')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake7d')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.stake7d}
                  {renderSortIcon('stake7d')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake1m')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.stake1m}
                  {renderSortIcon('stake1m')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake3m')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.stake3m}
                  {renderSortIcon('stake3m')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake6m')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.stake6m}
                  {renderSortIcon('stake6m')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake12m')}>
                <div className="flex items-center justify-end gap-1">
                  {TOKEN_LIST_TEXT.columns.stake12m}
                  {renderSortIcon('stake12m')}
                </div>
              </th>
              <th className="pb-2 px-0 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {isInitialLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={`token-list-skeleton-${index}`} className="border-b border-neutral-800/50 last:border-0">
                  <td className="py-1.5 px-0">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-neutral-800 animate-pulse shrink-0" />
                      <span className="h-3 w-10 rounded bg-neutral-800 animate-pulse" />
                      <span className="h-3 w-20 rounded bg-neutral-800 animate-pulse hidden sm:inline-block" />
                    </div>
                  </td>
                  {Array.from({ length: 7 }).map((__, metricIndex) => (
                    <td key={`token-list-skeleton-metric-${index}-${metricIndex}`} className="py-1.5 px-0 text-right">
                      <span className="inline-block h-3 w-14 rounded bg-neutral-800 animate-pulse" />
                    </td>
                  ))}
                  <td className="py-1.5 px-0 text-right">
                    <span className="inline-block h-6 w-12 rounded bg-neutral-800 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[13px] text-neutral-500">
                  {searchQuery ? TOKEN_LIST_TEXT.emptyStates.noResults : TOKEN_LIST_TEXT.emptyStates.noData}
                </td>
              </tr>
            ) : (
              sortedTokens.slice(0, visibleCount).map((token) => {
                const tokenIconSrc = normalizeImageSrc(token.icon)
                return (
                <tr key={token.ticker} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                  <td className="py-1.5 px-0">
                    <div className="flex items-center gap-2">
                      {token.isImage && tokenIconSrc ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 overflow-hidden shrink-0 text-[9px] font-bold text-white">
                          <Image
                            src={tokenIconSrc}
                            alt={token.ticker}
                            width={20}
                            height={20}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : token.isImage ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 shrink-0 text-[9px] font-bold text-white">
                          {token.ticker.charAt(0)}
                        </div>
                      ) : (
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${token.colorBg} text-[9px] font-bold text-white`}>
                          {token.icon === 'V' ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l8 16 8-16"/></svg>
                          ) : token.icon}
                        </div>
                      )}
                      <span className="font-semibold text-white">{token.ticker}</span>
                      <span className="text-neutral-500 hidden sm:inline">{token.name}</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-0 text-right text-white">
                    {token.priceFormatted} <span className="text-neutral-500 text-[10px]">{TOKEN_LIST_TEXT.currency}</span>
                  </td>
                  <td className={`py-1.5 px-0 text-right ${token.chg24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {token.chg24h >= 0 ? '+' : ''}{token.chg24h}%
                  </td>
                  <td className="py-1.5 px-0 text-right text-neutral-300">{token.stake7d >= 0 ? '+' : ''}{token.stake7d}%</td>
                  <td className="py-1.5 px-0 text-right text-neutral-300">{token.stake1m >= 0 ? '+' : ''}{token.stake1m}%</td>
                  <td className="py-1.5 px-0 text-right text-neutral-300">{token.stake3m >= 0 ? '+' : ''}{token.stake3m}%</td>
                  <td className="py-1.5 px-0 text-right text-neutral-300">{token.stake6m >= 0 ? '+' : ''}{token.stake6m}%</td>
                  <td className="py-1.5 px-0 text-right text-neutral-300">{token.stake12m >= 0 ? '+' : ''}{token.stake12m}%</td>
                  <td className="py-1.5 px-0 text-right">
                    <button 
                      onClick={() => openModal(token)}
                      className="bg-white text-black hover:bg-neutral-200 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      {TOKEN_LIST_TEXT.btnStake}
                    </button>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
        
        {!isInitialLoading && visibleCount < sortedTokens.length && (
          <div className="flex justify-center mt-2 mb-1">
              <button 
                onClick={handleLoadMore}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {TOKEN_LIST_TEXT.btnLoadMore}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Backdrop */}
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
