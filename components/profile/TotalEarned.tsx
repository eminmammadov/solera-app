"use client"

import { Activity } from "lucide-react"
import { useUserData } from "@/store/use-user-data"

export function TotalEarned() {
  const { totalEarned, totalEarnedUsd } = useUserData()

  return (
    <div className="h-full rounded-xl border border-neutral-800 bg-[#111111] p-4 sm:p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-green-500" />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-400 mb-1">Total Earned</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-green-500">+{totalEarned.toLocaleString()} RA</h3>
          <span className="text-sm text-neutral-500">~${totalEarnedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  )
}
