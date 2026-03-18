import { adminRequestJson, invalidateAdminApiCache } from "@/lib/api/admin-api"
import { isApiRequestError } from "@/lib/api/api-request"
import { backendRoutes } from "@/lib/api/backend-routes"

export interface AdminAuthUser {
  id: string
  walletAddress: string
  name: string
  role: "SUPER_ADMIN" | "EDITOR" | "VIEWER" | "CUSTOM"
  customRoleName: string | null
  isActive: boolean
}

export const COOKIE_AUTH_TOKEN_MARKER = "__cookie_auth__"
const ADMIN_SESSION_HINT_COOKIE = "solera_admin_state=1"
const ADMIN_SIGNED_OUT_MARKER_KEY = "solera_admin_signed_out"

const isBrowser = () => typeof window !== "undefined"

export const hasAdminSignedOutMarker = () => {
  if (!isBrowser()) return false
  return window.sessionStorage.getItem(ADMIN_SIGNED_OUT_MARKER_KEY) === "1"
}

export const clearAdminSignedOutMarker = () => {
  if (!isBrowser()) return
  window.sessionStorage.removeItem(ADMIN_SIGNED_OUT_MARKER_KEY)
}

export const markAdminSignedOut = () => {
  if (!isBrowser()) return

  window.sessionStorage.setItem(ADMIN_SIGNED_OUT_MARKER_KEY, "1")
  document.cookie = "solera_admin_state=; Max-Age=0; path=/admin; SameSite=Lax"
  document.cookie = "solera_admin_state=; Max-Age=0; path=/; SameSite=Lax"
}

export const hasAdminSessionHint = () => {
  if (hasAdminSignedOutMarker()) return false
  if (typeof document === "undefined") return false
  return document.cookie.split("; ").includes(ADMIN_SESSION_HINT_COOKIE)
}

export const requestAdminAuthNonce = async (walletAddress: string) => {
  const data = await adminRequestJson<{ message?: string }>({
    token: null,
    path: backendRoutes.auth.nonce(walletAddress),
    fallbackMessage: "Authentication service unavailable",
    cacheTtlMs: 0,
    minIntervalMs: 0,
  })

  if (!data?.message) {
    throw new Error("Invalid authentication challenge response")
  }

  return data.message
}

export const verifyAdminWalletSignature = async (
  walletAddress: string,
  signature: string,
  message: string,
) => {
  const data = await adminRequestJson<{ admin?: AdminAuthUser }>({
    token: null,
    path: backendRoutes.auth.verify,
    fallbackMessage: "Authentication failed",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, signature, message }),
  })

  return data.admin ?? null
}

export const fetchAdminSessionProfile = async () =>
  adminRequestJson<AdminAuthUser>({
    token: COOKIE_AUTH_TOKEN_MARKER,
    path: backendRoutes.auth.me,
    fallbackMessage: "Unable to load admin profile",
    cache: "no-store",
    cacheTtlMs: 0,
    minIntervalMs: 0,
  })

export const isAdminUnauthorizedError = (error: unknown) =>
  isApiRequestError(error) && error.status === 401

export const logoutAdminSession = async () => {
  try {
    await adminRequestJson<{ ok?: boolean }>({
      token: COOKIE_AUTH_TOKEN_MARKER,
      path: backendRoutes.auth.logout,
      fallbackMessage: "Logout failed",
      method: "POST",
    })
  } finally {
    markAdminSignedOut()
    invalidateAdminApiCache()
  }
}
