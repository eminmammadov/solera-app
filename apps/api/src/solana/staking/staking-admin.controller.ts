import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminAccessGuard } from '../../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../../auth/admin-capability.decorator';
import { ExecuteAdminStakingInstructionDto } from './dto/execute-admin-staking-instruction.dto';
import { PrepareAdminStakingInstructionDto } from './dto/prepare-admin-staking-instruction.dto';
import {
  assertAuthenticatedAdminWallet,
  type AuthenticatedAdminRequest,
  resolveStakingNetwork,
} from './staking-admin-http.utils';
import { StakingAdminService } from './staking-admin.service';

const STAKING_RUNTIME_PATHS = [
  'staking/admin/runtime',
  'market/admin/staking/runtime',
];
const STAKING_CUTOVER_POLICY_PATHS = [
  'staking/admin/cutover/policy',
  'market/admin/staking/cutover/policy',
];
const STAKING_MIGRATION_SNAPSHOT_PATHS = [
  'staking/admin/migration/snapshot',
  'market/admin/staking/migration/snapshot',
];
const STAKING_MIGRATION_EXPORT_PATHS = [
  'staking/admin/migration/export',
  'market/admin/staking/migration/export',
];
const STAKING_TOKENS_PATHS = [
  'staking/admin/tokens',
  'market/admin/staking/tokens',
];
const STAKING_TOKEN_BY_ID_PATHS = [
  'staking/admin/tokens/:id',
  'market/admin/staking/tokens/:id',
];
const STAKING_PREPARE_SYNC_PATHS = [
  'staking/admin/tokens/:id/prepare-sync',
  'market/admin/staking/tokens/:id/prepare-sync',
];
const STAKING_PREPARE_GLOBAL_CONFIG_PATHS = [
  'staking/admin/global-config/prepare',
  'market/admin/staking/global-config/prepare',
];
const STAKING_PREPARE_GLOBAL_CONFIG_UPDATE_PATHS = [
  'staking/admin/global-config/prepare-update',
  'market/admin/staking/global-config/prepare-update',
];
const STAKING_PREPARE_SWAP_NODE_PATHS = [
  'staking/admin/swap-node/prepare',
  'market/admin/staking/swap-node/prepare',
];
const STAKING_PREPARE_SWAP_NODE_UPDATE_PATHS = [
  'staking/admin/swap-node/prepare-update',
  'market/admin/staking/swap-node/prepare-update',
];
const STAKING_PREPARE_FUNDING_COVERAGE_PATHS = [
  'staking/admin/funding/prepare-coverage',
  'market/admin/staking/funding/prepare-coverage',
];
const STAKING_FUNDING_BATCHES_PATHS = [
  'staking/admin/funding/batches',
  'market/admin/staking/funding/batches',
];
const STAKING_EXECUTE_PATHS = [
  'staking/admin/execute',
  'market/admin/staking/execute',
];
const STAKING_MIRROR_SYNC_PATHS = [
  'staking/admin/mirror/sync',
  'market/admin/staking/mirror/sync',
  'market/admin/staking/devnet/sync',
];

@Controller()
@UseGuards(AdminAccessGuard)
export class StakingAdminController {
  constructor(private readonly stakingAdminService: StakingAdminService) {}

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_RUNTIME_PATHS)
  getStakingRuntime() {
    return this.stakingAdminService.getAdminRuntime();
  }

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_CUTOVER_POLICY_PATHS)
  getStakingCutoverPolicy() {
    return this.stakingAdminService.getCutoverPolicy();
  }

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_MIGRATION_SNAPSHOT_PATHS)
  getStakingMigrationSnapshot(
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    return this.stakingAdminService.getMigrationSnapshotSummary(
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_MIGRATION_EXPORT_PATHS)
  async exportStakingMigrationSnapshot(
    @Res({ passthrough: true }) res: Response,
    @Query('network') network?: 'devnet' | 'mainnet',
    @Query('format') format?: 'json' | 'csv',
  ) {
    const resolvedNetwork = resolveStakingNetwork(network);
    const normalizedFormat = format === 'csv' ? 'csv' : 'json';
    const fileSuffix = resolvedNetwork ?? 'active';

    if (normalizedFormat === 'csv') {
      const csv =
        await this.stakingAdminService.exportLegacyStakeSnapshotCsv(
          resolvedNetwork,
        );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="staking-migration-${fileSuffix}.csv"`,
      );
      return csv;
    }

    const snapshot =
      await this.stakingAdminService.exportLegacyStakeSnapshot(resolvedNetwork);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="staking-migration-${fileSuffix}.json"`,
    );
    return snapshot;
  }

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_TOKENS_PATHS)
  getAdminStakeConfigCandidates(
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    return this.stakingAdminService.listTokenConfigCandidates(
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_TOKEN_BY_ID_PATHS)
  getAdminStakeConfigCandidate(
    @Param('id') id: string,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    return this.stakingAdminService.getTokenConfigCandidate(
      id,
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_PREPARE_SYNC_PATHS)
  prepareAdminStakeConfigSync(
    @Param('id') id: string,
    @Req() req: AuthenticatedAdminRequest,
    @Body() dto?: PrepareAdminStakingInstructionDto,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto?.walletAddress,
      'Prepared staking sync wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.prepareTokenConfigSync(
      id,
      resolveStakingNetwork(network),
      dto,
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_PREPARE_GLOBAL_CONFIG_PATHS)
  prepareAdminGlobalConfigInitialize(
    @Body() dto: PrepareAdminStakingInstructionDto,
    @Req() req?: AuthenticatedAdminRequest,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto.walletAddress,
      'Global config initialization wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.prepareGlobalConfigInitialize(
      dto,
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_PREPARE_GLOBAL_CONFIG_UPDATE_PATHS)
  prepareAdminGlobalConfigUpdate(
    @Body() dto: PrepareAdminStakingInstructionDto,
    @Req() req?: AuthenticatedAdminRequest,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto.walletAddress,
      'Global config update wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.prepareGlobalConfigUpdate(
      dto,
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_PREPARE_SWAP_NODE_PATHS)
  prepareAdminSwapNodeInitialize(
    @Body() dto: PrepareAdminStakingInstructionDto,
    @Req() req?: AuthenticatedAdminRequest,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto.walletAddress,
      'Swap-node initialization wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.prepareSwapNodeInitialize(
      dto,
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_PREPARE_SWAP_NODE_UPDATE_PATHS)
  prepareAdminSwapNodeUpdate(
    @Body() dto: PrepareAdminStakingInstructionDto,
    @Req() req?: AuthenticatedAdminRequest,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto.walletAddress,
      'Swap-node update wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.prepareSwapNodeUpdate(
      dto,
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_PREPARE_FUNDING_COVERAGE_PATHS)
  prepareAdminRewardCoverageBatch(
    @Body() dto: PrepareAdminStakingInstructionDto,
    @Req() req?: AuthenticatedAdminRequest,
    @Query('network') network?: 'devnet' | 'mainnet',
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto.walletAddress,
      'Reward coverage wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.prepareRewardVaultFundingBatch(
      dto,
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.admin.read')
  @Get(STAKING_FUNDING_BATCHES_PATHS)
  listAdminFundingBatches(@Query('network') network?: 'devnet' | 'mainnet') {
    return this.stakingAdminService.listFundingBatches(
      resolveStakingNetwork(network),
    );
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_EXECUTE_PATHS)
  executeAdminStakingInstruction(
    @Req() req: AuthenticatedAdminRequest,
    @Body() dto: ExecuteAdminStakingInstructionDto,
  ) {
    assertAuthenticatedAdminWallet(
      req,
      dto.walletAddress,
      'Prepared staking execution wallet does not match the authenticated admin session.',
    );
    return this.stakingAdminService.executePreparedInstruction(dto);
  }

  @RequireAdminCapabilities('staking.operator.write')
  @Post(STAKING_MIRROR_SYNC_PATHS)
  syncAdminStakingMirror(@Query('network') network?: 'devnet' | 'mainnet') {
    return this.stakingAdminService.syncMirror(resolveStakingNetwork(network));
  }
}
