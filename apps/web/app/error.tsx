"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { AppErrorScreen } from "@/app/_shared/AppErrorScreen"
import { notifyError } from "@/lib/ui/ui-feedback"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    notifyError({
      title: "Page Error",
      error,
      fallbackMessage: "Unexpected page error.",
      dedupeKey: `error-boundary:${error.message}`,
      dedupeMs: 20_000,
    })
  }, [error])

  return (
    <AppErrorScreen
      title="Something went wrong"
      description="The page failed to render correctly. You can retry or return to home."
      actionLabel="Retry"
      onAction={reset}
      icon={AlertTriangle}
      iconClassName="text-red-300"
    />
  )
}
