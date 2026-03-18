import { NextResponse } from "next/server"
import { isProductionRuntime } from "@/lib/config/env"

export const buildBackendBaseResolutionErrorResponse = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Backend base URL is not configured."

  return NextResponse.json({ message }, { status: 500 })
}

export const buildProxyUnavailableResponse = (error: unknown) => {
  const detail =
    !isProductionRuntime() && error instanceof Error
      ? ` (${error.message})`
      : ""

  return NextResponse.json(
    {
      message:
        `Backend service is unreachable. Start apps/api or set SOLERA_API_INTERNAL_URL.${detail}`,
    },
    { status: 502 },
  )
}
