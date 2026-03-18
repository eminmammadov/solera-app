import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import {
  NEWS_CLIENT_COOKIE_MAX_AGE_SECONDS,
  NEWS_CLIENT_COOKIE_NAME,
  NEWS_CLIENT_ID_SECRET,
  ROOT_COOKIE_PATH,
} from "./constants"
import type { CookieInstruction } from "./types"

const signValue = (value: string) =>
  createHmac("sha256", NEWS_CLIENT_ID_SECRET).update(value).digest("base64url")

const buildSignedNewsCookie = (clientId: string) =>
  `${clientId}.${signValue(clientId)}`

const verifySignedNewsCookie = (signedValue: string): string | null => {
  const [clientId, signature] = signedValue.split(".")
  if (!clientId || !signature) {
    return null
  }

  if (!/^[A-Za-z0-9_-]{16,128}$/.test(clientId)) {
    return null
  }

  const expected = signValue(clientId)
  const expectedBuffer = Buffer.from(expected, "utf8")
  const providedBuffer = Buffer.from(signature, "utf8")

  if (expectedBuffer.length !== providedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null
  }

  return clientId
}

export const getOrIssueNewsClientId = (
  req: NextRequest,
): { clientId: string; cookieInstruction?: CookieInstruction } => {
  if (!NEWS_CLIENT_ID_SECRET) {
    throw new Error(
      "NEWS_CLIENT_ID_SECRET is required for news client tracking. Define it in environment variables.",
    )
  }

  const existing = req.cookies.get(NEWS_CLIENT_COOKIE_NAME)?.value
  if (existing) {
    const validClientId = verifySignedNewsCookie(existing)
    if (validClientId) {
      return { clientId: validClientId }
    }
  }

  const nextClientId = randomBytes(18).toString("base64url")
  return {
    clientId: nextClientId,
    cookieInstruction: {
      name: NEWS_CLIENT_COOKIE_NAME,
      value: buildSignedNewsCookie(nextClientId),
      maxAge: NEWS_CLIENT_COOKIE_MAX_AGE_SECONDS,
      path: ROOT_COOKIE_PATH,
    },
  }
}
