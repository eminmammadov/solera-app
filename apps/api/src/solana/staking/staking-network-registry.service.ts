import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { readOptionalEnv } from '../../common/env';
import { isSolanaPlaceholderAddress } from '../../common/solana.constants';
import {
  DEVNET_NETWORK,
  MAINNET_NETWORK,
  STAKING_PROGRAM_ENV,
} from './staking.constants';
import type {
  RuntimeNetwork,
  StakingProgramRegistryEntry,
} from './staking.types';

@Injectable()
export class StakingNetworkRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActiveNetwork(): Promise<RuntimeNetwork> {
    const headerSettings = await this.prisma.headerSetting.upsert({
      where: { id: 'header-settings' },
      update: {},
      create: { id: 'header-settings' },
      select: { network: true },
    });

    return headerSettings.network === MAINNET_NETWORK
      ? MAINNET_NETWORK
      : DEVNET_NETWORK;
  }

  getRegistry(network: RuntimeNetwork): StakingProgramRegistryEntry {
    const keys = STAKING_PROGRAM_ENV[network];
    const stakePoolProgramId = readOptionalEnv(keys.stakePoolProgramId);
    const swapNodeProgramId = readOptionalEnv(keys.swapNodeProgramId);
    const rewardVaultAddress = readOptionalEnv(keys.rewardVault);
    const hasPlaceholderKey =
      isSolanaPlaceholderAddress(stakePoolProgramId) ||
      isSolanaPlaceholderAddress(swapNodeProgramId) ||
      isSolanaPlaceholderAddress(rewardVaultAddress);

    return {
      network,
      stakePoolProgramId,
      swapNodeProgramId,
      rewardVaultAddress,
      isReady: Boolean(
        stakePoolProgramId &&
        swapNodeProgramId &&
        rewardVaultAddress &&
        !hasPlaceholderKey,
      ),
    };
  }

  async getActiveRegistry(): Promise<StakingProgramRegistryEntry> {
    const network = await this.resolveActiveNetwork();
    return this.getRegistry(network);
  }
}
