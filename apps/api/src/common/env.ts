import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

let hasLoadedEnvFiles = false;

const tryLoadEnvFile = (path: string) => {
  if (!existsSync(path)) return;
  loadDotenv({ path, override: false, quiet: true });
};

export const resolveBackendRootDir = (): string => {
  const cwd = process.cwd();
  const currentPackageJson = resolve(cwd, 'package.json');
  const currentNestCliJson = resolve(cwd, 'nest-cli.json');
  const monorepoBackendDir = resolve(cwd, 'apps', 'api');
  const monorepoBackendPackageJson = resolve(
    monorepoBackendDir,
    'package.json',
  );

  if (existsSync(currentPackageJson) && existsSync(currentNestCliJson)) {
    return cwd;
  }

  if (existsSync(monorepoBackendPackageJson)) {
    return monorepoBackendDir;
  }

  return cwd;
};

export const resolveFrontendRootDir = (): string => {
  const backendRoot = resolveBackendRootDir();
  return resolve(backendRoot, '..', 'web');
};

export const resolveFrontendPublicDir = (): string =>
  resolve(resolveFrontendRootDir(), 'public');

export const resolveBackendEnvFilePaths = (): string[] => {
  const backendEnvRoot = resolveBackendRootDir();
  return [resolve(backendEnvRoot, '.env')];
};

const loadBackendEnvFiles = () => {
  if (hasLoadedEnvFiles) return;

  const candidates = resolveBackendEnvFilePaths();

  for (const path of candidates) {
    tryLoadEnvFile(path);
  }

  hasLoadedEnvFiles = true;
};

export const isProductionNodeEnv = (): boolean =>
  process.env.NODE_ENV === 'production';

export const readOptionalEnv = (name: string): string | null => {
  loadBackendEnvFiles();
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
};

export const readRequiredEnv = (name: string): string => {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

interface ReadIntegerEnvOptions {
  fallback: number;
  min?: number;
  max?: number;
}

interface ReadBooleanEnvOptions {
  fallback: boolean;
}

export const readIntegerEnv = (
  name: string,
  { fallback, min, max }: ReadIntegerEnvOptions,
): number => {
  const rawValue = readOptionalEnv(name);
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (typeof min === 'number' && parsed < min) {
    return fallback;
  }

  if (typeof max === 'number' && parsed > max) {
    return fallback;
  }

  return parsed;
};

export const readBooleanEnv = (
  name: string,
  { fallback }: ReadBooleanEnvOptions,
): boolean => {
  const rawValue = readOptionalEnv(name);
  if (!rawValue) {
    return fallback;
  }

  switch (rawValue.toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      return fallback;
  }
};

export const parseCorsOrigins = (
  rawOrigins: string | null | undefined,
): string[] => {
  if (!rawOrigins || rawOrigins.trim().length === 0) {
    throw new Error(
      'Missing CORS_ORIGIN. Define comma-separated frontend origin(s) in environment variables.',
    );
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN is empty after parsing.');
  }

  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `Invalid CORS_ORIGIN entry "${origin}". Use http:// or https:// origins.`,
      );
    }
  }

  return origins;
};

export const readProxySharedKey = (): string =>
  readOptionalEnv('SOLERA_PROXY_SHARED_KEY') || '';

export const ensureSecurityEnv = () => {
  readRequiredEnv('SOLERA_PROXY_SHARED_KEY');
};

export const readPort = (): number => {
  const rawPort = readOptionalEnv('PORT');
  if (!rawPort) return 3001;

  const parsed = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid PORT value. Must be a positive integer.');
  }

  return parsed;
};
