import { readOptionalEnv } from '../common/env';
import { WRAPPED_SOL_MINT_ADDRESS } from '../common/solana.constants';

export const MAINTENANCE_SETTINGS_ID = 'maintenance-settings';
export const HEADER_SETTINGS_ID = 'header-settings';
export const RA_RUNTIME_SETTINGS_ID = 'ra-runtime-settings';
export const PROXY_BACKEND_SETTINGS_ID = 'proxy-backend-settings';
export const DOCS_SETTINGS_ID = 'docs-settings';
export const DEFAULT_HEADER_NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Staking', href: '/staking' },
  { name: 'Explorer', href: '/explorer' },
  { name: 'Blog', href: '/blog' },
  { name: 'Docs', href: '/docs' },
] as const;
export const DEFAULT_HEADER_SETTINGS = {
  logoUrl: '/logos/ra-white-logo.png',
  projectName: 'Solera Work',
  description: 'MEME coin staking platform',
  network: 'devnet',
  connectEnabled: true,
  navLinks: DEFAULT_HEADER_NAV_LINKS.map((link) => ({ ...link })),
} as const;
export const DEFAULT_HEADER_NETWORK = DEFAULT_HEADER_SETTINGS.network;
export const DEFAULT_ONLINE_TIMEOUT_MS = 90_000;
export const MIN_ONLINE_TIMEOUT_MS = 30_000;
export const MAX_ONLINE_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_RA_PRICE_USD = 0.1;
export const DEFAULT_RA_MINT_DEVNET =
  'AUUQf8oWYxvqWnAvg2rf9jdL1AAJibHCzshvjisxXZ22';
export const DEFAULT_RA_MINT_MAINNET =
  '2jPF5RY4B3jtJb4iAwRZ5J68WLLu4uaaBZ4wpjV29YYA';
export const DEFAULT_RA_LOGO_URL = '/logos/ra-white-logo.png';
export const DEFAULT_RA_TOKEN_SYMBOL = 'RA';
export const DEFAULT_RA_TOKEN_NAME = 'Solera';
export const DEFAULT_RA_TREASURY_DEVNET =
  '2KNsZWkfUrrpsuP2svBVHGUDPnUTGf1RdJ3TisnfnETp';
export const DEFAULT_RA_TREASURY_MAINNET =
  '2KNsZWkfUrrpsuP2svBVHGUDPnUTGf1RdJ3TisnfnETp';
export const DEFAULT_RA_ORACLE_PRIMARY = 'DEXSCREENER';
export const DEFAULT_RA_ORACLE_SECONDARY = 'RAYDIUM';
export const DEFAULT_RA_STAKE_FEE_BPS = 5;
export const DEFAULT_RA_CLAIM_FEE_BPS = 5;
export const DEFAULT_RA_CONVERT_FEE_BPS = 25;
export const DEFAULT_RA_CONVERT_ENABLED = true;
export const DEFAULT_RA_CONVERT_PROVIDER = 'RAYDIUM';
export const DEFAULT_RA_CONVERT_EXECUTION_MODE = 'ALLOW_MULTI_TX';
export const DEFAULT_RA_CONVERT_ROUTE_POLICY = 'TOKEN_TO_SOL_TO_RA';
export const DEFAULT_RA_CONVERT_SLIPPAGE_BPS = 100;
export const DEFAULT_RA_CONVERT_MAX_TOKENS_PER_SESSION = 5;
export const DEFAULT_RA_CONVERT_POOL_ID_DEVNET =
  'GjcATx94fS1adW1hEVwFH8ACh9kmxaNcrW3xWpxR6PrZ';
export const DEFAULT_RA_CONVERT_POOL_ID_MAINNET =
  'GjcATx94fS1adW1hEVwFH8ACh9kmxaNcrW3xWpxR6PrZ';
export const DEFAULT_RA_CONVERT_QUOTE_MINT_DEVNET = WRAPPED_SOL_MINT_ADDRESS;
export const DEFAULT_RA_CONVERT_QUOTE_MINT_MAINNET = WRAPPED_SOL_MINT_ADDRESS;
export const DEFAULT_RA_STAKE_MIN_USD = 10;
export const DEFAULT_RA_STAKE_MAX_USD = 50_000;
export const DEFAULT_RA_CONVERT_MIN_USD = 0.5;
export const DEFAULT_RA_CONVERT_MAX_USD = 2.5;
export const ORACLE_PROVIDERS = new Set(['DEXSCREENER', 'RAYDIUM']);
export const CONVERT_PROVIDERS = new Set(['RAYDIUM', 'JUPITER']);
export const CONVERT_EXECUTION_MODES = new Set([
  'AUTO',
  'SINGLE_TX_ONLY',
  'ALLOW_MULTI_TX',
]);
export const CONVERT_ROUTE_POLICIES = new Set(['TOKEN_TO_SOL_TO_RA']);

export const resolveOnlineTimeoutMs = () => {
  const raw = readOptionalEnv('USER_ONLINE_TIMEOUT_MS');
  if (!raw) return DEFAULT_ONLINE_TIMEOUT_MS;

  const parsed = Number.parseInt(raw, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed < MIN_ONLINE_TIMEOUT_MS ||
    parsed > MAX_ONLINE_TIMEOUT_MS
  ) {
    return DEFAULT_ONLINE_TIMEOUT_MS;
  }

  return parsed;
};
