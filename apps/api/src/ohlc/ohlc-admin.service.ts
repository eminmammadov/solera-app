import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MAX_POLL_INTERVAL_MS,
  MIN_POLL_INTERVAL_MS,
  RUNTIME_SETTINGS_ID,
  normalizePollIntervalMs,
} from './ohlc.constants';
import type {
  OhlcAdminContext,
  TrackedPairRecord,
  TrackedPairWithLatestTickRow,
} from './ohlc.types';

@Injectable()
export class OhlcAdminService {
  async getAdminConfig(context: OhlcAdminContext) {
    let pairRow: TrackedPairRecord | null = null;
    try {
      pairRow = await context.resolvePair(undefined);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    if (!pairRow) {
      return {
        success: true,
        status: context.ingestEnabled ? 'degraded' : 'paused',
        ingestEnabled: context.ingestEnabled,
        pollIntervalMs: context.currentPollIntervalMs,
        featuredPairKey: context.featuredPairKey ?? context.pairConfig.pairKey,
        minPollIntervalMs: MIN_POLL_INTERVAL_MS,
        maxPollIntervalMs: MAX_POLL_INTERVAL_MS,
        pair: {
          pairKey: context.featuredPairKey ?? context.pairConfig.pairKey,
          poolId: context.pairConfig.poolId,
          baseMint: context.pairConfig.baseMint,
          quoteMint: context.pairConfig.quoteMint,
          baseSymbol: context.pairConfig.baseSymbol,
          quoteSymbol: context.pairConfig.quoteSymbol,
        },
        latestTickAt: null,
        latestPriceUsd: null,
        lagSeconds: null,
      };
    }

    const { rows } = await context.requirePool().query<{
      ts: string;
      price_usd: string;
    }>(
      `SELECT ts::text, price_usd::text
       FROM price_ticks
       WHERE pair_id = $1
       ORDER BY ts DESC
       LIMIT 1`,
      [pairRow.id],
    );

    const latestTick = rows[0] ?? null;
    const lagSeconds = latestTick
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(latestTick.ts).getTime()) / 1000),
        )
      : null;

    const status = !context.ingestEnabled
      ? 'paused'
      : lagSeconds !== null && lagSeconds <= 30
        ? 'ok'
        : 'degraded';

    return {
      success: true,
      status,
      ingestEnabled: context.ingestEnabled,
      pollIntervalMs: context.currentPollIntervalMs,
      featuredPairKey: pairRow.pair_key,
      minPollIntervalMs: MIN_POLL_INTERVAL_MS,
      maxPollIntervalMs: MAX_POLL_INTERVAL_MS,
      pair: {
        pairKey: pairRow.pair_key,
        poolId: pairRow.pool_id,
        baseMint: pairRow.base_mint,
        quoteMint: pairRow.quote_mint,
        baseSymbol: pairRow.base_symbol,
        quoteSymbol: pairRow.quote_symbol,
      },
      latestTickAt: latestTick?.ts ?? null,
      latestPriceUsd: latestTick ? Number(latestTick.price_usd) : null,
      lagSeconds,
    };
  }

  async updateAdminConfig(
    context: OhlcAdminContext,
    input: { pollIntervalMs?: number; ingestEnabled?: boolean },
  ) {
    const nextPollIntervalMs =
      typeof input.pollIntervalMs === 'number'
        ? normalizePollIntervalMs(
            input.pollIntervalMs,
            context.currentPollIntervalMs,
          )
        : context.currentPollIntervalMs;
    const nextIngestEnabled =
      typeof input.ingestEnabled === 'boolean'
        ? input.ingestEnabled
        : context.ingestEnabled;

    await context.requirePool().query(
      `INSERT INTO ohlc_runtime_settings (id, poll_interval_ms, ingest_enabled, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         poll_interval_ms = EXCLUDED.poll_interval_ms,
         ingest_enabled = EXCLUDED.ingest_enabled,
         updated_at = NOW()`,
      [RUNTIME_SETTINGS_ID, nextPollIntervalMs, nextIngestEnabled],
    );

    const previousIngestEnabled = context.ingestEnabled;
    const previousPollIntervalMs = context.currentPollIntervalMs;
    context.setRuntimeState({
      currentPollIntervalMs: nextPollIntervalMs,
      ingestEnabled: nextIngestEnabled,
    });

    if (!nextIngestEnabled) {
      context.stopPolling();
    } else if (
      !previousIngestEnabled ||
      previousPollIntervalMs !== nextPollIntervalMs
    ) {
      if (!previousIngestEnabled) {
        await context.pollOnce(true);
      }
      context.startPolling();
    }

    return this.getAdminConfig(context);
  }

  async syncNow(context: OhlcAdminContext) {
    await context.pollOnce(true);
    return this.getAdminConfig(context);
  }

  async setAdminFeaturedPair(context: OhlcAdminContext, pairIdRaw: number) {
    const pairId = context.parsePairId(pairIdRaw);
    const pair = await context.getPairById(pairId);

    if (!pair.is_active) {
      throw new BadRequestException('Only active pairs can be featured.');
    }

    await context.updateRuntimeFeaturedPairKey(pair.pair_key);
    context.setRuntimeState({ featuredPairKey: pair.pair_key });
    return this.getAdminConfig(context);
  }

  async getPairs(context: OhlcAdminContext) {
    const { rows } = await context.requirePool().query<TrackedPairRecord>(
      `SELECT id, pair_key, pool_id, base_mint, quote_mint, base_symbol, quote_symbol, is_active, is_core, created_at::text, updated_at::text
       FROM tracked_pairs
       ORDER BY id ASC`,
    );

    return {
      success: true,
      pairs: rows.map((row) => ({
        id: row.id,
        pairKey: row.pair_key,
        poolId: row.pool_id,
        baseMint: row.base_mint,
        quoteMint: row.quote_mint,
        baseSymbol: row.base_symbol,
        quoteSymbol: row.quote_symbol,
        isActive: row.is_active,
        isCore: row.is_core,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  async getAdminPairs(context: OhlcAdminContext) {
    const { rows } = await context
      .requirePool()
      .query<TrackedPairWithLatestTickRow>(
        `SELECT
         p.id,
         p.pair_key,
         p.pool_id,
         p.base_mint,
         p.quote_mint,
         p.base_symbol,
         p.quote_symbol,
         p.is_active,
         p.is_core,
         p.created_at::text,
         p.updated_at::text,
         t.ts::text AS latest_tick_at,
         t.price_usd::text AS latest_price_usd
       FROM tracked_pairs p
       LEFT JOIN LATERAL (
         SELECT ts, price_usd
         FROM price_ticks
         WHERE pair_id = p.id
         ORDER BY ts DESC
         LIMIT 1
       ) t ON TRUE
       ORDER BY p.is_core DESC, p.id ASC`,
      );

    return {
      success: true,
      pairs: rows.map((row) => ({
        id: row.id,
        pairKey: row.pair_key,
        poolId: row.pool_id,
        baseMint: row.base_mint,
        quoteMint: row.quote_mint,
        baseSymbol: row.base_symbol,
        quoteSymbol: row.quote_symbol,
        isActive: row.is_active,
        isCore: row.is_core,
        isFeatured: context.featuredPairKey === row.pair_key,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        latestTickAt: row.latest_tick_at,
        latestPriceUsd:
          row.latest_price_usd !== null ? Number(row.latest_price_usd) : null,
      })),
    };
  }

  async createAdminPair(
    context: OhlcAdminContext,
    input: {
      pairKey: string;
      poolId: string;
      baseMint: string;
      quoteMint: string;
      baseSymbol: string;
      quoteSymbol: string;
      isActive?: boolean;
    },
  ) {
    const payload = context.normalizePairInput(input);

    try {
      await context.requirePool().query(
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())`,
        [
          payload.pairKey,
          payload.poolId,
          payload.baseMint,
          payload.quoteMint,
          payload.baseSymbol,
          payload.quoteSymbol,
          payload.isActive,
        ],
      );
    } catch (error) {
      context.rethrowPairConflictError(error);
    }

    if (
      !context.featuredPairKey ||
      context.featuredPairKey.trim().length === 0
    ) {
      await context.ensureFeaturedPairKeyIsValid();
    }

    return { success: true };
  }

  async updateAdminPair(
    context: OhlcAdminContext,
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
    const pairId = context.parsePairId(pairIdRaw);
    const existingPair = await context.getPairById(pairId);

    if (existingPair.is_core) {
      const triesToChangeCoreMetadata =
        (typeof input.pairKey === 'string' &&
          input.pairKey.trim() !== existingPair.pair_key) ||
        (typeof input.poolId === 'string' &&
          input.poolId.trim() !== existingPair.pool_id) ||
        (typeof input.baseMint === 'string' &&
          input.baseMint.trim() !== existingPair.base_mint) ||
        (typeof input.quoteMint === 'string' &&
          input.quoteMint.trim() !== existingPair.quote_mint) ||
        (typeof input.baseSymbol === 'string' &&
          input.baseSymbol.trim().toUpperCase() !== existingPair.base_symbol) ||
        (typeof input.quoteSymbol === 'string' &&
          input.quoteSymbol.trim().toUpperCase() !== existingPair.quote_symbol);

      if (triesToChangeCoreMetadata) {
        throw new BadRequestException(
          'Core pair metadata is locked. Only active/inactive status can be changed.',
        );
      }
    }

    const payload = context.normalizePairInput({
      pairKey: input.pairKey ?? existingPair.pair_key,
      poolId: input.poolId ?? existingPair.pool_id,
      baseMint: input.baseMint ?? existingPair.base_mint,
      quoteMint: input.quoteMint ?? existingPair.quote_mint,
      baseSymbol: input.baseSymbol ?? existingPair.base_symbol,
      quoteSymbol: input.quoteSymbol ?? existingPair.quote_symbol,
      isActive:
        typeof input.isActive === 'boolean'
          ? input.isActive
          : existingPair.is_active,
    });

    try {
      await context.requirePool().query(
        `UPDATE tracked_pairs
         SET
           pair_key = $2,
           pool_id = $3,
           base_mint = $4,
           quote_mint = $5,
           base_symbol = $6,
           quote_symbol = $7,
           is_active = $8,
           updated_at = NOW()
         WHERE id = $1`,
        [
          pairId,
          payload.pairKey,
          payload.poolId,
          payload.baseMint,
          payload.quoteMint,
          payload.baseSymbol,
          payload.quoteSymbol,
          payload.isActive,
        ],
      );
    } catch (error) {
      context.rethrowPairConflictError(error);
    }

    if (context.featuredPairKey === existingPair.pair_key) {
      if (!payload.isActive) {
        await context.ensureFeaturedPairKeyIsValid();
      } else if (payload.pairKey !== existingPair.pair_key) {
        await context.updateRuntimeFeaturedPairKey(payload.pairKey);
        context.setRuntimeState({ featuredPairKey: payload.pairKey });
      }
    }

    return { success: true };
  }

  async deleteAdminPair(context: OhlcAdminContext, pairIdRaw: number) {
    const pairId = context.parsePairId(pairIdRaw);
    const existingPair = await context.getPairById(pairId);
    if (existingPair.is_core) {
      throw new BadRequestException(
        'Core pair cannot be deleted. Disable it instead.',
      );
    }

    const client = await context.requirePool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM tracked_pairs WHERE id = $1`, [pairId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (context.featuredPairKey === existingPair.pair_key) {
      await context.ensureFeaturedPairKeyIsValid();
    }

    return {
      success: true,
      deletedPairId: pairId,
      deletedPairKey: existingPair.pair_key,
    };
  }
}
