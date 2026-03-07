"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Users } from "lucide-react"
import Image from "next/image"

export function TotalTvlMetrics() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [totalUsers, setTotalUsers] = useState(1500)
  const [onlineUsers, setOnlineUsers] = useState(1123)

  const handleSync = useCallback(() => {
    setIsSyncing(true)
    // Simulate API request
    setTimeout(() => {
      // Add some random fluctuation
      setTotalUsers(prev => prev + Math.floor(Math.random() * 5))
      setOnlineUsers(prev => {
        const fluctuation = Math.floor(Math.random() * 21) - 10 // -10 to +10
        return Math.max(0, prev + fluctuation)
      })
      setIsSyncing(false)
    }, 1500)
  }, [])

  // Auto sync every 120 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleSync()
    }, 120000)
    return () => clearInterval(interval)
  }, [handleSync])

  return (
    <div className="relative flex flex-col p-3 sm:p-4 bg-[#111111] rounded-xl border border-neutral-800 w-full h-full justify-between overflow-hidden group">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://e.radikal.host/2026/03/04/pexels-hngstrm-20250939.jpg" 
          alt="Users Background" 
          fill 
          className="object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
        {/* Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-start">
        <span className="text-[12px] text-neutral-300 mb-1 block">Total User</span>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {totalUsers.toLocaleString()}
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-neutral-400">Online {onlineUsers.toLocaleString()}</span>
      </div>

      {/* Sync Button */}
      <div className="relative z-10 flex justify-start mt-4">
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="p-1 rounded-md bg-neutral-800/50 hover:bg-neutral-700 border border-neutral-700/30 text-neutral-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          aria-label="Sync data"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-white' : ''}`} />
          <span className="text-[9px] font-medium uppercase tracking-wider">Sync</span>
        </button>
      </div>
    </div>
  )
}
