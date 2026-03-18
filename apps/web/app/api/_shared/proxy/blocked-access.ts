import { sanitizeBlockedAccessMessage } from "@/lib/access/blocked-access-notice-shared"

export const parseBlockedMessageCandidate = (rawBody: string): string | null => {
  const trimmed = rawBody.trim()
  if (!trimmed) return null

  let candidate: string | null = null
  try {
    const parsed = JSON.parse(trimmed) as {
      message?: unknown
      reason?: unknown
      error?: unknown
    }

    if (typeof parsed.message === "string") {
      candidate = parsed.message
    } else if (typeof parsed.reason === "string") {
      candidate = parsed.reason
    } else if (typeof parsed.error === "string") {
      candidate = parsed.error
    }
  } catch {
    candidate = trimmed
  }

  const normalized = candidate?.toLowerCase()
  if (!normalized) return null

  if (!normalized.includes("blocked") && !normalized.includes("block@solera.work")) {
    return null
  }

  return sanitizeBlockedAccessMessage(candidate)
}
