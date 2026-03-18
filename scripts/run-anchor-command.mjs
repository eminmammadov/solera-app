import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = process.cwd()
const programsRoot = resolve(repoRoot, "programs")
const programsRootForWsl = programsRoot.replace(/\\/g, "/")
const repoAnchorWallet = resolve(programsRoot, ".keys", "devnet-deployer.json")
const args = process.argv.slice(2)
const defaultLinuxPath = (home) =>
  `${home}/.local/share/solana/install/active_release/bin:${home}/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`

if (args.length === 0) {
  console.error("Usage: node scripts/run-anchor-command.mjs <anchor-args...>")
  process.exit(1)
}

const runWhere = (command) =>
  new Promise((resolvePromise) => {
    const child = spawn("where", [command], {
      stdio: "ignore",
      shell: false,
      windowsHide: true,
    })
    child.on("exit", (code) => resolvePromise(code === 0))
  })

const runAndCapture = (command, commandArgs, options = {}) =>
  new Promise((resolvePromise) => {
    const child = spawn(command, commandArgs, {
      shell: false,
      windowsHide: true,
      ...options,
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", (error) =>
      resolvePromise({
        ok: false,
        code: 1,
        stdout,
        stderr,
        error,
      }),
    )
    child.on("exit", (code) =>
      resolvePromise({
        ok: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
      }),
    )
  })

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`

const resolveWslHome = async () => {
  if (process.env.STAKING_WSL_HOME?.trim()) {
    return process.env.STAKING_WSL_HOME.trim()
  }

  const result = await runAndCapture("wsl", ["bash", "-lc", 'printf %s "$HOME"'])
  if (!result.ok || !result.stdout.trim()) {
    return null
  }
  return result.stdout.trim()
}

const resolveWslProgramsRoot = async () => {
  const result = await runAndCapture("wsl", [
    "wslpath",
    "-a",
    programsRootForWsl,
  ])
  if (!result.ok || !result.stdout.trim()) {
    return null
  }
  return result.stdout.trim()
}

const hasWindowsAnchor = await runWhere("anchor")
const hasWindowsSolana = await runWhere("solana")

if (hasWindowsAnchor && hasWindowsSolana) {
  const child = spawn("anchor", args, {
    cwd: programsRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...(existsSync(repoAnchorWallet) && !process.env.ANCHOR_WALLET
        ? { ANCHOR_WALLET: repoAnchorWallet }
        : {}),
    },
  })

  child.on("exit", (code) => {
    process.exit(code ?? 1)
  })
} else {
  const wslHome = await resolveWslHome()
  const wslProgramsRoot = await resolveWslProgramsRoot()

  if (!wslHome || !wslProgramsRoot) {
    console.error("Anchor/Solana CLI tooling is not available on Windows PATH.")
    console.error("WSL fallback could not be initialized.")
    console.error("- Install Anchor CLI")
    console.error("- Install Solana CLI")
    console.error("- Or set STAKING_WSL_HOME and rerun the staking devnet build/deploy scripts")
    process.exit(1)
  }

  const linuxPath = defaultLinuxPath(wslHome)
  const wslAnchorWallet = `${wslProgramsRoot}/.keys/devnet-deployer.json`
  const toolingCheck = await runAndCapture("wsl", [
    "env",
    "-i",
    `HOME=${wslHome}`,
    `PATH=${linuxPath}`,
    "bash",
    "-lc",
    "command -v anchor >/dev/null 2>&1 && command -v solana >/dev/null 2>&1",
  ])

  if (!toolingCheck.ok) {
    console.error("Anchor/Solana CLI tooling is not available on Windows PATH.")
    console.error("WSL fallback is available, but Anchor/Solana is not installed there yet.")
    console.error("- Install Anchor CLI inside WSL")
    console.error("- Install Solana CLI inside WSL")
    console.error("- Then rerun the staking devnet build/deploy scripts")
    process.exit(1)
  }

  const child = spawn(
    "wsl",
    [
      "env",
      "-i",
      `HOME=${wslHome}`,
      `PATH=${linuxPath}`,
      ...(process.env.ANCHOR_WALLET
        ? [`ANCHOR_WALLET=${process.env.ANCHOR_WALLET}`]
        : existsSync(repoAnchorWallet)
          ? [`ANCHOR_WALLET=${wslAnchorWallet}`]
          : []),
      "bash",
      "-lc",
      `cd ${shellQuote(wslProgramsRoot)} && anchor ${args
        .map(shellQuote)
        .join(" ")}`,
    ],
    {
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    },
  )

  child.on("exit", (code) => {
    process.exit(code ?? 1)
  })
}
