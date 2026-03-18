"use client"

import { useEffect } from "react"
import { notifyError } from "@/lib/ui/ui-feedback"

const isIgnorableRuntimeError = (message: string) => {
  const normalized = message.toLowerCase()
  if (!normalized) return true

  return (
    normalized.includes("resizeobserver loop") ||
    normalized.includes("chrome-extension://") ||
    normalized.includes("script error")
  )
}

const toReasonMessage = (reason: unknown) => {
  if (reason instanceof Error && reason.message) return reason.message
  if (typeof reason === "string") return reason
  try {
    return JSON.stringify(reason)
  } catch {
    return "Unknown promise rejection."
  }
}

export function GlobalErrorListener() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message?.trim() || "Unexpected runtime error."
      if (isIgnorableRuntimeError(message)) return

      notifyError({
        title: "Unexpected Error",
        description: message,
        dedupeKey: `runtime:error:${message}`,
        dedupeMs: 20_000,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = toReasonMessage(event.reason).trim()
      if (isIgnorableRuntimeError(message)) return

      notifyError({
        title: "Unhandled Promise Rejection",
        description: message || "Unexpected async runtime failure.",
        dedupeKey: `runtime:rejection:${message}`,
        dedupeMs: 20_000,
      })
    }

    window.addEventListener("error", handleWindowError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleWindowError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
