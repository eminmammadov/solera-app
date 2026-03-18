"use client"

import { Wallet, ArrowUpRight, Coins, Copy, Check, LogOut, ArrowRightLeft } from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react"
import { useShallow } from "zustand/react/shallow"
import { useSolanaPortfolio } from "@/hooks/use-solana-portfolio"
import { useWallet } from "@/store/wallet/use-wallet"
import { useUserData } from "@/store/profile/use-user-data"
import { useMarketData } from "@/store/market/use-market-data"
import { ConvertModal } from "@/components/modals/ConvertModal"
import { clearWalletSignatureSession } from "@/lib/wallet/wallet-signature-session"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { useRuntimeSolanaNetwork } from "@/hooks/use-runtime-solana-network"
import {
  buildTrackedPortfolioTokens,
  type TrackedPortfolioToken,
} from "@/lib/portfolio/tracked-portfolio"
import {
  resolveRaLogoUrl,
  resolveRaMintForNetwork,
  resolveRaName,
  resolveRaSymbol,
} from "@/lib/ra/ra-runtime"

/**
 * Centralized static text content for the ProfileOverview component.
 */
const PROFILE_TEXT = {
  addressFallback: "Not connected",
  connectedWallet: "Connected Wallet",
  copyAddressTitle: "Copy Address",
  convertBtn: "Convert",
  convertTitle: "Convert small balances",
  totalPortfolioValue: "Total Portfolio Value",
  disconnectTitle: "Disconnect",
  availableBalance: "Available Balance",
  stakedBalance: "Staked Balance",
} as const

export function ProfileOverview() {
  const [copied, setCopied] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const router = useRouter()
  const { disconnect, walletAddress } = useWallet()
  const {
    disconnect: disconnectAdapter,
    connected: adapterConnected,
    publicKey,
  } = useAdapterWallet()
  const {
    availableBalance,
    stakedBalance,
    isProfileLoading,
    isProfileLoaded,
    profileError,
    portfolio,
    profileUpdatedAt,
  } = useUserData(
    useShallow((state) => ({
      availableBalance: state.availableBalance,
      stakedBalance: state.stakedBalance,
      isProfileLoading: state.isProfileLoading,
      isProfileLoaded: state.isProfileLoaded,
      profileError: state.profileError,
      portfolio: state.portfolio,
      profileUpdatedAt: state.profileUpdatedAt,
    })),
  )
  const {
    tokens: listedTokens,
    liveRaPrice,
    liveRaPriceChange,
    hasFetchedTokens,
    isLoadingTokens,
  } = useMarketData()
  const {
    portfolio: chainPortfolio,
    isLoading: isWalletPortfolioLoading,
    updatedAt: chainPortfolioUpdatedAt,
  } =
    useSolanaPortfolio()
  const { settings: raRuntime } = useRaRuntimeSettings()
  const { runtimeNetwork } = useRuntimeSolanaNetwork()

  const resolvedWalletAddress = walletAddress ?? publicKey?.toBase58() ?? null
  const raSymbol = resolveRaSymbol(raRuntime)
  const raName = resolveRaName(raRuntime)
  const address = resolvedWalletAddress
    ? `${resolvedWalletAddress.slice(0, 4)}...${resolvedWalletAddress.slice(-4)}`
    : PROFILE_TEXT.addressFallback
  const isProfileDataLoading =
    isProfileLoading || (!isProfileLoaded && !profileError)
  const trackedPortfolioTokens = useMemo(
    () =>
      buildTrackedPortfolioTokens({
        listedTokens,
        chainPortfolio,
        profilePortfolio: portfolio,
        liveRaPrice,
        liveRaPriceChange,
        preferProfileAmounts: profileUpdatedAt >= chainPortfolioUpdatedAt,
        raMintAddress: resolveRaMintForNetwork(raRuntime, runtimeNetwork),
        raLogoUrl: resolveRaLogoUrl(raRuntime),
        raSymbol,
        raName,
      }),
    [
      chainPortfolio,
      chainPortfolioUpdatedAt,
      listedTokens,
      liveRaPrice,
      liveRaPriceChange,
      portfolio,
      profileUpdatedAt,
      raName,
      raRuntime,
      raSymbol,
      runtimeNetwork,
    ],
  )
  const safeTrackedPortfolioTokens = useMemo<TrackedPortfolioToken[]>(
    () =>
      trackedPortfolioTokens.filter(
        (token): token is TrackedPortfolioToken => token !== null,
      ),
    [trackedPortfolioTokens],
  )
  const hasPendingPortfolioPricing = safeTrackedPortfolioTokens.some(
    (token) => token.amount > 0 && token.priceUsd <= 0,
  )
  const isPortfolioMetricsLoading =
    isProfileDataLoading ||
    !hasFetchedTokens ||
    isLoadingTokens ||
    isWalletPortfolioLoading ||
    hasPendingPortfolioPricing
  const isAddressLoading =
    isProfileDataLoading || (adapterConnected && !resolvedWalletAddress)

  const { calculatedPortfolioValue, calculatedPortfolioChange } = useMemo(() => {
    if (safeTrackedPortfolioTokens.length === 0) {
      return { calculatedPortfolioValue: 0, calculatedPortfolioChange: 0 }
    }

    const merged = safeTrackedPortfolioTokens.map((token) => ({
      usdValue: token.amount * token.priceUsd,
      change24h: token.change24h,
    }))

    const totalValue = merged.reduce((sum, item) => sum + item.usdValue, 0)
    const weightedChange =
      totalValue > 0
        ? merged.reduce((sum, item) => sum + (item.usdValue / totalValue) * item.change24h, 0)
        : 0

    return {
      calculatedPortfolioValue: totalValue,
      calculatedPortfolioChange: weightedChange,
    }
  }, [safeTrackedPortfolioTokens])

  const handleCopy = () => {
    if (!resolvedWalletAddress) return

    navigator.clipboard.writeText(resolvedWalletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    if (resolvedWalletAddress) {
      clearWalletSignatureSession(resolvedWalletAddress)
    }

    try {
      await disconnectAdapter()
    } catch {
      // Store state reset below keeps UI consistent even if adapter disconnect fails.
    }
    disconnect()
    router.push("/")
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full">
        {/* User Info & Total Value */}
        <div className="flex-1 rounded-xl border border-neutral-800 bg-[#111111] p-4 sm:p-6 flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-neutral-800 shrink-0">
                <Image src="/images/avatar.png" alt="Avatar" width={64} height={64} className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center gap-2 min-h-[28px]">
                  {isAddressLoading ? (
                    <>
                      <span className="block h-7 w-36 rounded bg-neutral-800 animate-pulse sm:w-44" />
                      <span className="h-4 w-4 rounded bg-neutral-800 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-white">{address}</h2>
                      <button
                        onClick={handleCopy}
                        disabled={!resolvedWalletAddress}
                        className="text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        title={PROFILE_TEXT.copyAddressTitle}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
                <p className="text-sm text-neutral-400">{PROFILE_TEXT.connectedWallet}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsConvertModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-500 hover:bg-green-500/20 transition-colors cursor-pointer border border-green-500/20"
              title={PROFILE_TEXT.convertTitle}
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{PROFILE_TEXT.convertBtn}</span>
            </button>
          </div>
          <div>
            <p className="text-sm text-neutral-400 mb-1">{PROFILE_TEXT.totalPortfolioValue}</p>
            <div className="flex items-baseline gap-2">
              {isPortfolioMetricsLoading ? (
                <>
                  <span className="h-9 w-52 rounded bg-neutral-800 animate-pulse" />
                  <span className="h-5 w-20 rounded bg-neutral-800 animate-pulse" />
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-white">
                    $
                    {calculatedPortfolioValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h3>
                  <span
                    className={`text-sm font-medium flex items-center ${
                      calculatedPortfolioChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-0.5" />
                    {calculatedPortfolioChange > 0 ? "+" : ""}
                    {calculatedPortfolioChange.toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 p-2 rounded-full bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
            title={PROFILE_TEXT.disconnectTitle}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Balances */}
        <div className="flex flex-row gap-2">
          <div className="flex-1 rounded-xl border border-neutral-800 bg-[#111111] p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-neutral-400 truncate">{PROFILE_TEXT.availableBalance}</p>
              {isProfileDataLoading ? (
                <span className="mt-1 block h-6 w-28 rounded bg-neutral-800 animate-pulse" />
              ) : (
                <p className="text-sm sm:text-lg font-bold text-white truncate">
                  {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                  {raSymbol}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex-1 rounded-xl border border-neutral-800 bg-[#111111] p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-neutral-400 truncate">{PROFILE_TEXT.stakedBalance}</p>
              {isProfileDataLoading ? (
                <span className="mt-1 block h-6 w-28 rounded bg-neutral-800 animate-pulse" />
              ) : (
                <p className="text-sm sm:text-lg font-bold text-white truncate">
                  {stakedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                  {raSymbol}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ConvertModal 
        isOpen={isConvertModalOpen} 
        onClose={() => setIsConvertModalOpen(false)} 
      />
    </>
  )
}
