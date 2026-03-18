const ABSOLUTE_URL_PATTERN = /^https?:\/\//i
const NEXT_IMAGE_PROXY_PATH = "/_next/image"

const unwrapNextImageProxyUrl = (value: string): string => {
  try {
    const parsed = new URL(value)
    if (parsed.pathname !== NEXT_IMAGE_PROXY_PATH) return value

    const wrappedUrl = parsed.searchParams.get("url")
    if (!wrappedUrl) return value

    const decoded = decodeURIComponent(wrappedUrl).trim()
    return decoded || value
  } catch {
    return value
  }
}

export const normalizeImageSrc = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("data:")) return null
  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    const unwrapped = unwrapNextImageProxyUrl(trimmed)
    if (unwrapped !== trimmed) {
      return normalizeImageSrc(unwrapped)
    }
    return trimmed
  }
  if (trimmed.startsWith("/")) return trimmed
  if (trimmed.includes("://")) return null

  return `/${trimmed.replace(/^\/+/, "")}`
}
