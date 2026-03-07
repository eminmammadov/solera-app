"use client"

import { Wallet, ArrowUpRight, Activity, Coins, Copy, Check, LogOut, ArrowRightLeft } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/store/use-wallet"
import { useUserData } from "@/store/use-user-data"
import { ConvertModal } from "@/components/modals/ConvertModal"

export function ProfileOverview() {
  const [copied, setCopied] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const router = useRouter()
  const { disconnect } = useWallet()
  const { availableBalance, stakedBalance, totalEarned, totalEarnedUsd, portfolioValue, portfolioChange } = useUserData()
  
  const address = "0x4A2...8f9"
  const fullAddress = "0x4A2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4z"

  const handleCopy = () => {
    navigator.clipboard.writeText(fullAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    disconnect()
    router.push("/")
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full">
        {/* User Info & Total Value */}
        <div className="flex-1 rounded-xl border border-neutral-800 bg-[#111111] p-4 sm:p-6 flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-neutral-800 shrink-0">
                <Image src="https://e.radikal.host/2026/03/04/avatar.png" alt="Avatar" width={64} height={64} className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{address}</h2>
                  <button 
                    onClick={handleCopy} 
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Address"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-sm text-neutral-400">Connected Wallet</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsConvertModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-500 hover:bg-green-500/20 transition-colors cursor-pointer border border-green-500/20"
              title="Convert small balances to RA"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Convert</span>
            </button>
          </div>
          <div>
            <p className="text-sm text-neutral-400 mb-1">Total Portfolio Value</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              <span className={`text-sm font-medium flex items-center ${portfolioChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <ArrowUpRight className="h-4 w-4 mr-0.5" />
                {portfolioChange > 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
              </span>
            </div>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 p-2 rounded-full bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Disconnect"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Balances */}
        <div className="flex flex-row gap-2">
          <div className="flex-1 rounded-xl border border-neutral-800 bg-[#111111] p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-neutral-400 truncate">Available Balance</p>
              <p className="text-sm sm:text-lg font-bold text-white truncate">{availableBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} RA</p>
            </div>
          </div>
          
          <div className="flex-1 rounded-xl border border-neutral-800 bg-[#111111] p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-neutral-400 truncate">Staked Balance</p>
              <p className="text-sm sm:text-lg font-bold text-white truncate">{stakedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} RA</p>
            </div>
          </div>
        </div>
      </div>
      
      <ConvertModal 
        isOpen={isConvertModalOpen} 
        onClose={() => setIsConvertModalOpen(false)} 
      />
    </>
  )
}
