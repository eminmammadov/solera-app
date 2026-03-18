import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import {
  INTERVAL_SECONDS,
  MAX_POLL_INTERVAL_MS,
  MIN_POLL_INTERVAL_MS,
  STORAGE_INTERVAL_KEYS,
} from './ohlc.constants';
import { readOhlcEnvConfig } from './ohlc-config';
import { OhlcAdminService } from './ohlc-admin.service';
import { OhlcPersistenceService } from './ohlc-persistence.service';
import { OhlcQueryService } from './ohlc-query.service';
import { OhlcRuntimeService } from './ohlc-runtime.service';
import type {
  GetBarsInput,
  IntervalKey,
  OhlcAdminContext,
  OhlcPersistenceContext,
  OhlcQueryContext,
  OhlcRuntimeContext,
  PairConfig,
  PriceSnapshot,
  RaydiumMintPriceResponse,
  RaydiumPoolInfoResponse,
  TrackedPairRecord,
} from './ohlc.types';

@Injectable()
export class OhlcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OhlcService.name);
  private readonly envConfig = readOhlcEnvConfig();
  private readonly raydiumApiBase = this.envConfig.raydiumApiBase;
  private readonly defaultPollIntervalMs = this.envConfig.defaultPollIntervalMs;
  private readonly pairConfig: PairConfig = this.envConfig.pairConfig;

  private readonly dbUrl = this.envConfig.databaseUrl;
  private readonly pool: Pool | null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private currentPollIntervalMs = this.defaultPollIntervalMs;
  private ingestEnabled = true;
  private featuredPairKey: string | null = this.pairConfig.pairKey;

  constructor(
    private readonly adminService: OhlcAdminService,
    private readonly persistenceService: OhlcPersistenceService,
    private readonly queryService: OhlcQueryService,
    private readonly runtimeService: OhlcRuntimeService,
  ) {
    this.pool = new Pool({
      connectionString: this.dbUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      statement_timeout: 8_000,
      connectionTimeoutMillis: 8_000,
    });
  }

  private buildAdminContext(): OhlcAdminContext {
    return {
      pairConfig: this.pairConfig,
      currentPollIntervalMs: this.currentPollIntervalMs,
      ingestEnabled: this.ingestEnabled,
      featuredPairKey: this.featuredPairKey,
      requirePool: () => this.requirePool(),
      resolvePair: (pair?: string) => this.resolvePair(pair),
      pollOnce: (force = false) => this.pollOnce(force),
      startPolling: () => this.startPolling(),
      stopPolling: () => this.stopPolling(),
      parsePairId: (value: number) => this.parsePairId(value),
      getPairById: (pairId: number) => this.getPairById(pairId),
      normalizePairInput: (input) => this.normalizePairInput(input),
      rethrowPairConflictError: (error: unknown): never =>
        this.rethrowPairConflictError(error),
      updateRuntimeFeaturedPairKey: (pairKey: string | null) =>
        this.updateRuntimeFeaturedPairKey(pairKey),
      ensureFeaturedPairKeyIsValid: () => this.ensureFeaturedPairKeyIsValid(),
      setRuntimeState: (input) => {
        if (input.currentPollIntervalMs !== undefined) {
          this.currentPollIntervalMs = input.currentPollIntervalMs;
        }
        if (input.ingestEnabled !== undefined) {
          this.ingestEnabled = input.ingestEnabled;
        }
        if (input.featuredPairKey !== undefined) {
          this.featuredPairKey = input.featuredPairKey;
        }
      },
    };
  }

  private buildPersistenceContext(): OhlcPersistenceContext {
    return {
      pool: this.pool,
      pairConfig: this.pairConfig,
      defaultPollIntervalMs: this.defaultPollIntervalMs,
      currentPollIntervalMs: this.currentPollIntervalMs,
      ingestEnabled: this.ingestEnabled,
      featuredPairKey: this.featuredPairKey,
      setRuntimeState: (input) => {
        if (input.currentPollIntervalMs !== undefined) {
          this.currentPollIntervalMs = input.currentPollIntervalMs;
        }
        if (input.ingestEnabled !== undefined) {
          this.ingestEnabled = input.ingestEnabled;
        }
        if (input.featuredPairKey !== undefined) {
          this.featuredPairKey = input.featuredPairKey;
        }
      },
    };
  }

  private buildQueryContext(): OhlcQueryContext {
    return {
      pairConfig: this.pairConfig,
      currentPollIntervalMs: this.currentPollIntervalMs,
      ingestEnabled: this.ingestEnabled,
      featuredPairKey: this.featuredPairKey,
      requirePool: () => this.requirePool(),
      resolvePair: (pair?: string) => this.resolvePair(pair),
      parseInterval: (interval: string) => this.parseInterval(interval),
      clampLimit: (limit: number) => this.clampLimit(limit),
      getStoredBars: (pairId, intervalSec, limit) =>
        this.getStoredBars(pairId, intervalSec, limit),
      getAggregatedBars: (pairId, intervalSec, limit) =>
        this.getAggregatedBars(pairId, intervalSec, limit),
    };
  }

  private buildRuntimeContext(): OhlcRuntimeContext {
    return {
      pool: this.pool,
      pairConfig: this.pairConfig,
      currentPollIntervalMs: this.currentPollIntervalMs,
      ingestEnabled: this.ingestEnabled,
      isPolling: this.isPolling,
      pollTimer: this.pollTimer,
      logger: this.logger,
      ensureSchema: () => this.ensureSchema(),
      ensureDefaultTrackedPair: () => this.ensureDefaultTrackedPair(),
      ensureRuntimeSettings: () => this.ensureRuntimeSettings(),
      reconcileStartupPairs: () => this.reconcileStartupPairs(),
      loadActivePairs: () => this.loadActivePairs(),
      fetchCurrentSnapshot: (pair, quoteUsdCache) =>
        this.fetchCurrentSnapshot(pair, quoteUsdCache),
      persistSnapshot: (snapshot) => this.persistSnapshot(snapshot),
      setRuntimeState: (input) => {
        if (input.currentPollIntervalMs !== undefined) {
          this.currentPollIntervalMs = input.currentPollIntervalMs;
        }
        if (input.ingestEnabled !== undefined) {
          this.ingestEnabled = input.ingestEnabled;
        }
        if (input.isPolling !== undefined) {
          this.isPolling = input.isPolling;
        }
        if (input.pollTimer !== undefined) {
          this.pollTimer = input.pollTimer;
        }
      },
      pollOnce: (force = false) =>
        this.runtimeService.pollOnce(this.buildRuntimeContext(), force),
      closePool: async () => {
        if (this.pool) {
          await this.pool.end();
        }
      },
    };
  }

  async onModuleInit() {
    return this.runtimeService.initializeRuntime(this.buildRuntimeContext());
  }

  async onModuleDestroy() {
    return this.runtimeService.destroyRuntime(this.buildRuntimeContext());
  }

  async getAdminConfig() {
    if (!this.pool) {
      return {
        success: false,
        status: 'disabled',
        reason: 'OHLC_DATABASE_URL is not configured.',
        ingestEnabled: false,
        pollIntervalMs: null,
        featuredPairKey: this.pairConfig.pairKey,
        minPollIntervalMs: MIN_POLL_INTERVAL_MS,
        maxPollIntervalMs: MAX_POLL_INTERVAL_MS,
        pair: {
          pairKey: this.pairConfig.pairKey,
          poolId: this.pairConfig.poolId,
          baseMint: this.pairConfig.baseMint,
          quoteMint: this.pairConfig.quoteMint,
          baseSymbol: this.pairConfig.baseSymbol,
          quoteSymbol: this.pairConfig.quoteSymbol,
        },
      };
    }

    return this.adminService.getAdminConfig(this.buildAdminContext());
  }

  async getFeaturedPair() {
    return this.queryService.getFeaturedPair(this.buildQueryContext());
  }

  async updateAdminConfig(input: {
    pollIntervalMs?: number;
    ingestEnabled?: boolean;
  }) {
    return this.adminService.updateAdminConfig(this.buildAdminContext(), input);
  }

  async syncNow() {
    return this.adminService.syncNow(this.buildAdminContext());
  }

  async setAdminFeaturedPair(pairIdRaw: number) {
    return this.adminService.setAdminFeaturedPair(
      this.buildAdminContext(),
      pairIdRaw,
    );
  }

  async syncRuntimeFeaturedPair(input: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
  }) {
    const pair = await this.persistenceService.upsertRuntimeFeaturedPair(
      this.buildPersistenceContext(),
      input,
    );

    if (this.ingestEnabled) {
      try {
        await this.pollOnce(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown OHLC sync error.';
        this.logger.warn(
          `Runtime featured pair synced, but OHLC refresh failed: ${message}`,
        );
      }
    }

    return {
      success: true,
      pair: {
        id: pair.id,
        pairKey: pair.pair_key,
        poolId: pair.pool_id,
        baseMint: pair.base_mint,
        quoteMint: pair.quote_mint,
        baseSymbol: pair.base_symbol,
        quoteSymbol: pair.quote_symbol,
      },
    };
  }

  async validateRuntimeFeaturedPair(input: {
    poolId: string;
    baseMint: string;
    quoteMint: string;
  }): Promise<boolean> {
    const poolInfo = await this.fetchRaydiumPoolInfo(input.poolId);
    if (!poolInfo) {
      return false;
    }

    const mintA = poolInfo.mintA.address.trim().toLowerCase();
    const mintB = poolInfo.mintB.address.trim().toLowerCase();
    const baseMint = input.baseMint.trim().toLowerCase();
    const quoteMint = input.quoteMint.trim().toLowerCase();

    return (
      (mintA === baseMint && mintB === quoteMint) ||
      (mintA === quoteMint && mintB === baseMint)
    );
  }

  getConfiguredCorePair() {
    return { ...this.pairConfig };
  }

  async getPairs() {
    return this.adminService.getPairs(this.buildAdminContext());
  }

  async getAdminPairs() {
    return this.adminService.getAdminPairs(this.buildAdminContext());
  }

  async createAdminPair(input: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
    isActive?: boolean;
  }) {
    return this.adminService.createAdminPair(this.buildAdminContext(), input);
  }

  async updateAdminPair(
    pairIdRaw: number,
    input: {
      pairKey?: string;
      poolId?: string;
      baseMint?: string;
      quoteMint?: string;
      baseSymbol?: string;
      quoteSymbol?: string;
      isActive?: boolean;
    },
  ) {
    return this.adminService.updateAdminPair(
      this.buildAdminContext(),
      pairIdRaw,
      input,
    );
  }

  async deleteAdminPair(pairIdRaw: number) {
    return this.adminService.deleteAdminPair(
      this.buildAdminContext(),
      pairIdRaw,
    );
  }

  async getBars({ pair, interval, limit }: GetBarsInput) {
    return this.queryService.getBars(this.buildQueryContext(), {
      pair,
      interval,
      limit,
    });
  }

  async getTicker(pair?: string) {
    return this.queryService.getTicker(this.buildQueryContext(), pair);
  }

  async getHealth() {
    if (!this.pool) {
      return {
        success: false,
        status: 'disabled',
        reason: 'OHLC_DATABASE_URL is not configured.',
      };
    }

    return this.queryService.getHealth(this.buildQueryContext());
  }

  private async ensureSchema() {
    return this.persistenceService.ensureSchema(this.buildPersistenceContext());
  }

  private async ensureDefaultTrackedPair() {
    return this.persistenceService.ensureDefaultTrackedPair(
      this.buildPersistenceContext(),
    );
  }

  private async ensureRuntimeSettings() {
    return this.persistenceService.ensureRuntimeSettings(
      this.buildPersistenceContext(),
    );
  }

  private startPolling() {
    this.runtimeService.startPolling(this.buildRuntimeContext());
  }

  private stopPolling() {
    this.runtimeService.stopPolling(this.buildRuntimeContext());
  }

  private async resolvePair(pair?: string) {
    return this.persistenceService.resolvePair(
      this.buildPersistenceContext(),
      pair,
    );
  }

  private parseInterval(interval: string): IntervalKey {
    if (
      interval === '1m' ||
      interval === '5m' ||
      interval === '15m' ||
      interval === '1h' ||
      interval === '4h'
    ) {
      return interval;
    }
    throw new NotFoundException(
      'Unsupported interval. Use 1m, 5m, 15m, 1h, or 4h.',
    );
  }

  private clampLimit(limit: number) {
    if (!Number.isFinite(limit) || limit <= 0) return 300;
    return Math.min(Math.max(Math.floor(limit), 1), 2000);
  }

  private async loadActivePairs() {
    return this.persistenceService.loadActivePairs(
      this.buildPersistenceContext(),
    );
  }

  private async reconcileStartupPairs() {
    const activePairs = await this.loadActivePairs();
    if (activePairs.length === 0) {
      return;
    }

    const compatiblePairs: TrackedPairRecord[] = [];
    const mismatchedPairs: TrackedPairRecord[] = [];

    for (const pair of activePairs) {
      const compatibility = await this.inspectTrackedPairCompatibility(pair);
      if (compatibility === 'compatible') {
        compatiblePairs.push(pair);
      } else if (compatibility === 'orientation-mismatch') {
        mismatchedPairs.push(pair);
      }
    }

    if (mismatchedPairs.length === 0) {
      return;
    }

    if (compatiblePairs.length === 0) {
      const fallbackPair = this.getConfiguredCorePair();
      const fallbackIsCompatible = await this.validateRuntimeFeaturedPair(
        fallbackPair,
      ).catch(() => false);

      if (!fallbackIsCompatible) {
        this.logger.warn(
          `OHLC startup detected ${mismatchedPairs.length} incompatible tracked pair(s), but the configured core pair could not be validated.`,
        );
        return;
      }

      await this.syncRuntimeFeaturedPair(fallbackPair);
      this.logger.warn(
        `OHLC startup restored the configured core pair after detecting ${mismatchedPairs.length} incompatible tracked pair(s).`,
      );
      return;
    }

    const mismatchedIds = mismatchedPairs.map((pair) => pair.id);
    const deactivatedCount =
      await this.persistenceService.deactivateTrackedPairs(
        this.buildPersistenceContext(),
        mismatchedIds,
      );

    const fallbackPair = compatiblePairs[0] ?? null;
    const featuredPairIsInvalid = mismatchedPairs.some(
      (pair) => pair.pair_key === this.featuredPairKey,
    );
    if (featuredPairIsInvalid && fallbackPair) {
      await this.updateRuntimeFeaturedPairKey(fallbackPair.pair_key);
    }

    this.logger.warn(
      `OHLC startup deactivated ${deactivatedCount} incompatible tracked pair(s) before polling.`,
    );
  }

  private async pollOnce(force = false) {
    return this.runtimeService.pollOnce(this.buildRuntimeContext(), force);
  }

  private async inspectTrackedPairCompatibility(
    pair: Pick<TrackedPairRecord, 'pool_id' | 'base_mint' | 'quote_mint'>,
  ): Promise<'compatible' | 'orientation-mismatch' | 'unverified'> {
    try {
      const poolInfo = await this.fetchRaydiumPoolInfo(pair.pool_id);
      if (!poolInfo) {
        return 'unverified';
      }

      const mintA = poolInfo.mintA.address.trim().toLowerCase();
      const mintB = poolInfo.mintB.address.trim().toLowerCase();
      const baseMint = pair.base_mint.trim().toLowerCase();
      const quoteMint = pair.quote_mint.trim().toLowerCase();

      return (mintA === baseMint && mintB === quoteMint) ||
        (mintA === quoteMint && mintB === baseMint)
        ? 'compatible'
        : 'orientation-mismatch';
    } catch {
      return 'unverified';
    }
  }

  private async fetchCurrentSnapshot(
    pair: TrackedPairRecord,
    quoteUsdCache: Map<string, number | null>,
  ): Promise<PriceSnapshot | null> {
    const poolInfo = await this.fetchRaydiumPoolInfo(pair.pool_id);
    if (!poolInfo) return null;

    let quoteMintUsd = quoteUsdCache.get(pair.quote_mint);
    if (quoteMintUsd === undefined) {
      quoteMintUsd = await this.fetchMintUsd(pair.quote_mint);
      quoteUsdCache.set(pair.quote_mint, quoteMintUsd);
    }

    if (quoteMintUsd === null || quoteMintUsd <= 0) {
      throw new Error('Unable to resolve quote token USD price.');
    }

    const rawPrice = Number(poolInfo.price);
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
      throw new Error('Invalid pool price received from Raydium.');
    }

    let quotePerBase: number;
    if (
      poolInfo.mintA.address === pair.base_mint &&
      poolInfo.mintB.address === pair.quote_mint
    ) {
      quotePerBase = rawPrice;
    } else if (
      poolInfo.mintA.address === pair.quote_mint &&
      poolInfo.mintB.address === pair.base_mint
    ) {
      quotePerBase = 1 / rawPrice;
    } else {
      throw new Error('Pair mint orientation does not match configured mints.');
    }

    if (!Number.isFinite(quotePerBase) || quotePerBase <= 0) {
      throw new Error('Invalid converted quote price.');
    }

    const priceUsd = quotePerBase * quoteMintUsd;
    const dayVolume = Number(poolInfo.day?.volume ?? 0);
    const volumeEstimate =
      Number.isFinite(dayVolume) && dayVolume > 0 ? dayVolume / 17_280 : 0;
    const tickSizeMs = Math.max(
      this.currentPollIntervalMs,
      MIN_POLL_INTERVAL_MS,
    );
    const ts = new Date(Math.floor(Date.now() / tickSizeMs) * tickSizeMs);

    return {
      pairId: pair.id,
      pairKey: pair.pair_key,
      ts,
      priceUsd,
      priceQuote: quotePerBase,
      volumeEstimate,
    };
  }

  private async fetchRaydiumPoolInfo(poolId: string) {
    const url = new URL('/pools/info/ids', this.raydiumApiBase);
    url.searchParams.set('ids', poolId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`Raydium pool request failed with ${response.status}`);
    }

    const payload = (await response.json()) as RaydiumPoolInfoResponse;
    const poolInfo = payload.data?.[0];
    if (!payload.success || !poolInfo) {
      throw new Error('Raydium pool response did not include pool data.');
    }

    return poolInfo;
  }

  private async fetchMintUsd(mintAddress: string) {
    const url = new URL('/mint/price', this.raydiumApiBase);
    url.searchParams.set('mints', mintAddress);

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(
        `Raydium mint price request failed with ${response.status}`,
      );
    }

    const payload = (await response.json()) as RaydiumMintPriceResponse;
    const rawValue = payload.data?.[mintAddress];
    if (rawValue === null || rawValue === undefined) {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private async persistSnapshot(snapshot: PriceSnapshot) {
    return this.persistenceService.persistSnapshot(
      this.buildPersistenceContext(),
      snapshot,
      STORAGE_INTERVAL_KEYS.map((intervalKey) => INTERVAL_SECONDS[intervalKey]),
      (
        client: PoolClient,
        currentSnapshot: PriceSnapshot,
        intervalSec: number,
      ) => this.upsertBar(client, currentSnapshot, intervalSec),
    );
  }

  private async getStoredBars(
    pairId: number,
    intervalSec: number,
    limit: number,
  ) {
    return this.persistenceService.getStoredBars(
      this.buildPersistenceContext(),
      pairId,
      intervalSec,
      limit,
    );
  }

  private async getAggregatedBars(
    pairId: number,
    intervalSec: number,
    limit: number,
  ) {
    return this.persistenceService.getAggregatedBars(
      this.buildPersistenceContext(),
      pairId,
      intervalSec,
      limit,
    );
  }

  private async upsertBar(
    client: PoolClient,
    snapshot: PriceSnapshot,
    intervalSec: number,
  ) {
    await client.query(
      `INSERT INTO ohlc_bars (
         pair_id,
         interval_sec,
         bucket_start,
         open,
         high,
         low,
         close,
         volume,
         tick_count,
         last_source_ts,
         updated_at
       )
       VALUES (
         $1,
         $2::integer,
         TO_TIMESTAMP(
           FLOOR(EXTRACT(EPOCH FROM $3::timestamptz) / $2::double precision) *
           $2::double precision
         ),
         $4,
         $4,
         $4,
         $4,
         $5,
         1,
         $3,
         NOW()
       )
       ON CONFLICT (pair_id, interval_sec, bucket_start)
       DO UPDATE SET
         high = GREATEST(ohlc_bars.high, EXCLUDED.high),
         low = LEAST(ohlc_bars.low, EXCLUDED.low),
         close = EXCLUDED.close,
         volume = ohlc_bars.volume + EXCLUDED.volume,
         tick_count = ohlc_bars.tick_count + 1,
         last_source_ts = EXCLUDED.last_source_ts,
         updated_at = NOW()`,
      [
        snapshot.pairId,
        intervalSec,
        snapshot.ts.toISOString(),
        snapshot.priceUsd,
        snapshot.volumeEstimate,
      ],
    );
  }

  private parsePairId(value: number) {
    return this.persistenceService.parsePairId(value);
  }

  private normalizePairInput(input: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
    isActive?: boolean;
  }) {
    return this.persistenceService.normalizePairInput(input);
  }

  private async getPairById(pairId: number) {
    return this.persistenceService.getPairById(
      this.buildPersistenceContext(),
      pairId,
    );
  }

  private rethrowPairConflictError(error: unknown): never {
    return this.persistenceService.rethrowPairConflictError(error);
  }

  private async updateRuntimeFeaturedPairKey(pairKey: string | null) {
    return this.persistenceService.updateRuntimeFeaturedPairKey(
      this.buildPersistenceContext(),
      pairKey,
    );
  }

  private async ensureFeaturedPairKeyIsValid() {
    return this.persistenceService.ensureFeaturedPairKeyIsValid(
      this.buildPersistenceContext(),
    );
  }

  private requirePool() {
    return this.persistenceService.requirePool(this.buildPersistenceContext());
  }
}
