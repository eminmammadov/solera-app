"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Loader2 } from "lucide-react"
import { useWallet } from "@/store/use-wallet"

interface ConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

const wallets = [
  {
    name: "Phantom",
    color: "bg-[#AB9FF2]"
  },
  {
    name: "Solflare",
    color: "bg-[#FC7A22]"
  }
]

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connect } = useWallet()
  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  const handleConnect = (walletName: string) => {
    setIsConnecting(walletName)
    // Simulate connection delay
    setTimeout(() => {
      connect("8x...3f")
      setIsConnecting(null)
      onClose()
    }, 1500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isConnecting ? undefined : onClose}
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
                <h2 className="text-base font-medium text-white">Connect Wallet</h2>
                {!isConnecting && (
                  <button
                    onClick={onClose}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet.name)}
                    disabled={isConnecting !== null}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-[#161616] hover:bg-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${wallet.color} flex items-center justify-center overflow-hidden shrink-0`}>
                        <span className="text-white font-bold text-sm">{wallet.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-white">{wallet.name}</span>
                    </div>
                    {isConnecting === wallet.name ? (
                      <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium text-neutral-500 group-hover:text-white transition-colors">Detected</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
