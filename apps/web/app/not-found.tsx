import Link from "next/link"
import { SearchX } from "lucide-react"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#111111] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-amber-300">
          <SearchX className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Page Not Found</h1>
        </div>
        <p className="mt-3 text-sm text-neutral-400">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Go Home
          </Link>
          <Link
            href="/docs"
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500"
          >
            Open Docs
          </Link>
        </div>
      </div>
    </div>
  )
}
