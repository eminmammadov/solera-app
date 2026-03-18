"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowUp, ArrowDown, Newspaper, X, Search, Filter } from "lucide-react"

import { useFeedbackToast } from "@/hooks/use-feedback-toast"
import {
  fetchPublicNewsItems,
  voteOnPublicNewsItem,
} from "@/lib/public/news-public"
import { useNewsStore, type NewsItemData } from "@/store/news/use-news-store"
import { NewsReadOverlay } from "@/components/modals/NewsReadOverlay"

interface NewsApiItem {
  id: string
  title: string
  source: string
  tags: string[]
  body: string | null
  articleUrl: string | null
  isActive: boolean
  upvotes: number
  downvotes: number
  createdAt: string
  viewerVote: "up" | "down" | null
}

const NEWS_FEED_TEXT = {
  title: "News feed",
  filterLatest: "Latest news",
  filterOldest: "Oldest news",
  searchPlaceholder: "Search news...",
  loading: "Loading news feed...",
  emptyFeed: "News feed is empty",
  noResults: "No results found",
  loadError: "Unable to fetch news feed.",
  btnLoadMore: "Load more",
} as const

const NEWS_PAGE_SIZE = 15
const NEWS_FETCH_LIMIT = 120

const formatDateTimeUTC = (date: Date) => {
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  const formattedMinutes = minutes.toString().padStart(2, "0")
  const time = `${formattedHours.toString().padStart(2, "0")}:${formattedMinutes} ${ampm}`

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const dateLabel = `${date.getUTCDate().toString().padStart(2, "0")} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`

  return { time, date: dateLabel }
}

const mapApiNewsToFeedItem = (item: NewsApiItem): NewsItemData => {
  const createdAt = new Date(item.createdAt)
  const safeDate = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
  const formatted = formatDateTimeUTC(safeDate)

  return {
    id: item.id,
    time: formatted.time,
    date: formatted.date,
    timestamp: safeDate.getTime(),
    title: item.title,
    source: item.source,
    tags: Array.isArray(item.tags) ? item.tags : [],
    body: item.body?.trim() || null,
    articleUrl: item.articleUrl?.trim() || null,
    upvotes: Number.isFinite(item.upvotes) ? item.upvotes : 0,
    downvotes: Number.isFinite(item.downvotes) ? item.downvotes : 0,
    viewerVote: item.viewerVote === "up" || item.viewerVote === "down" ? item.viewerVote : null,
  }
}

const applyVoteToItem = (
  item: NewsItemData,
  nextVote: "up" | "down" | null,
): NewsItemData => {
  const previousVote = item.viewerVote
  let upvotes = item.upvotes
  let downvotes = item.downvotes

  if (previousVote === "up") upvotes -= 1
  if (previousVote === "down") downvotes -= 1

  if (nextVote === "up") upvotes += 1
  if (nextVote === "down") downvotes += 1

  return {
    ...item,
    upvotes: Math.max(0, upvotes),
    downvotes: Math.max(0, downvotes),
    viewerVote: nextVote,
  }
}

function NewsItem({
  item,
  onVote,
  isVoting,
}: {
  item: NewsItemData
  onVote: (item: NewsItemData, voteType: "up" | "down") => void
  isVoting: boolean
}) {
  const { selectedNews, setSelectedNews } = useNewsStore()
  const isSelected = selectedNews?.id === item.id

  return (
    <div
      onClick={() => setSelectedNews(item)}
      className={`flex gap-1 py-2 px-4 border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group cursor-pointer ${isSelected ? "bg-neutral-800/30" : ""}`}
    >
      <div className="w-[72px] shrink-0 flex flex-col min-h-[54px]">
        <div className="pt-0.5">
          <span className="block text-[9px] text-neutral-400 leading-tight">{item.date}</span>
          <span className="block text-[8px] text-neutral-500 leading-tight">{item.time}</span>
        </div>
        {item.tags.length > 0 && (
          <div className="mt-auto pt-1 flex items-center gap-0.5 text-[9px] text-neutral-500">
            <span className="text-yellow-500/80">$</span>
            <span className="truncate">{item.tags[0]}</span>
            {item.tags.length > 1 && (
              <span className="text-neutral-600">+{item.tags.length - 1}</span>
            )}
          </div>
        )}
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

          <div className="ml-auto flex items-center gap-0.5 bg-neutral-800/50 px-1 py-0.5 rounded">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onVote(item, "up")
              }}
              disabled={isVoting}
              className={`p-0.5 cursor-pointer rounded hover:bg-neutral-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${item.viewerVote === "up" ? "text-green-500" : "text-neutral-400 hover:text-white"}`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <span className={`font-medium px-1 ${item.viewerVote === "up" ? "text-green-500" : "text-neutral-400"}`}>
              {item.upvotes}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onVote(item, "down")
              }}
              disabled={isVoting}
              className={`p-0.5 cursor-pointer rounded hover:bg-neutral-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${item.viewerVote === "down" ? "text-red-500" : "text-neutral-400 hover:text-white"}`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
            <span className={`font-medium px-1 ${item.viewerVote === "down" ? "text-red-500" : "text-neutral-400"}`}>
              {item.downvotes}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewsItemSkeleton() {
  return (
    <div className="flex gap-1 py-2 px-4 border-b border-neutral-800/50">
      <div className="w-[72px] shrink-0 flex flex-col min-h-[54px]">
        <div className="pt-0.5 space-y-1">
          <div className="h-2 w-14 rounded bg-neutral-800 animate-pulse" />
          <div className="h-2 w-10 rounded bg-neutral-800 animate-pulse" />
        </div>
        <div className="mt-auto pt-1 flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-neutral-800 animate-pulse" />
          <div className="h-2 w-8 rounded bg-neutral-800 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="h-3 w-[92%] rounded bg-neutral-800 animate-pulse" />
        <div className="h-3 w-[78%] rounded bg-neutral-800 animate-pulse" />
        <div className="flex items-center gap-3 mt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-neutral-800 animate-pulse" />
            <div className="h-2 w-16 rounded bg-neutral-800 animate-pulse" />
          </div>
          <div className="ml-auto h-5 w-20 rounded bg-neutral-800 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function NewsFeedContent({ onClose }: { onClose?: () => void } = {}) {
  const { selectedNews, setSelectedNews } = useNewsStore()
  const selectedNewsId = selectedNews?.id ?? null
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE)
  const [newsItems, setNewsItems] = useState<NewsItemData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [votingById, setVotingById] = useState<Record<string, boolean>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  useFeedbackToast({
    scope: "news-feed",
    error: loadError,
    errorTitle: "News Feed",
    errorDedupeMs: 90_000,
  })

  const loadNews = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const data = await fetchPublicNewsItems<NewsApiItem>({
        active: true,
        limit: NEWS_FETCH_LIMIT,
      })
      const mapped = Array.isArray(data) ? data.map(mapApiNewsToFeedItem) : []
      setNewsItems(mapped)
    } catch (error) {
      const message = error instanceof Error ? error.message : NEWS_FEED_TEXT.loadError
      setLoadError(message)
      setNewsItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNews()
  }, [loadNews])

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
    if (!selectedNewsId) return

    const updated = newsItems.find((item) => item.id === selectedNewsId)
    if (!updated) {
      setSelectedNews(null)
      return
    }

    setSelectedNews(updated)
  }, [newsItems, selectedNewsId, setSelectedNews])

  const filteredNews = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().replace("$", "")
    return newsItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.source.toLowerCase().includes(normalizedSearch) ||
          item.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)),
      )
      .sort((a, b) => (sortOrder === "latest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp))
  }, [newsItems, searchQuery, sortOrder])

  const visibleNews = filteredNews.slice(0, visibleCount)

  const handleVote = async (item: NewsItemData, voteType: "up" | "down") => {
    if (votingById[item.id]) return

    const nextVote = item.viewerVote === voteType ? null : voteType
    const optimisticItem = applyVoteToItem(item, nextVote)

    setVotingById((prev) => ({ ...prev, [item.id]: true }))
    setNewsItems((prev) => prev.map((news) => (news.id === item.id ? optimisticItem : news)))
    if (selectedNews?.id === item.id) {
      setSelectedNews(optimisticItem)
    }

    try {
      const updated = mapApiNewsToFeedItem(
        await voteOnPublicNewsItem<NewsApiItem>(item.id, nextVote),
      )
      setNewsItems((prev) => prev.map((news) => (news.id === item.id ? updated : news)))
      if (selectedNews?.id === item.id) {
        setSelectedNews(updated)
      }
    } catch {
      setNewsItems((prev) => prev.map((news) => (news.id === item.id ? item : news)))
      if (selectedNews?.id === item.id) {
        setSelectedNews(item)
      }
    } finally {
      setVotingById((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
    }
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + NEWS_PAGE_SIZE)
  }

  return (
    <div className="flex flex-col relative w-full h-full bg-[#111111] border-neutral-800 sm:border sm:rounded-xl overflow-hidden">
      <div className="flex flex-col p-4 border-b border-neutral-800 shrink-0 bg-[#111111] z-10 gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-medium text-white">{NEWS_FEED_TEXT.title}</h3>
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
                      onClick={() => { setSortOrder("latest"); setIsDropdownOpen(false); setVisibleCount(NEWS_PAGE_SIZE) }}
                      className={`w-full cursor-pointer text-left px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] ${sortOrder === "latest" ? "text-white bg-neutral-800/50" : "text-neutral-400 hover:text-white"}`}
                    >
                      {NEWS_FEED_TEXT.filterLatest}
                    </button>
                    <button
                      onClick={() => { setSortOrder("oldest"); setIsDropdownOpen(false); setVisibleCount(NEWS_PAGE_SIZE) }}
                      className={`w-full cursor-pointer text-left px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] ${sortOrder === "oldest" ? "text-white bg-neutral-800/50" : "text-neutral-400 hover:text-white"}`}
                    >
                      {NEWS_FEED_TEXT.filterOldest}
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
        <div className="flex items-center gap-2 bg-neutral-800/50 rounded-full px-2 py-1.5 w-full border border-neutral-700/30 focus-within:border-neutral-500 transition-colors">
          <Search className="h-3 w-3 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder={NEWS_FEED_TEXT.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(NEWS_PAGE_SIZE) }}
            className="bg-transparent text-[11px] text-white outline-none w-full placeholder:text-neutral-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setVisibleCount(NEWS_PAGE_SIZE)
              }}
              className="text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <div className="flex flex-col pb-4">
            {Array.from({ length: NEWS_PAGE_SIZE }).map((_, index) => (
              <NewsItemSkeleton key={`news-skeleton-${index}`} />
            ))}
          </div>
        ) : loadError ? (
          <div className="min-h-full flex items-center justify-center p-8 text-center text-red-300 text-sm">
            {loadError}
          </div>
        ) : newsItems.length === 0 ? (
          <div className="min-h-full flex items-center justify-center p-8 text-center text-neutral-500 text-sm">
            {NEWS_FEED_TEXT.emptyFeed}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="min-h-full flex items-center justify-center p-8 text-center text-neutral-500 text-sm">
            {NEWS_FEED_TEXT.noResults}
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {visibleNews.map((item) => (
              <NewsItem
                key={item.id}
                item={item}
                onVote={handleVote}
                isVoting={Boolean(votingById[item.id])}
              />
            ))}
            {visibleCount < filteredNews.length && (
              <div className="p-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {NEWS_FEED_TEXT.btnLoadMore}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <NewsReadOverlay isMobile={true} />
    </div>
  )
}

export function NewsFeed() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="hidden lg:flex w-[320px] shrink-0 h-full relative z-30">
        <NewsFeedContent />
        <NewsReadOverlay />
      </div>

      <div className="sm:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-4 z-40 w-12 h-12 cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-black/50 border border-neutral-700 transition-transform hover:scale-105 active:scale-95"
        >
          <Newspaper className="h-5 w-5" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />

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
