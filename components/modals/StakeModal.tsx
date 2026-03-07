"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Check, ChevronDown, Wallet, Search, Send, RefreshCw, ArrowRightLeft, FileText, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { useStakeModal } from "@/store/use-stake-modal"
import { useMarketData } from "@/store/use-market-data"
import { useWallet } from "@/store/use-wallet"
import { ConnectModal } from "@/components/modals/ConnectModal"

const periods = [
  { label: "7D", apy: 0.7 },
  { label: "1M", apy: 2.5 },
  { label: "3M", apy: 8.0 },
  { label: "6M", apy: 18.0 },
  { label: "12M", apy: 40.0 }
]
const progressSteps = [
  { name: "sending", icon: Send },
  { name: "swap contract", icon: RefreshCw },
  { name: "transaction", icon: ArrowRightLeft },
  { name: "stake pool", icon: FileText },
  { name: "completed", icon: CheckCircle2 }
]

export function StakeModal() {
  const { isOpen, token, closeModal } = useStakeModal()
  const [step, setStep] = useState<'input' | 'processing'>('input')
  const [amount, setAmount] = useState("")
  const [period, setPeriod] = useState("1M")
  const [progressIndex, setProgressIndex] = useState(0)
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const { isConnected } = useWallet()
  const { tokens } = useMarketData()

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep('input')
      setAmount("")
      setPeriod("1M")
      setProgressIndex(0)
      
      if (token.ticker.toLowerCase() === 'ra') {
        const firstNonRAToken = tokens.find(t => t.ticker.toLowerCase() !== 'ra')
        setSelectedToken(firstNonRAToken || token)
      } else {
        setSelectedToken(token)
      }
      
      setIsTokenDropdownOpen(false)
      setSearchQuery("")
    }
  }, [isOpen, token, tokens])

  // Handle processing simulation
  useEffect(() => {
    if (step === 'processing' && progressIndex < progressSteps.length) {
      const timer = setTimeout(() => {
        setProgressIndex(prev => prev + 1)
      }, 1500) // 1.5 seconds per step
      return () => clearTimeout(timer)
    }
  }, [step, progressIndex])

  if (!isOpen || !token) return null

  const currentToken = selectedToken || token

  const handleStake = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return
    setStep('processing')
  }

  const handleClose = () => {
    closeModal()
  }

  // Mock calculations
  const balance = isConnected ? 566.23 : 0.00
  const usdValue = amount ? (Number(amount) * currentToken.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"
  
  const selectedPeriod = periods.find(p => p.label === period) || periods[1]
  const apy = selectedPeriod.apy
  
  const rewardAmount = amount ? (Number(amount) * (apy / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"
  const rewardUsd = amount ? (Number(amount) * (apy / 100) * 0.01).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00" // Mock RA price

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 'processing' && progressIndex < progressSteps.length ? undefined : handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[480px] shadow-2xl pointer-events-auto relative flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-medium text-white">Staking</h2>
                {!(step === 'processing' && progressIndex < progressSteps.length) && (
                  <button
                    onClick={handleClose}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <AnimatePresence mode="wait">
                  {step === 'input' ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Stake Input Box */}
                      <div className="relative border border-neutral-800/60 rounded-lg p-4 bg-[#161616]">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs text-neutral-400">Stake</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                              <Wallet className="h-3 w-3" />
                              <span>{balance} {currentToken.ticker}</span>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => setAmount((balance / 2).toString())}
                                className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer"
                              >
                                HALF
                              </button>
                              <button 
                                onClick={() => setAmount(balance.toString())}
                                className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer"
                              >
                                MAX
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <button 
                              onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                              className="flex items-center gap-2 bg-[#1a1a1a] border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-2 transition-colors cursor-pointer"
                            >
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                                <Image src={`https://picsum.photos/seed/${currentToken.ticker}/20/20`} alt={currentToken.ticker} width={20} height={20} referrerPolicy="no-referrer" />
                              </div>
                              <span className="font-medium text-white text-sm">{currentToken.ticker}</span>
                              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${isTokenDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          
                          <div className="flex flex-col items-end flex-1">
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-transparent text-right text-2xl font-medium text-white outline-none placeholder:text-neutral-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                            />
                            <span className="text-[10px] text-neutral-500 mt-1">${usdValue}</span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isTokenDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50"
                            >
                              <div className="p-2 border-b border-neutral-800">
                                <div className="flex items-center gap-2 bg-neutral-800/50 rounded-md px-2 py-1.5 border border-neutral-700/30">
                                  <Search className="h-3 w-3 text-neutral-400 shrink-0" />
                                  <input 
                                    type="text" 
                                    placeholder="Search token..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent text-xs text-white outline-none w-full placeholder:text-neutral-500"
                                  />
                                </div>
                              </div>
                              <div className="p-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {tokens
                                  .filter(t => t.ticker.toLowerCase() !== 'ra')
                                  .filter(t => t.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .map(t => (
                                    <button
                                      key={t.ticker}
                                      onClick={() => {
                                        setSelectedToken(t)
                                        setIsTokenDropdownOpen(false)
                                        setSearchQuery("")
                                      }}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800/50 hover:bg-neutral-700 border border-neutral-700/50 rounded-full transition-colors cursor-pointer"
                                    >
                                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                                        <Image src={`https://picsum.photos/seed/${t.ticker}/16/16`} alt={t.ticker} width={16} height={16} referrerPolicy="no-referrer" />
                                      </div>
                                      <span className="font-medium text-white text-xs">{t.ticker}</span>
                                    </button>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Staking Period */}
                      <div>
                        <span className="text-xs text-neutral-400 block mb-3">Staking period</span>
                        <div className="flex items-center gap-4">
                          {periods.map((p) => (
                            <label key={p.label} className="flex items-center gap-2 cursor-pointer group" onClick={() => setPeriod(p.label)}>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${period === p.label ? 'border-white' : 'border-neutral-600 group-hover:border-neutral-400'}`}>
                                {period === p.label && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className={`text-xs transition-colors ${period === p.label ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'}`}>{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Rewards Box */}
                      <div className="border border-neutral-800/60 rounded-lg p-4 bg-[#161616]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-neutral-400">Rewards</span>
                          <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded">APY {apy}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-2xl font-medium text-white mb-1">
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                            <Image src="https://e.radikal.host/2026/03/02/ra75624ed5431b13a5.jpg" alt="RA" width={24} height={24} referrerPolicy="no-referrer" className="object-cover w-full h-full" />
                          </div>
                          {rewardAmount} <span className="text-base text-neutral-400">RA</span>
                        </div>
                        <span className="text-[10px] text-neutral-500">${rewardUsd}</span>
                      </div>

                      {/* Action */}
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={handleClose}
                          className="flex-1 py-2 px-3 bg-transparent hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        {!isConnected ? (
                          <button
                            onClick={() => setIsConnectModalOpen(true)}
                            className="flex-1 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Connect Wallet
                          </button>
                        ) : (
                          <button
                            onClick={handleStake}
                            disabled={!amount || Number(amount) <= 0}
                            className="flex-1 py-2 px-3 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Confirm Stake
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-8 py-2"
                    >
                      <p className="text-xs text-neutral-400 leading-relaxed text-center px-4">
                        Note: Here&apos;s how the process works. At the end of the period, you will receive RA tokens by claiming the tokens you staked!
                      </p>

                      {/* Visual Circles */}
                      <div className="flex items-center justify-center py-6">
                        <div className="flex items-center">
                          <motion.span 
                            animate={{ 
                              opacity: progressIndex >= progressSteps.length - 1 ? 0 : 1,
                              x: progressIndex >= progressSteps.length - 1 ? 14 : 0
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="text-neutral-400 mr-4 text-sm font-medium"
                          >
                            {currentToken.ticker}
                          </motion.span>
                          <div className="relative flex items-center justify-center">
                            <motion.div 
                              animate={
                                progressIndex >= progressSteps.length - 1
                                  ? { x: 14, scale: 0, opacity: 0 }
                                  : progressIndex > 0 
                                    ? { x: -10 } 
                                    : { x: 0 }
                              }
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="w-14 h-14 rounded-full border border-neutral-500 flex items-center justify-center bg-[#111111] z-0 overflow-hidden relative"
                            >
                              <Image src={`https://picsum.photos/seed/${currentToken.ticker}/56/56`} alt={currentToken.ticker} width={56} height={56} referrerPolicy="no-referrer" />
                            </motion.div>
                            <motion.div 
                              animate={
                                progressIndex >= progressSteps.length - 1
                                  ? { x: -14, scale: 1.1, zIndex: 20 }
                                  : progressIndex > 0 
                                    ? { x: 10 } 
                                    : { x: 0 }
                              }
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="w-14 h-14 rounded-full border border-neutral-500 flex items-center justify-center bg-[#111111] z-10 -ml-7 overflow-hidden relative"
                            >
                              <Image src="https://e.radikal.host/2026/03/02/ra75624ed5431b13a5.jpg" alt="RA" width={56} height={56} referrerPolicy="no-referrer" className="object-cover w-full h-full" />
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: progressIndex >= progressSteps.length - 1 ? 1 : 0 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="absolute inset-0 bg-green-500/20 mix-blend-overlay"
                              />
                            </motion.div>
                          </div>
                          <motion.span 
                            animate={{ 
                              x: progressIndex >= progressSteps.length - 1 ? -14 : 0,
                              color: progressIndex >= progressSteps.length - 1 ? "#22c55e" : "#a3a3a3"
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="text-neutral-400 ml-4 text-sm font-medium"
                          >
                            RA
                          </motion.span>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="relative px-2">
                        <div className="absolute top-3 left-6 right-6 h-[1px] bg-neutral-800" />
                        <div 
                          className="absolute top-3 left-6 h-[1px] bg-white transition-all duration-500 ease-in-out" 
                          style={{ width: `calc(${Math.min(progressIndex, progressSteps.length - 1) / (progressSteps.length - 1) * 100}% - ${Math.min(progressIndex, progressSteps.length - 1) / (progressSteps.length - 1) * 3}rem)` }}
                        />
                        
                        <div className="relative flex justify-between">
                          {progressSteps.map((step, idx) => {
                            const isActive = idx === progressIndex
                            const isCompleted = idx < progressIndex
                            const Icon = step.icon
                            
                            return (
                              <div key={step.name} className="flex flex-col items-center gap-2 z-10">
                                <div className="text-[9px] text-neutral-500 mb-1 absolute -top-5 whitespace-nowrap">
                                  {step.name}
                                </div>
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                                    isActive ? 'border border-white text-white bg-[#111111]' : 
                                    isCompleted ? 'border border-white bg-white text-black' : 
                                    'border border-neutral-800 text-neutral-600 bg-[#111111]'
                                  }`}
                                >
                                  {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-6">
                        {progressIndex >= progressSteps.length ? (
                          <a
                            href="https://solscan.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleClose}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            Completed (View Txn)
                          </a>
                        ) : (
                          <button
                            disabled={true}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Processing...
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
          <ConnectModal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} />
        </>
      )}
    </AnimatePresence>
  )
}
