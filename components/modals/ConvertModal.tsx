"use client"

import { X, ArrowRightLeft } from "lucide-react"
import Image from "next/image"
import { useUserData } from "@/store/use-user-data"
import { motion, AnimatePresence } from "motion/react"

interface ConvertModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConvertModal({ isOpen, onClose }: ConvertModalProps) {
  const { portfolio, convertSmallBalances } = useUserData()

  // Find tokens with value < $1.00 (excluding RA)
  const smallBalances = portfolio.filter(t => t.id !== 'ra' && t.amount > 0 && (t.amount * t.priceUsd) < 1.00)
  const totalUsdValue = smallBalances.reduce((sum, t) => sum + (t.amount * t.priceUsd), 0)
  
  const raToken = portfolio.find(t => t.id === 'ra')
  const raPrice = raToken?.priceUsd || 0.10
  const expectedRaGained = totalUsdValue / raPrice

  const handleConvert = () => {
    convertSmallBalances()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[360px] shadow-2xl pointer-events-auto relative flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-medium text-white tracking-tight">Convert Small Balances</h2>
                <button 
                  onClick={onClose}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-500 mb-4 px-1 leading-relaxed">
                Convert balances under $1.00 to RA token instantly. No hidden fees.
              </p>
              
              <div className="max-h-[240px] overflow-y-auto pr-1 -mr-1 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:rounded-full mb-4">
                {smallBalances.length > 0 ? (
                  smallBalances.map((token) => (
                    <div 
                      key={token.id} 
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl hover:bg-neutral-800/30 transition-colors border border-transparent hover:border-neutral-800/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 bg-neutral-900 border border-neutral-800">
                          <Image 
                            src={token.logoUrl} 
                            alt={token.name} 
                            width={32} 
                            height={32} 
                            className="object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white leading-tight">{token.ticker}</span>
                          <span className="text-[11px] text-neutral-500 leading-tight">
                            {token.amount.toLocaleString(undefined, { maximumSignificantDigits: 4 })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-white leading-tight">
                          ${(token.amount * token.priceUsd).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    No small balances found.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5 mb-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Total Value</span>
                  <span className="text-xs font-medium text-white">${totalUsdValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">You will receive</span>
                  <span className="text-sm font-bold text-emerald-400">~{expectedRaGained.toFixed(2)} RA</span>
                </div>
              </div>

              <button
                onClick={handleConvert}
                disabled={smallBalances.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 px-3 text-xs font-medium text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Convert to RA
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
