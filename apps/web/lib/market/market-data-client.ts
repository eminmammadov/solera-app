import { backendRoutes } from "@/lib/api/backend-routes"
import { publicRequestJson } from "@/lib/api/public-api"

export const fetchMarketTokensPayload = async () =>
  publicRequestJson<unknown>({
    path: backendRoutes.market.tokens,
    fallbackMessage: "Live token list could not be refreshed.",
    cacheTtlMs: 3_000,
    minIntervalMs: 250,
  })

export const fetchMarketMintSnapshots = async <TResponse = unknown>(
  mintAddresses: string[],
) =>
  publicRequestJson<TResponse>({
    path: backendRoutes.market.priceByMints(mintAddresses),
    fallbackMessage: "Failed to load token pricing.",
    cache: "no-store",
    cacheTtlMs: 5_000,
    minIntervalMs: 300,
  })
