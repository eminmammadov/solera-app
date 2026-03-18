import { spawn } from "node:child_process"
import { resolve } from "node:path"

const repoRoot = process.cwd()
const programsRoot = resolve(repoRoot, "programs")
const programsRootForWsl = programsRoot.replace(/\\/g, "/")
const args = process.argv.slice(2)
const defaultLinuxPath = (home) =>
  `${home}/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`

if (args.length === 0) {
  console.error("Usage: node scripts/run-rust-command.mjs <cargo-args...>")
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

const hasWindowsCargo = await runWhere("cargo")

if (hasWindowsCargo) {
  const child = spawn("cargo", args, {
    cwd: programsRoot,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  })

  child.on("exit", (code) => {
    process.exit(code ?? 1)
  })
} else {
  const wslHome = await resolveWslHome()
  const wslProgramsRoot = await resolveWslProgramsRoot()

  if (!wslHome || !wslProgramsRoot) {
    console.error("Cargo is not available on Windows PATH and WSL fallback could not be initialized.")
    process.exit(1)
  }

  const linuxPath = defaultLinuxPath(wslHome)
  const toolingCheck = await runAndCapture("wsl", [
    "env",
    "-i",
    `HOME=${wslHome}`,
    `PATH=${linuxPath}`,
    "bash",
    "-lc",
    "command -v cargo >/dev/null 2>&1",
  ])

  if (!toolingCheck.ok) {
    console.error("Cargo is not available on Windows PATH or inside WSL.")
    process.exit(1)
  }

  const child = spawn(
    "wsl",
    [
      "env",
      "-i",
      `HOME=${wslHome}`,
      `PATH=${linuxPath}`,
      "bash",
      "-lc",
      `cd ${shellQuote(wslProgramsRoot)} && cargo ${args.map(shellQuote).join(" ")}`,
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
