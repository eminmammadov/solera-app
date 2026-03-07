"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Cookie } from "lucide-react"

export function Cookies() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleAccept = () => {
    setIsVisible(false)
  }

  const handleReject = () => {
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.6 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-4xl"
        >
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-full p-1.5 sm:pr-1.5 sm:pl-4 shadow-2xl flex items-center gap-3 sm:gap-5">
            <div className="items-center justify-center w-8 h-8 rounded-full bg-[#111111] border border-neutral-800 shrink-0 hidden md:flex">
              <Cookie className="w-3.5 h-3.5 text-white" />
            </div>
            
            <div className="flex-1 py-0.5 pl-2 sm:pl-0">
              <h3 className="text-white font-medium text-[11px] sm:text-xs leading-tight">Optimize your experience</h3>
              <p className="text-neutral-400 text-[10px] mt-0.5 line-clamp-1 sm:line-clamp-none leading-tight">Cookies help us deliver real-time market data and secure your session.</p>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={handleReject}
                className="px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-medium text-white bg-[#111111] border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Reject
              </button>
              <button 
                onClick={handleAccept}
                className="px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Accept all
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
