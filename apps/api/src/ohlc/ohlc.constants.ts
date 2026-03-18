import type { IntervalKey, PairConfig, StoredIntervalKey } from './ohlc.types';
import { WRAPPED_SOL_MINT_ADDRESS } from '../common/solana.constants';

export const INTERVAL_SECONDS: Record<IntervalKey, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3_600,
  '4h': 14_400,
};

export const STORAGE_INTERVAL_KEYS: StoredIntervalKey[] = ['1m', '5m', '15m'];

export const DEFAULT_PAIR_CONFIG: PairConfig = {
  pairKey: 'RA_SOL',
  poolId: 'GjcATx94fS1adW1hEVwFH8ACh9kmxaNcrW3xWpxR6PrZ',
  baseMint: '2jPF5RY4B3jtJb4iAwRZ5J68WLLu4uaaBZ4wpjV29YYA',
  quoteMint: WRAPPED_SOL_MINT_ADDRESS,
  baseSymbol: 'RA',
  quoteSymbol: 'SOL',
};

export const RUNTIME_SETTINGS_ID = 'default';
export const MIN_POLL_INTERVAL_MS = 5_000;
export const MAX_POLL_INTERVAL_MS = 300_000;

export const normalizePollIntervalMs = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    Math.max(Math.floor(value), MIN_POLL_INTERVAL_MS),
    MAX_POLL_INTERVAL_MS,
  );
};
