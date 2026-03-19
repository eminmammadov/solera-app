import { isProductionRuntime, readOptionalEnv } from "@/lib/config/env"

export const FORWARDED_HEADER_ALLOWLIST = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "origin",
  "referer",
  "user-agent",
  "x-request-id",
  "x-correlation-id",
] as const

export const DEFAULT_BACKEND_BASE_URL = (readOptionalEnv("SOLERA_API_INTERNAL_URL") ?? "")
  .trim()
  .replace(/\/+$/, "")

export const BACKEND_BASE_CACHE_TTL_MS = 15_000

export const ADMIN_AUTH_COOKIE_NAME = "solera_admin_token"
export const ADMIN_AUTH_STATE_COOKIE_NAME = "solera_admin_state"
export const ADMIN_AUTH_STATE_COOKIE_VALUE = "1"
export const USER_AUTH_COOKIE_NAME = "solera_user_token"
export const NEWS_CLIENT_COOKIE_NAME = "solera_news_vid"
export const ADMIN_COOKIE_PATH = "/admin"
export const ROOT_COOKIE_PATH = "/"
export const ADMIN_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24
export const USER_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
export const NEWS_CLIENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180
export const COOKIE_SECURE = isProductionRuntime()
export const NEWS_CLIENT_ID_SECRET = readOptionalEnv("NEWS_CLIENT_ID_SECRET") || ""
export const SOLERA_PROXY_SHARED_KEY =
  readOptionalEnv("SOLERA_PROXY_SHARED_KEY") || ""
