"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react"

interface ClaimModalProps {
  isOpen: boolean
  onClose: () => void
  stake: any
  onClaimSuccess?: () => void
}

export function ClaimModal({ isOpen, onClose, stake, onClaimSuccess }: ClaimModalProps) {
  const [status, setStatus] = useState<"idle" | "claiming" | "success">("idle")

  const handleClose = () => {
    onClose()
    // Reset status after a short delay to allow exit animation to finish
    setTimeout(() => setStatus("idle"), 300)
  }

  const handleClaim = () => {
    setStatus("claiming")
    
    // Simulate blockchain transaction
    setTimeout(() => {
      setStatus("success")
      if (onClaimSuccess) {
        onClaimSuccess()
      }
    }, 3000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={status === "claiming" ? undefined : handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[360px] shadow-2xl pointer-events-auto relative"
            >
              {status !== "claiming" && (
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-3">
                {status === "idle" && (
                  <>
                    <div className="space-y-1.5 pr-6 px-1">
                      <h2 className="text-base font-medium text-white">Claim Rewards</h2>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        You are about to claim your earned rewards for the <span className="text-neutral-300">{stake.name}</span> pool.
                      </p>
                    </div>

                    <div className="bg-[#161616] border border-neutral-800/60 rounded-lg p-3 space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">Staked Amount</span>
                        <span className="text-neutral-300 font-medium">{stake.stakedAmount}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">Earned Rewards</span>
                        <span className="text-green-500 font-medium">{stake.earned}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2 px-3 bg-transparent hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClaim}
                        className="flex-1 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        Confirm Claim
                      </button>
                    </div>
                  </>
                )}

                {status === "claiming" && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-medium text-white">Processing</h3>
                      <p className="text-neutral-500 text-xs">Confirming transaction on chain...</p>
                    </div>
                  </div>
                )}

                {status === "success" && (
                  <div className="py-2 flex flex-col items-center space-y-5">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mt-2">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-medium text-white">Claim Successful</h3>
                      <p className="text-neutral-400 text-xs">
                        Rewards have been added to your wallet.
                      </p>
                    </div>

                    <div className="w-full flex gap-2 pt-2">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2 px-3 bg-transparent hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                      <a
                        href="https://etherscan.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        View Tx <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
