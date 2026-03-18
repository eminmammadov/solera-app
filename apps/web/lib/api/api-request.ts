import { readHttpErrorMessage } from "@/lib/api/http-error"

export class ApiRequestError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null, options?: { cause?: unknown }) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    if (options?.cause) {
      // Keep original error for diagnostics in supported runtimes.
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError =>
  error instanceof ApiRequestError

interface RequestPolicyOptions {
  dedupe?: boolean
  dedupeKey?: string
  cacheTtlMs?: number
  minIntervalMs?: number
}

export interface RequestJsonOptions extends RequestInit {
  fallbackMessage: string
  networkMessage?: string
  timeoutMs?: number
  policy?: RequestPolicyOptions
}

const DEFAULT_REQUEST_TIMEOUT_MS = 12_000
const inFlightRequests = new Map<string, Promise<unknown>>()
const responseCache = new Map<string, { expiresAt: number; value: unknown }>()
const lastRequestAt = new Map<string, number>()

const normalizeMethod = (method: string | undefined) => (method ?? "GET").toUpperCase()

const isFreshCacheEntry = (
  entry: { expiresAt: number; value: unknown } | undefined,
  now: number,
) => Boolean(entry && entry.expiresAt > now)

const pruneExpiredCacheEntries = (now: number) => {
  if (responseCache.size === 0) return
  for (const [key, entry] of responseCache.entries()) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key)
    }
  }
}

export const clearRequestJsonRuntimeCache = () => {
  inFlightRequests.clear()
  responseCache.clear()
  lastRequestAt.clear()
}

export const requestJson = async <TResponse>(
  url: string,
  options: RequestJsonOptions,
): Promise<TResponse> => {
  const {
    fallbackMessage,
    networkMessage,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    policy,
    signal: providedSignal,
    ...fetchInit
  } = options
  const method = normalizeMethod(fetchInit.method)

  // Mutations invalidate response memoization to avoid stale admin panels.
  if (method !== "GET") {
    responseCache.clear()
  }

  const dedupeEnabled = method === "GET" && (policy?.dedupe ?? true)
  const cacheTtlMs = method === "GET" ? Math.max(0, policy?.cacheTtlMs ?? 0) : 0
  const minIntervalMs = method === "GET" ? Math.max(0, policy?.minIntervalMs ?? 0) : 0

  const dedupeKey = `${method}:${policy?.dedupeKey ?? url}`
  const cacheKey = `${method}:${url}`
  const now = Date.now()
  pruneExpiredCacheEntries(now)

  const cached = responseCache.get(cacheKey)
  if (isFreshCacheEntry(cached, now)) {
    return cached!.value as TResponse
  }

  if (minIntervalMs > 0) {
    const lastAt = lastRequestAt.get(dedupeKey)
    if (
      typeof lastAt === "number" &&
      now - lastAt < minIntervalMs &&
      cached
    ) {
      return cached.value as TResponse
    }
  }

  if (dedupeEnabled) {
    const inFlight = inFlightRequests.get(cacheKey)
    if (inFlight) {
      return inFlight as Promise<TResponse>
    }
  }

  lastRequestAt.set(dedupeKey, now)

  const runRequest = async (): Promise<TResponse> => {
    const abortController = new AbortController()
    const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    const timeoutId = hasTimeout
      ? setTimeout(() => abortController.abort(), timeoutMs)
      : null
    const handleProvidedAbort = () => abortController.abort()

    if (providedSignal) {
      if (providedSignal.aborted) {
        abortController.abort()
      } else {
        providedSignal.addEventListener("abort", handleProvidedAbort, { once: true })
      }
    }

    try {
      const response = await fetch(url, { ...fetchInit, method, signal: abortController.signal })
      if (!response.ok) {
        const message = await readHttpErrorMessage(response, fallbackMessage)
        throw new ApiRequestError(message, response.status)
      }

      const payload = (await response.json()) as TResponse
      if (cacheTtlMs > 0 && method === "GET") {
        responseCache.set(cacheKey, {
          value: payload,
          expiresAt: Date.now() + cacheTtlMs,
        })
      }
      return payload
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw error
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiRequestError(
          networkMessage ?? "Request timed out. Please try again.",
          null,
          { cause: error },
        )
      }

      throw new ApiRequestError(networkMessage ?? fallbackMessage, null, {
        cause: error,
      })
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (providedSignal) {
        providedSignal.removeEventListener("abort", handleProvidedAbort)
      }
    }
  }

  const requestPromise = runRequest().finally(() => {
    inFlightRequests.delete(cacheKey)
  })

  if (dedupeEnabled) {
    inFlightRequests.set(cacheKey, requestPromise as Promise<unknown>)
  }

  return requestPromise
}
