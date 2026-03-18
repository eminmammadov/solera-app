import type { SqlPoolMigration } from '../common/pool-migrations';

export const OHLC_POOL_MIGRATIONS: SqlPoolMigration[] = [
  {
    id: '001_initial_schema',
    name: 'initial ohlc schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS tracked_pairs (
        id SERIAL PRIMARY KEY,
        pair_key TEXT NOT NULL UNIQUE,
        pool_id TEXT NOT NULL UNIQUE,
        base_mint TEXT NOT NULL,
        quote_mint TEXT NOT NULL,
        base_symbol TEXT NOT NULL,
        quote_symbol TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_core BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE tracked_pairs ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT FALSE`,
      `CREATE TABLE IF NOT EXISTS price_ticks (
        id BIGSERIAL PRIMARY KEY,
        pair_id INTEGER NOT NULL REFERENCES tracked_pairs(id) ON DELETE CASCADE,
        ts TIMESTAMPTZ NOT NULL,
        price_usd NUMERIC(30, 12) NOT NULL,
        price_quote NUMERIC(38, 18) NOT NULL,
        volume_estimate NUMERIC(30, 12) NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'RAYDIUM',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(pair_id, ts)
      )`,
      `CREATE TABLE IF NOT EXISTS ohlc_bars (
        id BIGSERIAL PRIMARY KEY,
        pair_id INTEGER NOT NULL REFERENCES tracked_pairs(id) ON DELETE CASCADE,
        interval_sec INTEGER NOT NULL,
        bucket_start TIMESTAMPTZ NOT NULL,
        open NUMERIC(30, 12) NOT NULL,
        high NUMERIC(30, 12) NOT NULL,
        low NUMERIC(30, 12) NOT NULL,
        close NUMERIC(30, 12) NOT NULL,
        volume NUMERIC(30, 12) NOT NULL DEFAULT 0,
        tick_count INTEGER NOT NULL DEFAULT 1,
        last_source_ts TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(pair_id, interval_sec, bucket_start)
      )`,
      `CREATE TABLE IF NOT EXISTS ohlc_runtime_settings (
        id TEXT PRIMARY KEY,
        poll_interval_ms INTEGER NOT NULL,
        ingest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        featured_pair_key TEXT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE ohlc_runtime_settings ADD COLUMN IF NOT EXISTS featured_pair_key TEXT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_price_ticks_pair_ts
        ON price_ticks(pair_id, ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ohlc_bars_pair_interval_bucket
        ON ohlc_bars(pair_id, interval_sec, bucket_start DESC)`,
    ],
  },
];
