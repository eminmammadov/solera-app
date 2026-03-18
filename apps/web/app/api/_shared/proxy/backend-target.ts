import { DEFAULT_BACKEND_BASE_URL, BACKEND_BASE_CACHE_TTL_MS, SOLERA_PROXY_SHARED_KEY } from "./constants"
import type { ProxyRuntimeConfigResponse } from "./types"

let backendBaseCache: { value: string; expiresAt: number } | null = null

const getBackendBaseUrlValidationError = (value: string): string | null => {
  if (!value) {
    return "SOLERA_API_INTERNAL_URL is not configured."
  }

  if (value.includes("/api/backend")) {
    return "Invalid SOLERA_API_INTERNAL_URL: must point to backend API (e.g. https://api.example.com/api), not /api/backend."
  }

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Invalid SOLERA_API_INTERNAL_URL: must start with http:// or https://."
    }
    return null
  } catch {
    return "Invalid SOLERA_API_INTERNAL_URL: must be a valid absolute URL."
  }
}

const normalizeBackendBaseUrl = (value: string) => value.trim().replace(/\/+$/, "")

export const clearBackendBaseCache = () => {
  backendBaseCache = null
}

const readRuntimeBackendBaseUrl = (
  payload: ProxyRuntimeConfigResponse,
): string | null => {
  const rawValue = payload?.effectiveBackendBaseUrl
  if (typeof rawValue !== "string") return null

  const normalized = normalizeBackendBaseUrl(rawValue)
  if (!normalized) return null
  if (getBackendBaseUrlValidationError(normalized)) {
    return null
  }

  return normalized
}

export const resolveBackendBaseUrl = async (): Promise<string> => {
  const defaultValidationError = getBackendBaseUrlValidationError(
    DEFAULT_BACKEND_BASE_URL,
  )
  if (defaultValidationError) {
    throw new Error(defaultValidationError)
  }

  if (!SOLERA_PROXY_SHARED_KEY) {
    throw new Error(
      "SOLERA_PROXY_SHARED_KEY is not configured. Define it in environment variables.",
    )
  }

  const now = Date.now()
  if (backendBaseCache && backendBaseCache.expiresAt > now) {
    return backendBaseCache.value
  }

  let resolvedBaseUrl = DEFAULT_BACKEND_BASE_URL

  try {
    const runtimeUrl = new URL(
      `${DEFAULT_BACKEND_BASE_URL}/system/proxy-backend/runtime`,
    )

    const runtimeResponse = await fetch(runtimeUrl.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-solera-proxy-key": SOLERA_PROXY_SHARED_KEY,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    })

    if (runtimeResponse.ok) {
      const payload = (await runtimeResponse.json()) as ProxyRuntimeConfigResponse
      const runtimeBaseUrl = readRuntimeBackendBaseUrl(payload)
      if (runtimeBaseUrl) {
        resolvedBaseUrl = runtimeBaseUrl
      }
    }
  } catch {
    // Fail-open with env-based backend target when runtime config fetch fails.
  }

  backendBaseCache = {
    value: resolvedBaseUrl,
    expiresAt: now + BACKEND_BASE_CACHE_TTL_MS,
  }

  return resolvedBaseUrl
}
