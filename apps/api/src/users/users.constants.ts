import { WalletActivityStatus, WalletActivityType } from '@prisma/client';
import { readIntegerEnv } from '../common/env';
import { RAYDIUM_API_BASE_URL } from '../common/external.constants';
import {
  DEFAULT_RA_LOGO_URL,
  DEFAULT_RA_TOKEN_SYMBOL,
} from '../system/system.constants';
export {
  DEFAULT_HEADER_NETWORK,
  DEFAULT_RA_CLAIM_FEE_BPS,
  DEFAULT_RA_CONVERT_ENABLED,
  DEFAULT_RA_CONVERT_EXECUTION_MODE,
  DEFAULT_RA_CONVERT_MAX_TOKENS_PER_SESSION,
  DEFAULT_RA_CONVERT_MAX_USD,
  DEFAULT_RA_CONVERT_MIN_USD,
  DEFAULT_RA_CONVERT_POOL_ID_DEVNET,
  DEFAULT_RA_CONVERT_POOL_ID_MAINNET,
  DEFAULT_RA_CONVERT_PROVIDER,
  DEFAULT_RA_CONVERT_QUOTE_MINT_DEVNET,
  DEFAULT_RA_CONVERT_QUOTE_MINT_MAINNET,
  DEFAULT_RA_CONVERT_ROUTE_POLICY,
  DEFAULT_RA_CONVERT_SLIPPAGE_BPS,
  DEFAULT_RA_LOGO_URL,
  DEFAULT_RA_MINT_DEVNET,
  DEFAULT_RA_MINT_MAINNET,
  DEFAULT_RA_ORACLE_PRIMARY,
  DEFAULT_RA_ORACLE_SECONDARY,
  DEFAULT_RA_PRICE_USD,
  DEFAULT_RA_STAKE_FEE_BPS,
  DEFAULT_RA_STAKE_MAX_USD,
  DEFAULT_RA_STAKE_MIN_USD,
  DEFAULT_RA_TOKEN_NAME,
  DEFAULT_RA_TOKEN_SYMBOL,
  DEFAULT_RA_TREASURY_DEVNET,
  DEFAULT_RA_TREASURY_MAINNET,
  HEADER_SETTINGS_ID,
  RA_RUNTIME_SETTINGS_ID,
} from '../system/system.constants';

export const GEO_LOOKUP_TIMEOUT_MS = 2_000;
export const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const GEO_NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;
export const USER_AUTH_TOKEN_TYPE = 'wallet_user';
export const USER_AUTH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const DEFAULT_ONLINE_TIMEOUT_MS = 90_000;
export const ONLINE_TIMEOUT_MS = readIntegerEnv('USER_ONLINE_TIMEOUT_MS', {
  fallback: DEFAULT_ONLINE_TIMEOUT_MS,
  min: 30_000,
  max: 15 * 60 * 1000,
});
export const WALLET_AUTH_NONCE_TTL_MS = 5 * 60 * 1000;
export const WALLET_AUTH_NONCE_PER_MINUTE = 30;
export const WALLET_AUTH_VERIFY_PER_MINUTE = 40;
export const WALLET_AUTH_APP_NAME = 'Solera Work';
export const HEADER_SETTINGS_CACHE_TTL_MS = 10_000;
export const CONNECT_DISABLED_MESSAGE =
  'Wallet connections are temporarily disabled by platform administration.';
export const DEFAULT_BLOCK_MESSAGE =
  'You are blocked. Please contact block@solera.work for assistance.';
export const RA_SETTINGS_CACHE_TTL_MS = 10_000;
export const RA_ORACLE_RAYDIUM_API_BASE = RAYDIUM_API_BASE_URL;
export const EXPLORER_FEED_DEFAULT_LIMIT = 30;
export const EXPLORER_FEED_MAX_LIMIT = 100;
export const EXPLORER_ACTIVITY_STATUSES = new Set<WalletActivityStatus>([
  WalletActivityStatus.PENDING,
  WalletActivityStatus.COMPLETED,
  WalletActivityStatus.FAILED,
]);
export const MANUAL_EXPLORER_ACTIVITY_TYPES = new Set<WalletActivityType>([
  WalletActivityType.DEPOSIT,
  WalletActivityType.WITHDRAW,
  WalletActivityType.CONVERT,
]);
export const STAKE_PERIOD_DAYS: Record<string, number> = {
  '7D': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '12M': 365,
};
export const TOKEN_LOGO_BY_TICKER: Record<string, string> = {
  [DEFAULT_RA_TOKEN_SYMBOL]: DEFAULT_RA_LOGO_URL,
  PEPE: 'https://cryptologos.cc/logos/pepe-pepe-logo.png',
  WIF: 'https://cryptologos.cc/logos/dogwifhat-wif-logo.png',
  DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
  SHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png',
  BONK: 'https://cryptologos.cc/logos/bonk1-bonk-logo.png',
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
};
