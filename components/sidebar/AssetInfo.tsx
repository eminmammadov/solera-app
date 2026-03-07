"use client"

import { useState, useEffect, useRef } from "react"
import { ExternalLink, ChevronDown } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { currentPrice } from "@/lib/chart-data"

export function AssetInfo() {
  const [currentTime, setCurrentTime] = useState<string>("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
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

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const month = now.toLocaleString('en-US', { month: 'short' })
      const day = now.getDate()
      const timeString = now.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      const offset = -now.getTimezoneOffset() / 60
      const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`
      
      setCurrentTime(`${month} ${day} at ${timeString}, UTC ${offsetStr}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#111111] rounded-xl border border-neutral-800 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden">
            <Image 
              src="https://e.radikal.host/2026/03/02/ra75624ed5431b13a5.jpg" 
              alt="RA Logo" 
              width={24} 
              height={24} 
              className="object-cover w-full h-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xl font-medium text-white">RA</span>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 py-1"
              >
                <a 
                  href="https://raydium.io/swap/?inputMint=sol&outputMint=2jPF5RY4B3jtJb4iAwRZ5J68WLLu4uaaBZ4wpjV29YYA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] text-neutral-200 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-neutral-800/50 border border-neutral-700/50">
                    <Image 
                      src="https://cryptologos.cc/logos/raydium-ray-logo.png" 
                      alt="Raydium" 
                      width={12} 
                      height={12} 
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  Raydium
                </a>
                <a 
                  href="https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=2jPF5RY4B3jtJb4iAwRZ5J68WLLu4uaaBZ4wpjV29YYA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] text-neutral-200 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-neutral-800/50 border border-neutral-700/50">
                    <Image 
                      src="https://cryptologos.cc/logos/jupiter-ag-jup-logo.png" 
                      alt="Jupiter" 
                      width={12} 
                      height={12} 
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  Jupiter
                </a>
                <a 
                  href="https://dexscreener.com/solana/gjcatx94fs1adw1hevwfh8ach9kmxancrw3xwpxr6prz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/80 transition-colors text-[13px] text-neutral-200 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-neutral-800/50 border border-neutral-700/50">
                    <Image 
                      src="https://cryptologos.cc/logos/lisk-lsk-logo.png" 
                      alt="DexScreener" 
                      width={12} 
                      height={12} 
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  DexScreener
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-center gap-1 text-sm text-neutral-200">
          <span>Solera</span>
          <a 
            href="https://solscan.io/token/2jPF5RY4B3jtJb4iAwRZ5J68WLLu4uaaBZ4wpjV29YYA" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-neutral-500 hover:text-white transition-colors" />
          </a>
          <span className="text-neutral-500">• SPL</span>
        </div>
        <div className="text-xs text-neutral-500">Staked on Solana</div>
      </div>

      <div className="flex flex-col mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-[42px] leading-none font-normal text-white tracking-tight">{currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-sm text-neutral-500 font-medium">USD</span>
        </div>
        <div className="flex items-center gap-2 text-[15px] mt-2">
          <span className="text-[#22c55e] font-medium">+17.89 (0.32%)</span>
        </div>
        <div className="text-xs text-neutral-500 mt-1.5">
          Last update {currentTime || "..."}
        </div>
      </div>
    </div>
  )
}
