"use client"

import { useEffect } from "react"
import { notifyError, notifySuccess } from "@/lib/ui/ui-feedback"

interface UseFeedbackToastOptions {
  scope: string
  error?: string | null
  success?: string | null
  errorTitle?: string
  successTitle?: string
  errorDedupeMs?: number
  successDedupeMs?: number
}

export const useFeedbackToast = ({
  scope,
  error,
  success,
  errorTitle = "Action failed",
  successTitle = "Completed",
  errorDedupeMs = 8_000,
  successDedupeMs = 2_000,
}: UseFeedbackToastOptions) => {
  useEffect(() => {
    if (!error) return
    notifyError({
      title: errorTitle,
      description: error,
      dedupeKey: `${scope}:error:${error}`,
      dedupeMs: errorDedupeMs,
    })
  }, [error, errorDedupeMs, errorTitle, scope])

  useEffect(() => {
    if (!success) return
    notifySuccess({
      title: successTitle,
      description: success,
      dedupeKey: `${scope}:success:${success}`,
      dedupeMs: successDedupeMs,
    })
  }, [scope, success, successDedupeMs, successTitle])
}
