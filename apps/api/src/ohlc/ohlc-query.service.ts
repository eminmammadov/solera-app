import { Injectable, NotFoundException } from '@nestjs/common';
import { INTERVAL_SECONDS } from './ohlc.constants';
import type {
  GetBarsInput,
  OhlcQueryContext,
  TrackedPairRecord,
} from './ohlc.types';

@Injectable()
export class OhlcQueryService {
  async getFeaturedPair(context: OhlcQueryContext) {
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
        pair: {
          pairKey: context.featuredPairKey ?? context.pairConfig.pairKey,
          poolId: context.pairConfig.poolId,
          baseMint: context.pairConfig.baseMint,
          quoteMint: context.pairConfig.quoteMint,
          baseSymbol: context.pairConfig.baseSymbol,
          quoteSymbol: context.pairConfig.quoteSymbol,
        },
      };
    }

    return {
      success: true,
      pair: {
        pairKey: pairRow.pair_key,
        poolId: pairRow.pool_id,
        baseMint: pairRow.base_mint,
        quoteMint: pairRow.quote_mint,
        baseSymbol: pairRow.base_symbol,
        quoteSymbol: pairRow.quote_symbol,
      },
    };
  }

  async getBars(
    context: OhlcQueryContext,
    { pair, interval, limit }: GetBarsInput,
  ) {
    const intervalKey = context.parseInterval(interval);
    const pairRow = await context.resolvePair(pair);
    const clampedLimit = context.clampLimit(limit);
    const intervalSec = INTERVAL_SECONDS[intervalKey];
    const bars =
      intervalKey === '1h' || intervalKey === '4h'
        ? await context.getAggregatedBars(pairRow.id, intervalSec, clampedLimit)
        : await context.getStoredBars(pairRow.id, intervalSec, clampedLimit);

    return {
      success: true,
      pair: pairRow.pair_key,
      interval: intervalKey,
      bars,
      count: bars.length,
    };
  }

  async getTicker(context: OhlcQueryContext, pair?: string) {
    const pairRow = await context.resolvePair(pair);

    const latest = await context.requirePool().query<{
      close: string;
      bucket_start: string;
    }>(
      `SELECT close::text, bucket_start::text
       FROM ohlc_bars
       WHERE pair_id = $1
         AND interval_sec = 60
       ORDER BY bucket_start DESC
       LIMIT 1`,
      [pairRow.id],
    );

    const latestRow = latest.rows[0];
    if (!latestRow) {
      return {
        success: true,
        pair: pairRow.pair_key,
        priceUsd: 0,
        change24h: 0,
        updatedAt: null,
      };
    }

    const reference = await context.requirePool().query<{ close: string }>(
      `SELECT close::text
       FROM ohlc_bars
       WHERE pair_id = $1
         AND interval_sec = 60
         AND bucket_start <= NOW() - INTERVAL '24 hours'
       ORDER BY bucket_start DESC
       LIMIT 1`,
      [pairRow.id],
    );

    const latestPrice = Number(latestRow.close);
    const referencePrice = Number(reference.rows[0]?.close ?? latestRow.close);
    const change24h =
      referencePrice > 0
        ? ((latestPrice - referencePrice) / referencePrice) * 100
        : 0;

    return {
      success: true,
      pair: pairRow.pair_key,
      priceUsd: latestPrice,
      change24h,
      updatedAt: latestRow.bucket_start,
    };
  }

  async getHealth(context: OhlcQueryContext) {
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
        status: !context.ingestEnabled ? 'paused' : 'degraded',
        pollIntervalMs: context.currentPollIntervalMs,
        ingestEnabled: context.ingestEnabled,
        pair: context.featuredPairKey ?? context.pairConfig.pairKey,
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

    return {
      success: true,
      status: !context.ingestEnabled
        ? 'paused'
        : lagSeconds !== null && lagSeconds <= 30
          ? 'ok'
          : 'degraded',
      pollIntervalMs: context.currentPollIntervalMs,
      ingestEnabled: context.ingestEnabled,
      pair: pairRow.pair_key,
      latestTickAt: latestTick?.ts ?? null,
      latestPriceUsd: latestTick ? Number(latestTick.price_usd) : null,
      lagSeconds,
    };
  }
}
