import { isApiRequestError } from "@/lib/api/api-request"
import { notify, type ToastVariant } from "@/store/ui/use-toast"

interface NotifyFeedbackOptions {
  title: string
  description?: string | null
  dedupeKey?: string
  dedupeMs?: number
}

interface NotifyErrorOptions extends NotifyFeedbackOptions {
  error?: unknown
  fallbackMessage?: string
}

const DEFAULT_DEDUPE_MS = 4_000
const MAX_NOTIFICATION_CACHE_SIZE = 500
const notificationCache = new Map<string, number>()

const buildFallbackDedupeKey = (
  variant: ToastVariant,
  title: string,
  description?: string | null,
) => `${variant}:${title}:${(description ?? "").trim()}`

const shouldNotify = (key: string, dedupeMs: number) => {
  const now = Date.now()

  if (notificationCache.size > MAX_NOTIFICATION_CACHE_SIZE) {
    const oldestKey = notificationCache.keys().next().value
    if (oldestKey) {
      notificationCache.delete(oldestKey)
    }
  }

  const lastAt = notificationCache.get(key) ?? 0
  if (now - lastAt < dedupeMs) return false

  notificationCache.set(key, now)
  return true
}

const normalizeDescription = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const notifyFeedback = (
  variant: ToastVariant,
  { title, description, dedupeKey, dedupeMs = DEFAULT_DEDUPE_MS }: NotifyFeedbackOptions,
) => {
  const normalizedDescription = normalizeDescription(description)
  const cacheKey =
    dedupeKey ?? buildFallbackDedupeKey(variant, title, normalizedDescription)
  if (!shouldNotify(cacheKey, Math.max(0, dedupeMs))) return

  notify({
    variant,
    title,
    description: normalizedDescription,
  })
}

export const toErrorMessage = (
  error: unknown,
  fallbackMessage = "Request failed.",
) => {
  if (isApiRequestError(error) && typeof error.message === "string") {
    return error.message
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return fallbackMessage
}

export const notifyError = ({
  title,
  error,
  description,
  fallbackMessage = "Request failed.",
  dedupeKey,
  dedupeMs = 8_000,
}: NotifyErrorOptions) => {
  const message = normalizeDescription(description) ?? toErrorMessage(error, fallbackMessage)
  notifyFeedback("error", {
    title,
    description: message,
    dedupeKey,
    dedupeMs,
  })
}

export const notifySuccess = (options: NotifyFeedbackOptions) => {
  notifyFeedback("success", options)
}

export const notifyWarning = (options: NotifyFeedbackOptions) => {
  notifyFeedback("warning", options)
}

export const notifyInfo = (options: NotifyFeedbackOptions) => {
  notifyFeedback("info", options)
}
