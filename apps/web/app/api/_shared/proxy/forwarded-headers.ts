import type { NextRequest } from "next/server"
import { FORWARDED_HEADER_ALLOWLIST } from "./constants"
import type { NextRequestWithOptionalIp } from "./types"

const normalizeIpAddress = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7) || null
  }

  return trimmed
}

const extractClientIpFromRequest = (req: NextRequest): string | null => {
  const runtimeIp = normalizeIpAddress((req as NextRequestWithOptionalIp).ip)
  if (runtimeIp) return runtimeIp

  const hostForwardedIp = normalizeIpAddress(req.headers.get("x-real-ip"))
  if (hostForwardedIp) return hostForwardedIp

  return null
}

export const buildForwardedHeaders = (req: NextRequest): Headers => {
  const headers = new Headers()

  FORWARDED_HEADER_ALLOWLIST.forEach((headerName) => {
    const value = req.headers.get(headerName)
    if (value) {
      headers.set(headerName, value)
    }
  })

  const clientIp = extractClientIpFromRequest(req)
  if (clientIp) {
    headers.set("x-solera-client-ip", clientIp)
  }

  return headers
}
