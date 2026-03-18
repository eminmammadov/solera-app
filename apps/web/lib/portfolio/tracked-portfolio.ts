import type { SolanaTokenBalance } from "@/hooks/use-solana-portfolio"
import { normalizeImageSrc } from "@/lib/ui/image-src"
import { WRAPPED_SOL_MINT_ADDRESS } from "@/lib/solana/solana-constants"
import type { MarketToken } from "@/store/market/use-market-data"
import type { TokenBalance } from "@/store/profile/use-user-data"

const BASE58_MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
export const WRAPPED_SOL_MINT = WRAPPED_SOL_MINT_ADDRESS
export const NATIVE_SOL_TICKER = "SOL"

export interface TrackedPortfolioToken {
  id: string
  ticker: string
  name: string
  logoUrl: string
  isImage: boolean
  colorBg: string | undefined
  priceUsd: number
  amount: number
  change24h: number
}

const normalizeMintAddress = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!BASE58_MINT_PATTERN.test(trimmed)) return null
  return trimmed
}

export const resolveTrackedMintAddress = (token: {
  ticker?: string | null
  mintAddress?: string | null
}) => {
  if (token.ticker?.trim().toUpperCase() === NATIVE_SOL_TICKER) {
    return WRAPPED_SOL_MINT
  }

  return normalizeMintAddress(token.mintAddress ?? null)
}

const toPositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }
  return null
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  return null
}

export const buildTrackedPortfolioTokens = (input: {
  listedTokens: MarketToken[]
  chainPortfolio: SolanaTokenBalance[]
  profilePortfolio: TokenBalance[]
  liveRaPrice?: number
  liveRaPriceChange?: number
  preferProfileAmounts?: boolean
  raMintAddress?: string | null
  raLogoUrl?: string | null
  raSymbol?: string | null
  raName?: string | null
}) => {
  const {
    listedTokens,
    chainPortfolio,
    profilePortfolio,
    liveRaPrice,
    liveRaPriceChange,
    preferProfileAmounts = false,
    raMintAddress,
    raLogoUrl,
    raSymbol,
    raName,
  } = input
  const normalizedRaSymbol =
    typeof raSymbol === "string" && /^[A-Za-z0-9]{1,12}$/.test(raSymbol.trim())
      ? raSymbol.trim().toUpperCase()
      : "RA"
  const normalizedRaName =
    typeof raName === "string" && raName.trim().length > 0
      ? raName.trim()
      : "Solera"
  const normalizedRaMint = normalizeMintAddress(raMintAddress)
  const normalizedRaMintKey = normalizedRaMint?.toLowerCase() ?? null

  const profileByTicker = new Map(
    profilePortfolio.map((item) => [item.ticker.trim().toUpperCase(), item]),
  )
  const chainByMint = new Map(
    chainPortfolio
      .map((item) => {
        const mint = normalizeMintAddress(item.id)
        if (!mint) return null
        return [mint.toLowerCase(), item] as const
      })
      .filter(
        (
          entry,
        ): entry is readonly [string, SolanaTokenBalance] => Boolean(entry),
      ),
  )
  const chainByTicker = new Map(
    chainPortfolio.map((item) => [item.ticker.trim().toUpperCase(), item]),
  )
  const listedByTrackingMint = new Map(
    listedTokens
      .map((token) => {
        const mint = resolveTrackedMintAddress(token)
        if (!mint) return null
        return [mint.toLowerCase(), token] as const
      })
      .filter(
        (entry): entry is readonly [string, MarketToken] => Boolean(entry),
      ),
  )

  const listedRows = Array.from(listedByTrackingMint.entries())
    .map(([mintKey, listedToken]) => {
      const tickerKey = listedToken.ticker.trim().toUpperCase()
      if (
        tickerKey === "RA" ||
        tickerKey === normalizedRaSymbol ||
        mintKey === normalizedRaMintKey
      ) {
        return null
      }

      const chainToken =
        chainByMint.get(mintKey) ?? chainByTicker.get(tickerKey) ?? null
      const profileToken = profileByTicker.get(tickerKey) ?? null
      const chainAmount =
        typeof chainToken?.amount === "number" && Number.isFinite(chainToken.amount)
          ? chainToken.amount
          : 0
      const profileAmount =
        typeof profileToken?.amount === "number" && Number.isFinite(profileToken.amount)
          ? profileToken.amount
          : 0
      const amount = preferProfileAmounts
        ? profileAmount
        : chainAmount > 0
          ? chainAmount
          : profileAmount

      return {
        id: mintKey,
        ticker: tickerKey,
        name: listedToken.name || profileToken?.name || chainToken?.name || "Token",
        logoUrl:
          normalizeImageSrc(
            listedToken.icon || chainToken?.logoUrl || profileToken?.logoUrl,
          ) ?? "",
        isImage: Boolean(
          normalizeImageSrc(
            listedToken.icon || chainToken?.logoUrl || profileToken?.logoUrl,
          ),
        ),
        colorBg: listedToken.colorBg ?? undefined,
        priceUsd:
          toPositiveNumber(listedToken.price) ??
          toPositiveNumber(chainToken?.priceUsd) ??
          0,
        amount,
        change24h:
          (toPositiveNumber(listedToken.price) !== null
            ? toFiniteNumber(listedToken.chg24h)
            : null) ??
          toFiniteNumber(chainToken?.change24h) ??
          toFiniteNumber(profileToken?.change24h) ??
          0,
      }
    })
    .filter((item): item is TrackedPortfolioToken => Boolean(item))
    .sort((a, b) => {
      const valueDiff = b.amount * b.priceUsd - a.amount * a.priceUsd
      if (valueDiff !== 0) return valueDiff
      return a.ticker.localeCompare(b.ticker)
    })

  const listedRa = listedTokens.find(
    (token) =>
      token.ticker.trim().toUpperCase() === "RA" ||
      token.ticker.trim().toUpperCase() === normalizedRaSymbol ||
      resolveTrackedMintAddress(token)?.toLowerCase() === normalizedRaMintKey,
  )
  const profileRa =
    (normalizedRaMintKey
      ? profilePortfolio.find(
          (item) => normalizeMintAddress(item.id)?.toLowerCase() === normalizedRaMintKey,
        ) ?? null
      : null) ??
    profileByTicker.get(normalizedRaSymbol) ??
    profileByTicker.get("RA") ??
    null
  const chainRa =
    (normalizedRaMintKey ? chainByMint.get(normalizedRaMintKey) ?? null : null) ??
    chainByTicker.get(normalizedRaSymbol) ??
    chainByTicker.get("RA") ??
    chainPortfolio.find((item) => item.name.trim().toLowerCase() === "solera") ??
    null

  const raRow: TrackedPortfolioToken = {
    id: normalizedRaMint ?? profileRa?.id ?? chainRa?.id ?? "ra",
    ticker: normalizedRaSymbol,
    name: normalizedRaName,
    logoUrl:
      normalizeImageSrc(
        raLogoUrl ||
          listedRa?.icon ||
          profileRa?.logoUrl ||
          chainRa?.logoUrl ||
          "/logos/ra-white-logo.png",
      ) ?? "/logos/ra-white-logo.png",
    isImage: true,
    colorBg: undefined,
    priceUsd:
      toPositiveNumber(liveRaPrice) ??
      toPositiveNumber(chainRa?.priceUsd) ??
      0,
    amount:
      preferProfileAmounts
        ? toFiniteNumber(profileRa?.amount) ?? 0
        : toFiniteNumber(profileRa?.amount) ??
          toFiniteNumber(chainRa?.amount) ??
          0,
    change24h:
      toFiniteNumber(liveRaPriceChange) ??
      toFiniteNumber(chainRa?.change24h) ??
      0,
  }

  return [raRow, ...listedRows]
}
