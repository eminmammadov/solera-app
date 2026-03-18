"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/primitives/Card"
import {
  Activity,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Lock,
  Search,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react"
import { motion } from "motion/react"
import {
  fetchExplorerFeed,
  type WalletActivityType,
  type WalletExplorerActivity,
  type WalletExplorerFeedStats,
} from "@/lib/user/user-analytics"

const EXPLORER_POLL_INTERVAL_MS = 10_000
const EXPLORER_PAGE_SIZE = 30

const EXPLORER_TEXT = {
  title: "Explorer",
  description:
    "Real-time system transaction feed for all users on Solera. Includes Stake, Claim, Deposit, Withdraw and Convert operations.",
  searchPlaceholder: "Search wallet, token, event hash...",
  stats: {
    totalTx: "Total Transactions",
    last24h: "Last 24h",
    volume: "Volume",
    activeUsers: "Active Users",
  },
  liveFeedInfo: "Live feed • Polling every 10s",
  columns: {
    txHash: "Event Hash",
    type: "Type",
    wallet: "Wallet",
    amount: "Amount",
    time: "Time",
    status: "Status",
  },
  loadMoreBtn: "Load more transactions",
} as const

type FilterType = "ALL" | WalletActivityType

const FILTER_OPTIONS: Array<{ label: string; value: FilterType }> = [
  { label: "All", value: "ALL" },
  { label: "Stake", value: "STAKE" },
  { label: "Claim", value: "CLAIM" },
  { label: "Deposit", value: "DEPOSIT" },
  { label: "Withdraw", value: "WITHDRAW" },
  { label: "Convert", value: "CONVERT" },
]

const shortenHash = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`
const shortenAddress = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`

const formatTimeAgo = (dateIso: string, nowTs: number): string => {
  const createdAt = new Date(dateIso).getTime()
  if (!Number.isFinite(createdAt)) return "-"

  const diffMs = Math.max(0, nowTs - createdAt)
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const getTransactionStyle = (type: WalletActivityType) => {
  switch (type) {
    case "CLAIM":
    case "DEPOSIT":
      return { icon: ArrowDownLeft, color: "text-green-500", bg: "bg-green-500/10" }
    case "STAKE":
      return { icon: Lock, color: "text-blue-500", bg: "bg-blue-500/10" }
    case "CONVERT":
      return { icon: ArrowRightLeft, color: "text-purple-500", bg: "bg-purple-500/10" }
    case "WITHDRAW":
    default:
      return { icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-500/10" }
  }
}

export function ExplorerOverview() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("ALL")
  const [items, setItems] = useState<WalletExplorerActivity[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [stats, setStats] = useState<WalletExplorerFeedStats | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [latestTxFlash, setLatestTxFlash] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())
  const itemsRef = useRef<WalletExplorerActivity[]>([])
  const nextCursorRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTs(Date.now())
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const copyText = async (
    value: string,
    setCopied: (value: string | null) => void,
  ) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      // Keep silent if clipboard API fails.
    }
  }

  const fetchFirstPage = useCallback(
    async (mode: "initial" | "refresh" | "poll") => {
      if (mode === "initial") setIsInitialLoading(true)
      if (mode === "refresh") setIsRefreshing(true)

      const response = await fetchExplorerFeed({
        search: debouncedSearch,
        type: filterType,
        limit: EXPLORER_PAGE_SIZE,
      })

      if (!response) {
        if (mode === "initial") {
          setItems([])
          setNextCursor(null)
          setStats(null)
        }
        setIsInitialLoading(false)
        setIsRefreshing(false)
        return
      }

      setStats(response.stats)

      if (mode === "poll" && itemsRef.current.length > EXPLORER_PAGE_SIZE) {
        const existing = itemsRef.current
        const dedupe = new Set<string>()
        const merged: WalletExplorerActivity[] = []
        for (const item of [...response.items, ...existing]) {
          if (dedupe.has(item.id)) continue
          dedupe.add(item.id)
          merged.push(item)
        }
        const capped = merged.slice(0, existing.length)
        const firstNew = response.items.find(
          (item) => !existing.some((prev) => prev.id === item.id),
        )
        if (firstNew) {
          setLatestTxFlash(firstNew.id)
          window.setTimeout(() => setLatestTxFlash(null), 1800)
        }
        setItems(capped)
        itemsRef.current = capped
      } else {
        const firstNew =
          mode !== "initial"
            ? response.items.find(
                (item) => !itemsRef.current.some((prev) => prev.id === item.id),
              )
            : null
        if (firstNew) {
          setLatestTxFlash(firstNew.id)
          window.setTimeout(() => setLatestTxFlash(null), 1800)
        }

        setItems(response.items)
        itemsRef.current = response.items
        setNextCursor(response.nextCursor)
        nextCursorRef.current = response.nextCursor
      }

      setIsInitialLoading(false)
      setIsRefreshing(false)
    },
    [debouncedSearch, filterType],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFirstPage("initial")
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchFirstPage])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchFirstPage("poll")
    }, EXPLORER_POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [fetchFirstPage])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !nextCursorRef.current) return
    setIsLoadingMore(true)

    const response = await fetchExplorerFeed({
      search: debouncedSearch,
      type: filterType,
      limit: EXPLORER_PAGE_SIZE,
      cursor: nextCursorRef.current,
    })

    if (response) {
      const dedupe = new Set(itemsRef.current.map((item) => item.id))
      const appended = response.items.filter((item) => !dedupe.has(item.id))
      const merged = [...itemsRef.current, ...appended]
      setItems(merged)
      itemsRef.current = merged
      setNextCursor(response.nextCursor)
      nextCursorRef.current = response.nextCursor
      setStats(response.stats)
    }

    setIsLoadingMore(false)
  }, [debouncedSearch, filterType, isLoadingMore])

  const totalTxCount = stats?.totalTransactions ?? 0
  const last24hCount = stats?.last24hTransactions ?? 0
  const totalVolume = stats?.totalVolumeUsd ?? 0
  const activeUsers = stats?.activeUsers ?? 0
  const isStatsInitialLoading = isInitialLoading && stats === null
  const hasMore = Boolean(nextCursor)

  const noData = !isInitialLoading && items.length === 0
  const txRows = useMemo(() => items, [items])

  return (
    <div className="flex flex-col gap-2 h-full lg:overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-[#111111] border border-neutral-800 rounded-xl p-4 shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{EXPLORER_TEXT.title}</h1>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          </div>
          <p className="text-sm text-neutral-400">{EXPLORER_TEXT.description}</p>
        </div>

        <div className="w-full lg:w-72">
          <div className="flex items-center gap-2 bg-neutral-800/50 rounded-full px-2 py-1.5 w-full border border-neutral-700/30 focus-within:border-neutral-500 transition-colors">
            <Search className="h-3 w-3 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder={EXPLORER_TEXT.searchPlaceholder}
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-md bg-emerald-500/10">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-neutral-500 font-medium uppercase">{EXPLORER_TEXT.stats.totalTx}</p>
          </div>
          {isStatsInitialLoading ? (
            <div className="h-7 w-20 rounded bg-neutral-800 animate-pulse" />
          ) : (
            <h3 className="text-lg font-bold text-white">{totalTxCount.toLocaleString()}</h3>
          )}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-md bg-blue-500/10">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-[10px] text-neutral-500 font-medium uppercase">{EXPLORER_TEXT.stats.last24h}</p>
          </div>
          {isStatsInitialLoading ? (
            <div className="h-7 w-20 rounded bg-neutral-800 animate-pulse" />
          ) : (
            <h3 className="text-lg font-bold text-white">{last24hCount.toLocaleString()}</h3>
          )}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-md bg-purple-500/10">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-[10px] text-neutral-500 font-medium uppercase">{EXPLORER_TEXT.stats.volume}</p>
          </div>
          {isStatsInitialLoading ? (
            <div className="h-7 w-24 rounded bg-neutral-800 animate-pulse" />
          ) : (
            <h3 className="text-lg font-bold text-white">
              ${totalVolume.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </h3>
          )}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-md bg-orange-500/10">
              <Users className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <p className="text-[10px] text-neutral-500 font-medium uppercase">{EXPLORER_TEXT.stats.activeUsers}</p>
          </div>
          {isStatsInitialLoading ? (
            <div className="h-7 w-16 rounded bg-neutral-800 animate-pulse" />
          ) : (
            <h3 className="text-lg font-bold text-white">{activeUsers.toLocaleString()}</h3>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-[#111111] border border-neutral-800 rounded-lg p-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {FILTER_OPTIONS.map((typeOption) => (
            <button
              key={typeOption.value}
              onClick={() => setFilterType(typeOption.value)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === typeOption.value
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {typeOption.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void fetchFirstPage("refresh")}
          disabled={isRefreshing || isInitialLoading}
          className="ml-auto flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Zap className={`w-3 h-3 text-emerald-500 ${isRefreshing ? "animate-pulse" : ""}`} />
          <span>{EXPLORER_TEXT.liveFeedInfo}</span>
        </button>
      </div>

      <div className="flex-1 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="w-full overflow-x-auto flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-[11px] text-left whitespace-nowrap">
            <thead className="text-[10px] uppercase text-neutral-500 border-b border-neutral-800 sticky top-0 bg-[#111111] z-10">
              <tr>
                <th className="py-1.5 px-3 sm:px-4 font-medium">{EXPLORER_TEXT.columns.txHash}</th>
                <th className="py-1.5 px-3 sm:px-4 font-medium">{EXPLORER_TEXT.columns.type}</th>
                <th className="py-1.5 px-3 sm:px-4 font-medium">{EXPLORER_TEXT.columns.wallet}</th>
                <th className="py-1.5 px-3 sm:px-4 font-medium text-right">{EXPLORER_TEXT.columns.amount}</th>
                <th className="py-1.5 px-3 sm:px-4 font-medium text-right">{EXPLORER_TEXT.columns.time}</th>
                <th className="py-1.5 px-3 sm:px-4 font-medium text-right">{EXPLORER_TEXT.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                Array.from({ length: 12 }).map((_, index) => (
                  <tr key={`explorer-skeleton-${index}`} className="border-b border-neutral-800/40">
                    <td className="py-1.5 px-3 sm:px-4"><span className="block h-3 w-24 rounded bg-neutral-800 animate-pulse" /></td>
                    <td className="py-1.5 px-3 sm:px-4"><span className="block h-3 w-20 rounded bg-neutral-800 animate-pulse" /></td>
                    <td className="py-1.5 px-3 sm:px-4"><span className="block h-3 w-20 rounded bg-neutral-800 animate-pulse" /></td>
                    <td className="py-1.5 px-3 sm:px-4 text-right"><span className="inline-block h-3 w-24 rounded bg-neutral-800 animate-pulse" /></td>
                    <td className="py-1.5 px-3 sm:px-4 text-right"><span className="inline-block h-3 w-12 rounded bg-neutral-800 animate-pulse" /></td>
                    <td className="py-1.5 px-3 sm:px-4 text-right"><span className="inline-block h-3 w-16 rounded bg-neutral-800 animate-pulse" /></td>
                  </tr>
                ))
              ) : noData ? (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-4 py-0">
                    <div className="flex min-h-[260px] items-center justify-center text-center text-sm text-neutral-500">
                      No system transactions found for current filters.
                    </div>
                  </td>
                </tr>
              ) : (
                txRows.map((tx) => {
                  const { icon: Icon, color, bg } = getTransactionStyle(tx.type)
                  const isNew = tx.id === latestTxFlash

                  const statusColor =
                    tx.status === "COMPLETED"
                      ? "text-green-500"
                      : tx.status === "PENDING"
                        ? "text-yellow-500"
                        : "text-red-500"

                  const amountColor =
                    tx.amountDisplay.startsWith("+") ? "text-green-500" : "text-red-400"

                  return (
                    <motion.tr
                      key={tx.id}
                      initial={isNew ? { backgroundColor: "rgba(16, 185, 129, 0.1)" } : false}
                      animate={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
                      transition={{ duration: 1.6 }}
                      className="border-b border-neutral-800/30 hover:bg-neutral-800/20 transition-colors"
                    >
                      <td className="py-1.5 px-3 sm:px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-emerald-400 font-mono text-[11px]"
                            title={tx.eventHash}
                          >
                            {shortenHash(tx.eventHash)}
                          </span>
                          <button
                            className="text-neutral-600 hover:text-neutral-400 cursor-pointer transition-colors"
                            onClick={() => void copyText(tx.eventHash, setCopiedHash)}
                            title="Copy hash"
                          >
                            {copiedHash === tx.eventHash ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                            <Icon className={`h-3 w-3 ${color}`} />
                          </div>
                          <span className="font-semibold text-white">
                            {tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 sm:px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-300 font-mono text-[11px]" title={tx.walletAddress}>
                            {shortenAddress(tx.walletAddress)}
                          </span>
                          <button
                            className="text-neutral-600 hover:text-neutral-400 cursor-pointer transition-colors"
                            onClick={() => void copyText(tx.walletAddress, setCopiedWallet)}
                            title="Copy wallet"
                          >
                            {copiedWallet === tx.walletAddress ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className={`py-1.5 px-3 sm:px-4 text-right font-medium ${amountColor}`}>
                        {tx.amountDisplay}
                      </td>
                      <td className="py-1.5 px-3 sm:px-4 text-right text-neutral-500">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(tx.createdAt, nowTs)}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 sm:px-4 text-right">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${statusColor}`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === "COMPLETED"
                                ? "bg-green-500"
                                : tx.status === "PENDING"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          />
                          {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {hasMore && !isInitialLoading && (
          <div className="flex justify-center py-2 border-t border-neutral-800 shrink-0">
            <button
              onClick={() => void loadMore()}
              disabled={isLoadingMore}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoadingMore ? "Loading..." : EXPLORER_TEXT.loadMoreBtn}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
