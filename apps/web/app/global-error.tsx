"use client"

import { useEffect } from "react"
import { AlertOctagon } from "lucide-react"
import { AppErrorScreen } from "@/app/_shared/AppErrorScreen"
import { notifyError } from "@/lib/ui/ui-feedback"

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    notifyError({
      title: "Critical Application Error",
      error,
      fallbackMessage: "Unexpected global application error.",
      dedupeKey: `global-error:${error.message}`,
      dedupeMs: 20_000,
    })
  }, [error])

  return (
    <AppErrorScreen
      title="Critical Error"
      description="The application encountered a critical error. Try a reset or return to home."
      actionLabel="Reset"
      onAction={reset}
      icon={AlertOctagon}
      iconClassName="text-red-300"
      withHtmlBody
    />
  )
}
