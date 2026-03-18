import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';
import { readOptionalEnv } from '../../common/env';
import type {
  FundingBatchProjection,
  RuntimeNetwork,
  StakingFundingOverview,
  StakingMirrorHealthSnapshot,
  StakingMirrorSyncResult,
  StakingProgramRegistryEntry,
  TokenStakeConfigProjection,
} from './staking.types';

@Injectable()
export class StakingMirrorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StakingMirrorService.name);
  private pool: Pool | null = null;

  private getConnectionString(): string | null {
    return readOptionalEnv('SOLANA_DEVNET_DATABASE_URL');
  }

  private getPool(): Pool | null {
    const connectionString = this.getConnectionString();
    if (!connectionString) return null;

    if (!this.pool) {
      this.pool = new Pool({
        connectionString,
        max: 4,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 3_000,
      });
    }

    return this.pool;
  }

  async onModuleInit() {
    const pool = this.getPool();
    if (!pool) return;

    try {
      await this.ensureSchema(pool);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown schema init error';
      this.logger.warn(`Staking mirror schema init failed: ${message}`);
    }
  }

  async getHealthSnapshot(): Promise<StakingMirrorHealthSnapshot> {
    const pool = this.getPool();
    if (!pool) {
      return {
        configured: false,
        available: false,
        driver: 'postgres',
        target: 'devnet',
        latencyMs: null,
        message: 'SOLANA_DEVNET_DATABASE_URL is not configured.',
      };
    }

    const startedAt = Date.now();
    try {
      await pool.query('SELECT 1');
      return {
        configured: true,
        available: true,
        driver: 'postgres',
        target: 'devnet',
        latencyMs: Date.now() - startedAt,
        message: 'Staking mirror is reachable.',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown staking mirror error';
      this.logger.warn(`Staking mirror health check failed: ${message}`);
      return {
        configured: true,
        available: false,
        driver: 'postgres',
        target: 'devnet',
        latencyMs: Date.now() - startedAt,
        message,
      };
    }
  }

  async syncTokenConfigs(input: {
    network: RuntimeNetwork;
    runtime: StakingProgramRegistryEntry;
    configs: TokenStakeConfigProjection[];
  }): Promise<StakingMirrorSyncResult> {
    if (input.network !== 'devnet') {
      throw new BadRequestException(
        'Devnet mirror sync is only supported when runtime network is devnet.',
      );
    }

    const pool = this.getPool();
    if (!pool) {
      throw new BadRequestException(
        'SOLANA_DEVNET_DATABASE_URL is not configured.',
      );
    }

    await this.ensureSchema(pool);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
        INSERT INTO staking_runtime_snapshot (
          runtime_network,
          stake_pool_program_id,
          swap_node_program_id,
          reward_vault_address,
          is_ready,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (runtime_network)
        DO UPDATE SET
          stake_pool_program_id = EXCLUDED.stake_pool_program_id,
          swap_node_program_id = EXCLUDED.swap_node_program_id,
          reward_vault_address = EXCLUDED.reward_vault_address,
          is_ready = EXCLUDED.is_ready,
          updated_at = NOW()
        `,
        [
          input.network,
          input.runtime.stakePoolProgramId,
          input.runtime.swapNodeProgramId,
          input.runtime.rewardVaultAddress,
          input.runtime.isReady,
        ],
      );

      for (const config of input.configs) {
        await client.query(
          `
          INSERT INTO staking_token_config_projection (
            token_id,
            ticker,
            token_name,
            runtime_network,
            source_network,
            mint_address,
            enabled,
            min_stake_usd,
            max_stake_usd,
            apr_7d_bps,
            apr_1m_bps,
            apr_3m_bps,
            apr_6m_bps,
            apr_12m_bps,
            required_global_seed,
            required_token_seed,
            sync_status,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, NOW()
          )
          ON CONFLICT (token_id, runtime_network)
          DO UPDATE SET
            ticker = EXCLUDED.ticker,
            token_name = EXCLUDED.token_name,
            source_network = EXCLUDED.source_network,
            mint_address = EXCLUDED.mint_address,
            enabled = EXCLUDED.enabled,
            min_stake_usd = EXCLUDED.min_stake_usd,
            max_stake_usd = EXCLUDED.max_stake_usd,
            apr_7d_bps = EXCLUDED.apr_7d_bps,
            apr_1m_bps = EXCLUDED.apr_1m_bps,
            apr_3m_bps = EXCLUDED.apr_3m_bps,
            apr_6m_bps = EXCLUDED.apr_6m_bps,
            apr_12m_bps = EXCLUDED.apr_12m_bps,
            required_global_seed = EXCLUDED.required_global_seed,
            required_token_seed = EXCLUDED.required_token_seed,
            sync_status = EXCLUDED.sync_status,
            updated_at = NOW()
          `,
          [
            config.tokenId,
            config.ticker,
            config.tokenName,
            config.network,
            config.sourceNetwork,
            config.mintAddress,
            config.enabled,
            config.minStakeUsd,
            config.maxStakeUsd,
            config.apr7dBps,
            config.apr1mBps,
            config.apr3mBps,
            config.apr6mBps,
            config.apr12mBps,
            config.requiredSeeds.globalConfig,
            config.requiredSeeds.tokenConfig,
            config.syncStatus,
          ],
        );
      }

      await client.query(
        `
        INSERT INTO staking_indexer_checkpoint (
          checkpoint_key,
          last_synced_at,
          updated_at
        )
        VALUES ('token-config-sync', NOW(), NOW())
        ON CONFLICT (checkpoint_key)
        DO UPDATE SET
          last_synced_at = NOW(),
          updated_at = NOW()
        `,
      );

      await client.query('COMMIT');

      return {
        network: input.network,
        target: 'devnet',
        writtenConfigs: input.configs.length,
        runtimeWritten: true,
        message: 'Staking mirror sync completed.',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async upsertPositionProjection(input: {
    network: RuntimeNetwork;
    stakePositionId: string;
    walletAddress: string;
    sourceMode: string;
    tokenTicker: string;
    tokenName: string | null;
    amount: number;
    amountUsd: number;
    periodLabel: string;
    periodDays: number;
    apy: number;
    principalRa: number;
    rewardRa: number;
    finalRaPayout: number;
    status: string;
    prepareSessionId?: string | null;
    preparedMessageHash?: string | null;
    walletSignature?: string | null;
    startedAt: Date;
    unlockAt: Date;
    claimedAt?: Date | null;
  }): Promise<boolean> {
    if (input.network !== 'devnet') {
      return false;
    }

    const pool = this.getPool();
    if (!pool) {
      return false;
    }

    await this.ensureSchema(pool);
    await pool.query(
      `
      INSERT INTO staking_position_projection (
        stake_position_id,
        runtime_network,
        wallet_address,
        source_mode,
        token_ticker,
        token_name,
        amount,
        amount_usd,
        period_label,
        period_days,
        apy,
        principal_ra,
        reward_ra,
        final_ra_payout,
        status,
        prepare_session_id,
        prepared_message_hash,
        wallet_signature,
        started_at,
        unlock_at,
        claimed_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, NOW(), NOW()
      )
      ON CONFLICT (stake_position_id)
      DO UPDATE SET
        runtime_network = EXCLUDED.runtime_network,
        wallet_address = EXCLUDED.wallet_address,
        source_mode = EXCLUDED.source_mode,
        token_ticker = EXCLUDED.token_ticker,
        token_name = EXCLUDED.token_name,
        amount = EXCLUDED.amount,
        amount_usd = EXCLUDED.amount_usd,
        period_label = EXCLUDED.period_label,
        period_days = EXCLUDED.period_days,
        apy = EXCLUDED.apy,
        principal_ra = EXCLUDED.principal_ra,
        reward_ra = EXCLUDED.reward_ra,
        final_ra_payout = EXCLUDED.final_ra_payout,
        status = EXCLUDED.status,
        prepare_session_id = EXCLUDED.prepare_session_id,
        prepared_message_hash = EXCLUDED.prepared_message_hash,
        wallet_signature = EXCLUDED.wallet_signature,
        started_at = EXCLUDED.started_at,
        unlock_at = EXCLUDED.unlock_at,
        claimed_at = EXCLUDED.claimed_at,
        updated_at = NOW()
      `,
      [
        input.stakePositionId,
        input.network,
        input.walletAddress,
        input.sourceMode,
        input.tokenTicker,
        input.tokenName,
        input.amount,
        input.amountUsd,
        input.periodLabel,
        input.periodDays,
        input.apy,
        input.principalRa,
        input.rewardRa,
        input.finalRaPayout,
        input.status,
        input.prepareSessionId ?? null,
        input.preparedMessageHash ?? null,
        input.walletSignature ?? null,
        input.startedAt,
        input.unlockAt,
        input.claimedAt ?? null,
      ],
    );

    return true;
  }

  async appendFundingEvent(input: {
    network: RuntimeNetwork;
    eventType: string;
    sourceMode: string;
    walletAddress: string;
    stakePositionId: string | null;
    tokenTicker: string;
    principalRa: number;
    rewardRa: number;
    finalRaPayout: number;
    referenceId?: string | null;
    message?: string | null;
  }): Promise<boolean> {
    if (input.network !== 'devnet') {
      return false;
    }

    const pool = this.getPool();
    if (!pool) {
      return false;
    }

    await this.ensureSchema(pool);
    await pool.query(
      `
      INSERT INTO staking_funding_event (
        runtime_network,
        event_type,
        source_mode,
        wallet_address,
        stake_position_id,
        token_ticker,
        principal_ra,
        reward_ra,
        final_ra_payout,
        reference_id,
        message,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `,
      [
        input.network,
        input.eventType,
        input.sourceMode,
        input.walletAddress,
        input.stakePositionId,
        input.tokenTicker,
        input.principalRa,
        input.rewardRa,
        input.finalRaPayout,
        input.referenceId ?? null,
        input.message ?? null,
      ],
    );

    return true;
  }

  async upsertFundingBatchProjection(input: {
    network: RuntimeNetwork;
    batchId: string;
    status: 'APPROVED' | 'EXECUTED' | 'CANCELLED';
    inputMintAddress: string;
    inputTicker?: string | null;
    plannedRewardRa: number;
    fundedRewardRa: number;
    approvedInputAmountRaw: string;
    transactionSignature?: string | null;
    explorerUrl?: string | null;
    createdAt: Date;
    executedAt?: Date | null;
    cancelledAt?: Date | null;
  }): Promise<boolean> {
    if (input.network !== 'devnet') {
      return false;
    }

    const pool = this.getPool();
    if (!pool) {
      return false;
    }

    await this.ensureSchema(pool);
    await pool.query(
      `
      INSERT INTO staking_funding_batch_projection (
        batch_id,
        runtime_network,
        status,
        input_mint_address,
        input_ticker,
        planned_reward_ra,
        funded_reward_ra,
        approved_input_amount_raw,
        transaction_signature,
        explorer_url,
        created_at,
        executed_at,
        cancelled_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
      )
      ON CONFLICT (batch_id)
      DO UPDATE SET
        runtime_network = EXCLUDED.runtime_network,
        status = EXCLUDED.status,
        input_mint_address = EXCLUDED.input_mint_address,
        input_ticker = EXCLUDED.input_ticker,
        planned_reward_ra = EXCLUDED.planned_reward_ra,
        funded_reward_ra = EXCLUDED.funded_reward_ra,
        approved_input_amount_raw = EXCLUDED.approved_input_amount_raw,
        transaction_signature = EXCLUDED.transaction_signature,
        explorer_url = EXCLUDED.explorer_url,
        created_at = EXCLUDED.created_at,
        executed_at = EXCLUDED.executed_at,
        cancelled_at = EXCLUDED.cancelled_at,
        updated_at = NOW()
      `,
      [
        input.batchId,
        input.network,
        input.status,
        input.inputMintAddress,
        input.inputTicker ?? null,
        input.plannedRewardRa,
        input.fundedRewardRa,
        input.approvedInputAmountRaw,
        input.transactionSignature ?? null,
        input.explorerUrl ?? null,
        input.createdAt,
        input.executedAt ?? null,
        input.cancelledAt ?? null,
      ],
    );

    return true;
  }

  async listFundingBatchProjections(
    network: RuntimeNetwork,
    limit = 8,
  ): Promise<FundingBatchProjection[]> {
    if (network !== 'devnet') {
      return [];
    }

    const pool = this.getPool();
    if (!pool) {
      return [];
    }

    await this.ensureSchema(pool);
    const result = await pool.query<{
      batch_id: string;
      runtime_network: RuntimeNetwork;
      status: FundingBatchProjection['status'];
      input_mint_address: string;
      input_ticker: string | null;
      planned_reward_ra: number;
      funded_reward_ra: number;
      approved_input_amount_raw: string;
      transaction_signature: string | null;
      explorer_url: string | null;
      created_at: string;
      executed_at: string | null;
      cancelled_at: string | null;
    }>(
      `
      SELECT
        batch_id,
        runtime_network,
        status,
        input_mint_address,
        input_ticker,
        planned_reward_ra,
        funded_reward_ra,
        approved_input_amount_raw,
        transaction_signature,
        explorer_url,
        created_at,
        executed_at,
        cancelled_at
      FROM staking_funding_batch_projection
      WHERE runtime_network = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [network, Math.max(1, Math.min(32, limit))],
    );

    return result.rows.map((row) => ({
      batchId: row.batch_id,
      runtimeNetwork: row.runtime_network,
      status: row.status,
      inputMintAddress: row.input_mint_address,
      inputTicker: row.input_ticker,
      plannedRewardRa: Number(row.planned_reward_ra) || 0,
      fundedRewardRa: Number(row.funded_reward_ra) || 0,
      approvedInputAmountRaw: row.approved_input_amount_raw,
      transactionSignature: row.transaction_signature,
      explorerUrl: row.explorer_url,
      createdAt: row.created_at,
      executedAt: row.executed_at,
      cancelledAt: row.cancelled_at,
    }));
  }

  async getFundingOverview(
    network: RuntimeNetwork,
  ): Promise<
    Omit<
      StakingFundingOverview,
      'rewardVaultBalanceRa' | 'pendingFundingDeficitRa' | 'coverageRatio'
    >
  > {
    if (network !== 'devnet') {
      return {
        activePositions: 0,
        claimablePositions: 0,
        totalOpenLiabilityRa: 0,
        claimableLiabilityRa: 0,
        pendingBatches: 0,
        executedBatches: 0,
        cancelledBatches: 0,
        lastBatchAt: null,
      };
    }

    const pool = this.getPool();
    if (!pool) {
      return {
        activePositions: 0,
        claimablePositions: 0,
        totalOpenLiabilityRa: 0,
        claimableLiabilityRa: 0,
        pendingBatches: 0,
        executedBatches: 0,
        cancelledBatches: 0,
        lastBatchAt: null,
      };
    }

    await this.ensureSchema(pool);
    const [positions, batches] = await Promise.all([
      pool.query<{
        active_positions: string;
        claimable_positions: string;
        total_open_liability_ra: string;
        claimable_liability_ra: string;
      }>(
        `
        SELECT
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active_positions,
          COUNT(*) FILTER (WHERE status = 'ACTIVE' AND unlock_at <= NOW())::text AS claimable_positions,
          COALESCE(SUM(final_ra_payout) FILTER (WHERE status = 'ACTIVE'), 0)::text AS total_open_liability_ra,
          COALESCE(SUM(final_ra_payout) FILTER (WHERE status = 'ACTIVE' AND unlock_at <= NOW()), 0)::text AS claimable_liability_ra
        FROM staking_position_projection
        WHERE runtime_network = $1
        `,
        [network],
      ),
      pool.query<{
        pending_batches: string;
        executed_batches: string;
        cancelled_batches: string;
        last_batch_at: string | null;
      }>(
        `
        SELECT
          COUNT(*) FILTER (WHERE status = 'APPROVED')::text AS pending_batches,
          COUNT(*) FILTER (WHERE status = 'EXECUTED')::text AS executed_batches,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::text AS cancelled_batches,
          MAX(COALESCE(executed_at, cancelled_at, created_at))::text AS last_batch_at
        FROM staking_funding_batch_projection
        WHERE runtime_network = $1
        `,
        [network],
      ),
    ]);

    const positionRow = positions.rows[0];
    const batchRow = batches.rows[0];

    return {
      activePositions: Number(positionRow?.active_positions ?? 0) || 0,
      claimablePositions: Number(positionRow?.claimable_positions ?? 0) || 0,
      totalOpenLiabilityRa:
        Number(positionRow?.total_open_liability_ra ?? 0) || 0,
      claimableLiabilityRa:
        Number(positionRow?.claimable_liability_ra ?? 0) || 0,
      pendingBatches: Number(batchRow?.pending_batches ?? 0) || 0,
      executedBatches: Number(batchRow?.executed_batches ?? 0) || 0,
      cancelledBatches: Number(batchRow?.cancelled_batches ?? 0) || 0,
      lastBatchAt: batchRow?.last_batch_at ?? null,
    };
  }

  private async ensureSchema(pool: Pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staking_runtime_snapshot (
        runtime_network TEXT PRIMARY KEY,
        stake_pool_program_id TEXT,
        swap_node_program_id TEXT,
        reward_vault_address TEXT,
        is_ready BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staking_token_config_projection (
        id BIGSERIAL PRIMARY KEY,
        token_id TEXT NOT NULL,
        ticker TEXT NOT NULL,
        token_name TEXT NOT NULL,
        runtime_network TEXT NOT NULL,
        source_network TEXT NOT NULL,
        mint_address TEXT,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        min_stake_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
        max_stake_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
        apr_7d_bps INTEGER NOT NULL DEFAULT 0,
        apr_1m_bps INTEGER NOT NULL DEFAULT 0,
        apr_3m_bps INTEGER NOT NULL DEFAULT 0,
        apr_6m_bps INTEGER NOT NULL DEFAULT 0,
        apr_12m_bps INTEGER NOT NULL DEFAULT 0,
        required_global_seed TEXT NOT NULL,
        required_token_seed TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT staking_token_config_projection_token_id_runtime_network_key
          UNIQUE (token_id, runtime_network)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staking_indexer_checkpoint (
        checkpoint_key TEXT PRIMARY KEY,
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staking_position_projection (
        stake_position_id TEXT PRIMARY KEY,
        runtime_network TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        source_mode TEXT NOT NULL,
        token_ticker TEXT NOT NULL,
        token_name TEXT,
        amount DOUBLE PRECISION NOT NULL DEFAULT 0,
        amount_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
        period_label TEXT NOT NULL,
        period_days INTEGER NOT NULL DEFAULT 0,
        apy DOUBLE PRECISION NOT NULL DEFAULT 0,
        principal_ra DOUBLE PRECISION NOT NULL DEFAULT 0,
        reward_ra DOUBLE PRECISION NOT NULL DEFAULT 0,
        final_ra_payout DOUBLE PRECISION NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        prepare_session_id TEXT,
        prepared_message_hash TEXT,
        wallet_signature TEXT,
        started_at TIMESTAMPTZ NOT NULL,
        unlock_at TIMESTAMPTZ NOT NULL,
        claimed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staking_funding_event (
        id BIGSERIAL PRIMARY KEY,
        runtime_network TEXT NOT NULL,
        event_type TEXT NOT NULL,
        source_mode TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        stake_position_id TEXT,
        token_ticker TEXT NOT NULL,
        principal_ra DOUBLE PRECISION NOT NULL DEFAULT 0,
        reward_ra DOUBLE PRECISION NOT NULL DEFAULT 0,
        final_ra_payout DOUBLE PRECISION NOT NULL DEFAULT 0,
        reference_id TEXT,
        message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staking_funding_batch_projection (
        batch_id TEXT PRIMARY KEY,
        runtime_network TEXT NOT NULL,
        status TEXT NOT NULL,
        input_mint_address TEXT NOT NULL,
        input_ticker TEXT,
        planned_reward_ra DOUBLE PRECISION NOT NULL DEFAULT 0,
        funded_reward_ra DOUBLE PRECISION NOT NULL DEFAULT 0,
        approved_input_amount_raw TEXT NOT NULL DEFAULT '0',
        transaction_signature TEXT,
        explorer_url TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        executed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
