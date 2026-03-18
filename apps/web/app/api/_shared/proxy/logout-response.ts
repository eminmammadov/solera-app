import { NextResponse } from "next/server"
import {
  clearAdminCookie,
  clearAdminStateCookie,
  clearUserCookie,
} from "./auth-cookies"
import type { ProxyRoutePolicy } from "./types"

export const buildProxyLogoutResponse = (
  policy: ProxyRoutePolicy,
): NextResponse | null => {
  if (policy.isAuthLogout) {
    const response = NextResponse.json({ ok: true }, { status: 200 })
    clearAdminCookie(response)
    clearAdminStateCookie(response)
    return response
  }

  if (policy.isUserAuthLogout) {
    const response = NextResponse.json({ ok: true }, { status: 200 })
    clearUserCookie(response)
    return response
  }

  return null
}
