import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = process.cwd()
const backendRoot = resolve(repoRoot, "apps", "api")

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
loadEnvFile(resolve(repoRoot, ".env"))

const requiredEnv = [
  "SOLANA_DEVNET_RPC_URL",
  "SOLANA_DEVNET_DATABASE_URL",
  "STAKING_STAKE_POOL_PROGRAM_ID_DEVNET",
  "STAKING_SWAP_NODE_PROGRAM_ID_DEVNET",
  "STAKING_RA_REWARD_VAULT_DEVNET",
]
const recommendedEnv = ["ANCHOR_WALLET"]
const errors = []

for (const name of requiredEnv) {
  const value = process.env[name]?.trim()
  if (!value) {
    errors.push(`Missing ${name}`)
  }
}

const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL?.trim()
if (rpcUrl) {
  try {
    const parsed = new URL(rpcUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      errors.push("SOLANA_DEVNET_RPC_URL must start with http:// or https://")
    }
  } catch {
    errors.push("SOLANA_DEVNET_RPC_URL must be a valid URL")
  }
}

const devnetDatabaseUrl = process.env.SOLANA_DEVNET_DATABASE_URL?.trim()
if (devnetDatabaseUrl) {
  try {
    const parsed = new URL(devnetDatabaseUrl)
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      errors.push("SOLANA_DEVNET_DATABASE_URL must start with postgres:// or postgresql://")
    }
  } catch {
    errors.push("SOLANA_DEVNET_DATABASE_URL must be a valid PostgreSQL connection string")
  }
}

for (const name of [
  "STAKING_STAKE_POOL_PROGRAM_ID_DEVNET",
  "STAKING_SWAP_NODE_PROGRAM_ID_DEVNET",
  "STAKING_RA_REWARD_VAULT_DEVNET",
]) {
  const value = process.env[name]?.trim()
  if (!value) continue
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    errors.push(`${name} must be a valid Solana public key`)
  }
}

if (errors.length > 0) {
  console.error("Devnet staking environment validation failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

for (const name of recommendedEnv) {
  if (!process.env[name]?.trim()) {
    console.warn(`Recommended: set ${name} before running Anchor deploy commands.`)
  }
}

console.log("Devnet staking environment looks ready.")
