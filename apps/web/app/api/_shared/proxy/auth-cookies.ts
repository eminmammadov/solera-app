import { NextResponse } from "next/server"
import {
  BLOCKED_ACCESS_NOTICE_COOKIE_MAX_AGE_SECONDS,
  BLOCKED_ACCESS_NOTICE_COOKIE_NAME,
  sanitizeBlockedAccessMessage,
} from "@/lib/access/blocked-access-notice-shared"
import {
  ADMIN_AUTH_COOKIE_MAX_AGE_SECONDS,
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_AUTH_STATE_COOKIE_NAME,
  ADMIN_AUTH_STATE_COOKIE_VALUE,
  ADMIN_COOKIE_PATH,
  COOKIE_SECURE,
  ROOT_COOKIE_PATH,
  USER_AUTH_COOKIE_MAX_AGE_SECONDS,
  USER_AUTH_COOKIE_NAME,
} from "./constants"
import type { CookieInstruction } from "./types"

const readJwtExpiry = (token: string): number | null => {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payloadRaw = Buffer.from(parts[1], "base64url").toString("utf8")
    const payload = JSON.parse(payloadRaw) as { exp?: unknown }
    return typeof payload.exp === "number" ? payload.exp : null
  } catch {
    return null
  }
}

export const buildAdminCookieInstruction = (
  accessToken: string,
): CookieInstruction => {
  const nowEpoch = Math.floor(Date.now() / 1000)
  const exp = readJwtExpiry(accessToken)
  const ttlFromToken =
    typeof exp === "number" && exp > nowEpoch ? exp - nowEpoch : null

  const maxAge =
    ttlFromToken && Number.isFinite(ttlFromToken) && ttlFromToken > 0
      ? Math.min(ttlFromToken, ADMIN_AUTH_COOKIE_MAX_AGE_SECONDS)
      : ADMIN_AUTH_COOKIE_MAX_AGE_SECONDS

  return {
    name: ADMIN_AUTH_COOKIE_NAME,
    value: accessToken,
    maxAge,
    path: ADMIN_COOKIE_PATH,
  }
}

export const buildUserCookieInstruction = (
  accessToken: string,
): CookieInstruction => {
  const nowEpoch = Math.floor(Date.now() / 1000)
  const exp = readJwtExpiry(accessToken)
  const ttlFromToken =
    typeof exp === "number" && exp > nowEpoch ? exp - nowEpoch : null

  const maxAge =
    ttlFromToken && Number.isFinite(ttlFromToken) && ttlFromToken > 0
      ? Math.min(ttlFromToken, USER_AUTH_COOKIE_MAX_AGE_SECONDS)
      : USER_AUTH_COOKIE_MAX_AGE_SECONDS

  return {
    name: USER_AUTH_COOKIE_NAME,
    value: accessToken,
    maxAge,
    path: ROOT_COOKIE_PATH,
  }
}

export const applyCookies = (
  response: NextResponse,
  instructions: CookieInstruction[],
) => {
  instructions.forEach((instruction) => {
    response.cookies.set({
      name: instruction.name,
      value: instruction.value,
      maxAge: instruction.maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      path: instruction.path ?? ROOT_COOKIE_PATH,
    })
  })
}

export const clearAdminCookie = (response: NextResponse) => {
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ADMIN_COOKIE_PATH,
  })
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ROOT_COOKIE_PATH,
  })
}

export const clearUserCookie = (response: NextResponse) => {
  response.cookies.set({
    name: USER_AUTH_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ROOT_COOKIE_PATH,
  })
}

export const setBlockedNoticeCookie = (
  response: NextResponse,
  message?: string | null,
) => {
  response.cookies.set({
    name: BLOCKED_ACCESS_NOTICE_COOKIE_NAME,
    value: encodeURIComponent(sanitizeBlockedAccessMessage(message)),
    maxAge: BLOCKED_ACCESS_NOTICE_COOKIE_MAX_AGE_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ROOT_COOKIE_PATH,
  })
}

export const setAdminStateCookie = (
  response: NextResponse,
  maxAge: number,
) => {
  response.cookies.set({
    name: ADMIN_AUTH_STATE_COOKIE_NAME,
    value: ADMIN_AUTH_STATE_COOKIE_VALUE,
    maxAge,
    httpOnly: false,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ADMIN_COOKIE_PATH,
  })
}

export const clearAdminStateCookie = (response: NextResponse) => {
  response.cookies.set({
    name: ADMIN_AUTH_STATE_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: false,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ADMIN_COOKIE_PATH,
  })
  response.cookies.set({
    name: ADMIN_AUTH_STATE_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: false,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: ROOT_COOKIE_PATH,
  })
}
