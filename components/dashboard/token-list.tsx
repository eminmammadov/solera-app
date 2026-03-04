"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Maximize2, Minimize2, ArrowUpDown, ArrowDown, ArrowUp, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"

const tokens = [
  { ticker: "SPX", name: "S&P 500", price: "5,670.98", chg24h: "0.67%", stake7d: "5.32%", stake1m: "8.15%", stake3m: "12.67%", stake6m: "18.4%", stake12m: "24.5%", color: "green", category: "Meme tokens" },
  { ticker: "NDQ", name: "Nasdaq 100", price: "19,581.78", chg24h: "0.75%", stake7d: "2.35%", stake1m: "5.20%", stake3m: "8.75%", stake6m: "15.2%", stake12m: "28.4%", color: "green", category: "Meme tokens" },
  { ticker: "DJI", name: "Dow Jones", price: "42,225.32", chg24h: "0.56%", stake7d: "-1.36%", stake1m: "1.45%", stake3m: "4.56%", stake6m: "8.9%", stake12m: "14.2%", color: "green", category: "Meme tokens" },
  { ticker: "VIX", name: "Volatility Index", price: "21.51", chg24h: "-1.19%", stake7d: "10.26%", stake1m: "2.15%", stake3m: "-5.19%", stake6m: "-12.4%", stake12m: "-18.5%", color: "red", category: "Meme tokens" },
  { ticker: "VIX $", name: "VIX Dollar", price: "102.74", chg24h: "-0.92%", stake7d: "-0.95%", stake1m: "-1.20%", stake3m: "-2.92%", stake6m: "-4.5%", stake12m: "-6.8%", color: "red", category: "Meme tokens" },
  { ticker: "AAPL", name: "Apple Inc.", price: "223.89", chg24h: "0.31%", stake7d: "4.70%", stake1m: "8.45%", stake3m: "15.31%", stake6m: "22.5%", stake12m: "34.2%", color: "green", category: "Asset tokens" },
  { ticker: "NFLX", name: "Netflix, Inc.", price: "282.76", chg24h: "5.33%", stake7d: "1.30%", stake1m: "12.4%", stake3m: "25.33%", stake6m: "42.1%", stake12m: "68.5%", color: "green", category: "Asset tokens" },
  { ticker: "TSLA", name: "Tesla, Inc.", price: "395.52", chg24h: "0.77%", stake7d: "-3.14%", stake1m: "4.25%", stake3m: "10.77%", stake6m: "18.4%", stake12m: "25.6%", color: "green", category: "Asset tokens" },
  { ticker: "USOIL", name: "Crude Oil", price: "69.88", chg24h: "-1.10%", stake7d: "-2.78%", stake1m: "-4.15%", stake3m: "-5.10%", stake6m: "-8.4%", stake12m: "-12.5%", color: "red", category: "Partner tokens" },
  { ticker: "GOLD", name: "Gold", price: "3,129.45", chg24h: "-0.28%", stake7d: "1.83%", stake1m: "4.50%", stake3m: "8.28%", stake6m: "14.2%", stake12m: "22.4%", color: "red", category: "Partner tokens" },
  { ticker: "SILVER", name: "Silver", price: "33.22", chg24h: "-1.96%", stake7d: "-0.65%", stake1m: "0.85%", stake3m: "1.96%", stake6m: "5.4%", stake12m: "8.2%", color: "red", category: "Partner tokens" },
]

type SortKey = 'price' | 'chg24h' | 'stake7d' | 'stake1m' | 'stake3m' | 'stake6m' | 'stake12m';

export function TokenList() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const categories = ["All", "Meme tokens", "Asset tokens", "Partner tokens"]
  const filteredTokens = selectedCategory === "All" ? tokens : tokens.filter(t => t.category === selectedCategory)

  const parseValue = (val: string) => {
    return parseFloat(val.replace(/,/g, '').replace(/%/g, ''))
  }

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    if (!sortConfig) return 0
    const aVal = parseValue(a[sortConfig.key])
    const bVal = parseValue(b[sortConfig.key])
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
        className={`flex flex-col p-4 bg-[#111111] rounded-xl border border-neutral-800 text-neutral-100 ${
          isExpanded 
            ? "fixed inset-4 sm:inset-12 z-50 shadow-2xl" 
            : "relative h-full w-full"
        }`}
        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
      >
        <motion.div layout className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-sm font-medium text-white">Stake tokens</h2>
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
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="text-[10px] uppercase text-neutral-500 border-b border-neutral-800">
            <tr>
              <th className="pb-3 px-3 font-medium">Token</th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  Price
                  {renderSortIcon('price')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('chg24h')}>
                <div className="flex items-center justify-end gap-1">
                  CHG % / 24h
                  {renderSortIcon('chg24h')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake7d')}>
                <div className="flex items-center justify-end gap-1">
                  % 7d
                  {renderSortIcon('stake7d')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake1m')}>
                <div className="flex items-center justify-end gap-1">
                  % 1M
                  {renderSortIcon('stake1m')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake3m')}>
                <div className="flex items-center justify-end gap-1">
                  % 3M
                  {renderSortIcon('stake3m')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake6m')}>
                <div className="flex items-center justify-end gap-1">
                  % 6M
                  {renderSortIcon('stake6m')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('stake12m')}>
                <div className="flex items-center justify-end gap-1">
                  % 12M
                  {renderSortIcon('stake12m')}
                </div>
              </th>
              <th className="pb-3 px-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[13px] text-neutral-500">
                  There is currently no data available.
                </td>
              </tr>
            ) : (
              sortedTokens.map((token) => (
                <tr key={token.ticker} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                        <Image src={`https://picsum.photos/seed/${token.ticker}/20/20`} alt={token.ticker} width={20} height={20} referrerPolicy="no-referrer" />
                      </div>
                      <span className="font-semibold text-white">{token.ticker}</span>
                      <span className="text-neutral-500 hidden sm:inline">{token.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {token.price} <span className="text-neutral-500 text-[10px]">USD</span>
                  </td>
                  <td className={`py-3 px-3 text-right ${token.color === 'green' ? 'text-green-500' : 'text-red-500'}`}>
                    {token.chg24h}
                  </td>
                  <td className="py-3 px-3 text-right text-neutral-300">{token.stake7d}</td>
                  <td className="py-3 px-3 text-right text-neutral-300">{token.stake1m}</td>
                  <td className="py-3 px-3 text-right text-neutral-300">{token.stake3m}</td>
                  <td className="py-3 px-3 text-right text-neutral-300">{token.stake6m}</td>
                  <td className="py-3 px-3 text-right text-neutral-300">{token.stake12m}</td>
                  <td className="py-3 px-3 text-right">
                    <button className="bg-white text-black hover:bg-neutral-200 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer">
                      Stake
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
