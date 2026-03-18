"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import bs58 from "bs58"
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import {
  clearWalletSignatureSession,
  hasValidWalletSignatureSession,
  saveWalletSignatureSession,
} from "@/lib/wallet/wallet-signature-session"
import { ModalSurface } from "@/components/modals/_shared/ModalSurface"
import {
  checkWalletAccess,
  clearStoredWalletUserSession,
  requestWalletAuthNonce,
  verifyWalletAuthSignature,
} from "@/lib/user/user-analytics"
import { emitBlockedAccessNotice } from "@/lib/access/blocked-access-notice"
import { notifySuccess } from "@/lib/ui/ui-feedback"

interface ConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Centralized static text content for ConnectModal component.
 */
const CONNECT_MODAL_TEXT = {
  title: "Solera Connect Wallet",
  heading: "Secure Wallet Access",
  description:
    "Connect your Solana wallet and sign a short message to start your secure Solera session. Your keys remain in your wallet.",
  openSelector: "Open Wallet Selector",
  privacyPolicy: "Privacy Policy",
  walletImageAlt: "Wallet security illustration",
  signing: "Waiting for wallet signature...",
  signPrompt: "After connecting, wallet signature approval is required.",
  signatureRejected: "Signature was canceled. Please sign to continue with Solera.",
  signatureUnsupported: "This wallet does not support message signing. Choose another wallet.",
  signatureFailed: "Signature request failed. Please try again.",
  connectedTitle: "Wallet Connected",
  connectedDescription: "Secure wallet session is now active.",
  blockedDefault:
    "You are blocked. Please contact block@solera.work for assistance.",
} as const

const isUserRejectedSignature = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes("rejected") ||
    message.includes("declined") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  )
}

const isConnectDisabledError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes("connections are temporarily disabled") ||
    message.includes("connection is temporarily disabled") ||
    message.includes("wallet connections are disabled")
  )
}

const shortenWalletAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connected, publicKey, signMessage, disconnect } = useAdapterWallet()
  const { setVisible } = useWalletModal()
  const walletAddress = useMemo(() => publicKey?.toBase58() ?? null, [publicKey])
  const [isSigning, setIsSigning] = useState(false)
  const [autoSignAttempted, setAutoSignAttempted] = useState(false)
  const [isConnectFlowArmed, setIsConnectFlowArmed] = useState(false)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const isBlockedMessage = Boolean(
    signatureError &&
      (signatureError.toLowerCase().includes("blocked") ||
        signatureError.toLowerCase().includes("block@solera.work")),
  )

  const hasSessionSignature = useCallback((address: string) => {
    return hasValidWalletSignatureSession(address)
  }, [])

  const persistSessionSignature = useCallback((address: string) => {
    saveWalletSignatureSession(address)
  }, [])

  const handleBlockedAccess = useCallback(
    async (message?: string | null) => {
      const nextMessage = message?.trim() || CONNECT_MODAL_TEXT.blockedDefault
      setSignatureError(nextMessage)

      if (walletAddress) {
        clearWalletSignatureSession(walletAddress)
        clearStoredWalletUserSession(walletAddress)
      }

      emitBlockedAccessNotice(nextMessage)

      if (connected) {
        try {
          await disconnect()
        } catch {
          // Ignore disconnect failures; wallet can still be treated as blocked in UI.
        }
      }
    },
    [walletAddress, connected, disconnect],
  )

  const ensureWalletAllowed = useCallback(
    async (address: string) => {
      const access = await checkWalletAccess(address)
      if (access && (!access.allowed || access.isBlocked)) {
        await handleBlockedAccess(access.message)
        return false
      }

      return true
    },
    [handleBlockedAccess],
  )

  const requestSessionSignature = useCallback(async () => {
    if (!walletAddress || !signMessage) return

    setAutoSignAttempted(true)
    setIsSigning(true)
    setSignatureError(null)

    try {
      const allowed = await ensureWalletAllowed(walletAddress)
      if (!allowed) {
        return
      }

      const message = await requestWalletAuthNonce(walletAddress)
      const encodedMessage = new TextEncoder().encode(message)
      const signatureBytes = await signMessage(encodedMessage)
      const signature = bs58.encode(signatureBytes)
      await verifyWalletAuthSignature(walletAddress, signature, message)

      // Keep an in-tab session marker so we do not request signature repeatedly.
      persistSessionSignature(walletAddress)
      notifySuccess({
        title: CONNECT_MODAL_TEXT.connectedTitle,
        description: `${shortenWalletAddress(walletAddress)} · ${CONNECT_MODAL_TEXT.connectedDescription}`,
        dedupeKey: `wallet:connected:signed:${walletAddress}`,
        dedupeMs: 2_000,
      })
      onClose()
    } catch (error) {
      if (isUserRejectedSignature(error)) {
        setSignatureError(CONNECT_MODAL_TEXT.signatureRejected)
      } else if (
        error instanceof Error &&
        (error.message.toLowerCase().includes("blocked") ||
          error.message.toLowerCase().includes("block@solera.work"))
      ) {
        await handleBlockedAccess(error.message)
      } else if (isConnectDisabledError(error)) {
        setSignatureError(
          error instanceof Error
            ? error.message
            : "Wallet connections are temporarily disabled by platform administration.",
        )
      } else {
        setSignatureError(CONNECT_MODAL_TEXT.signatureFailed)
      }
    } finally {
      setIsSigning(false)
    }
  }, [
    walletAddress,
    signMessage,
    persistSessionSignature,
    onClose,
    ensureWalletAllowed,
    handleBlockedAccess,
  ])

  useEffect(() => {
    if (!isOpen) {
      setSignatureError(null)
      setAutoSignAttempted(false)
      setIsConnectFlowArmed(false)
      return
    }

    if (!isConnectFlowArmed) return
    if (!connected || !walletAddress) return

    if (hasSessionSignature(walletAddress)) {
      void ensureWalletAllowed(walletAddress).then((allowed) => {
        if (allowed) {
          onClose()
        }
      })
      return
    }

    if (!signMessage) {
      setSignatureError(CONNECT_MODAL_TEXT.signatureUnsupported)
      return
    }

    if (!isSigning && !autoSignAttempted && !signatureError) {
      void requestSessionSignature()
    }
  }, [
    isOpen,
    connected,
    walletAddress,
    signMessage,
    hasSessionSignature,
    onClose,
    isSigning,
    autoSignAttempted,
    isConnectFlowArmed,
    signatureError,
    requestSessionSignature,
    ensureWalletAllowed,
  ])

  const handleConnect = () => {
    setSignatureError(null)
    setIsConnectFlowArmed(true)

    if (!connected) {
      setVisible(true)
      return
    }

    if (!walletAddress) {
      setVisible(true)
      return
    }

    if (hasSessionSignature(walletAddress)) {
      void ensureWalletAllowed(walletAddress).then((allowed) => {
        if (allowed) {
          onClose()
        }
      })
      return
    }

    if (!signMessage) {
      setSignatureError(CONNECT_MODAL_TEXT.signatureUnsupported)
      setVisible(true)
      return
    }

    void requestSessionSignature()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalSurface
          onBackdropClick={onClose}
          panelClassName="bg-[#111111] border border-neutral-800 rounded-2xl w-full max-w-[430px] shadow-2xl pointer-events-auto relative flex flex-col overflow-hidden"
        >
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h2 className="text-base font-medium text-white">{CONNECT_MODAL_TEXT.title}</h2>
                <button
                  title="Close"
                  onClick={onClose}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-gradient-to-b from-[#111111] via-[#0f131a] to-[#0a0a0a] border-y border-neutral-800">
                <div className="relative h-48 w-full bg-[#0f141b]">
                  <Image
                    src="/images/wallet.png"
                    alt={CONNECT_MODAL_TEXT.walletImageAlt}
                    fill
                    sizes="(max-width: 430px) 100vw, 430px"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]/80" />
                </div>

                <div className="px-5 pb-5 pt-4 text-center">
                  <h3 className="text-2xl font-semibold leading-tight text-white mb-2">
                    {CONNECT_MODAL_TEXT.heading}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-300 px-1">
                    {CONNECT_MODAL_TEXT.description}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4">
                <button
                  onClick={handleConnect}
                  disabled={isSigning}
                  className="mt-3 w-full rounded-xl border border-neutral-700 bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-neutral-100 transition-colors hover:bg-[#222222] hover:border-neutral-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {CONNECT_MODAL_TEXT.openSelector}
                </button>

                {connected && (
                  <p className="mt-3 text-center text-xs text-neutral-400">
                    {isSigning ? CONNECT_MODAL_TEXT.signing : CONNECT_MODAL_TEXT.signPrompt}
                  </p>
                )}

                {signatureError &&
                  (isBlockedMessage ? (
                    <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center">
                      <p className="text-[11px] font-medium text-red-200">
                        {signatureError}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-center text-xs text-red-400">
                      {signatureError}
                    </p>
                  ))}

                <div className="mt-3 flex items-center justify-center">
                  <Link
                    href="/docs/privacy-policy"
                    onClick={onClose}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-4"
                  >
                    {CONNECT_MODAL_TEXT.privacyPolicy}
                  </Link>
                </div>
              </div>
        </ModalSurface>
      )}
    </AnimatePresence>
  )
}
