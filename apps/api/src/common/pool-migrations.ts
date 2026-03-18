import { Logger } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';

export interface SqlPoolMigration {
  id: string;
  name: string;
  statements: string[];
}

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const assertSafeIdentifier = (value: string) => {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Unsafe migration table identifier: ${value}`);
  }
  return value;
};

const ensureMigrationTable = async (pool: Pool, tableName: string) => {
  const identifier = assertSafeIdentifier(tableName);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${identifier} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const loadAppliedMigrationIds = async (pool: Pool, tableName: string) => {
  const identifier = assertSafeIdentifier(tableName);
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM ${identifier} ORDER BY applied_at ASC, id ASC`,
  );
  return new Set(rows.map((row) => row.id));
};

const applySingleMigration = async (
  client: PoolClient,
  tableName: string,
  migration: SqlPoolMigration,
) => {
  const identifier = assertSafeIdentifier(tableName);

  await client.query('BEGIN');
  try {
    for (const statement of migration.statements) {
      await client.query(statement);
    }

    await client.query(
      `INSERT INTO ${identifier} (id, name, applied_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [migration.id, migration.name],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

export const applyPoolMigrations = async (
  pool: Pool,
  tableName: string,
  migrations: SqlPoolMigration[],
  logger: Logger,
) => {
  await ensureMigrationTable(pool, tableName);
  const applied = await loadAppliedMigrationIds(pool, tableName);

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    logger.log(
      `Applying pool migration ${migration.id} (${migration.name}) via ${tableName}`,
    );
    const client = await pool.connect();
    try {
      await applySingleMigration(client, tableName, migration);
    } finally {
      client.release();
    }
  }
};
