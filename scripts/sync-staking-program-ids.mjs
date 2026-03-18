import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const network = process.argv[2] === "mainnet" ? "mainnet" : "devnet"
const repoRoot = process.cwd()
const backendEnv = resolve(repoRoot, "apps", "api", ".env")

const rawEnv = readFileSync(backendEnv, "utf8")
const env = Object.create(null)
for (const line of rawEnv.split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const equalsIndex = trimmed.indexOf("=")
  if (equalsIndex <= 0) continue
  env[trimmed.slice(0, equalsIndex).trim()] = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "")
}

const programIds = {
  stakePool:
    env[
      network === "mainnet"
        ? "STAKING_STAKE_POOL_PROGRAM_ID_MAINNET"
        : "STAKING_STAKE_POOL_PROGRAM_ID_DEVNET"
    ],
  swapNode:
    env[
      network === "mainnet"
        ? "STAKING_SWAP_NODE_PROGRAM_ID_MAINNET"
        : "STAKING_SWAP_NODE_PROGRAM_ID_DEVNET"
    ],
}

if (!programIds.stakePool || !programIds.swapNode) {
  throw new Error(`Missing staking program IDs in apps/api/.env for ${network}.`)
}

const patchDeclareId = (filePath, programId) => {
  const raw = readFileSync(filePath, "utf8")
  const next = raw.replace(/declare_id!\("([^"]+)"\);/, `declare_id!("${programId}");`)
  writeFileSync(filePath, next)
}

const upsertTomlProgramKey = (source, networkName, key, value) => {
  const sectionHeader = `[programs.${networkName}]`
  const keyPattern = new RegExp(`^${key}\\s*=\\s*"[^"]*"\\s*$`, "m")

  if (!source.includes(sectionHeader)) {
    return `${source.trimEnd()}\n\n${sectionHeader}\n${key} = "${value}"\n`
  }

  const sectionPattern = new RegExp(
    `(\\[programs\\.${networkName}\\][\\s\\S]*?)(?=\\n\\[|$)`,
    "m",
  )

  return source.replace(sectionPattern, (section) => {
    if (keyPattern.test(section)) {
      return section.replace(keyPattern, `${key} = "${value}"`)
    }

    return `${section.trimEnd()}\n${key} = "${value}"`
  })
}

patchDeclareId(resolve(repoRoot, "programs", "stake-pool", "src", "lib.rs"), programIds.stakePool)
patchDeclareId(resolve(repoRoot, "programs", "swap-node", "src", "lib.rs"), programIds.swapNode)

const anchorTomlPath = resolve(repoRoot, "programs", "Anchor.toml")
const anchorToml = readFileSync(anchorTomlPath, "utf8")
const nextAnchorToml = upsertTomlProgramKey(
  upsertTomlProgramKey(anchorToml, network, "stake_pool", programIds.stakePool),
  network,
  "swap_node",
  programIds.swapNode,
)
writeFileSync(anchorTomlPath, nextAnchorToml)

console.log(`Synced ${network} program IDs into Anchor sources.`)
