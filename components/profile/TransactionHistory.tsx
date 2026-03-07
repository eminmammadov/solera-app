"use client"

import { ArrowDownLeft, ArrowUpRight, Lock, ArrowRightLeft } from "lucide-react"
import { useState } from "react"
import { useUserData } from "@/store/use-user-data"

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

export function TransactionHistory() {
  const [visibleCount, setVisibleCount] = useState(10)
  const { transactions } = useUserData()
  
  const visibleTransactions = transactions.slice(0, visibleCount)
  const hasMore = visibleCount < transactions.length

  return (
    <div className="flex flex-col p-2 sm:p-3 bg-[#111111] rounded-xl border border-neutral-800 text-neutral-100 relative h-full w-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-[17px] font-medium text-white whitespace-nowrap">Transaction History</h2>
      </div>
      
      {transactions.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-neutral-500">
          No transaction history available yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="text-[10px] uppercase text-neutral-500 border-b border-neutral-800">
              <tr>
                <th className="pb-2 px-2 font-medium">Type</th>
                <th className="pb-2 px-2 font-medium text-right">Amount</th>
                <th className="pb-2 px-2 font-medium text-right">Date</th>
                <th className="pb-2 px-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((tx) => {
                const { icon: Icon, color, bg } = getTransactionStyle(tx.type)
                
                let statusColor = "text-neutral-500"
                if (tx.status === "Pending") statusColor = "text-yellow-500"
                if (tx.status === "Failed") statusColor = "text-red-500"
                if (tx.status === "Completed") statusColor = "text-green-500"
                
                return (
                  <tr key={tx.id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                          <Icon className={`h-3 w-3 ${color}`} />
                        </div>
                        <span className="font-semibold text-white">{tx.type}</span>
                      </div>
                    </td>
                    <td className={`py-1.5 px-2 text-right ${tx.amount.startsWith('+') ? 'text-green-500' : 'text-white'}`}>
                      {tx.amount}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400">{tx.date}</td>
                    <td className="py-1.5 px-2 text-right">
                      <span className={statusColor}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {hasMore && (
            <div className="flex justify-center mt-2 mb-1">
              <button 
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
