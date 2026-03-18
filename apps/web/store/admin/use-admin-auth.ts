import { create } from "zustand"
import {
  clearAdminSignedOutMarker,
  COOKIE_AUTH_TOKEN_MARKER,
  fetchAdminSessionProfile,
  hasAdminSessionHint,
  hasAdminSignedOutMarker,
  isAdminUnauthorizedError,
  logoutAdminSession,
  markAdminSignedOut,
  requestAdminAuthNonce,
  type AdminAuthUser,
  verifyAdminWalletSignature,
} from "@/lib/auth/admin-auth-client"

interface AdminAuthState {
  // Marker to keep compatibility with legacy admin pages that still read `token`.
  token: string | null
  admin: AdminAuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null

  getNonce: (walletAddress: string) => Promise<string>
  verifyWallet: (
    walletAddress: string,
    signature: string,
    message: string,
  ) => Promise<boolean>
  loadProfile: (force?: boolean) => Promise<void>
  logout: () => Promise<void>
}

export const useAdminAuth = create<AdminAuthState>((set) => ({
  token: null,
  admin: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  getNonce: async (walletAddress: string) => {
    try {
      const message = await requestAdminAuthNonce(walletAddress)
      return message
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to connect auth service. Check API endpoint and backend status."
      set({ error: message })
      throw new Error(message)
    }
  },

  verifyWallet: async (walletAddress: string, signature: string, message: string) => {
    set({ isLoading: true, error: null })

    try {
      const admin = await verifyAdminWalletSignature(walletAddress, signature, message)
      clearAdminSignedOutMarker()
      set({
        token: COOKIE_AUTH_TOKEN_MARKER,
        admin,
        isAuthenticated: Boolean(admin),
        isLoading: false,
        error: null,
      })
      return Boolean(admin)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed"
      set({
        isLoading: false,
        error: message,
        token: null,
        isAuthenticated: false,
        admin: null,
      })
      return false
    }
  },

  loadProfile: async (force = false) => {
    if (hasAdminSignedOutMarker()) {
      set({
        token: null,
        admin: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      return
    }

    if (!force && !hasAdminSessionHint()) {
      set({
        token: null,
        admin: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const admin = await fetchAdminSessionProfile()
      clearAdminSignedOutMarker()
      set({
        admin,
        isAuthenticated: true,
        isLoading: false,
        token: COOKIE_AUTH_TOKEN_MARKER,
      })
    } catch (error) {
      if (isAdminUnauthorizedError(error)) {
        set({
          token: null,
          admin: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
        return
      }

      const message =
        error instanceof Error ? error.message : "Unable to load admin profile"
      set({
        token: null,
        admin: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      })
    }
  },

  logout: async () => {
    markAdminSignedOut()
    try {
      await logoutAdminSession()
    } catch {
      // Best-effort cookie clear request.
    } finally {
      set({ token: null, admin: null, isAuthenticated: false, error: null })
    }
  },
}))
