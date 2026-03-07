"use client"

import { motion, AnimatePresence } from "motion/react"
import { X, Send, RefreshCw, ArrowRightLeft, FileText, CheckCircle2 } from "lucide-react"

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

const steps = [
  {
    title: "Token Submission",
    description: "The selected tokens are submitted to the Node Swap smart contract through the staking interface.",
    icon: Send,
  },
  {
    title: "Token Conversion",
    description: "The Node Swap smart contract processes the transaction and converts the submitted tokens into RA Tokens according to the system protocol.",
    icon: RefreshCw,
  },
  {
    title: "Transfer to Staking Pool",
    description: "The converted RA Tokens are then transferred to the designated Staking Pool.",
    icon: ArrowRightLeft,
  },
  {
    title: "Order Creation",
    description: "Within the Staking Pool, a staking order is automatically generated and recorded on-chain.",
    icon: FileText,
  },
  {
    title: "Staking Completion",
    description: "The staking process is finalized, and the order remains active until the defined staking period concludes. At the end of the period, the user can claim the allocated RA Tokens.",
    icon: CheckCircle2,
  }
]

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[500px] shadow-2xl pointer-events-auto relative flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                <h2 className="text-lg font-semibold text-white">How It Works</h2>
                <button
                  onClick={onClose}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-neutral-800" />
                  
                  <div className="flex flex-col gap-6">
                    {steps.map((step, index) => {
                      const Icon = step.icon
                      return (
                        <div key={index} className="relative flex gap-4">
                          <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-[#161616] border border-neutral-700 shrink-0">
                            <Icon className="w-4 h-4 text-neutral-400" />
                          </div>
                          <div className="flex flex-col pt-2">
                            <h3 className="text-sm font-medium text-white mb-1.5">{step.title}</h3>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="mt-3 pt-3 px-1 border-t border-neutral-800 shrink-0">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
