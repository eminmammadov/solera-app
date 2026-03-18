import type { NextRequest } from "next/server"

export interface ProxyContext {
  params: Promise<{ path: string[] }>
}

export interface CookieInstruction {
  name: string
  value: string
  maxAge: number
  path?: string
}

export interface ProxyRuntimeConfigResponse {
  effectiveBackendBaseUrl?: string | null
  version?: number
}

export interface NextRequestWithOptionalIp extends NextRequest {
  ip?: string
}

export interface ProxyRoutePolicy {
  path: string[]
  targetPath: string
  hasAdminIntent: boolean
  isAuthLogout: boolean
  isUserAuthLogout: boolean
  isNewsRoute: boolean
  isUsersRoute: boolean
  isUsersAdminRoute: boolean
  isUsersAuthRoute: boolean
  isUsersPublicRoute: boolean
  isAuthVerify: boolean
  isUserAuthVerify: boolean
  isAuthMe: boolean
  shouldInvalidateBackendBaseCache: boolean
}
