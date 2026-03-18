import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const backendRoot = process.cwd()

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim()
  }
  return value
}

const loadEnvFile = (path) => {
  if (!existsSync(path)) return
  const raw = readFileSync(path, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex <= 0) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    const value = stripWrappingQuotes(trimmed.slice(equalsIndex + 1).trim())
    if (!key || process.env[key]) continue
    process.env[key] = value
  }
}

loadEnvFile(resolve(backendRoot, ".env"))

const requiredUrlEnv = ["DATABASE_URL", "LOG_DATABASE_URL", "OHLC_DATABASE_URL"]
const optionalUrlEnv = ["SOLANA_DEVNET_DATABASE_URL"]
const requiredHttpUrlEnv = ["SOLANA_MAINNET_RPC_URL", "SOLANA_DEVNET_RPC_URL"]
const requiredStringEnv = ["JWT_SECRET", "CORS_ORIGIN", "SOLERA_PROXY_SHARED_KEY"]
const optionalStringEnv = ["STAKING_MAINNET_MULTISIG_AUTHORITY"]
const optionalBooleanEnv = [
  "STAKING_MIGRATION_WINDOW_ACTIVE",
  "STAKING_LEGACY_STAKE_WRITE_FREEZE",
  "STAKING_LEGACY_CLAIM_WRITE_FREEZE",
  "STAKING_MAINNET_REQUIRE_MULTISIG",
  "STAKING_MAINNET_ALLOW_BOOTSTRAP",
  "STAKING_MAINNET_ALLOW_CONFIG_UPDATES",
  "STAKING_MAINNET_ALLOW_FUNDING_BATCH",
]
const errors = []

const validatePostgresUrl = (name, value) => {
  const normalized = value.toLowerCase()
  if (
    !(
      normalized.startsWith("postgresql://") ||
      normalized.startsWith("postgres://")
    )
  ) {
    errors.push(`${name} must start with postgresql:// or postgres://`)
  }
  if (!value.includes("://") || !value.includes("@")) {
    errors.push(`${name} must include connection authority and host`)
  }

  try {
    const parsed = new URL(value)
    if (
      parsed.protocol !== "postgresql:" &&
      parsed.protocol !== "postgres:"
    ) {
      errors.push(`${name} must use the postgres:// or postgresql:// protocol`)
    }
    if (!parsed.username) {
      errors.push(`${name} must include a database username`)
    }
    if (!parsed.pathname || parsed.pathname === "/") {
      errors.push(`${name} must include a database name in the path`)
    }
  } catch {
    errors.push(`${name} must be a valid PostgreSQL connection URL`)
  }
}

const readBooleanLike = (name, fallback = false) => {
  const value = process.env[name]?.trim().toLowerCase()
  if (!value) return fallback
  return ["1", "true", "yes", "on"].includes(value)
}

for (const name of requiredStringEnv) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`Missing ${name}`)
  }
}

for (const name of optionalStringEnv) {
  const value = process.env[name]?.trim()
  if (!value) continue
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    errors.push(`${name} must be a valid Solana public key`)
  }
}

for (const name of requiredUrlEnv) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`Missing ${name}`)
    continue
  }
  validatePostgresUrl(name, value)
}

for (const name of requiredHttpUrlEnv) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`Missing ${name}`)
    continue
  }

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      errors.push(`${name} must start with http:// or https://`)
    }
  } catch {
    errors.push(`${name} must be a valid URL`)
  }
}

for (const name of optionalUrlEnv) {
  const value = process.env[name]?.trim()
  if (!value) continue
  validatePostgresUrl(name, value)
}

for (const name of optionalBooleanEnv) {
  const value = process.env[name]?.trim()
  if (!value) continue
  const normalized = value.toLowerCase()
  if (!["1", "0", "true", "false", "yes", "no", "on", "off"].includes(normalized)) {
    errors.push(`${name} must be a boolean-like value (true/false, 1/0, yes/no, on/off)`)
  }
}

const mainnetBootstrapEnabled = readBooleanLike("STAKING_MAINNET_ALLOW_BOOTSTRAP", false)
const mainnetConfigUpdatesEnabled = readBooleanLike("STAKING_MAINNET_ALLOW_CONFIG_UPDATES", false)
const mainnetFundingEnabled = readBooleanLike("STAKING_MAINNET_ALLOW_FUNDING_BATCH", false)
const mainnetRequiresMultisig = readBooleanLike("STAKING_MAINNET_REQUIRE_MULTISIG", true)
const mainnetMultisigAuthority = process.env.STAKING_MAINNET_MULTISIG_AUTHORITY?.trim() || ""

if (
  mainnetRequiresMultisig &&
  (mainnetBootstrapEnabled || mainnetConfigUpdatesEnabled || mainnetFundingEnabled) &&
  !mainnetMultisigAuthority
) {
  errors.push(
    "STAKING_MAINNET_MULTISIG_AUTHORITY is required when mainnet staking actions are enabled and STAKING_MAINNET_REQUIRE_MULTISIG is true",
  )
}

const redisSocketUrl = process.env.RATE_LIMIT_REDIS_URL?.trim() || ""
const redisRestUrl = process.env.RATE_LIMIT_REDIS_REST_URL?.trim() || ""
const redisRestToken = process.env.RATE_LIMIT_REDIS_REST_TOKEN?.trim() || ""

if (!redisSocketUrl && !(redisRestUrl && redisRestToken)) {
  errors.push(
    "Missing Redis rate-limit backend. Set RATE_LIMIT_REDIS_URL or RATE_LIMIT_REDIS_REST_URL + RATE_LIMIT_REDIS_REST_TOKEN",
  )
}

if (redisSocketUrl) {
  try {
    const parsed = new URL(redisSocketUrl)
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      errors.push("RATE_LIMIT_REDIS_URL must use redis:// or rediss://")
    }
  } catch {
    errors.push("RATE_LIMIT_REDIS_URL must be a valid URL")
  }
}

if (redisRestUrl && !redisRestToken) {
  errors.push(
    "RATE_LIMIT_REDIS_REST_TOKEN is required when RATE_LIMIT_REDIS_REST_URL is set",
  )
}
if (!redisRestUrl && redisRestToken) {
  errors.push(
    "RATE_LIMIT_REDIS_REST_URL is required when RATE_LIMIT_REDIS_REST_TOKEN is set",
  )
}

if (errors.length > 0) {
  console.error("Backend environment validation failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}
