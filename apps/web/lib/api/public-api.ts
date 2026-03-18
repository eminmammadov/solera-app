import { API_BASE_URL } from "@/lib/config/api"
import { ApiRequestError } from "@/lib/api/api-request"
import {
  clearRequestJsonRuntimeCache,
  requestJson,
  type RequestJsonOptions,
} from "@/lib/api/api-request"

type PublicMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

interface PublicRequestJsonOptions
  extends Omit<
    RequestJsonOptions,
    "fallbackMessage" | "headers" | "method" | "policy"
  > {
  path: string
  fallbackMessage: string
  method?: PublicMethod
  headers?: Record<string, string>
  cacheTtlMs?: number
  minIntervalMs?: number
  dedupe?: boolean
  dedupeKey?: string
}

const DEFAULT_PUBLIC_GET_CACHE_TTL_MS = 2_000
const DEFAULT_PUBLIC_GET_MIN_INTERVAL_MS = 250
const DEFAULT_PUBLIC_REQUEST_TIMEOUT_MS = 12_000

const normalizePath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`

export const buildPublicApiUrl = (path: string) =>
  `${API_BASE_URL}${normalizePath(path)}`

export const invalidatePublicApiCache = () => {
  clearRequestJsonRuntimeCache()
}

export const publicRequestJson = async <TResponse>({
  path,
  fallbackMessage,
  method = "GET",
  headers,
  cacheTtlMs = DEFAULT_PUBLIC_GET_CACHE_TTL_MS,
  minIntervalMs = DEFAULT_PUBLIC_GET_MIN_INTERVAL_MS,
  dedupe = true,
  dedupeKey,
  cache,
  ...rest
}: PublicRequestJsonOptions): Promise<TResponse> => {
  const normalizedMethod = method.toUpperCase() as PublicMethod
  const isGet = normalizedMethod === "GET"

  return requestJson<TResponse>(buildPublicApiUrl(path), {
    ...rest,
    method: normalizedMethod,
    fallbackMessage,
    headers,
    cache: cache ?? (isGet ? "no-store" : undefined),
    policy: isGet
      ? {
          dedupe,
          dedupeKey,
          cacheTtlMs,
          minIntervalMs,
        }
      : undefined,
  })
}

interface PublicRequestOptions extends RequestInit {
  method?: PublicMethod
  timeoutMs?: number
  networkMessage?: string
}

export const publicRequest = async (
  path: string,
  {
    method = "GET",
    timeoutMs = DEFAULT_PUBLIC_REQUEST_TIMEOUT_MS,
    signal: providedSignal,
    networkMessage = "Request failed.",
    ...init
  }: PublicRequestOptions = {},
): Promise<Response> => {
  const abortController = new AbortController()
  const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
  const timeoutId = hasTimeout ? setTimeout(() => abortController.abort(), timeoutMs) : null
  const handleProvidedAbort = () => abortController.abort()

  if (providedSignal) {
    if (providedSignal.aborted) {
      abortController.abort()
    } else {
      providedSignal.addEventListener("abort", handleProvidedAbort, { once: true })
    }
  }

  try {
    return await fetch(buildPublicApiUrl(path), {
      ...init,
      method: method.toUpperCase(),
      signal: abortController.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiRequestError("Request timed out. Please try again.", null, {
        cause: error,
      })
    }

    throw new ApiRequestError(networkMessage, null, { cause: error })
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (providedSignal) {
      providedSignal.removeEventListener("abort", handleProvidedAbort)
    }
  }
}
