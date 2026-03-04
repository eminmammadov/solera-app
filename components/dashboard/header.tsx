"use client"

import { useState } from "react"
import { Menu, Search, ChevronDown, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="flex h-16 items-center justify-between px-3 sm:px-4 border-b border-neutral-800/50 bg-[#0a0a0a]">
      <div className="flex items-center gap-2 sm:gap-2">
        <button 
          className="text-neutral-400 hover:text-white cursor-pointer"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-black shrink-0">
            <Image src="https://e.radikal.host/2026/03/02/ra-white.jpg" alt="RA Staking Logo" width={32} height={32} className="object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold leading-none text-white">RA Staking</span>
            <span className="text-[10px] text-neutral-500">MEME coin staking platform</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-2 ml-4">
          <div className="flex items-center rounded-full bg-[#111111] border border-neutral-800 p-1">
            <button className="rounded-full bg-neutral-800 px-2 py-1 text-xs text-white cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </button>
          </div>
          <div className="flex items-center rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5 focus-within:border-neutral-600 transition-colors">
            <Search className="h-4 w-4 text-neutral-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-transparent text-sm text-white outline-none w-32 placeholder:text-neutral-500"
            />
          </div>
        </div>
        <div className="flex md:hidden items-center ml-auto mr-2">
          <button className="text-neutral-400 hover:text-white cursor-pointer">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5">
          <span className="text-sm font-semibold text-white">5</span>
          <span className="flex items-center justify-center rounded-full bg-green-500/20 h-5 w-5 text-green-500 hover:bg-green-500/30 transition-colors cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5">
          <span className="text-sm font-semibold text-white">1,000,000RA</span>
        </div>
        <div className="h-8 w-8 rounded-full overflow-hidden border border-neutral-800 shrink-0">
          <Image src="https://e.radikal.host/2026/03/02/ra.jpg" alt="Avatar" width={32} height={32} className="object-cover" referrerPolicy="no-referrer" />
        </div>
      </div>
    </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative w-64 max-w-[80vw] bg-[#111111] border-r border-neutral-800 h-full flex flex-col z-50 shadow-2xl"
            >
              <div className="p-4 border-b border-neutral-800/50 flex items-center justify-between">
                <span className="font-semibold text-white">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 p-1 rounded-full transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-2">
                <ul className="flex flex-col gap-1 px-2">
                  {['Staking', 'Swap', 'Partners', 'News'].map((item) => (
                    <li key={item}>
                      <Link 
                        href="#" 
                        className="flex items-center px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              <div className="p-4 border-t border-neutral-800/50 flex items-center gap-4">
                <a href="https://x.com/SOLERAwork" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.827H5.078z"/></svg>
                </a>
                <a href="https://t.me/SOLERAwork" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.662 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
