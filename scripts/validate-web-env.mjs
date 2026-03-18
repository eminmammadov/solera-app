import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)))
const repoRoot = resolve(scriptDir, "..")
const webRoot = resolve(repoRoot, "apps", "web")

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

loadEnvFile(resolve(webRoot, ".env.local"))

const requiredHttpEnv = [
  "APP_ORIGIN",
  "SOLERA_API_INTERNAL_URL",
  "SOLANA_MAINNET_RPC_URL",
  "SOLANA_DEVNET_RPC_URL",
]
const requiredStringEnv = ["SOLERA_PROXY_SHARED_KEY", "NEWS_CLIENT_ID_SECRET"]

const errors = []

for (const name of requiredStringEnv) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`Missing ${name}`)
  }
}

for (const name of requiredHttpEnv) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`Missing ${name}`)
    continue
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      errors.push(`${name} must be http:// or https://`)
    }
  } catch {
    errors.push(`${name} must be a valid absolute URL`)
  }
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
  console.error("Web environment validation failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}
