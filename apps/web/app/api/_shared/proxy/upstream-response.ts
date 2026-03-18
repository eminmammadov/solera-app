import { NextResponse } from "next/server"
import {
  applyCookies,
  buildAdminCookieInstruction,
  buildUserCookieInstruction,
  clearAdminCookie,
  clearAdminStateCookie,
  clearUserCookie,
  setAdminStateCookie,
  setBlockedNoticeCookie,
} from "./auth-cookies"
import { clearBackendBaseCache } from "./backend-target"
import { parseBlockedMessageCandidate } from "./blocked-access"
import { ADMIN_AUTH_COOKIE_NAME } from "./constants"
import type { CookieInstruction, ProxyRoutePolicy } from "./types"

const sanitizeProxyResponseHeaders = (
  upstreamHeaders: Headers,
  options?: { stripContentLength?: boolean },
) => {
  const responseHeaders = new Headers(upstreamHeaders)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("transfer-encoding")

  if (options?.stripContentLength) {
    responseHeaders.delete("content-length")
  }

  return responseHeaders
}

const invalidateBackendBaseCacheIfNeeded = (
  policy: ProxyRoutePolicy,
  upstreamOk: boolean,
) => {
  if (policy.shouldInvalidateBackendBaseCache && upstreamOk) {
    clearBackendBaseCache()
  }
}

export const buildAuthVerifyProxyResponse = async (
  upstream: Response,
  policy: ProxyRoutePolicy,
  cookiesToSet: CookieInstruction[],
) => {
  const responseHeaders = sanitizeProxyResponseHeaders(upstream.headers, {
    stripContentLength: true,
  })

  const rawBody = await upstream.text()
  let bodyToSend = rawBody
  let blockedMessage: string | null = null

  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>
    const accessToken =
      parsed && typeof parsed.accessToken === "string" ? parsed.accessToken : null

    if (upstream.ok && accessToken) {
      const authCookie = policy.isAuthVerify
        ? buildAdminCookieInstruction(accessToken)
        : buildUserCookieInstruction(accessToken)
      cookiesToSet.push(authCookie)

      const sanitized = { ...parsed }
      delete sanitized.accessToken
      bodyToSend = JSON.stringify(sanitized)
      responseHeaders.set("content-type", "application/json; charset=utf-8")
    }
  } catch {
    // Keep raw upstream payload when body is not JSON.
  }

  if (policy.isUserAuthVerify && upstream.status === 403) {
    blockedMessage = parseBlockedMessageCandidate(rawBody)
  }

  const response = new NextResponse(bodyToSend, {
    status: upstream.status,
    headers: responseHeaders,
  })

  applyCookies(response, cookiesToSet)
  invalidateBackendBaseCacheIfNeeded(policy, upstream.ok)

  if (blockedMessage) {
    clearUserCookie(response)
    setBlockedNoticeCookie(response, blockedMessage)
  }

  if (policy.isAuthVerify) {
    const adminCookie = cookiesToSet.find(
      (cookie) => cookie.name === ADMIN_AUTH_COOKIE_NAME,
    )
    if (adminCookie) {
      setAdminStateCookie(response, adminCookie.maxAge)
    } else {
      clearAdminStateCookie(response)
    }
  }

  return response
}

export const buildUpstreamProxyResponse = async (
  upstream: Response,
  policy: ProxyRoutePolicy,
  cookiesToSet: CookieInstruction[],
) => {
  const responseHeaders = sanitizeProxyResponseHeaders(upstream.headers)

  let blockedMessage: string | null = null
  if (policy.isUsersPublicRoute && upstream.status === 403) {
    blockedMessage = parseBlockedMessageCandidate(await upstream.clone().text())
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })

  applyCookies(response, cookiesToSet)
  invalidateBackendBaseCacheIfNeeded(policy, upstream.ok)

  if (policy.isAuthMe && upstream.status === 401) {
    clearAdminCookie(response)
    clearAdminStateCookie(response)
  }

  if (upstream.status === 401 && policy.isUsersRoute && !policy.isUsersAdminRoute) {
    clearUserCookie(response)
  }

  if (blockedMessage) {
    clearUserCookie(response)
    setBlockedNoticeCookie(response, blockedMessage)
  }

  return response
}
