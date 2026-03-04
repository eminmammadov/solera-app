"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowUp, ArrowDown, Newspaper, X, Search, Filter } from "lucide-react"

import { useNewsStore } from "@/store/news-store"
import { NewsReadOverlay } from "@/components/dashboard/news-read-overlay"

type NewsItemData = {
  id: string;
  time: string;
  date: string;
  timestamp: number;
  title: string;
  source: string;
  tags: string[];
  initialUpvotes: number;
  initialDownvotes: number;
}

const BASE_DATE = new Date("2026-03-03T12:00:00Z");

const mockTitles = [
  "Bitcoin Surges Past $65K Resistance as Institutional Inflows Accelerate",
  "Ethereum Gas Fees Hit 6-Month Low Following Dencun Upgrade",
  "Solana DeFi Ecosystem TVL Crosses $4 Billion Mark",
  "SEC Delays Decision on Spot Ethereum ETF Applications",
  "Binance Announces Integration of Lightning Network for BTC Withdrawals",
  "Tether Mints 1 Billion USDT on Tron Network to Meet Demand",
  "Polygon Unveils AggLayer to Connect Fragmented L2 Liquidity",
  "Coinbase Q4 Earnings Beat Estimates Driven by Retail Trading Volume",
  "Arbitrum DAO Votes on $20M Gaming Ecosystem Fund",
  "MicroStrategy Acquires Additional 3,000 BTC, Total Holdings Reach 193K",
  "Ripple CTO Unveils Plans for Native XRP Ledger Smart Contracts",
  "Chainlink Cross-Chain Interoperability Protocol (CCIP) Goes Live on Mainnet",
  "Uniswap Foundation Proposes Fee Switch to Reward UNI Token Holders",
  "Optimism Airdrops 19M OP Tokens to Active Network Contributors",
  "Cardano's Chang Hard Fork Scheduled for Q3, Bringing On-Chain Governance",
  "Avalanche Network Experiences Brief Outage, Developers Deploy Fix",
  "Grayscale GBTC Outflows Slow Down as Bitcoin Price Stabilizes",
  "MakerDAO Considers Allocating $600M to USDe and sUSDe",
  "Fantom Foundation Announces Sonic Upgrade to Boost Network Throughput",
  "Starknet STRK Token Airdrop Claim Process Begins Amid Controversy"
];
const mockSources = ["CoinDesk", "CoinTelegraph", "Blockworks", "Decrypt", "The Block", "CryptoSlate", "Wu Blockchain", "Bankless"];
const mockTagsList = [["BTC"], ["ETH"], ["SOL"], ["ETH"], ["BNB"], ["USDT"], ["MATIC"], ["COIN"], ["ARB"], ["BTC"], ["XRP"], ["LINK"], ["UNI"], ["OP"], ["ADA"], ["AVAX"], ["BTC"], ["MKR"], ["FTM"], ["STRK"]];

const mockNews: NewsItemData[] = Array.from({ length: 20 }, (_, i) => {
  // Deterministic date math to avoid hydration mismatch
  const date = new Date(BASE_DATE.getTime() - i * 3600000 * 5 - (i % 3) * 1800000);
  
  // Format consistently without relying on local timezone
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const timeString = `${formattedHours.toString().padStart(2, '0')}:${formattedMinutes} ${ampm}`;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateString = `${date.getUTCDate().toString().padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

  return {
    id: String(i + 1),
    time: timeString,
    date: dateString,
    timestamp: date.getTime(),
    title: mockTitles[i],
    source: mockSources[i % mockSources.length],
    tags: mockTagsList[i],
    initialUpvotes: (i * 17) % 100 + 10,
    initialDownvotes: (i * 7) % 20 + 1
  }
})

function NewsItem({ item }: { item: NewsItemData }) {
  const { selectedNews, setSelectedNews } = useNewsStore()
  const [upvotes, setUpvotes] = useState(item.initialUpvotes)
  const [downvotes, setDownvotes] = useState(item.initialDownvotes)
  const [voteStatus, setVoteStatus] = useState<'up' | 'down' | null>(null)

  const isSelected = selectedNews?.id === item.id

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (voteStatus === 'up') {
      setUpvotes(prev => prev - 1)
      setVoteStatus(null)
    } else {
      setUpvotes(prev => prev + 1)
      if (voteStatus === 'down') setDownvotes(prev => prev - 1)
      setVoteStatus('up')
    }
  }

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (voteStatus === 'down') {
      setDownvotes(prev => prev - 1)
      setVoteStatus(null)
    } else {
      setDownvotes(prev => prev + 1)
      if (voteStatus === 'up') setUpvotes(prev => prev - 1)
      setVoteStatus('down')
    }
  }

  return (
    <div 
      onClick={() => setSelectedNews(item)}
      className={`flex gap-1 py-2 px-4 border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group cursor-pointer ${isSelected ? 'bg-neutral-800/30' : ''}`}
    >
      <div className="w-[60px] shrink-0 flex flex-col pt-0.5">
        <span className="text-[9px] text-neutral-400 leading-tight">{item.date}</span>
        <span className="text-[8px] text-neutral-500 leading-tight">{item.time}</span>
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <h4 className="text-[13px] text-neutral-200 leading-snug line-clamp-2 font-medium group-hover:text-white transition-colors">
          {item.title}
        </h4>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-0.5">
          <div className="flex items-center gap-1.5">
            <Newspaper className="w-3 h-3 text-neutral-400" />
            <span className="truncate max-w-[80px]">{item.source}</span>
          </div>
          
          {item.tags.map(tag => (
            <div key={tag} className="flex items-center gap-0.5 hidden sm:flex">
              <span className="text-yellow-500/80">$</span>
              <span>{tag}</span>
            </div>
          ))}
          
          <div className="ml-auto flex items-center gap-0.5 bg-neutral-800/50 px-1 py-0.5 rounded">
            <button 
              onClick={handleUpvote}
              className={`p-0.5 cursor-pointer rounded hover:bg-neutral-700 transition-colors ${voteStatus === 'up' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <span className={`font-medium px-1 ${voteStatus === 'up' ? 'text-green-500' : 'text-neutral-400'}`}>
              {upvotes}
            </span>
            <button 
              onClick={handleDownvote}
              className={`p-0.5 cursor-pointer rounded hover:bg-neutral-700 transition-colors ${voteStatus === 'down' ? 'text-red-500' : 'text-neutral-400 hover:text-white'}`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
            <span className={`font-medium px-1 ${voteStatus === 'down' ? 'text-red-500' : 'text-neutral-400'}`}>
              {downvotes}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NewsFeedContent({ onClose }: { onClose?: () => void } = {}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const normalizedSearch = searchQuery.toLowerCase().replace('$', '');
  const filteredNews = mockNews.filter(item => 
    item.title.toLowerCase().includes(normalizedSearch) ||
    item.source.toLowerCase().includes(normalizedSearch) ||
    item.tags.some(tag => tag.toLowerCase().includes(normalizedSearch))
  ).sort((a, b) => {
    if (sortOrder === 'latest') return b.timestamp - a.timestamp
    return a.timestamp - b.timestamp
  })

  const visibleNews = filteredNews.slice(0, visibleCount)

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10)
  }

  return (
    <div className="flex flex-col relative w-full h-full bg-[#111111] border-neutral-800 sm:border sm:rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col p-4 border-b border-neutral-800 shrink-0 bg-[#111111] z-10 gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-medium text-white">News feed</h3>
          <div className="flex items-center gap-1">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
              >
                <Filter className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-1 w-36 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 py-1"
                  >
                    <button 
                      onClick={() => { setSortOrder('latest'); setIsDropdownOpen(false); setVisibleCount(10); }}
                      className={`w-full cursor-pointer text-left px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] ${sortOrder === 'latest' ? 'text-white bg-neutral-800/50' : 'text-neutral-400 hover:text-white'}`}
                    >
                      Latest news
                    </button>
                    <button 
                      onClick={() => { setSortOrder('oldest'); setIsDropdownOpen(false); setVisibleCount(10); }}
                      className={`w-full cursor-pointer text-left px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] ${sortOrder === 'oldest' ? 'text-white bg-neutral-800/50' : 'text-neutral-400 hover:text-white'}`}
                    >
                      Oldest news
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-neutral-800/50 rounded-full px-2 py-2 w-full border border-neutral-700/30 focus-within:border-neutral-500 transition-colors">
          <Search className="h-3 w-3 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search news..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(10); }}
            className="bg-transparent text-[13px] text-white outline-none w-full placeholder:text-neutral-500"
          />
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-col pb-4">
          {mockNews.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              News feed is empty
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              No results found
            </div>
          ) : (
            <>
              {visibleNews.map(item => (
                <NewsItem key={item.id} item={item} />
              ))}
              {visibleCount < filteredNews.length && (
                <div className="p-4 flex justify-center">
                  <button 
                    onClick={handleLoadMore}
                    className="px-4 py-2 cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white text-[13px] font-medium rounded-full transition-colors border border-neutral-700/50"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <NewsReadOverlay isMobile={true} />
    </div>
  )
}

export function NewsFeed() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop View (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex w-[320px] shrink-0 h-full">
        <NewsFeedContent />
      </div>

      {/* Mobile View (Floating Action Button & Drawer) */}
      <div className="sm:hidden">
        {/* FAB */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-4 z-40 w-12 h-12 cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-black/50 border border-neutral-700 transition-transform hover:scale-105 active:scale-95"
        >
          <Newspaper className="h-5 w-5" />
        </button>

        {/* Drawer */}
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />

              {/* Panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="relative w-full h-full bg-[#111111] border-r border-neutral-800 shadow-2xl flex flex-col"
              >
                <div className="flex-1 overflow-hidden">
                  <NewsFeedContent onClose={() => setIsOpen(false)} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
