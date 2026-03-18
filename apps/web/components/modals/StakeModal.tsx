"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Check, ChevronDown, Wallet, Search, Send, RefreshCw, ArrowRightLeft, FileText, CheckCircle2, AlertTriangle } from "lucide-react"
import Image from "next/image"
import { VersionedTransaction } from "@solana/web3.js"
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react"
import { useShallow } from "zustand/react/shallow"
import { useStakeModal, type Token } from "@/store/ui/use-stake-modal"
import { useMarketData, type MarketToken } from "@/store/market/use-market-data"
import { useWallet } from "@/store/wallet/use-wallet"
import { useUserData } from "@/store/profile/use-user-data"
import {
  resolveRaLogoUrl,
  resolveRaMintForNetwork,
  resolveRaName,
  resolveRaSymbol,
} from "@/lib/ra/ra-runtime"
import { ModalSurface } from "@/components/modals/_shared/ModalSurface"
import { ConnectModal } from "@/components/modals/ConnectModal"
import {
  executeWalletStake,
  prepareWalletStake,
  trackUserStakePosition,
  type WalletStakeExecutionResponse,
  type WalletStakePreparationResponse,
} from "@/lib/user/user-analytics"
import { useSolanaPortfolio } from "@/hooks/use-solana-portfolio"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { useRuntimeSolanaNetwork } from "@/hooks/use-runtime-solana-network"
import { notifyError, notifyWarning } from "@/lib/ui/ui-feedback"
import {
  buildTrackedPortfolioTokens,
  type TrackedPortfolioToken,
} from "@/lib/portfolio/tracked-portfolio"

type StakePeriodLabel = "7D" | "1M" | "3M" | "6M" | "12M"

const STAKE_PERIODS: Array<{ label: StakePeriodLabel; days: number }> = [
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "12M", days: 365 },
]

const DEFAULT_APY_BY_PERIOD: Record<StakePeriodLabel, number> = {
  "7D": 0.7,
  "1M": 2.5,
  "3M": 8.0,
  "6M": 18.0,
  "12M": 40.0,
}

const getPeriodApy = (
  marketToken: MarketToken | null,
  period: StakePeriodLabel,
): number => {
  if (!marketToken) return DEFAULT_APY_BY_PERIOD[period]

  switch (period) {
    case "7D":
      return marketToken.stake7d
    case "1M":
      return marketToken.stake1m
    case "3M":
      return marketToken.stake3m
    case "6M":
      return marketToken.stake6m
    case "12M":
      return marketToken.stake12m
    default:
      return DEFAULT_APY_BY_PERIOD[period]
  }
}

const formatTokenAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })

const BALANCE_EPSILON = 1e-8

const toInputAmount = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return ""
  const floored = Math.floor(value * 1e8) / 1e8
  return floored.toString()
}

const formatUsdAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const passthroughImageLoader = ({ src }: { src: string }) => src

const isUserRejectedWalletAction = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes("rejected") ||
    message.includes("declined") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  )
}

const decodeBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const encodeBase64 = (value: Uint8Array) => {
  const chunkSize = 0x8000
  let binary = ""
  for (let index = 0; index < value.length; index += chunkSize) {
    binary += String.fromCharCode(...value.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

interface TokenAvatarProps {
  ticker: string
  icon?: string
  isImage?: boolean
  colorBg?: string | null
  className: string
  textClassName?: string
}

function TokenAvatar({
  ticker,
  icon,
  isImage,
  colorBg,
  className,
  textClassName = "text-[10px]",
}: TokenAvatarProps) {
  if (isImage && icon) {
    return (
      <div className={`${className} rounded-full overflow-hidden shrink-0 bg-neutral-800`}>
        <Image
          src={icon}
          alt={ticker}
          width={24}
          height={24}
          unoptimized
          loader={passthroughImageLoader}
          className="object-cover w-full h-full"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  return (
    <div
      className={`${className} rounded-full flex items-center justify-center overflow-hidden shrink-0 text-white uppercase font-bold ${colorBg || "bg-neutral-700"} ${textClassName}`}
    >
      {(icon && !isImage ? icon : ticker.charAt(0)).slice(0, 1)}
    </div>
  )
}
const PROGRESS_STEPS_DATA = [
  { name: "sending", icon: Send },
  { name: "swap contract", icon: RefreshCw },
  { name: "transaction", icon: ArrowRightLeft },
  { name: "stake pool", icon: FileText },
  { name: "completed", icon: CheckCircle2 }
]

type ProgressStepState = "pending" | "active" | "success" | "failed"

const makeInitialProgressStates = (): ProgressStepState[] =>
  PROGRESS_STEPS_DATA.map(() => "pending")

/**
 * Centralized static text content for StakeModal component.
 */
const STAKE_MODAL_TEXT = {
  title: "Staking",
  stakeInputLabel: "Stake",
  btnQuarter: "25%",
  btnThreeQuarter: "75%",
  btnHalf: "HALF",
  btnMax: "MAX",
  searchPlaceholder: "Search token...",
  stakingPeriodLabel: "Staking period",
  rewardsLabel: "Rewards",
  apyPrefix: "APR",
  btnCancel: "Cancel",
  btnConnect: "Connect Wallet",
  btnConfirm: "Confirm Stake",
  btnCompleted: "Completed (View Txn)",
  btnProcessing: "Processing...",
  progressSteps: PROGRESS_STEPS_DATA
} as const

interface StakeModalContentProps {
  closeModal: () => void
  token: Token
}

function StakeModalContent({ closeModal, token }: StakeModalContentProps) {
  const [step, setStep] = useState<'input' | 'processing'>('input')
  const [amount, setAmount] = useState("")
  const [period, setPeriod] = useState<StakePeriodLabel>("1M")
  const [progressIndex, setProgressIndex] = useState(0)
  const [progressStates, setProgressStates] = useState<ProgressStepState[]>(
    makeInitialProgressStates,
  )
  const [processingStatus, setProcessingStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle")
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [completedTransactionUrl, setCompletedTransactionUrl] = useState<string | null>(null)
  const [userSelectedTokenTicker, setUserSelectedTokenTicker] = useState<string | null>(null)
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const processingRunIdRef = useRef(0)
  const { isConnected, walletAddress } = useWallet()
  const {
    connected: adapterConnected,
    publicKey,
    signTransaction,
  } = useAdapterWallet()
  const { tokens, incrementStakers, hasFetchedTokens, liveRaPrice } = useMarketData()
  const { addStake, profilePortfolio } = useUserData(
    useShallow((state) => ({
      addStake: state.addStake,
      profilePortfolio: state.portfolio,
    })),
  )
  const { portfolio: walletPortfolio, isLoading: isWalletPortfolioLoading } =
    useSolanaPortfolio()
  const {
    settings: raRuntime,
    isLoading: isRaRuntimeLoading,
    error: raRuntimeError,
  } = useRaRuntimeSettings()
  const { runtimeNetwork } = useRuntimeSolanaNetwork()
  const raSymbol = resolveRaSymbol(raRuntime)
  const raName = resolveRaName(raRuntime)

  const stakeableTokens = useMemo(
    () => tokens.filter((candidate) => candidate.ticker.toLowerCase() !== "ra"),
    [tokens],
  )
  const incomingStakeableToken = useMemo(() => {
    const incomingTicker = token.ticker?.trim().toLowerCase()
    if (!incomingTicker || incomingTicker === "ra") return null
    return (
      stakeableTokens.find(
        (candidate) => candidate.ticker.toLowerCase() === incomingTicker,
      ) ?? null
    )
  }, [stakeableTokens, token.ticker])
  const latestStakeableToken = useMemo(() => {
    if (stakeableTokens.length === 0) return null
    return [...stakeableTokens].sort((a, b) => {
      const aTime = Number.isFinite(new Date(a.publishedAt).getTime())
        ? new Date(a.publishedAt).getTime()
        : 0
      const bTime = Number.isFinite(new Date(b.publishedAt).getTime())
        ? new Date(b.publishedAt).getTime()
        : 0
      return bTime - aTime
    })[0]
  }, [stakeableTokens])

  const selectedTokenTicker = useMemo(() => {
    if (!userSelectedTokenTicker) {
      if (incomingStakeableToken) return incomingStakeableToken.ticker
      return latestStakeableToken?.ticker ?? null
    }
    const exists = stakeableTokens.some(
      (candidate) =>
        candidate.ticker.toLowerCase() === userSelectedTokenTicker.toLowerCase(),
    )
    return exists
      ? userSelectedTokenTicker
      : (incomingStakeableToken?.ticker ?? latestStakeableToken?.ticker ?? null)
  }, [incomingStakeableToken, latestStakeableToken, stakeableTokens, userSelectedTokenTicker])

  const currentTokenMarket = useMemo(() => {
    if (selectedTokenTicker) {
      const selected = stakeableTokens.find(
        (candidate) =>
          candidate.ticker.toLowerCase() === selectedTokenTicker.toLowerCase(),
      )
      if (selected) return selected
    }

    return incomingStakeableToken ?? latestStakeableToken
  }, [incomingStakeableToken, latestStakeableToken, selectedTokenTicker, stakeableTokens])

  const fallbackToken =
    token.ticker.toLowerCase() !== "ra"
      ? token
      : { ticker: "--", name: "No Token", price: 0 }
  const currentToken = currentTokenMarket ?? fallbackToken
  const currentTicker = currentToken.ticker
  const hasSelectableToken = currentTicker !== "--"
  const trackedPortfolioTokens = useMemo(
    () =>
      buildTrackedPortfolioTokens({
        listedTokens: tokens,
        chainPortfolio: walletPortfolio,
        profilePortfolio,
        liveRaPrice,
        raMintAddress: resolveRaMintForNetwork(raRuntime, runtimeNetwork),
        raLogoUrl: resolveRaLogoUrl(raRuntime),
        raSymbol,
        raName,
      }),
    [liveRaPrice, profilePortfolio, raName, raRuntime, raSymbol, runtimeNetwork, tokens, walletPortfolio],
  )
  const safeTrackedPortfolioTokens = useMemo<TrackedPortfolioToken[]>(
    () =>
      trackedPortfolioTokens.filter(
        (asset): asset is TrackedPortfolioToken => asset !== null,
      ),
    [trackedPortfolioTokens],
  )
  const currentPortfolioToken = useMemo(
    () =>
      safeTrackedPortfolioTokens.find(
        (asset) => asset.ticker.toLowerCase() === currentTicker.toLowerCase(),
      ) ?? null,
    [currentTicker, safeTrackedPortfolioTokens],
  )
  const currentTokenPrice =
    (typeof currentPortfolioToken?.priceUsd === "number" &&
    Number.isFinite(currentPortfolioToken.priceUsd) &&
    currentPortfolioToken.priceUsd > 0
      ? currentPortfolioToken.priceUsd
      : undefined) ??
    (typeof currentToken.price === "number" && Number.isFinite(currentToken.price)
      ? currentToken.price
      : 0)
  const selectedPeriod = STAKE_PERIODS.find((p) => p.label === period) ?? STAKE_PERIODS[1]
  const apy = getPeriodApy(currentTokenMarket, selectedPeriod.label)
  const raTokenMarket = useMemo(() => {
    const activeRaMint = resolveRaMintForNetwork(raRuntime, runtimeNetwork).toLowerCase()
    return (
      tokens.find(
        (candidate) =>
          candidate.ticker.toLowerCase() === "ra" ||
          candidate.mintAddress?.toLowerCase() === activeRaMint,
      ) ?? null
    )
  }, [raRuntime, runtimeNetwork, tokens])
  const raTrackedToken =
    safeTrackedPortfolioTokens.find(
      (asset) =>
        asset.ticker === raSymbol ||
        asset.id.toLowerCase() ===
          resolveRaMintForNetwork(raRuntime, runtimeNetwork).toLowerCase() ||
        asset.ticker === "RA",
    ) ?? null
  const raTokenPrice =
    (typeof liveRaPrice === "number" && Number.isFinite(liveRaPrice) && liveRaPrice > 0
      ? liveRaPrice
      : undefined) ??
    (raTrackedToken?.priceUsd ?? 0)
  const raDisplayIcon = raTrackedToken?.logoUrl || resolveRaLogoUrl(raRuntime) || raTokenMarket?.icon
  const processingNote = `Note: Here's how the process works. At the end of the period, you will receive ${raSymbol} tokens by claiming the tokens you staked!`
  const parsedAmount = Number(amount)
  const normalizedAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0

  const balance = isConnected ? currentPortfolioToken?.amount ?? 0 : 0
  const isBalanceLoading =
    isConnected &&
    isWalletPortfolioLoading &&
    !currentPortfolioToken
  const hasBalance = balance > 0
  const hasInsufficientBalance = normalizedAmount > balance + BALANCE_EPSILON
  const hasPriceFeed = currentTokenPrice > 0
  const stakeMinUsd = raRuntime.stakeMinUsd
  const stakeMaxUsd = raRuntime.stakeMaxUsd
  const minStakeAmount = hasPriceFeed ? stakeMinUsd / currentTokenPrice : 0
  const maxStakeAmount = hasPriceFeed ? stakeMaxUsd / currentTokenPrice : 0
  const effectiveMaxStakeAmount = hasPriceFeed
    ? Math.min(balance, maxStakeAmount)
    : balance
  const isBelowMinimumStake =
    normalizedAmount > 0 &&
    hasPriceFeed &&
    normalizedAmount + BALANCE_EPSILON < minStakeAmount
  const isAboveMaximumStakeByUsd =
    normalizedAmount > 0 &&
    hasPriceFeed &&
    normalizedAmount > maxStakeAmount + BALANCE_EPSILON
  const isPriceUnavailableForStake = hasSelectableToken && !hasPriceFeed

  const usdValue = normalizedAmount
    ? formatUsdAmount(normalizedAmount * currentTokenPrice)
    : "0.00"
  const rewardValue = normalizedAmount * (apy / 100)
  const rewardAmount = rewardValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const rewardUsd = (rewardValue * raTokenPrice).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const balanceLabel = isBalanceLoading ? "Loading..." : formatTokenAmount(balance)
  const isRewardsLoading = !hasFetchedTokens || !currentTokenMarket
  const isProcessingRunning = processingStatus === "running"
  const isProcessingSuccess = processingStatus === "success"
  const isProcessingFailed = processingStatus === "failed"
  const completedSteps = progressStates.filter((state) => state === "success").length
  const progressLineRatio =
    STAKE_MODAL_TEXT.progressSteps.length > 1
      ? Math.min(completedSteps, STAKE_MODAL_TEXT.progressSteps.length - 1) /
        (STAKE_MODAL_TEXT.progressSteps.length - 1)
      : 0

  const markStepState = useCallback((stepIdx: number, state: ProgressStepState) => {
    setProgressStates((prev) =>
      prev.map((current, idx) => (idx === stepIdx ? state : current)),
    )
  }, [])

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })

  const pushStakeFeedback = useCallback(
    (
      variant: "error" | "warning",
      title: string,
      description: string,
      dedupeKey: string,
      dedupeMs = 5_000,
    ) => {
      if (variant === "warning") {
        notifyWarning({
          title,
          description,
          dedupeKey,
          dedupeMs,
        })
        return
      }

      notifyError({
        title,
        description,
        dedupeKey,
        dedupeMs,
      })
    },
    [],
  )

  const persistStakePosition = useCallback(async (
    preparedStake: WalletStakePreparationResponse,
    signedTransactionBase64: string,
    executedStake: WalletStakeExecutionResponse,
  ) => {
    let remoteStakeId: string | null = null
    if (walletAddress) {
      const trackedPosition = await trackUserStakePosition({
        walletAddress,
        tokenTicker: currentToken.ticker,
        tokenName: currentToken.name,
        amount: normalizedAmount,
        amountUsd: preparedStake.amountUsd,
        periodLabel: period,
        periodDays: selectedPeriod.days,
        apy: preparedStake.apy,
        rewardEstimate: preparedStake.finalRaPayout,
        prepareSessionId: preparedStake.sessionId,
        signedTransactionBase64,
        executionSignature: executedStake.signature,
        executionExplorerUrl: executedStake.explorerUrl,
      })
      remoteStakeId = trackedPosition?.id ?? null
    }

    if (!remoteStakeId) {
      throw new Error("Failed to record stake on backend.")
    }

    addStake({
      remoteId: remoteStakeId,
      ticker: currentToken.ticker,
      name: currentToken.name,
      amount: normalizedAmount,
      period: period,
      apy: preparedStake.apy,
    })

    incrementStakers(preparedStake.amountUsd)
  }, [
    addStake,
    currentToken.name,
    currentToken.ticker,
    incrementStakers,
    normalizedAmount,
    period,
    selectedPeriod.days,
    walletAddress,
  ])

  const signPreparedStakeEnvelope = useCallback(async (
    preparedStake: WalletStakePreparationResponse,
  ) => {
    if (
      preparedStake.mode !== "ONCHAIN_PREPARED" ||
      !preparedStake.transactionBase64 ||
      !signTransaction
    ) {
      throw new Error("Prepared on-chain stake transaction is unavailable.")
    }

    const transaction = VersionedTransaction.deserialize(
      decodeBase64(preparedStake.transactionBase64),
    )
    const signedTransaction = await signTransaction(transaction)
    return encodeBase64(signedTransaction.serialize())
  }, [signTransaction])

  const startProcessing = useCallback(() => {
    const runId = Date.now()
    processingRunIdRef.current = runId

    setStep("processing")
    setProcessingStatus("running")
    setProcessingError(null)
    setCompletedTransactionUrl(null)
    setProgressIndex(0)
    setProgressStates(makeInitialProgressStates())

    void (async () => {
      let currentStep = 0

      try {
        let preparedStake: WalletStakePreparationResponse | null = null
        let signedTransactionBase64: string | null = null
        let executedStake: WalletStakeExecutionResponse | null = null

        for (currentStep = 0; currentStep < STAKE_MODAL_TEXT.progressSteps.length; currentStep += 1) {
          if (processingRunIdRef.current !== runId) return

          setProgressIndex(currentStep)
          markStepState(currentStep, "active")

          if (currentStep === 0) {
            await sleep(300)
          } else if (currentStep === 1) {
            preparedStake = await prepareWalletStake({
              walletAddress: walletAddress ?? "",
              tokenTicker: currentToken.ticker,
              amount: normalizedAmount,
              periodLabel: period,
            })
            await sleep(250)
          } else if (currentStep === 2) {
            if (!preparedStake) {
              throw new Error("Stake route preparation is missing.")
            }
            if (!adapterConnected || !publicKey || !signTransaction) {
              throw new Error("Wallet signing is required to continue staking.")
            }
            signedTransactionBase64 = await signPreparedStakeEnvelope(preparedStake)
          } else if (currentStep === 3) {
            if (!preparedStake) {
              throw new Error("Stake route preparation is missing.")
            }
            if (!signedTransactionBase64) {
              throw new Error("Stake transaction was not signed.")
            }
            executedStake = await executeWalletStake({
              walletAddress: walletAddress ?? "",
              sessionId: preparedStake.sessionId,
              signedTransactionBase64,
            })
            setCompletedTransactionUrl(executedStake.explorerUrl)
          } else if (currentStep === 4) {
            if (!preparedStake || !signedTransactionBase64 || !executedStake) {
              throw new Error(
                "On-chain stake execution must complete before the position can be recorded.",
              )
            }
            await persistStakePosition(
              preparedStake,
              signedTransactionBase64,
              executedStake,
            )
            await sleep(500)
          } else {
            await sleep(300)
          }

          if (processingRunIdRef.current !== runId) return
          markStepState(currentStep, "success")
        }

        if (processingRunIdRef.current !== runId) return
        setProcessingStatus("success")
      } catch (error) {
        if (processingRunIdRef.current !== runId) return
        markStepState(currentStep, "failed")
        setProcessingStatus("failed")
        if (isUserRejectedWalletAction(error)) {
          setProcessingError("Stake signing was canceled.")
          return
        }
        setProcessingError(
          error instanceof Error
            ? error.message
            : "The process failed. Please try again.",
        )
      }
    })()
  }, [
    adapterConnected,
    currentToken.ticker,
    markStepState,
    normalizedAmount,
    period,
    persistStakePosition,
    setCompletedTransactionUrl,
    publicKey,
    signPreparedStakeEnvelope,
    signTransaction,
    walletAddress,
  ])

  useEffect(() => {
    return () => {
      processingRunIdRef.current += 1
    }
  }, [])

  const applyBalanceRatio = (ratio: number) => {
    const normalizedRatio = Math.min(Math.max(ratio, 0), 1)
    if (normalizedRatio <= 0) return

    if (!isConnected) {
      setIsConnectModalOpen(true)
      return
    }
    if (!hasSelectableToken) {
      pushStakeFeedback(
        "error",
        "Token Not Available",
        "No stakeable token is currently available.",
        "stake-modal:token-unavailable",
      )
      return
    }
    if (isRaRuntimeLoading) {
      pushStakeFeedback(
        "warning",
        "Policy Sync In Progress",
        "Please wait while we load staking policy limits.",
        "stake-modal:ra-runtime-loading",
        4_000,
      )
      return
    }
    if (raRuntimeError) {
      pushStakeFeedback(
        "error",
        "Policy Sync Failed",
        raRuntimeError,
        "stake-modal:ra-runtime-error",
        7_000,
      )
      return
    }
    if (isBalanceLoading) {
      pushStakeFeedback(
        "warning",
        "Balance Sync In Progress",
        "Please wait while we load your wallet balances.",
        "stake-modal:balance-loading",
        4_000,
      )
      return
    }
    if (!hasBalance) {
      pushStakeFeedback(
        "error",
        "Insufficient Balance",
        `No ${currentTicker} balance found in your wallet.`,
        `stake-modal:no-balance:${currentTicker}`,
      )
      return
    }
    if (isPriceUnavailableForStake) {
      pushStakeFeedback(
        "warning",
        "Price Feed Unavailable",
        "Stake limits cannot be calculated right now. Please try again shortly.",
        "stake-modal:price-unavailable",
      )
      return
    }

    const nextAmount = toInputAmount(effectiveMaxStakeAmount * normalizedRatio)
    if (!nextAmount) return

    setAmount(nextAmount)
  }

  const handleStake = () => {
    if (!isConnected) {
      setIsConnectModalOpen(true)
      return
    }
    if (!hasSelectableToken) {
      pushStakeFeedback(
        "error",
        "Token Not Available",
        "No stakeable token is currently available.",
        "stake-modal:token-unavailable",
      )
      return
    }
    if (isRaRuntimeLoading) {
      pushStakeFeedback(
        "warning",
        "Policy Sync In Progress",
        "Please wait while we load staking policy limits.",
        "stake-modal:ra-runtime-loading",
        4_000,
      )
      return
    }
    if (raRuntimeError) {
      pushStakeFeedback(
        "error",
        "Policy Sync Failed",
        raRuntimeError,
        "stake-modal:ra-runtime-error",
        7_000,
      )
      return
    }
    if (isBalanceLoading) {
      pushStakeFeedback(
        "warning",
        "Balance Sync In Progress",
        "Please wait while we load your wallet balances.",
        "stake-modal:balance-loading",
        4_000,
      )
      return
    }
    if (!hasBalance) {
      pushStakeFeedback(
        "error",
        "Insufficient Balance",
        `No ${currentTicker} balance found in your wallet.`,
        `stake-modal:no-balance:${currentTicker}`,
      )
      return
    }
    if (!normalizedAmount) {
      pushStakeFeedback(
        "error",
        "Invalid Amount",
        "Enter a valid staking amount.",
        "stake-modal:invalid-amount",
        4_000,
      )
      return
    }
    if (isPriceUnavailableForStake) {
      pushStakeFeedback(
        "warning",
        "Price Feed Unavailable",
        "Stake limits cannot be calculated right now. Please try again shortly.",
        "stake-modal:price-unavailable",
      )
      return
    }
    if (isBelowMinimumStake) {
      pushStakeFeedback(
        "error",
        "Minimum Stake Amount",
        `Minimum stake is $${formatUsdAmount(stakeMinUsd)} (~${formatTokenAmount(minStakeAmount)} ${currentTicker}).`,
        `stake-modal:min-usd:${currentTicker}`,
      )
      return
    }
    if (isAboveMaximumStakeByUsd) {
      pushStakeFeedback(
        "error",
        "Maximum Stake Amount",
        `Maximum stake is $${formatUsdAmount(stakeMaxUsd)} (~${formatTokenAmount(maxStakeAmount)} ${currentTicker}).`,
        `stake-modal:max-usd:${currentTicker}`,
      )
      return
    }
    if (hasInsufficientBalance) {
      pushStakeFeedback(
        "error",
        "Insufficient Balance",
        `Entered amount exceeds your ${currentTicker} balance.`,
        `stake-modal:insufficient-balance:${currentTicker}`,
      )
      return
    }
    startProcessing()
  }

  const handleClose = () => {
    closeModal()
  }

  return (
    <>
      <ModalSurface
        onBackdropClick={isProcessingRunning ? undefined : handleClose}
        panelClassName="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[480px] shadow-2xl pointer-events-auto relative flex flex-col"
      >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-medium text-white">{STAKE_MODAL_TEXT.title}</h2>
                {!isProcessingRunning && (
                  <button
                    onClick={handleClose}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <AnimatePresence mode="wait">
                  {step === 'input' ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Stake Input Box */}
                      <div className="relative border border-neutral-800/60 rounded-lg p-4 bg-[#161616]">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs text-neutral-400">{STAKE_MODAL_TEXT.stakeInputLabel}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                              <Wallet className="h-3 w-3" />
                              {isBalanceLoading ? (
                                <span className="inline-block h-3 w-20 rounded bg-neutral-700 animate-pulse" />
                              ) : (
                                <span>{balanceLabel} {currentTicker}</span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => applyBalanceRatio(0.25)}
                                disabled={!isConnected || isRaRuntimeLoading || Boolean(raRuntimeError) || isBalanceLoading || !hasBalance}
                                className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {STAKE_MODAL_TEXT.btnQuarter}
                              </button>
                              <button
                                onClick={() => applyBalanceRatio(0.75)}
                                disabled={!isConnected || isRaRuntimeLoading || Boolean(raRuntimeError) || isBalanceLoading || !hasBalance}
                                className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {STAKE_MODAL_TEXT.btnThreeQuarter}
                              </button>
                              <button
                                onClick={() => applyBalanceRatio(0.5)}
                                disabled={!isConnected || isRaRuntimeLoading || Boolean(raRuntimeError) || isBalanceLoading || !hasBalance}
                                className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {STAKE_MODAL_TEXT.btnHalf}
                              </button>
                              <button 
                                onClick={() => applyBalanceRatio(1)}
                                disabled={!isConnected || isRaRuntimeLoading || Boolean(raRuntimeError) || isBalanceLoading || !hasBalance}
                                className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {STAKE_MODAL_TEXT.btnMax}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <button 
                              onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                              className="flex items-center gap-2 bg-[#1a1a1a] border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-2 transition-colors cursor-pointer"
                            >
                              <TokenAvatar
                                ticker={currentTicker}
                                icon={currentTokenMarket?.icon}
                                isImage={currentTokenMarket?.isImage}
                                colorBg={currentTokenMarket?.colorBg}
                                className="w-5 h-5"
                              />
                              <span className="font-medium text-white text-sm">{currentTicker}</span>
                              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${isTokenDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          
                          <div className="flex flex-col items-end flex-1">
                            <input
                              type="number"
                              value={amount}
                              min="0"
                              onChange={(e) => {
                                const nextValue = e.target.value
                                if (nextValue === "") {
                                  setAmount("")
                                  return
                                }
                                const nextNumber = Number(nextValue)
                                if (!Number.isFinite(nextNumber) || nextNumber < 0) return
                                setAmount(nextValue)
                              }}
                              placeholder="0.00"
                              className="w-full bg-transparent text-right text-2xl font-medium text-white outline-none placeholder:text-neutral-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                            />
                            <span className="text-[10px] text-neutral-500 mt-1">${usdValue}</span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isTokenDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50"
                            >
                              <div className="p-2 border-b border-neutral-800">
                                <div className="flex items-center gap-2 bg-neutral-800/50 rounded-md px-2 py-1.5 border border-neutral-700/30">
                                  <Search className="h-3 w-3 text-neutral-400 shrink-0" />
                                  <input 
                                    type="text" 
                                    placeholder={STAKE_MODAL_TEXT.searchPlaceholder} 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent text-xs text-white outline-none w-full placeholder:text-neutral-500"
                                  />
                                </div>
                              </div>
                              <div className="p-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {stakeableTokens
                                  .filter((candidate) => {
                                    const query = searchQuery.toLowerCase()
                                    return (
                                      candidate.ticker.toLowerCase().includes(query) ||
                                      candidate.name.toLowerCase().includes(query)
                                    )
                                  })
                                  .map(t => (
                                    (() => {
                                      const isSelected =
                                        selectedTokenTicker?.toLowerCase() ===
                                        t.ticker.toLowerCase()

                                      return (
                                        <button
                                          key={t.ticker}
                                          onClick={() => {
                                            setUserSelectedTokenTicker(t.ticker)
                                            setIsTokenDropdownOpen(false)
                                            setSearchQuery("")
                                            setAmount("")
                                          }}
                                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                                            isSelected
                                              ? "bg-emerald-500/12 border-emerald-400/35 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
                                              : "bg-neutral-800/50 hover:bg-neutral-700 border-neutral-700/50 text-white"
                                          }`}
                                        >
                                          <TokenAvatar
                                            ticker={t.ticker}
                                            icon={t.icon}
                                            isImage={t.isImage}
                                            colorBg={t.colorBg}
                                            className="w-4 h-4"
                                            textClassName="text-[8px]"
                                          />
                                          <span className="font-medium text-xs">{t.ticker}</span>
                                          {isSelected ? (
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                                          ) : null}
                                        </button>
                                      )
                                    })()
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {!hasSelectableToken ? (
                        <p className="text-[11px] text-red-300">
                          No stakeable token is currently available.
                        </p>
                      ) : !isConnected ? (
                        <p className="text-[11px] text-neutral-500">
                          Connect your wallet to check token balance and continue staking.
                        </p>
                      ) : isRaRuntimeLoading ? (
                        <p className="text-[11px] text-neutral-500">
                          Loading staking limits and fee policy...
                        </p>
                      ) : raRuntimeError ? (
                        <p className="text-[11px] text-red-300">
                          {raRuntimeError}
                        </p>
                      ) : isBalanceLoading ? (
                        <p className="text-[11px] text-neutral-500">
                          Loading {currentTicker} balance...
                        </p>
                      ) : !hasBalance ? (
                        <p className="text-[11px] text-red-300">
                          No {currentTicker} balance found in your wallet.
                        </p>
                      ) : isPriceUnavailableForStake ? (
                        <p className="text-[11px] text-amber-300">
                          Price feed is unavailable. Stake limits cannot be calculated right now.
                        </p>
                      ) : isBelowMinimumStake ? (
                        <p className="text-[11px] text-amber-300">
                          Minimum stake is ${formatUsdAmount(stakeMinUsd)} (~{formatTokenAmount(minStakeAmount)} {currentTicker}).
                        </p>
                      ) : isAboveMaximumStakeByUsd ? (
                        <p className="text-[11px] text-red-300">
                          Maximum stake is ${formatUsdAmount(stakeMaxUsd)} (~{formatTokenAmount(maxStakeAmount)} {currentTicker}).
                        </p>
                      ) : hasInsufficientBalance ? (
                        <p className="text-[11px] text-red-300">
                          Entered amount exceeds your {currentTicker} balance.
                        </p>
                      ) : null}

                      {/* Staking Period */}
                      <div>
                        <span className="text-xs text-neutral-400 block mb-3">{STAKE_MODAL_TEXT.stakingPeriodLabel}</span>
                        <div className="flex items-center gap-4">
                          {STAKE_PERIODS.map((p) => (
                            <label key={p.label} className="flex items-center gap-2 cursor-pointer group" onClick={() => setPeriod(p.label)}>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${period === p.label ? 'border-white' : 'border-neutral-600 group-hover:border-neutral-400'}`}>
                                {period === p.label && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className={`text-xs transition-colors ${period === p.label ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'}`}>{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Rewards Box */}
                      <div className="border border-neutral-800/60 rounded-lg p-4 bg-[#161616]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-neutral-400">{STAKE_MODAL_TEXT.rewardsLabel}</span>
                          {isRewardsLoading ? (
                            <span className="inline-block h-5 w-16 rounded bg-neutral-700 animate-pulse" />
                          ) : (
                            <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded">{STAKE_MODAL_TEXT.apyPrefix} {apy}%</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-2xl font-medium text-white mb-1">
                          <TokenAvatar
                            ticker={raSymbol}
                            icon={raDisplayIcon}
                            isImage={true}
                            className="w-6 h-6"
                          />
                          {isRewardsLoading ? (
                            <span className="inline-block h-8 w-36 rounded bg-neutral-700 animate-pulse" />
                          ) : (
                            <>
                              {rewardAmount} <span className="text-base text-neutral-400">{raSymbol}</span>
                            </>
                          )}
                        </div>
                        {isRewardsLoading ? (
                          <span className="inline-block h-3 w-24 rounded bg-neutral-700 animate-pulse" />
                        ) : (
                          <span className="text-[10px] text-neutral-500">${rewardUsd}</span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={handleClose}
                          className="flex-1 py-2 px-3 bg-transparent hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          {STAKE_MODAL_TEXT.btnCancel}
                        </button>
                        {!isConnected ? (
                          <button
                            onClick={() => setIsConnectModalOpen(true)}
                            className="flex-1 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            {STAKE_MODAL_TEXT.btnConnect}
                          </button>
                        ) : (
                          <button
                            onClick={handleStake}
                            disabled={
                              !hasSelectableToken ||
                              !normalizedAmount ||
                              isRaRuntimeLoading ||
                              Boolean(raRuntimeError) ||
                              isPriceUnavailableForStake ||
                              isBelowMinimumStake ||
                              isAboveMaximumStakeByUsd ||
                              hasInsufficientBalance ||
                              isBalanceLoading ||
                              !hasBalance
                            }
                            className="flex-1 py-2 px-3 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            {STAKE_MODAL_TEXT.btnConfirm}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-8 py-2"
                    >
                      <p className="text-xs text-neutral-400 leading-relaxed text-center px-4">
                        {processingNote}
                      </p>

                      {/* Visual Circles */}
                      <div className="flex items-center justify-center py-6">
                        <div className="flex items-center">
                          <motion.span 
                            animate={{ 
                              opacity: isProcessingSuccess ? 0 : 1,
                              x: isProcessingSuccess ? 14 : 0
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="text-neutral-400 mr-4 text-sm font-medium"
                          >
                            {currentTicker}
                          </motion.span>
                          <div className="relative flex items-center justify-center">
                            <motion.div 
                              animate={
                                isProcessingSuccess
                                  ? { x: 14, scale: 0, opacity: 0 }
                                  : progressIndex > 0 
                                    ? { x: -10 } 
                                    : { x: 0 }
                              }
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="w-14 h-14 rounded-full border border-neutral-500 flex items-center justify-center bg-neutral-800 z-0 overflow-hidden relative text-xl font-bold text-white uppercase"
                            >
                              <TokenAvatar
                                ticker={currentTicker}
                                icon={currentTokenMarket?.icon}
                                isImage={currentTokenMarket?.isImage}
                                colorBg={currentTokenMarket?.colorBg}
                                className="w-14 h-14"
                                textClassName="text-xl"
                              />
                            </motion.div>
                            <motion.div 
                              animate={
                                isProcessingSuccess
                                  ? { x: -14, scale: 1.1, zIndex: 20 }
                                  : progressIndex > 0 
                                    ? { x: 10 } 
                                    : { x: 0 }
                              }
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="w-14 h-14 rounded-full border border-neutral-500 flex items-center justify-center bg-[#111111] z-10 -ml-7 overflow-hidden relative"
                            >
                              <TokenAvatar
                                ticker={raSymbol}
                                icon={raDisplayIcon}
                                isImage={true}
                                className="w-14 h-14"
                                textClassName="text-xl"
                              />
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: isProcessingSuccess ? 1 : 0 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="absolute inset-0 bg-green-500/20 mix-blend-overlay"
                              />
                            </motion.div>
                          </div>
                          <motion.span 
                            animate={{ 
                              x: isProcessingSuccess ? -14 : 0,
                              color: isProcessingSuccess ? "#22c55e" : "#a3a3a3"
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="text-neutral-400 ml-4 text-sm font-medium"
                          >
                            {raSymbol}
                          </motion.span>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="relative px-2">
                        <div className="absolute top-3 left-6 right-6 h-[1px] bg-neutral-800" />
                        <div 
                          className="absolute top-3 left-6 h-[1px] bg-white transition-all duration-500 ease-in-out" 
                          style={{ width: `calc(${progressLineRatio * 100}% - ${progressLineRatio * 3}rem)` }}
                        />
                        
                        <div className="relative flex justify-between">
                          {STAKE_MODAL_TEXT.progressSteps.map((step, idx) => {
                            const stepState = progressStates[idx] ?? "pending"
                            const Icon = step.icon
                            
                            return (
                              <div key={step.name} className="flex flex-col items-center gap-2 z-10">
                                <div
                                  className={`text-[9px] mb-1 absolute -top-5 whitespace-nowrap ${
                                    stepState === "failed"
                                      ? "text-red-400"
                                      : stepState === "success"
                                        ? "text-emerald-400"
                                        : "text-neutral-500"
                                  }`}
                                >
                                  {step.name}
                                </div>
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                                    stepState === "active"
                                      ? "border border-white text-white bg-[#111111]"
                                      : stepState === "success"
                                        ? "border border-emerald-500 bg-emerald-500 text-black"
                                        : stepState === "failed"
                                          ? "border border-red-500 bg-red-500/20 text-red-400"
                                          : "border border-neutral-800 text-neutral-600 bg-[#111111]"
                                  }`}
                                >
                                  {stepState === "success" ? (
                                    <Check className="h-3 w-3" />
                                  ) : stepState === "failed" ? (
                                    <AlertTriangle className="h-3 w-3" />
                                  ) : (
                                    <Icon className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {isProcessingFailed && processingError ? (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300 text-center">
                          {processingError}
                        </div>
                      ) : null}

                      {/* Action */}
                      <div className="pt-6">
                        {isProcessingSuccess ? (
                          completedTransactionUrl ? (
                            <a
                              href={completedTransactionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                              {STAKE_MODAL_TEXT.btnCompleted}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={handleClose}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                              Completed
                            </button>
                          )
                        ) : isProcessingFailed ? (
                          <button
                            type="button"
                            onClick={startProcessing}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Retry Stake
                          </button>
                        ) : (
                          <button
                            disabled={true}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            {STAKE_MODAL_TEXT.btnProcessing}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
      </ModalSurface>
      <ConnectModal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} />
    </>
  )
}

export function StakeModal() {
  const { isOpen, token, closeModal } = useStakeModal()

  return (
    <AnimatePresence>
      {isOpen && token ? (
        <StakeModalContent
          key={`${token.ticker}-${token.name}`}
          closeModal={closeModal}
          token={token}
        />
      ) : null}
    </AnimatePresence>
  )
}
