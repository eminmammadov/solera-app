import { randomUUID } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { StakingCutoverPolicyService } from './staking-cutover-policy.service';
import { StakingAdminExecutionService } from './staking-admin-execution.service';
import { StakingMainnetHardeningService } from './staking-mainnet-hardening.service';
import type { FundingBatchExecutionMetadata } from './staking-admin-session.types';
import {
  StakingMigrationService,
  type LegacyStakeMigrationSnapshot,
} from './staking-migration.service';
import { ExecuteAdminStakingInstructionDto } from './dto/execute-admin-staking-instruction.dto';
import { PrepareAdminStakingInstructionDto } from './dto/prepare-admin-staking-instruction.dto';
import { StakingAdminReadService } from './staking-admin-read.service';
import { StakingMirrorService } from './staking-mirror.service';
import { StakingNetworkRegistryService } from './staking-network-registry.service';
import { StakingTransactionService } from './staking-transaction.service';
import type {
  AdminStakingExecutionPayload,
  AdminStakingRuntimeSnapshot,
  FundingBatchProjection,
  StakingCutoverPolicySnapshot,
  StakingMigrationSnapshotSummary,
  PreparedAdminStakingExecution,
  RuntimeNetwork,
  TokenStakeConfigProjection,
  TokenStakeSyncPreparation,
} from './staking.types';

@Injectable()
export class StakingAdminService {
  constructor(
    private readonly executionService: StakingAdminExecutionService,
    private readonly readService: StakingAdminReadService,
    private readonly cutoverPolicy: StakingCutoverPolicyService,
    private readonly mainnetHardening: StakingMainnetHardeningService,
    private readonly stakingMirror: StakingMirrorService,
    private readonly migrationService: StakingMigrationService,
    private readonly networkRegistry: StakingNetworkRegistryService,
    private readonly transactionService: StakingTransactionService,
  ) {}

  async getAdminRuntime(): Promise<AdminStakingRuntimeSnapshot> {
    const runtime = await this.readService.getAdminRuntime();
    const migrationSnapshot = await this.getMigrationSnapshotSummary(
      runtime.activeNetwork,
    );

    return {
      ...runtime,
      cutoverPolicy: this.cutoverPolicy.getSnapshot(),
      migrationSnapshot,
    };
  }

  getCutoverPolicy(): StakingCutoverPolicySnapshot {
    return this.cutoverPolicy.getSnapshot();
  }

  async getMigrationSnapshotSummary(
    network?: RuntimeNetwork,
  ): Promise<StakingMigrationSnapshotSummary> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    const snapshot =
      await this.migrationService.exportLegacyStakeSnapshot(targetNetwork);
    const previewPositions = snapshot.positions.slice(0, 5).map((position) => ({
      legacyStakeId: position.legacyStakeId,
      walletAddress: position.walletAddress,
      tokenTicker: position.tokenTicker,
      amount: position.amount,
      rewardEstimate: position.rewardEstimate,
      unlockAt: position.unlockAt,
      maturedAtExport: position.maturedAtExport,
      sourceMode: position.sourceMode,
      executionSignature: position.executionSignature,
    }));

    return {
      network: snapshot.manifest.network,
      manifest: snapshot.manifest,
      previewPositions,
      omittedPositions: Math.max(
        0,
        snapshot.positions.length - previewPositions.length,
      ),
      hasLegacyPositions: snapshot.positions.length > 0,
    };
  }

  async exportLegacyStakeSnapshot(
    network?: RuntimeNetwork,
  ): Promise<LegacyStakeMigrationSnapshot> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    return this.migrationService.exportLegacyStakeSnapshot(targetNetwork);
  }

  async exportLegacyStakeSnapshotCsv(
    network?: RuntimeNetwork,
  ): Promise<string> {
    const snapshot = await this.exportLegacyStakeSnapshot(network);
    const header = [
      'legacyStakeId',
      'walletAddress',
      'network',
      'tokenTicker',
      'tokenName',
      'amount',
      'amountUsd',
      'periodLabel',
      'periodDays',
      'apy',
      'rewardToken',
      'rewardEstimate',
      'startedAt',
      'unlockAt',
      'claimedAt',
      'status',
      'maturedAtExport',
      'sourceMode',
      'prepareSessionId',
      'preparedMessageHash',
      'executionSignature',
    ];

    const escapeCsv = (value: string | number | boolean | null) => {
      const normalized = value === null ? '' : String(value);
      if (
        normalized.includes(',') ||
        normalized.includes('"') ||
        normalized.includes('\n')
      ) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    };

    const rows = snapshot.positions.map((position) =>
      [
        position.legacyStakeId,
        position.walletAddress,
        position.network,
        position.tokenTicker,
        position.tokenName,
        position.amount,
        position.amountUsd,
        position.periodLabel,
        position.periodDays,
        position.apy,
        position.rewardToken,
        position.rewardEstimate,
        position.startedAt,
        position.unlockAt,
        position.claimedAt,
        position.status,
        position.maturedAtExport,
        position.sourceMode,
        position.prepareSessionId,
        position.preparedMessageHash,
        position.executionSignature,
      ]
        .map(escapeCsv)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }

  async listTokenConfigCandidates(
    network?: RuntimeNetwork,
  ): Promise<TokenStakeConfigProjection[]> {
    return this.readService.listTokenConfigCandidates(network);
  }

  async getTokenConfigCandidate(
    id: string,
    network?: RuntimeNetwork,
  ): Promise<TokenStakeConfigProjection> {
    return this.readService.getTokenConfigCandidate(id, network);
  }

  async listFundingBatches(
    network?: RuntimeNetwork,
  ): Promise<FundingBatchProjection[]> {
    return this.readService.listFundingBatches(network);
  }

  async prepareTokenConfigSync(
    id: string,
    network?: RuntimeNetwork,
    dto?: PrepareAdminStakingInstructionDto,
  ): Promise<TokenStakeSyncPreparation | PreparedAdminStakingExecution> {
    const preparation =
      await this.transactionService.prepareTokenStakeConfigSync(id, network);

    if (!dto) {
      return preparation;
    }

    this.executionService.assertAdminWalletMatches(dto.walletAddress);
    this.mainnetHardening.assertCriticalActionAllowed({
      network: preparation.network,
      action: 'UPSERT_TOKEN_STAKE_CONFIG',
      registry: this.networkRegistry.getRegistry(preparation.network),
      dto,
    });
    const instructionPayload = preparation.instructionPayload
      ? {
          ...preparation.instructionPayload,
          accounts: preparation.instructionPayload.accounts.map((account) =>
            account.name === 'authority'
              ? {
                  ...account,
                  address: dto.walletAddress,
                }
              : account,
          ),
        }
      : null;

    return this.executionService.prepareInstructionExecution({
      network: preparation.network,
      action: 'UPSERT_TOKEN_STAKE_CONFIG',
      walletAddress: dto.walletAddress,
      instruction: instructionPayload,
    });
  }

  async prepareGlobalConfigInitialize(
    dto: PrepareAdminStakingInstructionDto,
    network?: RuntimeNetwork,
  ): Promise<PreparedAdminStakingExecution> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    this.executionService.assertAdminWalletMatches(dto.walletAddress);

    const registry = this.networkRegistry.getRegistry(targetNetwork);
    this.mainnetHardening.assertCriticalActionAllowed({
      network: targetNetwork,
      action: 'INITIALIZE_GLOBAL_CONFIG',
      registry,
      dto,
    });
    if (!registry.isReady || !registry.stakePoolProgramId) {
      throw new BadRequestException(
        'Staking registry is not fully configured for the active network.',
      );
    }
    if (await this.readService.isGlobalConfigInitialized(targetNetwork)) {
      throw new BadRequestException(
        'Global staking config is already initialized on-chain.',
      );
    }

    const prepared =
      this.transactionService.prepareInitializeGlobalConfigInstruction({
        network: targetNetwork,
        walletAddress: dto.walletAddress,
        operatorAuthority: dto.walletAddress,
        multisigAuthority:
          this.mainnetHardening.resolveBootstrapMultisigAuthority({
            network: targetNetwork,
            registry,
            dto,
            walletAddress: dto.walletAddress,
          }),
        raMintAddress:
          await this.readService.resolveRaMintAddress(targetNetwork),
      });

    return this.executionService.prepareInstructionExecution({
      network: targetNetwork,
      action: 'INITIALIZE_GLOBAL_CONFIG',
      walletAddress: dto.walletAddress,
      instruction: prepared.instructionPayload,
      instructions: prepared.instructions,
    });
  }

  async prepareGlobalConfigUpdate(
    dto: PrepareAdminStakingInstructionDto,
    network?: RuntimeNetwork,
  ): Promise<PreparedAdminStakingExecution> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    this.executionService.assertAdminWalletMatches(dto.walletAddress);

    const registry = this.networkRegistry.getRegistry(targetNetwork);
    this.mainnetHardening.assertCriticalActionAllowed({
      network: targetNetwork,
      action: 'UPDATE_GLOBAL_CONFIG',
      registry,
      dto,
    });
    if (!registry.stakePoolProgramId || !registry.swapNodeProgramId) {
      throw new BadRequestException(
        'Staking registry is not fully configured for the active network.',
      );
    }
    if (!(await this.readService.isGlobalConfigInitialized(targetNetwork))) {
      throw new BadRequestException(
        'Global staking config must be initialized before it can be updated.',
      );
    }

    const prepared =
      this.transactionService.prepareUpdateGlobalConfigInstruction({
        network: targetNetwork,
        walletAddress: dto.walletAddress,
        raMintAddress:
          await this.readService.resolveRaMintAddress(targetNetwork),
        rewardVaultAddress:
          this.readService.resolveRewardVaultAddress(targetNetwork),
      });

    return this.executionService.prepareInstructionExecution({
      network: targetNetwork,
      action: 'UPDATE_GLOBAL_CONFIG',
      walletAddress: dto.walletAddress,
      instruction: prepared.instructionPayload,
      instructions: prepared.instructions,
    });
  }

  async prepareSwapNodeInitialize(
    dto: PrepareAdminStakingInstructionDto,
    network?: RuntimeNetwork,
  ): Promise<PreparedAdminStakingExecution> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    this.executionService.assertAdminWalletMatches(dto.walletAddress);

    const registry = this.networkRegistry.getRegistry(targetNetwork);
    this.mainnetHardening.assertCriticalActionAllowed({
      network: targetNetwork,
      action: 'INITIALIZE_SWAP_NODE',
      registry,
      dto,
    });
    if (!registry.isReady || !registry.swapNodeProgramId) {
      throw new BadRequestException(
        'Swap-node registry is not fully configured for the active network.',
      );
    }
    if (await this.readService.isSwapNodeInitialized(targetNetwork)) {
      throw new BadRequestException(
        'Swap-node config is already initialized on-chain.',
      );
    }

    const prepared =
      this.transactionService.prepareInitializeSwapNodeInstruction({
        network: targetNetwork,
        walletAddress: dto.walletAddress,
        operatorAuthority: dto.walletAddress,
        multisigAuthority:
          this.mainnetHardening.resolveBootstrapMultisigAuthority({
            network: targetNetwork,
            registry,
            dto,
            walletAddress: dto.walletAddress,
          }),
        raMintAddress:
          await this.readService.resolveRaMintAddress(targetNetwork),
      });

    return this.executionService.prepareInstructionExecution({
      network: targetNetwork,
      action: 'INITIALIZE_SWAP_NODE',
      walletAddress: dto.walletAddress,
      instruction: prepared.instructionPayload,
      instructions: prepared.instructions,
    });
  }

  async prepareSwapNodeUpdate(
    dto: PrepareAdminStakingInstructionDto,
    network?: RuntimeNetwork,
  ): Promise<PreparedAdminStakingExecution> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    this.executionService.assertAdminWalletMatches(dto.walletAddress);

    const registry = this.networkRegistry.getRegistry(targetNetwork);
    this.mainnetHardening.assertCriticalActionAllowed({
      network: targetNetwork,
      action: 'UPDATE_SWAP_NODE_CONFIG',
      registry,
      dto,
    });
    if (!registry.stakePoolProgramId || !registry.swapNodeProgramId) {
      throw new BadRequestException(
        'Swap-node registry is not fully configured for the active network.',
      );
    }
    if (!(await this.readService.isSwapNodeInitialized(targetNetwork))) {
      throw new BadRequestException(
        'Swap-node config must be initialized before it can be updated.',
      );
    }

    const prepared = this.transactionService.prepareUpdateSwapNodeInstruction({
      network: targetNetwork,
      walletAddress: dto.walletAddress,
      raMintAddress: await this.readService.resolveRaMintAddress(targetNetwork),
      rewardVaultAddress:
        this.readService.resolveRewardVaultAddress(targetNetwork),
    });

    return this.executionService.prepareInstructionExecution({
      network: targetNetwork,
      action: 'UPDATE_SWAP_NODE_CONFIG',
      walletAddress: dto.walletAddress,
      instruction: prepared.instructionPayload,
      instructions: prepared.instructions,
    });
  }

  async prepareRewardVaultFundingBatch(
    dto: PrepareAdminStakingInstructionDto,
    network?: RuntimeNetwork,
  ): Promise<PreparedAdminStakingExecution> {
    const targetNetwork = await this.resolveTargetNetwork(network);
    this.executionService.assertAdminWalletMatches(dto.walletAddress);
    this.mainnetHardening.assertCriticalActionAllowed({
      network: targetNetwork,
      action: 'EXECUTE_FUNDING_BATCH',
      registry: this.networkRegistry.getRegistry(targetNetwork),
      dto,
    });

    if (targetNetwork !== 'devnet') {
      throw new BadRequestException(
        'Reward coverage batch preparation is currently limited to devnet.',
      );
    }
    if (!(await this.readService.isGlobalConfigInitialized(targetNetwork))) {
      throw new BadRequestException(
        'Global staking config must be initialized before funding reward coverage.',
      );
    }
    if (!(await this.readService.isSwapNodeInitialized(targetNetwork))) {
      throw new BadRequestException(
        'Swap-node config must be initialized before funding reward coverage.',
      );
    }

    const overview = await this.readService.getFundingOverview(targetNetwork);
    if (overview.pendingFundingDeficitRa <= 0) {
      throw new BadRequestException(
        'Reward vault is already sufficiently funded for the current mirror liability.',
      );
    }

    const batchId = randomUUID();
    const raMintAddress =
      await this.readService.resolveRaMintAddress(targetNetwork);
    const prepared =
      this.transactionService.prepareRewardVaultCoverageBatchInstruction({
        network: targetNetwork,
        walletAddress: dto.walletAddress,
        batchId,
        raMintAddress,
        plannedRewardRa: overview.pendingFundingDeficitRa,
      });

    const metadata: FundingBatchExecutionMetadata = {
      kind: 'FUNDING_BATCH',
      batchId,
      inputMintAddress: raMintAddress,
      inputTicker: 'RA',
      plannedRewardRa: overview.pendingFundingDeficitRa,
      approvedInputAmountRaw: Math.round(
        Math.max(0, overview.pendingFundingDeficitRa) * 1_000_000,
      ).toString(),
      createdAt: new Date().toISOString(),
    };

    await this.stakingMirror.upsertFundingBatchProjection({
      network: targetNetwork,
      batchId,
      status: 'APPROVED',
      inputMintAddress: raMintAddress,
      inputTicker: 'RA',
      plannedRewardRa: overview.pendingFundingDeficitRa,
      fundedRewardRa: 0,
      approvedInputAmountRaw: metadata.approvedInputAmountRaw,
      createdAt: new Date(metadata.createdAt),
    });

    return this.executionService.prepareInstructionExecution({
      network: targetNetwork,
      action: 'EXECUTE_FUNDING_BATCH',
      walletAddress: dto.walletAddress,
      instruction: prepared.instructionPayload,
      instructions: prepared.instructions,
      metadata,
    });
  }

  async executePreparedInstruction(
    dto: ExecuteAdminStakingInstructionDto,
  ): Promise<AdminStakingExecutionPayload> {
    return this.executionService.executePreparedInstruction(dto);
  }

  async syncMirror(network?: RuntimeNetwork) {
    return this.readService.syncMirror(network);
  }

  async syncDevnetMirror(network?: RuntimeNetwork) {
    return this.syncMirror(network);
  }

  private async resolveTargetNetwork(network?: RuntimeNetwork) {
    return network ?? (await this.networkRegistry.resolveActiveNetwork());
  }
}
