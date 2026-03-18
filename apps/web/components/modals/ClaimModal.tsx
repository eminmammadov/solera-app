"use client"

import { useState } from "react"
import { AnimatePresence } from "motion/react"
import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react"
import { VersionedTransaction } from "@solana/web3.js"
import { useWallet } from "@solana/wallet-adapter-react"
import type { Stake } from "@/store/profile/use-user-data"
import { ModalSurface } from "@/components/modals/_shared/ModalSurface"
import Link from "next/link"
import {
  claimUserStakePosition,
  executeWalletClaim,
  prepareWalletClaim,
} from "@/lib/user/user-analytics"
import { notifyError } from "@/lib/ui/ui-feedback"

interface ClaimModalProps {
  isOpen: boolean
  onClose: () => void
  stake: Stake
  onClaimSuccess?: () => void
}

/**
 * Centralized static text content for ClaimModal component.
 */
const CLAIM_MODAL_TEXT = {
  title: "Claim Rewards",
  descriptionPath1: "You are about to claim your earned rewards for the ",
  descriptionPath2: " pool.",
  stakedAmount: "Staked Amount",
  earnedRewards: "Earned Rewards",
  btnCancel: "Cancel",
  btnConfirm: "Confirm Claim",
  processingTitle: "Processing",
  processingDesc: "Confirming transaction on chain...",
  successTitle: "Claim Successful",
  successDesc: "Rewards have been added to your wallet.",
  btnClose: "Close",
  btnViewTx: "View Tx"
} as const

export function ClaimModal({ isOpen, onClose, stake, onClaimSuccess }: ClaimModalProps) {
  const [status, setStatus] = useState<"idle" | "claiming" | "success">("idle")
  const [txUrl, setTxUrl] = useState<string | null>(null)
  const { publicKey, signTransaction, connected } = useWallet()
  const stakeId = String(stake.id)

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

  const handleClose = () => {
    onClose()
    setTxUrl(null)
    // Reset status after a short delay to allow exit animation to finish
    setTimeout(() => setStatus("idle"), 300)
  }

  const handleClaim = async () => {
    if (!publicKey) return
    setStatus("claiming")

    try {
      const preparedClaim = await prepareWalletClaim(publicKey.toBase58(), stakeId)
      if (!preparedClaim.transactionBase64) {
        throw new Error("Prepared on-chain claim transaction is unavailable.")
      }
      if (!signTransaction || !connected) {
        throw new Error("Wallet signing is required to continue claim.")
      }

      const transaction = VersionedTransaction.deserialize(
        decodeBase64(preparedClaim.transactionBase64),
      )
      const signedTransaction = await signTransaction(transaction)
      const execution = await executeWalletClaim(
        publicKey.toBase58(),
        stakeId,
        preparedClaim.sessionId,
        encodeBase64(signedTransaction.serialize()),
      )
      setTxUrl(execution.explorerUrl)

      await claimUserStakePosition(publicKey.toBase58(), stakeId, {
        signature: execution.signature,
        explorerUrl: execution.explorerUrl,
      })
      setStatus("success")
      if (onClaimSuccess) {
        onClaimSuccess()
      }
    } catch (error) {
      notifyError({
        title: "Claim Error",
        error,
        fallbackMessage: "Failed to complete claim flow.",
        dedupeKey: `claim-modal:error:${stakeId}`,
      })
      setStatus("idle")
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalSurface
          onBackdropClick={status === "claiming" ? undefined : handleClose}
          panelClassName="bg-[#111111] border border-neutral-800 rounded-xl p-3 w-full max-w-[360px] shadow-2xl pointer-events-auto relative"
        >
              {status !== "claiming" && (
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-3">
                {status === "idle" && (
                  <>
                    <div className="space-y-1.5 pr-6 px-1">
                      <h2 className="text-base font-medium text-white">{CLAIM_MODAL_TEXT.title}</h2>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        {CLAIM_MODAL_TEXT.descriptionPath1}<span className="text-neutral-300">{stake.name}</span>{CLAIM_MODAL_TEXT.descriptionPath2}
                      </p>
                    </div>

                    <div className="bg-[#161616] border border-neutral-800/60 rounded-lg p-3 space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">{CLAIM_MODAL_TEXT.stakedAmount}</span>
                        <span className="text-neutral-300 font-medium">{stake.stakedAmount}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">{CLAIM_MODAL_TEXT.earnedRewards}</span>
                        <span className="text-green-500 font-medium">{stake.earned}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2 px-3 bg-transparent hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {CLAIM_MODAL_TEXT.btnCancel}
                      </button>
                      <button
                        onClick={handleClaim}
                        className="flex-1 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {CLAIM_MODAL_TEXT.btnConfirm}
                      </button>
                    </div>
                  </>
                )}

                {status === "claiming" && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-medium text-white">{CLAIM_MODAL_TEXT.processingTitle}</h3>
                      <p className="text-neutral-500 text-xs">{CLAIM_MODAL_TEXT.processingDesc}</p>
                    </div>
                  </div>
                )}

                {status === "success" && (
                  <div className="py-2 flex flex-col items-center space-y-5">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mt-2">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-medium text-white">{CLAIM_MODAL_TEXT.successTitle}</h3>
                      <p className="text-neutral-400 text-xs">
                        {CLAIM_MODAL_TEXT.successDesc}
                      </p>
                    </div>

                    <div className="w-full flex gap-2 pt-2">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2 px-3 bg-transparent hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {CLAIM_MODAL_TEXT.btnClose}
                      </button>
                      {txUrl ? (
                        <Link
                          href={txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          {CLAIM_MODAL_TEXT.btnViewTx} <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>
                  </div>
                )}
              </div>
        </ModalSurface>
      )}
    </AnimatePresence>
  )
}
