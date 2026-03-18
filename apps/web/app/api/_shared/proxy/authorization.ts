import type { NextRequest } from "next/server"
import {
  ADMIN_AUTH_COOKIE_NAME,
  USER_AUTH_COOKIE_NAME,
} from "./constants"
import type { ProxyRoutePolicy } from "./types"

export const applyProxyAuthorization = (
  req: NextRequest,
  forwardedHeaders: Headers,
  policy: ProxyRoutePolicy,
) => {
  if (forwardedHeaders.has("authorization")) {
    return
  }

  const shouldUseUserToken =
    policy.isUsersRoute && !policy.isUsersAdminRoute && !policy.isUsersAuthRoute
  const shouldUseAdminToken = policy.hasAdminIntent

  if (shouldUseUserToken) {
    const userToken = req.cookies.get(USER_AUTH_COOKIE_NAME)?.value
    if (userToken) {
      forwardedHeaders.set("authorization", `Bearer ${userToken}`)
    }
  }

  if (shouldUseAdminToken && !forwardedHeaders.has("authorization")) {
    const adminToken = req.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value
    if (adminToken) {
      forwardedHeaders.set("authorization", `Bearer ${adminToken}`)
    }
  }
}
