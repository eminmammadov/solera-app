"use client"

import { ArrowDownLeft, ArrowUpRight, Lock, ArrowRightLeft, Maximize2, Minimize2 } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useShallow } from "zustand/react/shallow"
import { useUserData } from "@/store/profile/use-user-data"

const getTransactionStyle = (type: string) => {
  switch (type) {
    case "Claim":
    case "Deposit":
      return {
        icon: ArrowDownLeft,
        color: "text-green-500",
        bg: "bg-green-500/10"
      }
    case "Stake":
      return {
        icon: Lock,
        color: "text-blue-500",
        bg: "bg-blue-500/10"
      }
    case "Convert":
      return {
        icon: ArrowRightLeft,
        color: "text-purple-500",
        bg: "bg-purple-500/10"
      }
    case "Withdraw":
    default:
      return {
        icon: ArrowUpRight,
        color: "text-red-500",
        bg: "bg-red-500/10"
      }
  }
}

/**
 * Centralized static texts for TransactionHistory component.
 */
const TX_HISTORY_TEXT = {
  title: "Transaction History",
  emptyState: "No transaction history available yet.",
  columns: {
    type: "Type",
    amount: "Amount",
    date: "Date",
    status: "Status"
  },
  loadMoreBtn: "Load more"
} as const

export function TransactionHistory() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const {
    transactions,
    isProfileLoading,
    isProfileLoaded,
    profileError,
  } = useUserData(
    useShallow((state) => ({
      transactions: state.transactions,
      isProfileLoading: state.isProfileLoading,
      isProfileLoaded: state.isProfileLoaded,
      profileError: state.profileError,
    })),
  )
  const isProfileDataLoading =
    isProfileLoading || (!isProfileLoaded && !profileError)
  
  const visibleTransactions = transactions.slice(0, visibleCount)
  const hasMore = visibleCount < transactions.length

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
          <h2 className="text-[17px] font-medium text-white whitespace-nowrap">{TX_HISTORY_TEXT.title}</h2>
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
                <th className="pb-2 px-0 font-medium">{TX_HISTORY_TEXT.columns.type}</th>
                <th className="pb-2 px-0 font-medium text-right">{TX_HISTORY_TEXT.columns.amount}</th>
                <th className="pb-2 px-0 font-medium text-right">{TX_HISTORY_TEXT.columns.date}</th>
                <th className="pb-2 px-0 font-medium text-right">{TX_HISTORY_TEXT.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {isProfileDataLoading
                ? Array.from({ length: 12 }).map((_, index) => (
                    <tr
                      key={`tx-skeleton-${index}`}
                      className="border-b border-neutral-800/50 last:border-0"
                    >
                      <td className="py-1.5 px-0">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-neutral-800 animate-pulse shrink-0" />
                          <span className="h-3 w-16 rounded bg-neutral-800 animate-pulse" />
                        </div>
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-20 rounded bg-neutral-800 animate-pulse" />
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-24 rounded bg-neutral-800 animate-pulse" />
                      </td>
                      <td className="py-1.5 px-0 text-right">
                        <span className="inline-block h-3 w-14 rounded bg-neutral-800 animate-pulse" />
                      </td>
                    </tr>
                  ))
                : transactions.length === 0
                  ? (
                    <tr>
                      <td colSpan={4} className="px-0 py-0">
                        <div className="flex min-h-[220px] items-center justify-center text-center text-[13px] text-neutral-500">
                          {TX_HISTORY_TEXT.emptyState}
                        </div>
                      </td>
                    </tr>
                  )
                  : visibleTransactions.map((tx) => {
                      const { icon: Icon, color, bg } = getTransactionStyle(tx.type)

                      let statusColor = "text-neutral-500"
                      if (tx.status === "Pending") statusColor = "text-yellow-500"
                      if (tx.status === "Failed") statusColor = "text-red-500"
                      if (tx.status === "Completed") statusColor = "text-green-500"

                      return (
                        <tr key={tx.id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                          <td className="py-1.5 px-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                                <Icon className={`h-3 w-3 ${color}`} />
                              </div>
                              <span className="font-semibold text-white">{tx.type}</span>
                            </div>
                          </td>
                          <td className={`py-1.5 px-0 text-right ${tx.amount.startsWith("+") ? "text-green-500" : "text-white"}`}>
                            {tx.amount}
                          </td>
                          <td className="py-1.5 px-0 text-right text-neutral-400">{tx.date}</td>
                          <td className="py-1.5 px-0 text-right">
                            <span className={statusColor}>
                              {tx.status}
                            </span>
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
                {TX_HISTORY_TEXT.loadMoreBtn}
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
    </>
  )
}
