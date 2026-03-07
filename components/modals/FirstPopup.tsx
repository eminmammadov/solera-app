"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import Image from "next/image"

const SLIDES = [
  {
    title: "Welcome to RA Staking",
    description: "The premier MEME coin staking platform. Stake your favorite tokens and earn rewards effortlessly."
  },
  {
    title: "Secure & Transparent",
    description: "Our smart contracts are fully audited. Enjoy peace of mind while your assets generate passive income."
  },
  {
    title: "Start Earning Today",
    description: "Connect your wallet, choose your preferred pool, and start generating passive income with your MEME coins."
  }
]

export function FirstPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const checkPopupStatus = () => {
      const lastClosed = localStorage.getItem("ra_staking_popup_closed")
      if (!lastClosed) {
        setIsOpen(true)
        return
      }

      const closedTime = parseInt(lastClosed, 10)
      const now = new Date().getTime()
      const hoursPassed = (now - closedTime) / (1000 * 60 * 60)

      if (hoursPassed >= 12) {
        setIsOpen(true)
      }
    }

    // Small delay for smooth entry
    const timer = setTimeout(checkPopupStatus, 800)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem("ra_staking_popup_closed", new Date().getTime().toString())
  }

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className="relative w-full max-w-[320px] overflow-hidden rounded-xl shadow-2xl border border-neutral-800 bg-[#111111]"
            style={{
              aspectRatio: "3/4"
            }}
          >
            {/* Pixelated background effect (simulated with radial gradients and blocks) */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 blur-2xl rounded-full" />
              <div className="absolute top-1/4 left-10 w-24 h-24 bg-neutral-500/5 blur-xl rounded-full" />
              <div className="absolute bottom-1/3 right-20 w-40 h-40 bg-white/5 blur-2xl rounded-full" />
              
              {/* Pixel blocks */}
              <div className="absolute top-12 right-12 w-8 h-8 bg-white/5" />
              <div className="absolute top-20 right-20 w-8 h-8 bg-white/5" />
              <div className="absolute top-16 right-28 w-8 h-8 bg-neutral-500/5" />
              <div className="absolute top-32 right-16 w-8 h-8 bg-white/5" />
              
              <div className="absolute top-1/3 left-12 w-8 h-8 bg-neutral-500/5" />
              <div className="absolute top-[40%] left-20 w-8 h-8 bg-white/5" />
              <div className="absolute top-[45%] left-12 w-8 h-8 bg-white/5" />
            </div>

            {/* Grid Background Overlay */}
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                backgroundPosition: 'center center'
              }}
            />

            {/* Content Container */}
            <div className="relative flex h-full flex-col items-center justify-end pb-8 px-6 text-center">
              
              {/* Logo/Icon */}
              <div className="mb-5 relative">
                <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-neutral-800 bg-[#111111] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
                  <Image 
                    src="https://e.radikal.host/2026/03/02/ra-white.jpg" 
                    alt="Logo" 
                    width={50} 
                    height={50} 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              {/* Slides */}
              <div className="relative w-full h-[120px] flex flex-col items-center justify-start">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col items-center"
                  >
                    <h2 className="mb-3 text-lg font-medium text-white tracking-tight">
                      {SLIDES[currentSlide].title}
                    </h2>
                    <p className="text-xs text-neutral-400 leading-relaxed max-w-[260px]">
                      {SLIDES[currentSlide].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation & Close */}
              <div className="mt-4 flex flex-col items-center gap-6 w-full">
                {/* Dots */}
                <div className="flex items-center gap-2">
                  {SLIDES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        currentSlide === index 
                          ? "w-4 bg-white" 
                          : "w-1.5 bg-neutral-700 hover:bg-neutral-500"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Action Area */}
                <div className="h-8 w-full flex items-center justify-center mt-2">
                  <AnimatePresence mode="wait">
                    {currentSlide === SLIDES.length - 1 ? (
                      <motion.button
                        key="close"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={handleClose}
                        className="flex w-full max-w-[160px] items-center justify-center rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200 cursor-pointer"
                      >
                        Get Started
                      </motion.button>
                    ) : (
                      <motion.button
                        key="next"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={nextSlide}
                        className="flex w-full max-w-[160px] items-center justify-center rounded-full bg-neutral-800 border border-neutral-700 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 cursor-pointer"
                      >
                        Next
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
