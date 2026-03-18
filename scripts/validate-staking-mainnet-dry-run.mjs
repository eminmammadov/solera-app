import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { SOLANA_PLACEHOLDER_PROGRAM_ID } from "./staking-program-constants.mjs"

const repoRoot = process.cwd()
const backendRoot = resolve(repoRoot, "apps/api")
const backendEnvPath = resolve(backendRoot, ".env")

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
  const env = {}
  if (!existsSync(path)) return env

  const raw = readFileSync(path, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex <= 0) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    const value = stripWrappingQuotes(trimmed.slice(equalsIndex + 1).trim())
    if (!key) continue
    env[key] = value
  }

  return env
}

const readBooleanLike = (value, fallback = false) => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return fallback
  return ["1", "true", "yes", "on"].includes(normalized)
}

const envFromFile = loadEnvFile(backendEnvPath)
const env = {
  ...envFromFile,
  ...process.env,
}

const runBackendEnvValidator = () => {
  const result = spawnSync(
    process.execPath,
    [resolve(backendRoot, "scripts/validate-backend-env.mjs")],
    {
      cwd: backendRoot,
      env,
      encoding: "utf8",
      shell: false,
    },
  )

  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  }
}

const isUsableSolanaAddress = (value) =>
  Boolean(value) &&
  value !== SOLANA_PLACEHOLDER_PROGRAM_ID &&
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)

const validator = runBackendEnvValidator()

const registry = {
  stakePoolProgramId: env.STAKING_STAKE_POOL_PROGRAM_ID_MAINNET?.trim() ?? "",
  swapNodeProgramId: env.STAKING_SWAP_NODE_PROGRAM_ID_MAINNET?.trim() ?? "",
  rewardVaultAddress: env.STAKING_RA_REWARD_VAULT_MAINNET?.trim() ?? "",
}

const flags = {
  requireMultisig: readBooleanLike(
    env.STAKING_MAINNET_REQUIRE_MULTISIG,
    true,
  ),
  allowBootstrap: readBooleanLike(
    env.STAKING_MAINNET_ALLOW_BOOTSTRAP,
    false,
  ),
  allowConfigUpdates: readBooleanLike(
    env.STAKING_MAINNET_ALLOW_CONFIG_UPDATES,
    false,
  ),
  allowFundingBatch: readBooleanLike(
    env.STAKING_MAINNET_ALLOW_FUNDING_BATCH,
    false,
  ),
}

const configuredMultisigAuthority =
  env.STAKING_MAINNET_MULTISIG_AUTHORITY?.trim() ?? ""

const registryReady =
  isUsableSolanaAddress(registry.stakePoolProgramId) &&
  isUsableSolanaAddress(registry.swapNodeProgramId) &&
  isUsableSolanaAddress(registry.rewardVaultAddress)

const baseBlockers = []

if (!validator.ok) {
  baseBlockers.push("Backend environment validation is failing.")
}
if (!registryReady) {
  baseBlockers.push(
    "Mainnet staking registry is incomplete. Configure mainnet program IDs and reward vault.",
  )
}
if (flags.requireMultisig && !configuredMultisigAuthority) {
  baseBlockers.push(
    "Mainnet multisig authority is required but STAKING_MAINNET_MULTISIG_AUTHORITY is not set.",
  )
}

const actionStates = [
  {
    action: "bootstrap",
    enabled: flags.allowBootstrap,
    blockers: [
      ...baseBlockers,
      ...(flags.allowBootstrap
        ? []
        : [
            "Bootstrap actions are disabled. Enable STAKING_MAINNET_ALLOW_BOOTSTRAP to continue.",
          ]),
    ],
  },
  {
    action: "config_updates",
    enabled: flags.allowConfigUpdates,
    blockers: [
      ...baseBlockers,
      ...(flags.allowConfigUpdates
        ? []
        : [
            "Config update actions are disabled. Enable STAKING_MAINNET_ALLOW_CONFIG_UPDATES to continue.",
          ]),
    ],
  },
  {
    action: "funding_batch",
    enabled: flags.allowFundingBatch,
    blockers: [
      ...baseBlockers,
      ...(flags.allowFundingBatch
        ? []
        : [
            "Funding batch actions are disabled. Enable STAKING_MAINNET_ALLOW_FUNDING_BATCH to continue.",
          ]),
    ],
  },
].map((entry) => ({
  ...entry,
  ready: entry.enabled && entry.blockers.length === 0,
}))

const overallReady = actionStates.every((entry) => entry.ready)

const summary = {
  network: "mainnet",
  backendEnvValid: validator.ok,
  registry: {
    ...registry,
    ready: registryReady,
  },
  mainnetHardening: {
    configuredMultisigAuthority,
    ...flags,
  },
  actions: actionStates,
  overallReady,
}

console.log(JSON.stringify(summary, null, 2))

if (!validator.ok && validator.stderr) {
  console.error(validator.stderr)
}

if (!overallReady) {
  process.exit(1)
}
