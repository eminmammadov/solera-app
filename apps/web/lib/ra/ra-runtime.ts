import { backendRoutes } from "@/lib/api/backend-routes"
import { publicRequestJson } from "@/lib/api/public-api"
import type { HeaderNetwork } from "@/lib/header/header-branding"
import { DEFAULT_PUBLIC_RA_RUNTIME_SETTINGS } from "@/lib/ra/ra-runtime-defaults"

export type RaOracleProvider = "DEXSCREENER" | "RAYDIUM"
export type RaConvertProvider = "RAYDIUM" | "JUPITER"
export type RaConvertExecutionMode = "AUTO" | "SINGLE_TX_ONLY" | "ALLOW_MULTI_TX"
export type RaConvertRoutePolicy = "TOKEN_TO_SOL_TO_RA"

export interface RaRuntimeSettings {
  logoUrl: string
  tokenSymbol: string
  tokenName: string
  mintDevnet: string
  mintMainnet: string
  treasuryDevnet: string
  treasuryMainnet: string
  oraclePrimary: RaOracleProvider
  oracleSecondary: RaOracleProvider | null
  stakeFeeBps: number
  claimFeeBps: number
  stakeMinUsd: number
  stakeMaxUsd: number
  convertMinUsd: number
  convertMaxUsd: number
  convertEnabled: boolean
  convertProvider: RaConvertProvider
  convertExecutionMode: RaConvertExecutionMode
  convertRoutePolicy: RaConvertRoutePolicy
  convertSlippageBps: number
  convertMaxTokensPerSession: number
  convertPoolIdDevnet: string
  convertPoolIdMainnet: string
  convertQuoteMintDevnet: string
  convertQuoteMintMainnet: string
  updatedAt: string
}

const DEFAULT_RA_RUNTIME_SETTINGS: RaRuntimeSettings =
  DEFAULT_PUBLIC_RA_RUNTIME_SETTINGS

const RA_RUNTIME_CACHE_TTL_MS = 15_000
export const RA_RUNTIME_SETTINGS_CHANGED_EVENT =
  "solera:ra-runtime-settings-changed"
const RA_RUNTIME_STORAGE_KEY = "solera_ra_runtime_settings"
const RA_RUNTIME_BROADCAST_CHANNEL = "solera-ra-runtime"

let raRuntimeCache:
  | { value: RaRuntimeSettings; expiresAt: number }
  | null = null
let raRuntimeInFlight: Promise<RaRuntimeSettings> | null = null
let raRuntimeBroadcastChannelInstance: BroadcastChannel | null = null

const sanitizeProvider = (
  value: unknown,
  fallback: RaOracleProvider,
): RaOracleProvider => {
  if (value === "DEXSCREENER" || value === "RAYDIUM") {
    return value
  }
  return fallback
}

const sanitizeConvertProvider = (
  value: unknown,
  fallback: RaConvertProvider,
): RaConvertProvider => {
  if (value === "RAYDIUM" || value === "JUPITER") {
    return value
  }
  return fallback
}

const sanitizeConvertExecutionMode = (
  value: unknown,
  fallback: RaConvertExecutionMode,
): RaConvertExecutionMode => {
  if (
    value === "AUTO" ||
    value === "SINGLE_TX_ONLY" ||
    value === "ALLOW_MULTI_TX"
  ) {
    return value
  }
  return fallback
}

const sanitizeConvertRoutePolicy = (
  value: unknown,
  fallback: RaConvertRoutePolicy,
): RaConvertRoutePolicy => {
  if (value === "TOKEN_TO_SOL_TO_RA") {
    return value
  }
  return fallback
}

const sanitizeNumber = (value: unknown, fallback: number) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeRaRuntime = (input: unknown): RaRuntimeSettings => {
  if (!input || typeof input !== "object") return DEFAULT_RA_RUNTIME_SETTINGS
  const source = input as Record<string, unknown>

  const stakeMinUsd = Math.max(
    0,
    sanitizeNumber(source.stakeMinUsd, DEFAULT_RA_RUNTIME_SETTINGS.stakeMinUsd),
  )
  const stakeMaxUsd = Math.max(
    stakeMinUsd,
    sanitizeNumber(source.stakeMaxUsd, DEFAULT_RA_RUNTIME_SETTINGS.stakeMaxUsd),
  )
  const convertMinUsd = Math.max(
    0,
    sanitizeNumber(
      source.convertMinUsd,
      DEFAULT_RA_RUNTIME_SETTINGS.convertMinUsd,
    ),
  )
  const convertMaxUsd = Math.max(
    convertMinUsd,
    sanitizeNumber(
      source.convertMaxUsd,
      DEFAULT_RA_RUNTIME_SETTINGS.convertMaxUsd,
    ),
  )

  return {
    logoUrl:
      typeof source.logoUrl === "string" && source.logoUrl.trim().startsWith("/")
        ? source.logoUrl.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.logoUrl,
    tokenSymbol:
      typeof source.tokenSymbol === "string" &&
      /^[A-Za-z0-9]{1,12}$/.test(source.tokenSymbol.trim())
        ? source.tokenSymbol.trim().toUpperCase()
        : DEFAULT_RA_RUNTIME_SETTINGS.tokenSymbol,
    tokenName:
      typeof source.tokenName === "string" &&
      source.tokenName.trim().length >= 2 &&
      source.tokenName.trim().length <= 40
        ? source.tokenName.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.tokenName,
    mintDevnet:
      typeof source.mintDevnet === "string" && source.mintDevnet.trim()
        ? source.mintDevnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.mintDevnet,
    mintMainnet:
      typeof source.mintMainnet === "string" && source.mintMainnet.trim()
        ? source.mintMainnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.mintMainnet,
    treasuryDevnet:
      typeof source.treasuryDevnet === "string" && source.treasuryDevnet.trim()
        ? source.treasuryDevnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.treasuryDevnet,
    treasuryMainnet:
      typeof source.treasuryMainnet === "string" && source.treasuryMainnet.trim()
        ? source.treasuryMainnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.treasuryMainnet,
    oraclePrimary: sanitizeProvider(
      source.oraclePrimary,
      DEFAULT_RA_RUNTIME_SETTINGS.oraclePrimary,
    ),
    oracleSecondary:
      source.oracleSecondary === null
        ? null
        : sanitizeProvider(
            source.oracleSecondary,
            DEFAULT_RA_RUNTIME_SETTINGS.oracleSecondary ?? "RAYDIUM",
          ),
    stakeFeeBps: Math.max(
      0,
      Math.min(
        10_000,
        Math.trunc(
          sanitizeNumber(
            source.stakeFeeBps,
            DEFAULT_RA_RUNTIME_SETTINGS.stakeFeeBps,
          ),
        ),
      ),
    ),
    claimFeeBps: Math.max(
      0,
      Math.min(
        10_000,
        Math.trunc(
          sanitizeNumber(
            source.claimFeeBps,
            DEFAULT_RA_RUNTIME_SETTINGS.claimFeeBps,
          ),
        ),
      ),
    ),
    stakeMinUsd,
    stakeMaxUsd,
    convertMinUsd,
    convertMaxUsd,
    convertEnabled:
      typeof source.convertEnabled === "boolean"
        ? source.convertEnabled
        : DEFAULT_RA_RUNTIME_SETTINGS.convertEnabled,
    convertProvider: sanitizeConvertProvider(
      source.convertProvider,
      DEFAULT_RA_RUNTIME_SETTINGS.convertProvider,
    ),
    convertExecutionMode: sanitizeConvertExecutionMode(
      source.convertExecutionMode,
      DEFAULT_RA_RUNTIME_SETTINGS.convertExecutionMode,
    ),
    convertRoutePolicy: sanitizeConvertRoutePolicy(
      source.convertRoutePolicy,
      DEFAULT_RA_RUNTIME_SETTINGS.convertRoutePolicy,
    ),
    convertSlippageBps: Math.max(
      0,
      Math.min(
        10_000,
        Math.trunc(
          sanitizeNumber(
            source.convertSlippageBps,
            DEFAULT_RA_RUNTIME_SETTINGS.convertSlippageBps,
          ),
        ),
      ),
    ),
    convertMaxTokensPerSession: Math.max(
      1,
      Math.min(
        5,
        Math.trunc(
          sanitizeNumber(
            source.convertMaxTokensPerSession,
            DEFAULT_RA_RUNTIME_SETTINGS.convertMaxTokensPerSession,
          ),
        ),
      ),
    ),
    convertPoolIdDevnet:
      typeof source.convertPoolIdDevnet === "string" &&
      source.convertPoolIdDevnet.trim()
        ? source.convertPoolIdDevnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.convertPoolIdDevnet,
    convertPoolIdMainnet:
      typeof source.convertPoolIdMainnet === "string" &&
      source.convertPoolIdMainnet.trim()
        ? source.convertPoolIdMainnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.convertPoolIdMainnet,
    convertQuoteMintDevnet:
      typeof source.convertQuoteMintDevnet === "string" &&
      source.convertQuoteMintDevnet.trim()
        ? source.convertQuoteMintDevnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.convertQuoteMintDevnet,
    convertQuoteMintMainnet:
      typeof source.convertQuoteMintMainnet === "string" &&
      source.convertQuoteMintMainnet.trim()
        ? source.convertQuoteMintMainnet.trim()
        : DEFAULT_RA_RUNTIME_SETTINGS.convertQuoteMintMainnet,
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim()
        ? source.updatedAt
        : DEFAULT_RA_RUNTIME_SETTINGS.updatedAt,
  }
}

const emitRaRuntimeChangedEvent = (settings: RaRuntimeSettings) => {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<RaRuntimeSettings>(RA_RUNTIME_SETTINGS_CHANGED_EVENT, {
      detail: settings,
    }),
  )
}

const getRaRuntimeBroadcastChannel = () => {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null
  }

  if (!raRuntimeBroadcastChannelInstance) {
    raRuntimeBroadcastChannelInstance = new BroadcastChannel(
      RA_RUNTIME_BROADCAST_CHANNEL,
    )
  }

  return raRuntimeBroadcastChannelInstance
}

const readBroadcastRaRuntimeSettings = (
  payload: unknown,
): RaRuntimeSettings | null => {
  if (!payload || typeof payload !== "object") return null
  const candidate = (payload as { settings?: unknown }).settings
  if (!candidate) return null
  return normalizeRaRuntime(candidate)
}

export const getCachedRaRuntimeSettings = (): RaRuntimeSettings | null => {
  if (!raRuntimeCache) return null
  if (raRuntimeCache.expiresAt <= Date.now()) return null
  return raRuntimeCache.value
}

export const primeRaRuntimeSettingsCache = (settings: RaRuntimeSettings) => {
  const normalized = normalizeRaRuntime(settings)
  raRuntimeCache = {
    value: normalized,
    expiresAt: Date.now() + RA_RUNTIME_CACHE_TTL_MS,
  }
  return normalized
}

export const broadcastRaRuntimeSettingsChange = (
  settings: RaRuntimeSettings,
) => {
  const normalized = primeRaRuntimeSettingsCache(settings)

  if (typeof window === "undefined") return normalized

  emitRaRuntimeChangedEvent(normalized)

  try {
    window.localStorage.setItem(
      RA_RUNTIME_STORAGE_KEY,
      JSON.stringify({
        settings: normalized,
        ts: Date.now(),
      }),
    )
  } catch {
    // Ignore storage failures.
  }

  try {
    getRaRuntimeBroadcastChannel()?.postMessage({ settings: normalized })
  } catch {
    // Ignore BroadcastChannel failures.
  }

  return normalized
}

export const subscribeToRaRuntimeSettingsChanges = (
  onChange: (settings: RaRuntimeSettings) => void,
) => {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handleRuntimeEvent = (event: Event) => {
    const customEvent = event as CustomEvent<RaRuntimeSettings>
    if (!customEvent.detail) return
    const nextSettings = primeRaRuntimeSettingsCache(customEvent.detail)
    onChange(nextSettings)
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== RA_RUNTIME_STORAGE_KEY || !event.newValue) return

    try {
      const parsed = JSON.parse(event.newValue) as { settings?: unknown }
      const nextSettings = readBroadcastRaRuntimeSettings(parsed)
      if (!nextSettings) return
      const normalized = primeRaRuntimeSettingsCache(nextSettings)
      onChange(normalized)
    } catch {
      // Ignore malformed storage payloads.
    }
  }

  const channel = getRaRuntimeBroadcastChannel()
  const handleChannelMessage = (event: MessageEvent<unknown>) => {
    const nextSettings = readBroadcastRaRuntimeSettings(event.data)
    if (!nextSettings) return
    const normalized = primeRaRuntimeSettingsCache(nextSettings)
    onChange(normalized)
  }

  window.addEventListener(
    RA_RUNTIME_SETTINGS_CHANGED_EVENT,
    handleRuntimeEvent,
  )
  window.addEventListener("storage", handleStorage)
  channel?.addEventListener("message", handleChannelMessage)

  return () => {
    window.removeEventListener(
      RA_RUNTIME_SETTINGS_CHANGED_EVENT,
      handleRuntimeEvent,
    )
    window.removeEventListener("storage", handleStorage)
    channel?.removeEventListener("message", handleChannelMessage)
  }
}

export const resolveRaMintForNetwork = (
  settings: RaRuntimeSettings,
  network: HeaderNetwork,
) => (network === "mainnet" ? settings.mintMainnet : settings.mintDevnet)

export const resolveRaLogoUrl = (settings: RaRuntimeSettings) =>
  settings.logoUrl?.trim().startsWith("/")
    ? settings.logoUrl.trim()
    : DEFAULT_RA_RUNTIME_SETTINGS.logoUrl

export const resolveRaSymbol = (settings: RaRuntimeSettings) =>
  /^[A-Z0-9]{1,12}$/.test(settings.tokenSymbol?.trim() ?? "")
    ? settings.tokenSymbol.trim().toUpperCase()
    : DEFAULT_RA_RUNTIME_SETTINGS.tokenSymbol

export const resolveRaName = (settings: RaRuntimeSettings) =>
  typeof settings.tokenName === "string" &&
  settings.tokenName.trim().length >= 2 &&
  settings.tokenName.trim().length <= 40
    ? settings.tokenName.trim()
    : DEFAULT_RA_RUNTIME_SETTINGS.tokenName

export const resolveRaTreasuryForNetwork = (
  settings: RaRuntimeSettings,
  network: HeaderNetwork,
) =>
  network === "mainnet" ? settings.treasuryMainnet : settings.treasuryDevnet

export const resolveRaConvertPoolForNetwork = (
  settings: RaRuntimeSettings,
  network: HeaderNetwork,
) =>
  network === "mainnet"
    ? settings.convertPoolIdMainnet
    : settings.convertPoolIdDevnet

export const resolveRaConvertQuoteMintForNetwork = (
  settings: RaRuntimeSettings,
  network: HeaderNetwork,
) =>
  network === "mainnet"
    ? settings.convertQuoteMintMainnet
    : settings.convertQuoteMintDevnet

export const fetchRaRuntimeSettings = async (
  force = false,
): Promise<RaRuntimeSettings> => {
  const now = Date.now()
  if (!force && raRuntimeCache && raRuntimeCache.expiresAt > now) {
    return raRuntimeCache.value
  }

  if (!force && raRuntimeInFlight) {
    return raRuntimeInFlight
  }

  const run = async () => {
    const payload = await publicRequestJson<unknown>({
      path: backendRoutes.system.ra,
      fallbackMessage: "Failed to load RA runtime settings.",
      cache: "no-store",
      cacheTtlMs: force ? 0 : 5_000,
      minIntervalMs: force ? 0 : 250,
      dedupe: !force,
    })

    return primeRaRuntimeSettingsCache(normalizeRaRuntime(payload))
  }

  raRuntimeInFlight = run().finally(() => {
    raRuntimeInFlight = null
  })

  return raRuntimeInFlight
}

export { DEFAULT_PUBLIC_RA_RUNTIME_SETTINGS }
