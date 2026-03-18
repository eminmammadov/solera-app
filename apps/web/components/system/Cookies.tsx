"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Cookie } from "lucide-react"

/**
 * Represents the structure of the cookie consent data stored in localStorage.
 */
interface CookieConsentData {
  /** The user's decision regarding cookies. */
  status: "accepted" | "rejected"
  /** The timestamp (in milliseconds) when this consent expires. */
  expiry: number
  /** The timestamp (in milliseconds) when this consent was given. */
  timestamp: number
}

/**
 * Centralized static text content for the Cookies component.
 */
const COOKIE_TEXT = {
  title: "Optimize your experience",
  description: "Cookies help us deliver real-time market data and secure your session.",
  rejectBtn: "Reject",
  acceptBtn: "Accept all"
} as const

/**
 * A persistent cookie consent banner component.
 * 
 * This component displays a fixed banner at the bottom of the screen to request user consent for cookies.
 * It uses `localStorage` to remember the user's choice for 48 hours to prevent repeatedly asking for consent.
 * 
 * Features:
 * - Next.js 15 compatible (safe SSR hydration handling).
 * - Animated entrance/exit using `framer-motion`.
 * - Auto-cleanup of expired consent records logic on load.
 * 
 * @returns {JSX.Element | null} The rendered component, or null during SSR to avoid hydration mismatch.
 */
export function Cookies() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkCookieConsent = () => {
      try {
        const storedConsent = localStorage.getItem("solera-cookie-consent")
        if (storedConsent) {
          const parsed = JSON.parse(storedConsent)
          const now = new Date().getTime()
          // Check if 48 hours have passed (48 * 60 * 60 * 1000 = 172,800,000 ms)
          if (now < parsed.expiry) {
            setIsVisible(false) // User already consented within 48h
            return
          } else {
             // Expiry passed, clean up old storage
             localStorage.removeItem("solera-cookie-consent")
          }
        }
        
        // No valid consent found, show the banner
        // Short delay for visual smoothness when first opening site
        const timer = setTimeout(() => {
          setIsVisible(true)
        }, 800)
        return () => clearTimeout(timer)
      } catch {
        setIsVisible(true) // Show by default on error
      }
    }

    checkCookieConsent()
  }, []) // Run only once on mount

  /**
   * Handles the user's action when they interact with the consent banner.
   * This saves the decision to local storage and hides the banner.
   * 
   * @param {"accepted" | "rejected"} decision - The user's choice to either accept or reject the cookie policy.
   */
  const handleConsentDecision = (decision: "accepted" | "rejected") => {
    setIsVisible(false)
    try {
      const expiryTime = new Date().getTime() + 48 * 60 * 60 * 1000 // 48 Hours in milliseconds
      
      const consentData: CookieConsentData = {
         status: decision,
         expiry: expiryTime,
         timestamp: new Date().getTime()
      }

      localStorage.setItem("solera-cookie-consent", JSON.stringify(consentData))

      // In a real prod app, push decision to analytics manager here.
      // e.g. window.dataLayer.push({ event: 'cookie_consent_update', consent_status: decision });
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.).
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
           initial={{ y: 100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: 100, opacity: 0 }}
           transition={{ type: "spring", bounce: 0, duration: 0.6 }}
           className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-4xl"
        >
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-full p-1.5 sm:pr-1.5 sm:pl-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-row items-center gap-2 sm:gap-4 md:gap-5 w-full mx-auto relative overflow-hidden group">
            
            {/* Ambient Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-transparent top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            
            <div className="items-center justify-center w-8 h-8 rounded-full bg-[#111111] border border-neutral-800 shrink-0 hidden md:flex z-10">
              <Cookie className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors duration-500" />
            </div>
            
            <div className="flex-1 py-1.5 pl-3 sm:pl-0 z-10 flex flex-col justify-center min-w-0">
              <h3 className="text-white font-medium text-[11px] sm:text-[13px] leading-tight flex items-center gap-1.5 truncate">
                 {COOKIE_TEXT.title}
              </h3>
              <p className="text-neutral-500 text-[10px] sm:text-[11px] mt-0.5 truncate sm:text-wrap leading-tight">
                {COOKIE_TEXT.description}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0 z-10">
              <button 
                onClick={() => handleConsentDecision("rejected")}
                className="px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-medium text-neutral-300 bg-[#111111] border border-neutral-800 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
              >
                {COOKIE_TEXT.rejectBtn}
              </button>
              <button 
                onClick={() => handleConsentDecision("accepted")}
                className="px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-bold text-black bg-white hover:bg-neutral-200 transition-colors cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {COOKIE_TEXT.acceptBtn}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
