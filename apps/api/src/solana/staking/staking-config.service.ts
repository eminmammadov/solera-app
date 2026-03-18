import { Injectable } from '@nestjs/common';
import { MarketToken } from '@prisma/client';
import { WRAPPED_SOL_MINT_ADDRESS } from '../../common/solana.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_RA_STAKE_MAX_USD,
  DEFAULT_RA_STAKE_MIN_USD,
  RA_RUNTIME_SETTINGS_ID,
} from '../../system/system.constants';
import {
  STAKING_GLOBAL_CONFIG_SEED,
  STAKING_TOKEN_CONFIG_SEED,
} from './staking.constants';
import { StakingNetworkRegistryService } from './staking-network-registry.service';
import type {
  RuntimeNetwork,
  TokenStakeConfigProjection,
} from './staking.types';

const NATIVE_SOL_TICKER = 'SOL';

@Injectable()
export class StakingConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly networkRegistry: StakingNetworkRegistryService,
  ) {}

  async listTokenStakeConfigProjections(
    network: RuntimeNetwork,
  ): Promise<TokenStakeConfigProjection[]> {
    const [tokens, minMax] = await Promise.all([
      this.prisma.marketToken.findMany({
        where: {
          OR: [{ network: 'global' }, { network }],
        },
        orderBy: [{ category: 'asc' }, { ticker: 'asc' }],
      }),
      this.readGlobalStakeBounds(),
    ]);

    const registry = this.networkRegistry.getRegistry(network);

    return tokens.map((token) =>
      this.toProjection(
        token,
        network,
        minMax.minStakeUsd,
        minMax.maxStakeUsd,
        registry.isReady,
      ),
    );
  }

  async getTokenStakeConfigProjection(
    id: string,
    network: RuntimeNetwork,
  ): Promise<TokenStakeConfigProjection | null> {
    const [token, minMax] = await Promise.all([
      this.prisma.marketToken.findUnique({ where: { id } }),
      this.readGlobalStakeBounds(),
    ]);
    if (!token) return null;

    const registry = this.networkRegistry.getRegistry(network);

    return this.toProjection(
      token,
      network,
      minMax.minStakeUsd,
      minMax.maxStakeUsd,
      registry.isReady,
    );
  }

  private async readGlobalStakeBounds() {
    const settings = await this.prisma.raRuntimeSetting.upsert({
      where: { id: RA_RUNTIME_SETTINGS_ID },
      update: {},
      create: { id: RA_RUNTIME_SETTINGS_ID },
      select: {
        stakeMinUsd: true,
        stakeMaxUsd: true,
      },
    });

    return {
      minStakeUsd:
        Number(settings.stakeMinUsd ?? DEFAULT_RA_STAKE_MIN_USD) ||
        DEFAULT_RA_STAKE_MIN_USD,
      maxStakeUsd:
        Number(settings.stakeMaxUsd ?? DEFAULT_RA_STAKE_MAX_USD) ||
        DEFAULT_RA_STAKE_MAX_USD,
    };
  }

  private toProjection(
    token: MarketToken,
    network: RuntimeNetwork,
    minStakeUsd: number,
    maxStakeUsd: number,
    programsReady: boolean,
  ): TokenStakeConfigProjection {
    const mintAddress = this.resolveStakeMintAddress(
      token.ticker,
      token.mintAddress,
    );
    const syncStatus = !mintAddress
      ? 'missing_mint'
      : programsReady
        ? 'ready'
        : 'program_not_configured';

    return {
      tokenId: token.id,
      ticker: token.ticker,
      tokenName: token.name,
      network,
      sourceNetwork:
        token.network === 'mainnet' || token.network === 'devnet'
          ? token.network
          : 'global',
      mintAddress,
      enabled: token.stakeEnabled,
      minStakeUsd,
      maxStakeUsd,
      apr7dBps: this.percentToBps(token.stake7d),
      apr1mBps: this.percentToBps(token.stake1m),
      apr3mBps: this.percentToBps(token.stake3m),
      apr6mBps: this.percentToBps(token.stake6m),
      apr12mBps: this.percentToBps(token.stake12m),
      requiredSeeds: {
        globalConfig: STAKING_GLOBAL_CONFIG_SEED,
        tokenConfig: `${STAKING_TOKEN_CONFIG_SEED}:${mintAddress ?? 'missing'}`,
      },
      syncStatus,
    };
  }

  private resolveStakeMintAddress(
    ticker: string,
    mintAddress: string | null | undefined,
  ): string | null {
    if (ticker.trim().toUpperCase() === NATIVE_SOL_TICKER) {
      return WRAPPED_SOL_MINT_ADDRESS;
    }

    const normalized = mintAddress?.trim();
    return normalized ? normalized : null;
  }

  private percentToBps(value: number): number {
    const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.round(normalized * 100);
  }
}
