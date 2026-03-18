import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';
import { readIntegerEnv, readOptionalEnv } from '../common/env';
import { applyPoolMigrations } from '../common/pool-migrations';
import { ListAdminAuditLogsDto } from './dto/list-admin-audit-logs.dto';
import { AUDIT_POOL_MIGRATIONS } from './audit.migrations';

interface AdminAuditLogRow {
  id: string;
  occurred_at: Date | string;
  actor_admin_id: string | null;
  actor_wallet_address: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  http_method: string;
  route_path: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'success' | 'failure';
  status_code: number | null;
  message: string | null;
  metadata: unknown;
}

export interface AdminAuditLogEvent {
  occurredAt?: Date;
  actorAdminId?: string | null;
  actorWalletAddress?: string | null;
  actorName?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  httpMethod: string;
  routePath: string;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: 'success' | 'failure';
  statusCode?: number | null;
  message?: string | null;
  metadata?: unknown;
}

export interface ListAdminAuditLogsResult {
  enabled: boolean;
  retentionDays: number;
  limit: number;
  offset: number;
  total: number;
  databaseConfigured?: boolean;
  reconnecting?: boolean;
  lastErrorMessage?: string | null;
  items: Array<{
    id: string;
    occurredAt: string;
    actorAdminId: string | null;
    actorWalletAddress: string | null;
    actorName: string | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    httpMethod: string;
    routePath: string;
    requestId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    status: 'success' | 'failure';
    statusCode: number | null;
    message: string | null;
    metadata: unknown;
  }>;
}

const DEFAULT_RETENTION_DAYS = 180;
const DEFAULT_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_RECONNECT_INTERVAL_MS = 15_000;
const MIN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_RECONNECT_INTERVAL_MS = 5_000;
const MAX_RECONNECT_INTERVAL_MS = 120_000;
const MAX_TEXT_FIELD_LENGTH = 512;
const MAX_ACTION_LENGTH = 180;
const MAX_ROUTE_LENGTH = 240;
const MAX_METHOD_LENGTH = 16;
const MAX_MESSAGE_LENGTH = 1000;

@Injectable()
export class AuditLogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly dbUrl = readOptionalEnv('LOG_DATABASE_URL');
  private readonly databaseConfigured = Boolean(this.dbUrl);
  private readonly retentionDays = readIntegerEnv('AUDIT_LOG_RETENTION_DAYS', {
    fallback: DEFAULT_RETENTION_DAYS,
    min: 7,
    max: 3650,
  });
  private readonly cleanupIntervalMs = readIntegerEnv(
    'AUDIT_LOG_CLEANUP_INTERVAL_MS',
    {
      fallback: DEFAULT_CLEANUP_INTERVAL_MS,
      min: MIN_CLEANUP_INTERVAL_MS,
      max: MAX_CLEANUP_INTERVAL_MS,
    },
  );
  private readonly reconnectIntervalMs = readIntegerEnv(
    'AUDIT_LOG_RECONNECT_INTERVAL_MS',
    {
      fallback: DEFAULT_RECONNECT_INTERVAL_MS,
      min: MIN_RECONNECT_INTERVAL_MS,
      max: MAX_RECONNECT_INTERVAL_MS,
    },
  );
  private pool: Pool | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private lastErrorMessage: string | null = null;

  constructor() {
    if (!this.databaseConfigured) {
      this.logger.warn(
        'LOG_DATABASE_URL is not configured. Admin audit logging is disabled.',
      );
    }
  }

  async onModuleInit() {
    if (!this.databaseConfigured) return;

    const connected = await this.initializePool();
    if (!connected) {
      this.startReconnectTimer();
    }
  }

  async onModuleDestroy() {
    this.stopReconnectTimer();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  getStatus() {
    return {
      enabled: Boolean(this.pool),
      databaseConfigured: this.databaseConfigured,
      reconnecting:
        this.databaseConfigured && !this.pool && Boolean(this.reconnectTimer),
      lastErrorMessage: this.lastErrorMessage,
      retentionDays: this.retentionDays,
      cleanupIntervalMs: this.cleanupIntervalMs,
      reconnectIntervalMs: this.reconnectIntervalMs,
    };
  }

  async logAdminAction(event: AdminAuditLogEvent): Promise<void> {
    if (!this.pool) {
      if (this.databaseConfigured) {
        this.startReconnectTimer();
      }
      return;
    }

    const metadataJson =
      event.metadata === undefined ? null : JSON.stringify(event.metadata);

    try {
      await this.pool.query(
        `INSERT INTO admin_audit_logs (
          occurred_at,
          actor_admin_id,
          actor_wallet_address,
          actor_name,
          action,
          resource_type,
          resource_id,
          http_method,
          route_path,
          request_id,
          ip_address,
          user_agent,
          status,
          status_code,
          message,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb
        )`,
        [
          event.occurredAt ?? new Date(),
          this.limitText(event.actorAdminId, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.actorWalletAddress, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.actorName, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.action, MAX_ACTION_LENGTH) || 'UNKNOWN_ACTION',
          this.limitText(event.resourceType, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.resourceId, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.httpMethod?.toUpperCase(), MAX_METHOD_LENGTH) ||
            'UNKNOWN',
          this.limitText(event.routePath, MAX_ROUTE_LENGTH) || '/',
          this.limitText(event.requestId, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.ipAddress, MAX_TEXT_FIELD_LENGTH),
          this.limitText(event.userAgent, MAX_TEXT_FIELD_LENGTH),
          event.status === 'failure' ? 'failure' : 'success',
          Number.isFinite(event.statusCode ?? NaN) ? event.statusCode : null,
          this.limitText(event.message, MAX_MESSAGE_LENGTH),
          metadataJson,
        ],
      );
    } catch (error) {
      this.logger.warn(
        `Admin audit log write failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );

      if (this.shouldReconnectFromError(error)) {
        await this.disableLoggingPool();
        this.startReconnectTimer();
      }
    }
  }

  async listAdminLogs(
    dto: ListAdminAuditLogsDto,
  ): Promise<ListAdminAuditLogsResult> {
    const limit = dto.limit ?? 50;
    const offset = dto.offset ?? 0;

    if (!this.pool) {
      return {
        enabled: false,
        databaseConfigured: this.databaseConfigured,
        reconnecting: this.databaseConfigured && Boolean(this.reconnectTimer),
        lastErrorMessage: this.lastErrorMessage,
        retentionDays: this.retentionDays,
        limit,
        offset,
        total: 0,
        items: [],
      };
    }

    const whereParts: string[] = [];
    const values: Array<string | number | Date> = [];
    const addWhere = (sql: string, value: string | number | Date) => {
      values.push(value);
      whereParts.push(sql.replace('$?', `$${values.length}`));
    };

    if (dto.action?.trim()) {
      addWhere('action ILIKE $? ', `%${dto.action.trim()}%`);
    }
    if (dto.resourceType?.trim()) {
      addWhere('resource_type = $? ', dto.resourceType.trim());
    }
    if (dto.actorWallet?.trim()) {
      addWhere('actor_wallet_address = $? ', dto.actorWallet.trim());
    }
    if (dto.status) {
      addWhere('status = $? ', dto.status);
    }
    if (dto.from) {
      const fromDate = new Date(dto.from);
      if (!Number.isNaN(fromDate.getTime())) {
        addWhere('occurred_at >= $? ', fromDate);
      }
    }
    if (dto.to) {
      const toDate = new Date(dto.to);
      if (!Number.isNaN(toDate.getTime())) {
        addWhere('occurred_at <= $? ', toDate);
      }
    }

    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM admin_audit_logs ${whereClause}`;
    const countResult = await this.pool.query<{ total: number }>(
      countQuery,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const dataValues = [...values, limit, offset];
    const dataQuery = `
      SELECT
        id::text,
        occurred_at,
        actor_admin_id,
        actor_wallet_address,
        actor_name,
        action,
        resource_type,
        resource_id,
        http_method,
        route_path,
        request_id,
        ip_address,
        user_agent,
        status,
        status_code,
        message,
        metadata
      FROM admin_audit_logs
      ${whereClause}
      ORDER BY occurred_at DESC, id DESC
      LIMIT $${dataValues.length - 1}
      OFFSET $${dataValues.length}
    `;

    const rows = await this.pool.query<AdminAuditLogRow>(dataQuery, dataValues);

    return {
      enabled: true,
      databaseConfigured: this.databaseConfigured,
      reconnecting: false,
      lastErrorMessage: this.lastErrorMessage,
      retentionDays: this.retentionDays,
      limit,
      offset,
      total,
      items: rows.rows.map((row) => ({
        id: row.id,
        occurredAt: new Date(row.occurred_at).toISOString(),
        actorAdminId: row.actor_admin_id,
        actorWalletAddress: row.actor_wallet_address,
        actorName: row.actor_name,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        httpMethod: row.http_method,
        routePath: row.route_path,
        requestId: row.request_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        status: row.status,
        statusCode: row.status_code,
        message: row.message,
        metadata: row.metadata,
      })),
    };
  }

  private createPool(connectionString: string): Pool {
    return new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 30_000,
      statement_timeout: 8_000,
      connectionTimeoutMillis: 8_000,
    });
  }

  private async initializePool(): Promise<boolean> {
    if (!this.databaseConfigured || !this.dbUrl) return false;
    if (this.pool) return true;

    const candidate = this.createPool(this.dbUrl);

    try {
      await candidate.query('SELECT 1');
      this.pool = candidate;
      await this.ensureSchema();
      await this.cleanupExpiredLogs();
      this.lastErrorMessage = null;
      this.stopReconnectTimer();
      this.startCleanupTimer();
      return true;
    } catch (error) {
      this.lastErrorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : 'Unknown database error';

      this.logger.warn(
        `Audit log database connection failed. Retrying in ${Math.trunc(
          this.reconnectIntervalMs / 1000,
        )}s. Reason: ${this.lastErrorMessage}`,
      );

      await candidate.end().catch(() => undefined);
      this.pool = null;
      return false;
    }
  }

  private startReconnectTimer() {
    if (!this.databaseConfigured || this.pool || this.reconnectTimer) return;

    this.reconnectTimer = setInterval(() => {
      void this.initializePool();
    }, this.reconnectIntervalMs);
  }

  private stopReconnectTimer() {
    if (!this.reconnectTimer) return;
    clearInterval(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private shouldReconnectFromError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const err = error as { code?: string; message?: string };
    const code = (err.code ?? '').toUpperCase();
    const message = (err.message ?? '').toUpperCase();

    if (
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === '57P01' ||
      code === '57P02' ||
      code === '57P03'
    ) {
      return true;
    }

    return (
      message.includes('CONNECTION TERMINATED') ||
      message.includes('CONNECTION ENDED') ||
      message.includes('CONNECTION REFUSED')
    );
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredLogs();
    }, this.cleanupIntervalMs);
  }

  private async cleanupExpiredLogs() {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `DELETE FROM admin_audit_logs
         WHERE occurred_at < (NOW() - ($1::int * INTERVAL '1 day'))`,
        [this.retentionDays],
      );
    } catch (error) {
      this.logger.warn(
        `Audit log retention cleanup failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async ensureSchema() {
    if (!this.pool) return;
    await applyPoolMigrations(
      this.pool,
      'audit_schema_migrations',
      AUDIT_POOL_MIGRATIONS,
      this.logger,
    );
  }

  private limitText(value: string | null | undefined, maxLength: number) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
  }

  private async disableLoggingPool() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (!this.pool) return;

    await this.pool.end().catch(() => undefined);
    this.pool = null;
  }
}
