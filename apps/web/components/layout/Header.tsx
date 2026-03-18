"use client"

import { useEffect, useMemo, useState } from "react"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useStakeModal } from "@/store/ui/use-stake-modal"
import { useWallet } from "@/store/wallet/use-wallet"
import { useUserData } from "@/store/profile/use-user-data"
import { useMarketData } from "@/store/market/use-market-data"
import { notifyWarning } from "@/lib/ui/ui-feedback"
import { ConnectModal } from "@/components/modals/ConnectModal"
import {
  fetchPublicHeaderBranding,
  getCachedPublicHeaderBranding,
} from "@/lib/public/system-public"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import {
  DEFAULT_HEADER_BRANDING,
  type HeaderBranding,
} from "@/lib/header/header-branding"
import { resolveRaSymbol } from "@/lib/ra/ra-runtime"

let hasShownHeaderFallbackNotice = false

const HEADER_TEXT = {
  btnConnect: "Connect",
  btnConnectDisabled: "Connect Disabled",
  mobileMenuTitle: "Menu",
  altTexts: {
    logo: "Project Logo",
    networkLogo: "Solana Logo",
    avatar: "Avatar",
  },
} as const

const isActiveNavLink = (pathname: string, href: string): boolean => {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/"
  const normalizedHref = href.replace(/\/+$/, "") || "/"

  if (normalizedHref === "/") {
    return normalizedPathname === "/"
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  )
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const cachedBranding = getCachedPublicHeaderBranding()
  const [branding, setBranding] = useState<HeaderBranding>(
    cachedBranding ?? DEFAULT_HEADER_BRANDING,
  )
  const [isBrandingLoading, setIsBrandingLoading] = useState(() => !cachedBranding)
  const { openModal } = useStakeModal()
  const { isConnected } = useWallet()
  const { settings: raRuntime } = useRaRuntimeSettings()
  const { activeStakings, availableBalance, isProfileLoading, isProfileLoaded } =
    useUserData()
  const { tokens } = useMarketData()
  const pathname = usePathname()
  const raSymbol = resolveRaSymbol(raRuntime)
  const isUserDataLoading = isConnected && (isProfileLoading || !isProfileLoaded)
  const isProfilePage = isActiveNavLink(pathname, "/profile")

  useEffect(() => {
    let cancelled = false
    let focusTimeoutId: number | null = null
    const initialCachedBranding = getCachedPublicHeaderBranding()

    const loadBranding = async (force = false) => {
      const cached = getCachedPublicHeaderBranding()

      if (!force && cached) {
        if (!cancelled) {
          setBranding(cached)
          setIsBrandingLoading(false)
        }
        return
      }

      if (!cancelled) {
        setIsBrandingLoading(!cached)
      }

      try {
        const nextBranding = await fetchPublicHeaderBranding(force)
        hasShownHeaderFallbackNotice = false

        if (!cancelled) {
          setBranding(nextBranding)
        }
      } catch {
        if (!cancelled && !cached) {
          setBranding((prev) => ({
            ...prev,
            connectEnabled: false,
          }))
        }
        if (!cancelled && !cached && !hasShownHeaderFallbackNotice) {
          notifyWarning({
            title: "Header settings unavailable",
            description: "Default header branding is in use until API is reachable.",
            dedupeKey: "header:settings-unavailable",
            dedupeMs: 30_000,
          })
          hasShownHeaderFallbackNotice = true
        }
      } finally {
        if (!cancelled) {
          setIsBrandingLoading(false)
        }
      }
    }

    if (initialCachedBranding) {
      setBranding(initialCachedBranding)
      setIsBrandingLoading(false)
    }

    void loadBranding()

    const handleWindowFocus = () => {
      if (focusTimeoutId) {
        window.clearTimeout(focusTimeoutId)
      }
      focusTimeoutId = window.setTimeout(() => {
        void loadBranding(true)
      }, 120)
    }

    window.addEventListener("focus", handleWindowFocus)

    return () => {
      cancelled = true
      if (focusTimeoutId) {
        window.clearTimeout(focusTimeoutId)
      }
      window.removeEventListener("focus", handleWindowFocus)
    }
  }, [])

  const networkTextTone =
    branding.network === "mainnet" ? "text-emerald-400" : "text-sky-400"
  const latestStakeableToken = useMemo(() => {
    const stakeable = tokens.filter(
      (candidate) => candidate.ticker.toLowerCase() !== "ra",
    )
    if (stakeable.length === 0) return null
    return [...stakeable].sort((a, b) => {
      const aTime = Number.isFinite(new Date(a.publishedAt).getTime())
        ? new Date(a.publishedAt).getTime()
        : 0
      const bTime = Number.isFinite(new Date(b.publishedAt).getTime())
        ? new Date(b.publishedAt).getTime()
        : 0
      return bTime - aTime
    })[0]
  }, [tokens])

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
              <Image
                src={branding.logoUrl}
                alt={HEADER_TEXT.altTexts.logo}
                width={32}
                height={32}
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold leading-none text-white">
                {branding.projectName}
              </span>
              {isBrandingLoading ? (
                <span className="mt-1 h-2.5 w-32 rounded bg-neutral-800 animate-pulse" />
              ) : branding.description ? (
                <span className="text-[10px] text-neutral-500">
                  {branding.description}
                </span>
              ) : null}
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-[#111111] border border-neutral-800 px-2 py-1">
              <div className="flex h-4 w-4 items-center justify-center rounded-full overflow-hidden shrink-0">
                <Image
                  src="/images/solana-logo.png"
                  alt={HEADER_TEXT.altTexts.networkLogo}
                  width={16}
                  height={16}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className={`text-[10px] font-medium ${networkTextTone}`}>
                {branding.network}
              </span>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-6 ml-8">
            {branding.navLinks.map((link) => {
              const isActive = isActiveNavLink(pathname, link.href)

              return (
                <Link
                  key={`${link.name}-${link.href}`}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-2">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2 rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5">
                {isUserDataLoading ? (
                  <span className="h-5 w-4 rounded bg-neutral-800 animate-pulse" />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {activeStakings.length}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (!latestStakeableToken) {
                      notifyWarning({
                        title: "Token Unavailable",
                        description: "No stakeable token is currently listed.",
                        dedupeKey: "header:latest-token-unavailable",
                        dedupeMs: 6_000,
                      })
                      return
                    }
                    openModal(latestStakeableToken)
                  }}
                  className="flex items-center justify-center rounded-full bg-green-500/20 h-5 w-5 text-green-500 hover:bg-green-500/30 transition-colors cursor-pointer"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[#111111] border border-neutral-800 px-3 py-1.5">
                {isUserDataLoading ? (
                  <span className="h-5 w-20 rounded bg-neutral-800 animate-pulse" />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {availableBalance.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {raSymbol}
                  </span>
                )}
              </div>
              <Link
                href="/profile"
                className={`h-8 w-8 rounded-full overflow-hidden shrink-0 cursor-pointer transition-colors ${
                  isProfilePage
                    ? "border-2 border-white"
                    : "border border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <Image
                  src="/images/avatar.png"
                  alt={HEADER_TEXT.altTexts.avatar}
                  width={32}
                  height={32}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </Link>
            </>
          ) : isBrandingLoading ? (
            <button
              type="button"
              disabled
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-black"
              aria-label={HEADER_TEXT.btnConnect}
            >
              <span className="inline-block h-3.5 w-14 rounded bg-black/20 animate-pulse align-middle" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (branding.connectEnabled) {
                  setIsConnectModalOpen(true)
                }
              }}
              disabled={!branding.connectEnabled}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                branding.connectEnabled
                  ? "bg-white text-black hover:bg-neutral-200 cursor-pointer"
                  : "bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed"
              }`}
            >
              {branding.connectEnabled
                ? HEADER_TEXT.btnConnect
                : HEADER_TEXT.btnConnectDisabled}
            </button>
          )}
        </div>
      </header>

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative w-64 max-w-[80vw] bg-[#111111] border-r border-neutral-800 h-full flex flex-col z-50 shadow-2xl"
            >
              <div className="p-4 border-b border-neutral-800/50 flex items-center justify-between">
                <span className="font-semibold text-white">
                  {HEADER_TEXT.mobileMenuTitle}
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 p-1 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-2">
                <ul className="flex flex-col gap-1 px-2">
                  {branding.navLinks.map((item) => {
                    const isActive = isActiveNavLink(pathname, item.href)

                    return (
                      <li key={`${item.name}-${item.href}`}>
                        <Link
                          href={item.href}
                          className={`flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                            isActive
                              ? "text-white bg-neutral-800/60"
                              : "text-neutral-300 hover:text-white hover:bg-neutral-800/50"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              <div className="p-4 border-t border-neutral-800/50 flex items-center gap-4">
                <Link
                  href="https://x.com/SOLERAwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.827H5.078z" />
                  </svg>
                </Link>
                <Link
                  href="https://t.me/SOLERAwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.662 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
