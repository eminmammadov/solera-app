import { readOptionalEnv } from './env';

export const DEXSCREENER_API_BASE_URL =
  readOptionalEnv('DEXSCREENER_API_BASE_URL') || 'https://api.dexscreener.com';
export const RAYDIUM_API_BASE_URL =
  readOptionalEnv('OHLC_RAYDIUM_API_BASE') || 'https://api-v3.raydium.io';
export const RAYDIUM_TRADE_API_BASE_URL =
  readOptionalEnv('RAYDIUM_TRADE_API_BASE_URL') ||
  'https://transaction-v1.raydium.io';
export const SOLSCAN_BASE_URL =
  readOptionalEnv('SOLSCAN_BASE_URL') || 'https://solscan.io';

export const buildSolscanTxUrl = (
  signature: string,
  network: 'devnet' | 'mainnet',
) =>
  `${SOLSCAN_BASE_URL}/tx/${signature}${
    network === 'mainnet' ? '' : `?cluster=${network}`
  }`;
