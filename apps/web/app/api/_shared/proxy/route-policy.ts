import type { NextRequest } from "next/server"
import type { ProxyRoutePolicy } from "./types"

export const buildProxyRoutePolicy = (
  req: NextRequest,
  path: string[],
): ProxyRoutePolicy => {
  const isUsersRoute = path[0] === "users"
  const isUsersAdminRoute = isUsersRoute && path[1] === "admin"
  const isUsersAuthRoute = isUsersRoute && path[1] === "auth"

  return {
    path,
    targetPath: path.join("/"),
    hasAdminIntent: req.headers.get("x-solera-admin-intent") === "1",
    isAuthLogout:
      req.method === "POST" && path[0] === "auth" && path[1] === "logout",
    isUserAuthLogout:
      req.method === "POST" &&
      path[0] === "users" &&
      path[1] === "auth" &&
      path[2] === "logout",
    isNewsRoute: path[0] === "news",
    isUsersRoute,
    isUsersAdminRoute,
    isUsersAuthRoute,
    isUsersPublicRoute: isUsersRoute && !isUsersAdminRoute,
    isAuthVerify:
      req.method === "POST" && path[0] === "auth" && path[1] === "verify",
    isUserAuthVerify:
      req.method === "POST" &&
      path[0] === "users" &&
      path[1] === "auth" &&
      path[2] === "verify",
    isAuthMe: req.method === "GET" && path[0] === "auth" && path[1] === "me",
    shouldInvalidateBackendBaseCache:
      path[0] === "system" &&
      path[1] === "proxy-backend" &&
      (path[2] === "draft" || path[2] === "publish" || path[2] === "rollback"),
  }
}
