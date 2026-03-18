import {
  readIntegerEnv,
  readOptionalEnv,
  readRequiredEnv,
} from '../common/env';
import { RAYDIUM_API_BASE_URL } from '../common/external.constants';
import {
  DEFAULT_PAIR_CONFIG,
  MIN_POLL_INTERVAL_MS,
  normalizePollIntervalMs,
} from './ohlc.constants';
import type { PairConfig } from './ohlc.types';

export interface OhlcEnvConfig {
  raydiumApiBase: string;
  defaultPollIntervalMs: number;
  pairConfig: PairConfig;
  databaseUrl: string;
}

export const readOhlcEnvConfig = (): OhlcEnvConfig => {
  const defaultPollIntervalMs = normalizePollIntervalMs(
    readIntegerEnv('OHLC_POLL_INTERVAL_MS', {
      fallback: MIN_POLL_INTERVAL_MS,
      min: MIN_POLL_INTERVAL_MS,
    }),
    MIN_POLL_INTERVAL_MS,
  );

  return {
    raydiumApiBase:
      readOptionalEnv('OHLC_RAYDIUM_API_BASE') || RAYDIUM_API_BASE_URL,
    defaultPollIntervalMs,
    pairConfig: {
      pairKey: readOptionalEnv('OHLC_PAIR_KEY') || DEFAULT_PAIR_CONFIG.pairKey,
      poolId:
        readOptionalEnv('OHLC_PAIR_POOL_ID') || DEFAULT_PAIR_CONFIG.poolId,
      baseMint:
        readOptionalEnv('OHLC_BASE_MINT') || DEFAULT_PAIR_CONFIG.baseMint,
      quoteMint:
        readOptionalEnv('OHLC_QUOTE_MINT') || DEFAULT_PAIR_CONFIG.quoteMint,
      baseSymbol:
        readOptionalEnv('OHLC_BASE_SYMBOL') || DEFAULT_PAIR_CONFIG.baseSymbol,
      quoteSymbol:
        readOptionalEnv('OHLC_QUOTE_SYMBOL') || DEFAULT_PAIR_CONFIG.quoteSymbol,
    },
    databaseUrl: readRequiredEnv('OHLC_DATABASE_URL'),
  };
};
