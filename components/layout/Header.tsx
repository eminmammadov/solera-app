"use client"

import { useState } from "react"
import { Menu, Search, ChevronDown, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { useStakeModal } from "@/store/use-stake-modal"
import { useWallet } from "@/store/use-wallet"
import { useUserData } from "@/store/use-user-data"
import { ConnectModal } from "@/components/modals/ConnectModal"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const { openModal } = useStakeModal()
  const { isConnected } = useWallet()
  const { activeStakings, availableBalance } = useUserData()

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
            <span className="text-sm font-semibold leading-none text-white">Solera Work</span>
            <span className="text-[10px] text-neutral-500">MEME coin staking platform</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#111111] border border-neutral-800 px-2 py-1">
            <div className="flex h-4 w-4 items-center justify-center rounded-full overflow-hidden shrink-0">
              <Image src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="Solana Logo" width={16} height={16} className="object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="text-[10px] font-medium text-green-500">mainnet</span>
          </div>
        </div>
        <nav className="hidden lg:flex items-center gap-6 ml-8">
          <Link href="/staking" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Staking</Link>
          <Link href="/swap" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Swap</Link>
          <Link href="/vault" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Vault</Link>
          <Link href="/Blog" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Blog</Link>
          <Link href="/docs" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Documentations</Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-2">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5">
              <span className="text-sm font-semibold text-white">{activeStakings.length}</span>
              <button 
                onClick={() => openModal({ ticker: "RA", name: "RA Token", price: 1.00 })}
                className="flex items-center justify-center rounded-full bg-green-500/20 h-5 w-5 text-green-500 hover:bg-green-500/30 transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5">
              <span className="text-sm font-semibold text-white">{availableBalance.toLocaleString()} RA</span>
            </div>
            <Link href="/profile" className="h-8 w-8 rounded-full overflow-hidden border border-neutral-800 shrink-0 cursor-pointer hover:border-neutral-600 transition-colors">
              <Image src="https://e.radikal.host/2026/03/04/avatar.png" alt="Avatar" width={32} height={32} className="object-cover" referrerPolicy="no-referrer" />
            </Link>
          </>
        ) : (
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Connect
          </button>
        )}
      </div>
    </header>

      <ConnectModal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} />

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
                  {[
                    { name: 'Staking', href: '/staking' },
                    { name: 'Swap', href: '/swap' },
                    { name: 'Vault', href: '/vault' },
                    { name: 'Blog', href: '/Blog' },
                    { name: 'Documentations', href: '/docs' }
                  ].map((item) => (
                    <li key={item.name}>
                      <Link 
                        href={item.href} 
                        className="flex items-center px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.name}
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
