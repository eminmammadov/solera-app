import type { SqlPoolMigration } from '../common/pool-migrations';

export const AUDIT_POOL_MIGRATIONS: SqlPoolMigration[] = [
  {
    id: '001_initial_schema',
    name: 'initial audit schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor_admin_id TEXT NULL,
        actor_wallet_address TEXT NULL,
        actor_name TEXT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NULL,
        resource_id TEXT NULL,
        http_method TEXT NOT NULL,
        route_path TEXT NOT NULL,
        request_id TEXT NULL,
        ip_address TEXT NULL,
        user_agent TEXT NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
        status_code INTEGER NULL,
        message TEXT NULL,
        metadata JSONB NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_occurred_at
        ON admin_audit_logs (occurred_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_wallet
        ON admin_audit_logs (actor_wallet_address)`,
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
        ON admin_audit_logs (action)`,
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_type
        ON admin_audit_logs (resource_type)`,
    ],
  },
];
