import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AuditLogService } from '../audit/audit-log.service';
import { OhlcService } from '../ohlc/ohlc.service';
import { PrismaService } from '../prisma/prisma.service';
import { StakingMirrorService } from '../solana/staking/staking-mirror.service';
import { readOptionalEnv } from './env';

@Injectable()
export class RuntimeReadinessService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RuntimeReadinessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ohlcService: OhlcService,
    private readonly auditLogService: AuditLogService,
    private readonly stakingMirror: StakingMirrorService,
  ) {}

  async onApplicationBootstrap() {
    await this.verifyMainDb();
    await this.verifyOhlcDb();
    this.verifyAuditDb();
    await this.verifyOptionalStakingMirror();

    this.logger.log(
      'Runtime readiness checks passed for main DB, OHLC DB, audit DB, and optional staking mirror.',
    );
  }

  private async verifyMainDb() {
    await this.prisma.$queryRawUnsafe('SELECT 1');
  }

  private async verifyOhlcDb() {
    const health = await this.ohlcService.getHealth();
    if (!health?.success) {
      throw new Error('OHLC runtime health check failed during startup.');
    }
  }

  private verifyAuditDb() {
    const status = this.auditLogService.getStatus();
    if (!status.databaseConfigured) {
      throw new Error('Audit database is not configured during startup.');
    }
    if (!status.enabled) {
      throw new Error(
        `Audit database is not ready during startup${status.lastErrorMessage ? `: ${status.lastErrorMessage}` : '.'}`,
      );
    }
  }

  private async verifyOptionalStakingMirror() {
    if (!readOptionalEnv('SOLANA_DEVNET_DATABASE_URL')) {
      return;
    }

    const health = await this.stakingMirror.getHealthSnapshot();
    if (!health.available) {
      throw new Error(
        `Staking mirror is not ready during startup${health.message ? `: ${health.message}` : '.'}`,
      );
    }
  }
}
