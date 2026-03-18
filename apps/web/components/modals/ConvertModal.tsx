"use client"

import { useEffect, useMemo, useState } from "react"
import { X, ArrowRightLeft, Loader2, CheckCircle2, CircleAlert } from "lucide-react"
import Image from "next/image"
import { AnimatePresence } from "motion/react"
import { VersionedTransaction } from "@solana/web3.js"
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react"
import { useShallow } from "zustand/react/shallow"
import { useSolanaPortfolio } from "@/hooks/use-solana-portfolio"
import { useUserData } from "@/store/profile/use-user-data"
import { useWallet } from "@/store/wallet/use-wallet"
import { useMarketData } from "@/store/market/use-market-data"
import { ModalSurface } from "@/components/modals/_shared/ModalSurface"
import { useRaRuntimeSettings } from "@/hooks/use-ra-runtime-settings"
import { resolveRaName, resolveRaSymbol } from "@/lib/ra/ra-runtime"
import {
  executeWalletConvert,
  previewWalletConvert,
  prepareWalletConvert,
  type WalletConvertExecutionResponse,
  type WalletConvertPreviewResponse,
} from "@/lib/user/user-analytics"
import { notifyError, notifySuccess, notifyWarning } from "@/lib/ui/ui-feedback"

interface ConvertModalProps {
  isOpen: boolean
  onClose: () => void
}

const CONVERT_MODAL_TEXT = {
  title: "Convert Small Balances",
  emptyState: "No small balances found.",
  totalValue: "Total Value",
  youWillReceive: "You will receive",
  preparing: "Preparing swap routes...",
  signing: "Waiting for wallet approval...",
  broadcasting: "Broadcasting signed transactions...",
  rejected: "Conversion signing was canceled.",
  unsupported: "This wallet cannot sign transactions.",
} as const

type ProgressStatus =
  | "PENDING"
  | "SIGNING"
  | "SIGNED"
  | "BROADCASTING"
  | "COMPLETED"
  | "FAILED"

interface ProgressLeg {
  legId: string
  ticker: string
  status: ProgressStatus
  message?: string | null
  signature?: string | null
}

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

const getProgressTone = (status: ProgressStatus) => {
  switch (status) {
    case "COMPLETED":
      return "text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
    case "FAILED":
      return "text-red-300 border-red-500/20 bg-red-500/10"
    case "SIGNED":
    case "BROADCASTING":
    case "SIGNING":
      return "text-neutral-200 border-neutral-700 bg-neutral-900/70"
    default:
      return "text-neutral-400 border-neutral-800 bg-neutral-950/70"
  }
}

const ProgressIcon = ({ status }: { status: ProgressStatus }) => {
  if (status === "COMPLETED") {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  }
  if (status === "FAILED") {
    return <CircleAlert className="h-3.5 w-3.5 text-red-400" />
  }
  if (status === "SIGNED" || status === "BROADCASTING" || status === "SIGNING") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-300" />
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
}

export function ConvertModal({ isOpen, onClose }: ConvertModalProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [progressLegs, setProgressLegs] = useState<ProgressLeg[]>([])
  const [preview, setPreview] = useState<WalletConvertPreviewResponse | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const { refreshProfile } = useUserData(
    useShallow((state) => ({
      refreshProfile: state.refreshProfile,
    })),
  )
  const { refreshPortfolio } = useSolanaPortfolio()
  const { isConnected, walletAddress } = useWallet()
  const {
    connected: adapterConnected,
    publicKey,
    signAllTransactions,
    signTransaction,
  } = useAdapterWallet()
  const { tokens: listedTokens } = useMarketData()
  const {
    settings: raRuntime,
    isLoading: isRaRuntimeLoading,
    error: raRuntimeError,
  } = useRaRuntimeSettings()
  const raSymbol = resolveRaSymbol(raRuntime)
  const raName = resolveRaName(raRuntime)

  const resetProgressState = () => {
    setProgressMessage(null)
    setProgressLegs([])
  }

  useEffect(() => {
    if (!isOpen) {
      setIsConverting(false)
      resetProgressState()
      setPreview(null)
      setPreviewError(null)
      setIsPreviewLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!isConnected || !walletAddress || !adapterConnected || !publicKey) {
      setPreview(null)
      setPreviewError(null)
      setIsPreviewLoading(false)
      return
    }

    let cancelled = false

    const loadPreview = async () => {
      setIsPreviewLoading(true)
      setPreviewError(null)
      try {
        const nextPreview = await previewWalletConvert(walletAddress)
        if (cancelled) return
        setPreview(nextPreview)
      } catch (error) {
        if (cancelled) return
        setPreview(null)
        setPreviewError(
          error instanceof Error
            ? error.message
            : "Failed to load convertable balances.",
        )
      } finally {
        if (!cancelled) {
          setIsPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [adapterConnected, isConnected, isOpen, publicKey, walletAddress])

  const getSafeLogoSrc = (value: string | null | undefined): string | null => {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith("/")) return trimmed
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed
    return null
  }

  const isLoadingSmallBalances = isRaRuntimeLoading || isPreviewLoading

  const tokenLogoByTicker = useMemo(
    () =>
      new Map(
        listedTokens.map((token) => [token.ticker.toUpperCase(), token.icon ?? ""]),
      ),
    [listedTokens],
  )

  const smallBalances = useMemo(
    () =>
      (preview?.tokens ?? []).map((token) => ({
        id: token.ticker,
        ticker: token.ticker,
        name: token.name,
        logoUrl: tokenLogoByTicker.get(token.ticker.toUpperCase()) ?? "",
        amount: token.amount,
        usdValue: token.amountUsd,
        quotedRaOut: token.quotedRaOut,
      })),
    [preview, tokenLogoByTicker],
  )

  const totalUsdValue = useMemo(
    () => smallBalances.reduce((sum, token) => sum + token.usdValue, 0),
    [smallBalances],
  )
  const totalQuotedRaOut = useMemo(
    () => smallBalances.reduce((sum, token) => sum + token.quotedRaOut, 0),
    [smallBalances],
  )

  const updateProgressLeg = (
    legId: string,
    patch: Partial<ProgressLeg>,
  ) => {
    setProgressLegs((current) =>
      current.map((item) => (item.legId === legId ? { ...item, ...patch } : item)),
    )
  }

  const applyExecutionResult = (result: WalletConvertExecutionResponse) => {
    setProgressLegs((current) =>
      current.map((item) => {
        const resolved = result.legs.find((entry) => entry.legId === item.legId)
        if (!resolved) return item
        return {
          ...item,
          status: resolved.status === "COMPLETED" ? "COMPLETED" : "FAILED",
          message: resolved.errorMessage,
          signature: resolved.signature,
        }
      }),
    )
  }

  const handleConvert = async () => {
    if (
      isConverting ||
      isRaRuntimeLoading ||
      isPreviewLoading ||
      raRuntimeError ||
      previewError ||
      smallBalances.length === 0
    ) {
      return
    }

    if (!isConnected || !walletAddress || !adapterConnected || !publicKey) {
      notifyError({
        title: "Conversion Failed",
        description: "Connect and authorize your wallet before converting balances.",
        dedupeKey: "profile:convert:not-connected",
        dedupeMs: 4_000,
      })
      return
    }

    if (!signAllTransactions && !signTransaction) {
      notifyError({
        title: "Conversion Failed",
        description: CONVERT_MODAL_TEXT.unsupported,
        dedupeKey: "profile:convert:unsupported-wallet",
        dedupeMs: 8_000,
      })
      return
    }

    setIsConverting(true)
    setProgressMessage(CONVERT_MODAL_TEXT.preparing)
    setProgressLegs([])

    try {
      const prepared = await prepareWalletConvert(
        walletAddress,
        smallBalances.map((token) => ({ ticker: token.ticker })),
      )

      const baseProgressLegs = prepared.legs.map((leg) => ({
        legId: leg.legId,
        ticker: leg.ticker,
        status: "PENDING" as const,
        message: null,
        signature: null,
      }))
      setProgressLegs(baseProgressLegs)
      setProgressMessage(CONVERT_MODAL_TEXT.signing)

      const preparedTransactions = prepared.legs.map((leg) => ({
        ...leg,
        transactions: leg.transactionBase64List.map((transactionBase64) =>
          VersionedTransaction.deserialize(decodeBase64(transactionBase64)),
        ),
      }))

      const signedLegs: Array<{ legId: string; signedTransactions: string[] }> = []
      let signingCanceled = false

      if (signAllTransactions) {
        preparedTransactions.forEach((leg) => {
          updateProgressLeg(leg.legId, { status: "SIGNING", message: null })
        })

        const flattenedTransactions = preparedTransactions.flatMap((leg) =>
          leg.transactions.map((transaction) => ({
            legId: leg.legId,
            transaction,
          })),
        )
        const signedTransactions = await signAllTransactions(
          flattenedTransactions.map((item) => item.transaction),
        )

        const signedByLeg = new Map<string, string[]>()
        signedTransactions.forEach((transaction, index) => {
          const targetLeg = flattenedTransactions[index]
          const current = signedByLeg.get(targetLeg.legId) ?? []
          current.push(encodeBase64(transaction.serialize()))
          signedByLeg.set(targetLeg.legId, current)
        })

        preparedTransactions.forEach((leg) => {
          const transactions = signedByLeg.get(leg.legId) ?? []
          signedLegs.push({
            legId: leg.legId,
            signedTransactions: transactions,
          })
          updateProgressLeg(leg.legId, { status: "SIGNED" })
        })
      } else if (signTransaction) {
        for (const leg of preparedTransactions) {
          try {
            updateProgressLeg(leg.legId, { status: "SIGNING", message: null })
            const signedTransactions: string[] = []
            for (const transaction of leg.transactions) {
              const signedTransaction = await signTransaction(transaction)
              signedTransactions.push(encodeBase64(signedTransaction.serialize()))
            }
            signedLegs.push({
              legId: leg.legId,
              signedTransactions,
            })
            updateProgressLeg(leg.legId, { status: "SIGNED" })
          } catch (error) {
            if (isUserRejectedWalletAction(error)) {
              signingCanceled = true
              break
            }
            throw error
          }
        }
      }

      if (signingCanceled || signedLegs.length === 0) {
        resetProgressState()
        notifyWarning({
          title: "Conversion Canceled",
          description: CONVERT_MODAL_TEXT.rejected,
          dedupeKey: "profile:convert:rejected",
          dedupeMs: 4_000,
        })
        return
      }

      signedLegs.forEach((leg) => {
        updateProgressLeg(leg.legId, { status: "BROADCASTING" })
      })
      setProgressMessage(CONVERT_MODAL_TEXT.broadcasting)

      const result = await executeWalletConvert(walletAddress, prepared.sessionId, signedLegs)
      applyExecutionResult(result)
      await refreshProfile()
      await refreshPortfolio({ clearFirst: true })
      setPreview(null)

      if (result.status === "COMPLETED") {
        notifySuccess({
          title: "Conversion Completed",
          description: `${result.completedLegs} balance${result.completedLegs === 1 ? "" : "s"} converted to ${raSymbol}.`,
          dedupeKey: `profile:convert:completed:${result.sessionId}`,
          dedupeMs: 4_000,
        })
        onClose()
      } else if (result.status === "PARTIAL_SUCCESS") {
        notifyWarning({
          title: "Conversion Partially Completed",
          description:
            result.failedLegs > 0
              ? `${result.completedLegs} succeeded, ${result.failedLegs} failed.`
              : `${result.completedLegs} balance${result.completedLegs === 1 ? "" : "s"} converted, but one or more post-trade steps need review.`,
          dedupeKey: `profile:convert:partial:${result.sessionId}`,
          dedupeMs: 6_000,
        })
        onClose()
      } else {
        notifyError({
          title: "Conversion Failed",
          description: "No conversion leg was confirmed on-chain.",
          dedupeKey: `profile:convert:failed:${result.sessionId}`,
          dedupeMs: 8_000,
        })
      }
    } catch (error) {
      if (isUserRejectedWalletAction(error)) {
        resetProgressState()
        notifyWarning({
          title: "Conversion Canceled",
          description: CONVERT_MODAL_TEXT.rejected,
          dedupeKey: "profile:convert:sign-rejected",
          dedupeMs: 4_000,
        })
      } else {
        notifyError({
          title: "Conversion Failed",
          error,
          fallbackMessage: "Unable to process conversion right now.",
          dedupeKey: "profile:convert-failed",
          dedupeMs: 8_000,
        })
      }
    } finally {
      setIsConverting(false)
      setProgressMessage(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalSurface
          onBackdropClick={onClose}
          panelClassName="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[360px] shadow-2xl pointer-events-auto relative flex flex-col"
        >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-medium text-white tracking-tight">{CONVERT_MODAL_TEXT.title}</h2>
                <button
                  onClick={onClose}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-500 mb-4 px-1 leading-relaxed">
                Convert eligible low balances to {raName} ({raSymbol}) instantly. Eligible range: ${raRuntime.convertMinUsd.toFixed(2)} - ${raRuntime.convertMaxUsd.toFixed(2)} per token.
              </p>
              {raRuntimeError ? (
                <p className="text-[11px] text-red-300 mb-3 px-1">{raRuntimeError}</p>
              ) : null}
              {!raRuntimeError && previewError ? (
                <p className="text-[11px] text-red-300 mb-3 px-1">{previewError}</p>
              ) : null}
              {!raRuntimeError && !previewError && preview?.note ? (
                <p className="text-[11px] text-neutral-400 mb-3 px-1">{preview.note}</p>
              ) : null}
              {!raRuntimeError && !previewError && preview?.feeWarning ? (
                <p className="text-[11px] text-amber-300 mb-3 px-1">
                  {preview.feeWarning} Available SOL: {preview.availableSolBalance.toFixed(6)}
                </p>
              ) : null}

              <div className="max-h-[240px] overflow-y-auto pr-1 -mr-1 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:rounded-full mb-4">
                {isLoadingSmallBalances ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`convert-skeleton-${index}`}
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl border border-neutral-800/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full shrink-0 bg-neutral-800 animate-pulse" />
                        <div className="flex flex-col gap-1">
                          <span className="h-3 w-12 rounded bg-neutral-800 animate-pulse" />
                          <span className="h-3 w-20 rounded bg-neutral-800 animate-pulse" />
                        </div>
                      </div>
                      <span className="h-3 w-14 rounded bg-neutral-800 animate-pulse" />
                    </div>
                  ))
                ) : smallBalances.length > 0 ? (
                  smallBalances.map((token) => {
                    const logoSrc = getSafeLogoSrc(token.logoUrl)
                    return (
                      <div
                        key={token.id}
                        className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl hover:bg-neutral-800/30 transition-colors border border-transparent hover:border-neutral-800/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 bg-neutral-900 border border-neutral-800">
                            {logoSrc ? (
                              <Image
                                src={logoSrc}
                                alt={token.name}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-300 uppercase">
                                {token.ticker?.charAt(0) || token.name?.charAt(0) || "T"}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white leading-tight">{token.ticker}</span>
                            <span className="text-[11px] text-neutral-500 leading-tight">
                              {token.amount.toLocaleString(undefined, { maximumSignificantDigits: 4 })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-white leading-tight">
                            ${token.usdValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    {CONVERT_MODAL_TEXT.emptyState}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5 mb-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{CONVERT_MODAL_TEXT.totalValue}</span>
                  <span className="text-xs font-medium text-white">${totalUsdValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{CONVERT_MODAL_TEXT.youWillReceive}</span>
                  <span className="text-sm font-bold text-emerald-400">
                    ~{totalQuotedRaOut.toFixed(2)} {raSymbol}
                  </span>
                </div>
              </div>

              {progressLegs.length > 0 ? (
                <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5 space-y-2">
                  {progressMessage ? (
                    <p className="px-1 text-[11px] text-neutral-400">{progressMessage}</p>
                  ) : null}
                  <div className="space-y-1.5">
                    {progressLegs.map((leg) => (
                      <div
                        key={leg.legId}
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] ${getProgressTone(
                          leg.status,
                        )}`}
                      >
                        <div className="flex items-center gap-2">
                          <ProgressIcon status={leg.status} />
                          <span className="font-medium">{leg.ticker}</span>
                        </div>
                        <span className="text-right text-[10px]">
                          {leg.message || leg.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                onClick={handleConvert}
                disabled={
                  smallBalances.length === 0 ||
                  isConverting ||
                  isLoadingSmallBalances ||
                  Boolean(raRuntimeError) ||
                  Boolean(previewError) ||
                  preview?.canExecute === false
                }
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 px-3 text-xs font-medium text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isConverting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                )}
                {isConverting ? "Processing..." : `Convert to ${raSymbol}`}
              </button>
        </ModalSurface>
      )}
    </AnimatePresence>
  )
}
