"use client"

import Link from "next/link"
import { LucideIcon, RefreshCw } from "lucide-react"

interface AppErrorScreenProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  icon: LucideIcon
  iconClassName: string
  withHtmlBody?: boolean
}

function AppErrorScreenBody({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  iconClassName,
}: Omit<AppErrorScreenProps, "withHtmlBody">) {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#111111] p-6 sm:p-8">
        <div className={`flex items-center gap-2 ${iconClassName}`}>
          <Icon className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <p className="mt-3 text-sm text-neutral-400">{description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            {actionLabel}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-neutral-700 hover:border-neutral-500 text-sm text-neutral-200 px-3 py-2 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export function AppErrorScreen({
  withHtmlBody = false,
  ...props
}: AppErrorScreenProps) {
  if (withHtmlBody) {
    return (
      <html lang="en">
        <body>
          <AppErrorScreenBody {...props} />
        </body>
      </html>
    )
  }

  return <AppErrorScreenBody {...props} />
}
