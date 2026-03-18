import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RA_RUNTIME_SETTINGS_ID } from '../../system/system.constants';
import { StakingConfigService } from './staking-config.service';
import { StakingMainnetHardeningService } from './staking-mainnet-hardening.service';
import { StakingMirrorService } from './staking-mirror.service';
import { StakingNetworkRegistryService } from './staking-network-registry.service';
import { StakingPdaService } from './staking-pda.service';
import { StakingSolanaConnectionService } from './staking-solana-connection.service';
import type {
  AdminStakingRuntimeSnapshot,
  FundingBatchProjection,
  RuntimeNetwork,
  StakingFundingOverview,
  TokenStakeConfigProjection,
} from './staking.types';

@Injectable()
export class StakingAdminReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly networkRegistry: StakingNetworkRegistryService,
    private readonly stakingMirror: StakingMirrorService,
    private readonly stakingConfig: StakingConfigService,
    private readonly pdaService: StakingPdaService,
    private readonly connectionService: StakingSolanaConnectionService,
    private readonly mainnetHardening: StakingMainnetHardeningService,
  ) {}

  async getAdminRuntime(): Promise<
    Omit<AdminStakingRuntimeSnapshot, 'cutoverPolicy' | 'migrationSnapshot'>
  > {
    const activeNetwork = await this.networkRegistry.resolveActiveNetwork();
    const [
      programs,
      mirror,
      tokenConfigs,
      globalConfigPda,
      initialized,
      swapNodeConfigPda,
      swapNodeInitialized,
      fundingOverview,
    ] = await Promise.all([
      this.networkRegistry.getActiveRegistry(),
      this.stakingMirror.getHealthSnapshot(),
      this.stakingConfig.listTokenStakeConfigProjections(activeNetwork),
      Promise.resolve(
        this.networkRegistry.getRegistry(activeNetwork).stakePoolProgramId
          ? this.pdaService.deriveGlobalConfigAddress(activeNetwork)
          : null,
      ),
      this.isGlobalConfigInitialized(activeNetwork),
      Promise.resolve(
        this.networkRegistry.getRegistry(activeNetwork).swapNodeProgramId
          ? this.pdaService.deriveSwapNodeConfigAddress(activeNetwork)
          : null,
      ),
      this.isSwapNodeInitialized(activeNetwork),
      this.getFundingOverview(activeNetwork),
    ]);

    return {
      activeNetwork,
      programs,
      mirror,
      availableTokenConfigs: tokenConfigs.length,
      mainnetHardening: this.mainnetHardening.getSnapshot(
        this.networkRegistry.getRegistry('mainnet'),
      ),
      globalConfigPda,
      globalConfigInitialized: initialized,
      swapNodeConfigPda,
      swapNodeInitialized,
      fundingOverview,
    };
  }

  async listTokenConfigCandidates(
    network?: RuntimeNetwork,
  ): Promise<TokenStakeConfigProjection[]> {
    const targetNetwork =
      network ?? (await this.networkRegistry.resolveActiveNetwork());
    return this.stakingConfig.listTokenStakeConfigProjections(targetNetwork);
  }

  async getTokenConfigCandidate(
    id: string,
    network?: RuntimeNetwork,
  ): Promise<TokenStakeConfigProjection> {
    const targetNetwork =
      network ?? (await this.networkRegistry.resolveActiveNetwork());
    const projection = await this.stakingConfig.getTokenStakeConfigProjection(
      id,
      targetNetwork,
    );

    if (!projection) {
      throw new NotFoundException('Stake config candidate not found');
    }

    return projection;
  }

  async listFundingBatches(
    network?: RuntimeNetwork,
  ): Promise<FundingBatchProjection[]> {
    const targetNetwork =
      network ?? (await this.networkRegistry.resolveActiveNetwork());
    return this.stakingMirror.listFundingBatchProjections(targetNetwork);
  }

  async syncMirror(network?: RuntimeNetwork) {
    const targetNetwork =
      network ?? (await this.networkRegistry.resolveActiveNetwork());
    const runtime = this.networkRegistry.getRegistry(targetNetwork);
    const configs =
      await this.stakingConfig.listTokenStakeConfigProjections(targetNetwork);

    return this.stakingMirror.syncTokenConfigs({
      network: targetNetwork,
      runtime,
      configs,
    });
  }

  async syncDevnetMirror(network?: RuntimeNetwork) {
    return this.syncMirror(network);
  }

  async isGlobalConfigInitialized(network: RuntimeNetwork): Promise<boolean> {
    const registry = this.networkRegistry.getRegistry(network);
    if (!registry.stakePoolProgramId || !registry.isReady) {
      return false;
    }

    const address = this.pdaService.deriveGlobalConfigAddress(network);
    return this.connectionService.isProgramOwnedAccount(
      network,
      address,
      registry.stakePoolProgramId,
    );
  }

  async isSwapNodeInitialized(network: RuntimeNetwork): Promise<boolean> {
    const registry = this.networkRegistry.getRegistry(network);
    if (!registry.swapNodeProgramId || !registry.isReady) {
      return false;
    }

    const address = this.pdaService.deriveSwapNodeConfigAddress(network);
    return this.connectionService.isProgramOwnedAccount(
      network,
      address,
      registry.swapNodeProgramId,
    );
  }

  async resolveRaMintAddress(network: RuntimeNetwork): Promise<string> {
    const raRuntime = await this.prisma.raRuntimeSetting.upsert({
      where: { id: RA_RUNTIME_SETTINGS_ID },
      update: {},
      create: { id: RA_RUNTIME_SETTINGS_ID },
      select: {
        mintDevnet: true,
        mintMainnet: true,
      },
    });
    const raMintAddress =
      network === 'mainnet' ? raRuntime.mintMainnet : raRuntime.mintDevnet;
    if (!raMintAddress) {
      throw new BadRequestException(
        'RA mint is missing for the active network.',
      );
    }
    return raMintAddress;
  }

  resolveRewardVaultAddress(network: RuntimeNetwork): string {
    const rewardVaultAddress =
      this.networkRegistry.getRegistry(network).rewardVaultAddress;
    if (!rewardVaultAddress) {
      throw new BadRequestException(
        'Reward vault is missing for the active network.',
      );
    }
    return rewardVaultAddress;
  }

  async getFundingOverview(
    network: RuntimeNetwork,
  ): Promise<StakingFundingOverview> {
    const mirrorOverview = await this.stakingMirror.getFundingOverview(network);
    const rewardVaultBalanceRa =
      await this.connectionService.getRewardVaultBalance(
        network,
        this.networkRegistry.getRegistry(network).rewardVaultAddress,
      );
    const totalOpenLiabilityRa = mirrorOverview.totalOpenLiabilityRa;
    const pendingFundingDeficitRa = Math.max(
      0,
      totalOpenLiabilityRa - rewardVaultBalanceRa,
    );

    return {
      ...mirrorOverview,
      rewardVaultBalanceRa,
      pendingFundingDeficitRa,
      coverageRatio:
        totalOpenLiabilityRa > 0
          ? Math.min(1, rewardVaultBalanceRa / totalOpenLiabilityRa)
          : null,
    };
  }
}
