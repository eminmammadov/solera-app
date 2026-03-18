import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { applyPoolMigrations } from '../common/pool-migrations';
import {
  INTERVAL_SECONDS,
  RUNTIME_SETTINGS_ID,
  normalizePollIntervalMs,
} from './ohlc.constants';
import { OHLC_POOL_MIGRATIONS } from './ohlc.migrations';
import type {
  NormalizedPairInput,
  OhlcBarPoint,
  OhlcBarRow,
  OhlcPersistenceContext,
  OhlcRuntimeSettingsRecord,
  OhlcUpsertBarFn,
  PriceSnapshot,
  TrackedPairRecord,
} from './ohlc.types';

@Injectable()
export class OhlcPersistenceService {
  private readonly logger = new Logger(OhlcPersistenceService.name);

  requirePool(context: OhlcPersistenceContext) {
    if (!context.pool) {
      throw new ServiceUnavailableException(
        'OHLC service is disabled. Configure OHLC_DATABASE_URL.',
      );
    }
    return context.pool;
  }

  async ensureSchema(context: OhlcPersistenceContext) {
    const pool = this.requirePool(context);
    await applyPoolMigrations(
      pool,
      'ohlc_schema_migrations',
      OHLC_POOL_MIGRATIONS,
      this.logger,
    );
  }

  async ensureDefaultTrackedPair(context: OhlcPersistenceContext) {
    const pool = this.requirePool(context);

    await pool.query(
      `UPDATE tracked_pairs
       SET is_core = TRUE, updated_at = NOW()
       WHERE pair_key = $1 OR pool_id = $2`,
      [context.pairConfig.pairKey, context.pairConfig.poolId],
    );

    await pool.query(
      `INSERT INTO tracked_pairs (
         pair_key,
         pool_id,
         base_mint,
         quote_mint,
         base_symbol,
         quote_symbol,
         is_active,
         is_core,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, NOW())
       ON CONFLICT DO NOTHING`,
      [
        context.pairConfig.pairKey,
        context.pairConfig.poolId,
        context.pairConfig.baseMint,
        context.pairConfig.quoteMint,
        context.pairConfig.baseSymbol,
        context.pairConfig.quoteSymbol,
      ],
    );
  }

  async ensureRuntimeSettings(context: OhlcPersistenceContext) {
    const pool = this.requirePool(context);

    await pool.query(
      `INSERT INTO ohlc_runtime_settings (
         id,
         poll_interval_ms,
         ingest_enabled,
         featured_pair_key,
         updated_at
       )
       VALUES ($1, $2, TRUE, $3, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        RUNTIME_SETTINGS_ID,
        context.defaultPollIntervalMs,
        context.pairConfig.pairKey,
      ],
    );

    const { rows } = await pool.query<OhlcRuntimeSettingsRecord>(
      `SELECT poll_interval_ms, ingest_enabled, featured_pair_key
       FROM ohlc_runtime_settings
       WHERE id = $1
       LIMIT 1`,
      [RUNTIME_SETTINGS_ID],
    );

    const row = rows[0];
    if (!row) {
      context.setRuntimeState({
        currentPollIntervalMs: context.defaultPollIntervalMs,
        ingestEnabled: true,
        featuredPairKey: context.pairConfig.pairKey,
      });
      return;
    }

    context.setRuntimeState({
      currentPollIntervalMs: normalizePollIntervalMs(
        row.poll_interval_ms,
        context.defaultPollIntervalMs,
      ),
      ingestEnabled: row.ingest_enabled !== false,
      featuredPairKey:
        row.featured_pair_key?.trim() || context.pairConfig.pairKey,
    });

    await this.ensureFeaturedPairKeyIsValid(context);
  }

  async resolvePair(context: OhlcPersistenceContext, pair?: string) {
    const pool = this.requirePool(context);
    const pairKey = pair?.trim();

    if (pairKey) {
      if (!/^[A-Za-z0-9_:-]{2,80}$/.test(pairKey)) {
        throw new NotFoundException('Invalid pair key.');
      }

      const { rows } = await pool.query<TrackedPairRecord>(
        `SELECT
           id,
           pair_key,
           pool_id,
           base_mint,
           quote_mint,
           base_symbol,
           quote_symbol,
           is_active,
           is_core,
           created_at::text,
           updated_at::text
         FROM tracked_pairs
         WHERE pair_key = $1
           AND is_active = TRUE
         LIMIT 1`,
        [pairKey],
      );

      const row = rows[0];
      if (!row) {
        throw new NotFoundException(`Pair "${pairKey}" not found.`);
      }
      return row;
    }

    const featuredPairKey = context.featuredPairKey?.trim();
    if (featuredPairKey && /^[A-Za-z0-9_:-]{2,80}$/.test(featuredPairKey)) {
      const featuredResult = await pool.query<TrackedPairRecord>(
        `SELECT
           id,
           pair_key,
           pool_id,
           base_mint,
           quote_mint,
           base_symbol,
           quote_symbol,
           is_active,
           is_core,
           created_at::text,
           updated_at::text
         FROM tracked_pairs
         WHERE pair_key = $1
           AND is_active = TRUE
         LIMIT 1`,
        [featuredPairKey],
      );

      if (featuredResult.rows[0]) {
        return featuredResult.rows[0];
      }
    }

    const { rows } = await pool.query<TrackedPairRecord>(
      `SELECT
         id,
         pair_key,
         pool_id,
         base_mint,
         quote_mint,
         base_symbol,
         quote_symbol,
         is_active,
         is_core,
         created_at::text,
         updated_at::text
       FROM tracked_pairs
       WHERE is_active = TRUE
       ORDER BY
         CASE
           WHEN pair_key = $1 THEN 0
           WHEN is_core THEN 1
           ELSE 2
         END,
         id ASC
       LIMIT 1`,
      [context.pairConfig.pairKey],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('No tracked pairs configured.');
    }
    return row;
  }

  async loadActivePairs(context: OhlcPersistenceContext) {
    const { rows } = await this.requirePool(context).query<TrackedPairRecord>(
      `SELECT
         id,
         pair_key,
         pool_id,
         base_mint,
         quote_mint,
         base_symbol,
         quote_symbol,
         is_active,
         is_core,
         created_at::text,
         updated_at::text
       FROM tracked_pairs
       WHERE is_active = TRUE
       ORDER BY is_core DESC, id ASC`,
    );
    return rows;
  }

  async deactivateTrackedPairs(
    context: OhlcPersistenceContext,
    pairIds: readonly number[],
  ) {
    if (pairIds.length === 0) {
      return 0;
    }

    const { rowCount } = await this.requirePool(context).query(
      `UPDATE tracked_pairs
       SET is_active = FALSE,
           is_core = FALSE,
           updated_at = NOW()
       WHERE id = ANY($1::int[])`,
      [pairIds],
    );

    return rowCount ?? 0;
  }

  async persistSnapshot(
    context: OhlcPersistenceContext,
    snapshot: PriceSnapshot,
    intervalSeconds: readonly number[],
    upsertBar: OhlcUpsertBarFn,
  ) {
    const client = await this.requirePool(context).connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO price_ticks (pair_id, ts, price_usd, price_quote, volume_estimate, source)
         VALUES ($1, $2, $3, $4, $5, 'RAYDIUM')
         ON CONFLICT (pair_id, ts)
         DO UPDATE SET
           price_usd = EXCLUDED.price_usd,
           price_quote = EXCLUDED.price_quote,
           volume_estimate = EXCLUDED.volume_estimate`,
        [
          snapshot.pairId,
          snapshot.ts.toISOString(),
          snapshot.priceUsd,
          snapshot.priceQuote,
          snapshot.volumeEstimate,
        ],
      );

      for (const intervalSec of intervalSeconds) {
        await upsertBar(client, snapshot, intervalSec);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStoredBars(
    context: OhlcPersistenceContext,
    pairId: number,
    intervalSec: number,
    limit: number,
  ): Promise<OhlcBarPoint[]> {
    const { rows } = await this.requirePool(context).query<OhlcBarRow>(
      `SELECT
         EXTRACT(EPOCH FROM bucket_start)::bigint AS bucket_time,
         open::text,
         high::text,
         low::text,
         close::text,
         volume::text
       FROM ohlc_bars
       WHERE pair_id = $1
         AND interval_sec = $2
       ORDER BY bucket_start DESC
       LIMIT $3`,
      [pairId, intervalSec, limit],
    );

    return rows
      .slice()
      .reverse()
      .map((row) => ({
        time: Number(row.bucket_time),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }));
  }

  async getAggregatedBars(
    context: OhlcPersistenceContext,
    pairId: number,
    intervalSec: number,
    limit: number,
  ): Promise<OhlcBarPoint[]> {
    const sourceIntervalSec = INTERVAL_SECONDS['15m'];
    const lookbackSeconds = Math.max(
      intervalSec * limit + sourceIntervalSec,
      intervalSec,
    );

    const { rows } = await this.requirePool(context).query<OhlcBarRow>(
      `WITH base AS (
         SELECT
           TO_TIMESTAMP(
             FLOOR(EXTRACT(EPOCH FROM bucket_start) / $2::double precision) *
             $2::double precision
           ) AS bucket_time,
           bucket_start,
           open,
           high,
           low,
           close,
           volume
         FROM ohlc_bars
         WHERE pair_id = $1
           AND interval_sec = $3
           AND bucket_start >= TO_TIMESTAMP(
             EXTRACT(EPOCH FROM NOW()) - $4::double precision
           )
       ),
       ranked AS (
         SELECT
           bucket_time,
           open,
           high,
           low,
           close,
           volume,
           ROW_NUMBER() OVER (
             PARTITION BY bucket_time
             ORDER BY bucket_start ASC
           ) AS rn_first,
           ROW_NUMBER() OVER (
             PARTITION BY bucket_time
             ORDER BY bucket_start DESC
           ) AS rn_last
         FROM base
       ),
       aggregated AS (
         SELECT
           bucket_time,
           MAX(CASE WHEN rn_first = 1 THEN open END) AS open,
           MAX(high) AS high,
           MIN(low) AS low,
           MAX(CASE WHEN rn_last = 1 THEN close END) AS close,
           SUM(volume) AS volume
         FROM ranked
         GROUP BY bucket_time
         ORDER BY bucket_time DESC
         LIMIT $5
       )
       SELECT
         EXTRACT(EPOCH FROM bucket_time)::bigint AS bucket_time,
         open::text,
         high::text,
         low::text,
         close::text,
         volume::text
       FROM aggregated
       ORDER BY bucket_time ASC`,
      [pairId, intervalSec, sourceIntervalSec, lookbackSeconds, limit],
    );

    return rows.map((row) => ({
      time: Number(row.bucket_time),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }));
  }

  parsePairId(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException('Invalid pair id.');
    }
    return value;
  }

  async upsertRuntimeFeaturedPair(
    context: OhlcPersistenceContext,
    input: {
      pairKey: string;
      poolId: string;
      baseMint: string;
      quoteMint: string;
      baseSymbol: string;
      quoteSymbol: string;
    },
  ) {
    const pool = this.requirePool(context);
    const payload = this.normalizePairInput({
      ...input,
      isActive: true,
    });

    const existingResult = await pool.query<{ id: number }>(
      `SELECT id
       FROM tracked_pairs
       WHERE pair_key = $1
          OR pool_id = $2
       ORDER BY
         CASE
           WHEN pair_key = $1 THEN 0
           WHEN pool_id = $2 THEN 1
           ELSE 2
         END,
         id ASC
       LIMIT 1`,
      [payload.pairKey, payload.poolId],
    );

    const existingId = existingResult.rows[0]?.id ?? null;

    if (existingId) {
      await pool.query(
        `UPDATE tracked_pairs
         SET
           pair_key = $2,
           pool_id = $3,
           base_mint = $4,
           quote_mint = $5,
           base_symbol = $6,
           quote_symbol = $7,
           is_active = TRUE,
           is_core = TRUE,
           updated_at = NOW()
         WHERE id = $1`,
        [
          existingId,
          payload.pairKey,
          payload.poolId,
          payload.baseMint,
          payload.quoteMint,
          payload.baseSymbol,
          payload.quoteSymbol,
        ],
      );
    } else {
      await pool.query(
        `INSERT INTO tracked_pairs (
           pair_key,
           pool_id,
           base_mint,
           quote_mint,
           base_symbol,
           quote_symbol,
           is_active,
           is_core,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, NOW())`,
        [
          payload.pairKey,
          payload.poolId,
          payload.baseMint,
          payload.quoteMint,
          payload.baseSymbol,
          payload.quoteSymbol,
        ],
      );
    }

    await this.updateRuntimeFeaturedPairKey(context, payload.pairKey);

    const { rows } = await pool.query<TrackedPairRecord>(
      `SELECT
         id,
         pair_key,
         pool_id,
         base_mint,
         quote_mint,
         base_symbol,
         quote_symbol,
         is_active,
         is_core,
         created_at::text,
         updated_at::text
       FROM tracked_pairs
       WHERE pair_key = $1
       LIMIT 1`,
      [payload.pairKey],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(
        `Unable to load synced pair "${payload.pairKey}".`,
      );
    }

    return row;
  }

  normalizePairInput(input: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
    isActive?: boolean;
  }): NormalizedPairInput {
    const pairKey = input.pairKey.trim();
    const poolId = input.poolId.trim();
    const baseMint = input.baseMint.trim();
    const quoteMint = input.quoteMint.trim();
    const baseSymbol = input.baseSymbol.trim().toUpperCase();
    const quoteSymbol = input.quoteSymbol.trim().toUpperCase();

    if (!/^[A-Za-z0-9_:-]{2,80}$/.test(pairKey)) {
      throw new BadRequestException(
        'pairKey must use 2-80 characters: letters, numbers, _, -, :',
      );
    }

    const base58AddressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,64}$/;
    if (!base58AddressPattern.test(poolId)) {
      throw new BadRequestException('poolId must be a valid base58 address.');
    }
    if (!base58AddressPattern.test(baseMint)) {
      throw new BadRequestException('baseMint must be a valid base58 address.');
    }
    if (!base58AddressPattern.test(quoteMint)) {
      throw new BadRequestException(
        'quoteMint must be a valid base58 address.',
      );
    }

    if (!/^[A-Z0-9]{2,16}$/.test(baseSymbol)) {
      throw new BadRequestException(
        'baseSymbol must contain 2-16 uppercase letters/numbers.',
      );
    }
    if (!/^[A-Z0-9]{2,16}$/.test(quoteSymbol)) {
      throw new BadRequestException(
        'quoteSymbol must contain 2-16 uppercase letters/numbers.',
      );
    }

    return {
      pairKey,
      poolId,
      baseMint,
      quoteMint,
      baseSymbol,
      quoteSymbol,
      isActive: input.isActive ?? true,
    };
  }

  async getPairById(context: OhlcPersistenceContext, pairId: number) {
    const { rows } = await this.requirePool(context).query<TrackedPairRecord>(
      `SELECT
         id,
         pair_key,
         pool_id,
         base_mint,
         quote_mint,
         base_symbol,
         quote_symbol,
         is_active,
         is_core,
         created_at::text,
         updated_at::text
       FROM tracked_pairs
       WHERE id = $1
       LIMIT 1`,
      [pairId],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Pair "${pairId}" not found.`);
    }

    return row;
  }

  rethrowPairConflictError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw new BadRequestException(
        'Pair key or pool id already exists. Use unique values.',
      );
    }

    throw error;
  }

  async updateRuntimeFeaturedPairKey(
    context: OhlcPersistenceContext,
    pairKey: string | null,
  ) {
    const normalizedPairKey = pairKey?.trim() || null;

    await this.requirePool(context).query(
      `INSERT INTO ohlc_runtime_settings (
         id,
         poll_interval_ms,
         ingest_enabled,
         featured_pair_key,
         updated_at
       )
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         featured_pair_key = EXCLUDED.featured_pair_key,
         updated_at = NOW()`,
      [
        RUNTIME_SETTINGS_ID,
        context.currentPollIntervalMs,
        context.ingestEnabled,
        normalizedPairKey,
      ],
    );

    context.setRuntimeState({ featuredPairKey: normalizedPairKey });
  }

  async ensureFeaturedPairKeyIsValid(context: OhlcPersistenceContext) {
    const featuredPairKey = context.featuredPairKey?.trim() || null;
    const pool = this.requirePool(context);

    if (featuredPairKey) {
      const featuredResult = await pool.query<{ pair_key: string }>(
        `SELECT pair_key
         FROM tracked_pairs
         WHERE pair_key = $1
           AND is_active = TRUE
         LIMIT 1`,
        [featuredPairKey],
      );

      if (featuredResult.rows[0]) {
        return;
      }
    }

    const fallbackResult = await pool.query<{ pair_key: string }>(
      `SELECT pair_key
       FROM tracked_pairs
       WHERE is_active = TRUE
       ORDER BY
         CASE
           WHEN pair_key = $1 THEN 0
           WHEN is_core THEN 1
           ELSE 2
         END,
         id ASC
       LIMIT 1`,
      [context.pairConfig.pairKey],
    );

    const fallbackPairKey = fallbackResult.rows[0]?.pair_key ?? null;
    await this.updateRuntimeFeaturedPairKey(context, fallbackPairKey);
  }
}
