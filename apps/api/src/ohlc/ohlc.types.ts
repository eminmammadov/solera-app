import type { Pool } from 'pg';
import type { PoolClient } from 'pg';

export type StoredIntervalKey = '1m' | '5m' | '15m';
export type IntervalKey = StoredIntervalKey | '1h' | '4h';

export interface PairConfig {
  pairKey: string;
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
}

export interface TrackedPairRecord {
  id: number;
  pair_key: string;
  pool_id: string;
  base_mint: string;
  quote_mint: string;
  base_symbol: string;
  quote_symbol: string;
  is_active: boolean;
  is_core: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackedPairWithLatestTickRow extends TrackedPairRecord {
  latest_tick_at: string | null;
  latest_price_usd: string | null;
}

export interface GetBarsInput {
  pair?: string;
  interval: string;
  limit: number;
}

export interface RaydiumPoolInfoResponse {
  success: boolean;
  data?: Array<{
    id: string;
    price: number | string;
    mintA: { address: string; symbol?: string };
    mintB: { address: string; symbol?: string };
    day?: { volume?: number };
  }>;
}

export interface RaydiumMintPriceResponse {
  success: boolean;
  data?: Record<string, string | number | null>;
}

export interface PriceSnapshot {
  pairId: number;
  pairKey: string;
  ts: Date;
  priceUsd: number;
  priceQuote: number;
  volumeEstimate: number;
}

export interface OhlcRuntimeSettingsRecord {
  poll_interval_ms: number;
  ingest_enabled: boolean;
  featured_pair_key: string | null;
}

export interface NormalizedPairInput {
  pairKey: string;
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  isActive: boolean;
}

export interface OhlcAdminContext {
  pairConfig: PairConfig;
  currentPollIntervalMs: number;
  ingestEnabled: boolean;
  featuredPairKey: string | null;
  requirePool(): Pool;
  resolvePair(pair?: string): Promise<TrackedPairRecord>;
  pollOnce(force?: boolean): Promise<void>;
  startPolling(): void;
  stopPolling(): void;
  parsePairId(value: number): number;
  getPairById(pairId: number): Promise<TrackedPairRecord>;
  normalizePairInput(input: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
    isActive?: boolean;
  }): NormalizedPairInput;
  rethrowPairConflictError(error: unknown): never;
  updateRuntimeFeaturedPairKey(pairKey: string | null): Promise<void>;
  ensureFeaturedPairKeyIsValid(): Promise<void>;
  setRuntimeState(input: {
    currentPollIntervalMs?: number;
    ingestEnabled?: boolean;
    featuredPairKey?: string | null;
  }): void;
}

export interface OhlcQueryContext {
  pairConfig: PairConfig;
  currentPollIntervalMs: number;
  ingestEnabled: boolean;
  featuredPairKey: string | null;
  requirePool(): Pool;
  resolvePair(pair?: string): Promise<TrackedPairRecord>;
  parseInterval(interval: string): IntervalKey;
  clampLimit(limit: number): number;
  getStoredBars(
    pairId: number,
    intervalSec: number,
    limit: number,
  ): Promise<
    Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>
  >;
  getAggregatedBars(
    pairId: number,
    intervalSec: number,
    limit: number,
  ): Promise<
    Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>
  >;
}

export interface OhlcRuntimeContext {
  pool: Pool | null;
  pairConfig: PairConfig;
  currentPollIntervalMs: number;
  ingestEnabled: boolean;
  isPolling: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;
  logger: {
    log(message: string): void;
    warn(message: string): void;
    error(message: string, stack?: string): void;
  };
  ensureSchema(): Promise<void>;
  ensureDefaultTrackedPair(): Promise<void>;
  ensureRuntimeSettings(): Promise<void>;
  reconcileStartupPairs(): Promise<void>;
  loadActivePairs(): Promise<TrackedPairRecord[]>;
  fetchCurrentSnapshot(
    pair: TrackedPairRecord,
    quoteUsdCache: Map<string, number | null>,
  ): Promise<PriceSnapshot | null>;
  persistSnapshot(snapshot: PriceSnapshot): Promise<void>;
  setRuntimeState(input: {
    currentPollIntervalMs?: number;
    ingestEnabled?: boolean;
    isPolling?: boolean;
    pollTimer?: ReturnType<typeof setInterval> | null;
  }): void;
  pollOnce(force?: boolean): Promise<void>;
  closePool(): Promise<void>;
}

export interface OhlcPersistenceContext {
  pool: Pool | null;
  pairConfig: PairConfig;
  defaultPollIntervalMs: number;
  currentPollIntervalMs: number;
  ingestEnabled: boolean;
  featuredPairKey: string | null;
  setRuntimeState(input: {
    currentPollIntervalMs?: number;
    ingestEnabled?: boolean;
    featuredPairKey?: string | null;
  }): void;
}

export type OhlcBarRow = {
  bucket_time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export type OhlcBarPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OhlcUpsertBarFn = (
  client: PoolClient,
  snapshot: PriceSnapshot,
  intervalSec: number,
) => Promise<void>;
