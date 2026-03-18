import { API_BASE_URL } from "@/lib/config/api"
import { buildAdminAuthHeader } from "@/lib/auth/admin-auth-header"
import { readHttpErrorMessage } from "@/lib/api/http-error"
import {
  ApiRequestError,
  clearRequestJsonRuntimeCache,
  requestJson,
  type RequestJsonOptions,
} from "@/lib/api/api-request"

type AdminMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

interface AdminRequestJsonOptions
  extends Omit<RequestJsonOptions, "fallbackMessage" | "headers" | "credentials" | "method" | "policy"> {
  token: string | null
  path: string
  fallbackMessage: string
  method?: AdminMethod
  headers?: Record<string, string>
  cacheTtlMs?: number
  minIntervalMs?: number
  dedupe?: boolean
  dedupeKey?: string
}

const DEFAULT_ADMIN_GET_CACHE_TTL_MS = 2_500
const DEFAULT_ADMIN_GET_MIN_INTERVAL_MS = 400
const ADMIN_API_BASE_URL =
  typeof window === "undefined" ? API_BASE_URL : "/admin/api/backend"

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`)

export const invalidateAdminApiCache = () => {
  clearRequestJsonRuntimeCache()
}

export const adminRequestJson = async <TResponse>({
  token,
  path,
  fallbackMessage,
  method = "GET",
  headers,
  cacheTtlMs = DEFAULT_ADMIN_GET_CACHE_TTL_MS,
  minIntervalMs = DEFAULT_ADMIN_GET_MIN_INTERVAL_MS,
  dedupe = true,
  dedupeKey,
  cache,
  ...rest
}: AdminRequestJsonOptions): Promise<TResponse> => {
  const normalizedPath = normalizePath(path)
  const normalizedMethod = method.toUpperCase() as AdminMethod
  const isGet = normalizedMethod === "GET"

  return requestJson<TResponse>(`${ADMIN_API_BASE_URL}${normalizedPath}`, {
    ...rest,
    method: normalizedMethod,
    fallbackMessage,
    headers: {
      "x-solera-admin-intent": "1",
      ...buildAdminAuthHeader(token),
      ...headers,
    },
    credentials: "include",
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

interface AdminRequestBlobOptions {
  token: string | null
  path: string
  fallbackMessage: string
  headers?: Record<string, string>
}

export const adminRequestBlob = async ({
  token,
  path,
  fallbackMessage,
  headers,
}: AdminRequestBlobOptions): Promise<Blob> => {
  const normalizedPath = normalizePath(path)
  const response = await fetch(`${ADMIN_API_BASE_URL}${normalizedPath}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      "x-solera-admin-intent": "1",
      ...buildAdminAuthHeader(token),
      ...headers,
    },
  })

  if (!response.ok) {
    const message = await readHttpErrorMessage(response, fallbackMessage)
    throw new ApiRequestError(message, response.status)
  }

  return response.blob()
}
