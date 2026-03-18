"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react"
import { useToastStore, type ToastItem, type ToastVariant } from "@/store/ui/use-toast"

const TOAST_VARIANT_STYLES: Record<ToastVariant, string> = {
  error: "border-red-500/30 bg-[#1a0e0e] text-red-100",
  success: "border-emerald-500/30 bg-[#0c1512] text-emerald-100",
  info: "border-neutral-700 bg-[#121212] text-neutral-100",
  warning: "border-amber-500/30 bg-[#1a1408] text-amber-100",
}

const TOAST_VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismissToast = useToastStore((state) => state.dismissToast)
  const Icon = TOAST_VARIANT_ICONS[toast.variant]

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dismissToast(toast.id)
    }, toast.durationMs)

    return () => window.clearTimeout(timer)
  }, [toast.id, toast.durationMs, dismissToast])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`pointer-events-auto w-full rounded-xl border shadow-2xl backdrop-blur-sm ${TOAST_VARIANT_STYLES[toast.variant]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-xs text-neutral-300 leading-relaxed">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.li>
  )
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[130] w-[min(92vw,360px)]">
      <AnimatePresence initial={false}>
        <motion.ul layout className="space-y-2">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} />
          ))}
        </motion.ul>
      </AnimatePresence>
    </div>
  )
}
