import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const BACKEND_READY_URL =
  process.env.SOLERA_BACKEND_READY_URL?.trim() ||
  'http://localhost:3001/api/ohlc/health';
const FRONTEND_PORT = Number.parseInt(
  process.env.SOLERA_DEV_WEB_PORT ?? '3000',
  10,
);
const BACKEND_PORT = Number.parseInt(
  process.env.SOLERA_DEV_API_PORT ?? '3001',
  10,
);
const BACKEND_READY_TIMEOUT_MS = Number.parseInt(
  process.env.SOLERA_BACKEND_READY_TIMEOUT_MS ?? '120000',
  10,
);
const BACKEND_READY_POLL_MS = Number.parseInt(
  process.env.SOLERA_BACKEND_READY_POLL_MS ?? '1000',
  10,
);

const isWindows = process.platform === 'win32';
let shuttingDown = false;
let backendReady = false;

const childProcesses = [];

function createChild(scriptName, label) {
  const child = isWindows
    ? spawn(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', `npm run ${scriptName}`],
        {
          cwd: process.cwd(),
          stdio: 'inherit',
          shell: false,
          env: process.env,
        },
      )
    : spawn('npm', ['run', scriptName], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: false,
        env: process.env,
      });

  childProcesses.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const exitCode = code ?? (signal ? 1 : 0);
    if (label === 'api' && !backendReady) {
      console.error(
        `[dev] Backend exited before becoming ready. Exit code: ${exitCode}`,
      );
      shutdown(exitCode);
      return;
    }

    if (label === 'web') {
      console.error(`[dev] Frontend exited. Exit code: ${exitCode}`);
      shutdown(exitCode);
      return;
    }

    if (label === 'api') {
      console.error('[dev] Backend stopped. Shutting down frontend.');
      shutdown(exitCode);
    }
  });

  return child;
}

async function isPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });
  });
}

async function assertPortsAvailable() {
  const busyPorts = [];

  for (const port of [FRONTEND_PORT, BACKEND_PORT]) {
    if (await isPortBusy(port)) {
      busyPorts.push(port);
    }
  }

  if (busyPorts.length === 0) return;

  throw new Error(
    `Port(s) already in use: ${busyPorts.join(', ')}. Stop the existing process before running npm run dev.`,
  );
}

function terminateChild(child) {
  if (!child || child.killed) return;

  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      cwd: process.cwd(),
      shell: false,
      env: process.env,
    });
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of childProcesses) {
    terminateChild(child);
  }

  setTimeout(() => {
    process.exit(code);
  }, 250).unref();
}

async function waitForBackendReady(apiChild) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < BACKEND_READY_TIMEOUT_MS) {
    if (shuttingDown) return false;
    if (apiChild.exitCode !== null) {
      throw new Error(`Backend process exited with code ${apiChild.exitCode}.`);
    }

    try {
      const response = await fetch(BACKEND_READY_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Backend is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, BACKEND_READY_POLL_MS));
  }

  throw new Error(
    `Timed out waiting for backend readiness at ${BACKEND_READY_URL} after ${BACKEND_READY_TIMEOUT_MS}ms.`,
  );
}

async function main() {
  await assertPortsAvailable();

  const apiProcess = createChild('dev:api', 'api');
  console.log(`[dev] Waiting for backend readiness at ${BACKEND_READY_URL} ...`);

  backendReady = await waitForBackendReady(apiProcess);
  console.log('[dev] Backend is ready. Starting frontend.');

  createChild('dev:web', 'web');
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

process.on('uncaughtException', (error) => {
  console.error('[dev] Uncaught exception in dev orchestrator:', error);
  shutdown(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[dev] Unhandled rejection in dev orchestrator:', reason);
  shutdown(1);
});

main().catch((error) => {
  console.error(
    '[dev] Failed to start development services:',
    error instanceof Error ? error.message : error,
  );
  shutdown(1);
});
