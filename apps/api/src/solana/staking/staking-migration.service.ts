import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StakePositionStatus,
  WalletActivityType,
} from '@prisma/client';
import { toNumber } from '../../common/numeric';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  LegacyStakeMigrationManifest,
  RuntimeNetwork,
} from './staking.types';

export interface LegacyStakeMigrationRecord {
  legacyStakeId: string;
  walletAddress: string;
  network: RuntimeNetwork;
  tokenTicker: string;
  tokenName: string | null;
  amount: number;
  amountUsd: number;
  periodLabel: string;
  periodDays: number;
  apy: number;
  rewardToken: string;
  rewardEstimate: number;
  startedAt: string;
  unlockAt: string;
  claimedAt: string | null;
  status: StakePositionStatus;
  maturedAtExport: boolean;
  sourceMode: string | null;
  prepareSessionId: string | null;
  preparedMessageHash: string | null;
  executionSignature: string | null;
}

export interface LegacyStakeMigrationSnapshot {
  manifest: LegacyStakeMigrationManifest;
  positions: LegacyStakeMigrationRecord[];
}

@Injectable()
export class StakingMigrationService {
  constructor(private readonly prisma: PrismaService) {}

  async exportLegacyStakeSnapshot(
    network: RuntimeNetwork,
  ): Promise<LegacyStakeMigrationSnapshot> {
    const positions = await this.prisma.walletStakePosition.findMany({
      where: {
        network,
        status: StakePositionStatus.ACTIVE,
      },
      orderBy: [{ unlockAt: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    const positionIds = positions.map((position) => position.id);

    const relatedStakeActivities = positionIds.length
      ? await this.prisma.walletUserActivity.findMany({
          where: {
            type: WalletActivityType.STAKE,
            referenceId: {
              in: positionIds,
            },
          },
          orderBy: [{ createdAt: 'desc' }],
          select: {
            referenceId: true,
            metadata: true,
          },
        })
      : [];

    const latestActivityByReferenceId = new Map<
      string,
      { metadata: Prisma.JsonValue | null }
    >();

    for (const activity of relatedStakeActivities) {
      if (
        !activity.referenceId ||
        latestActivityByReferenceId.has(activity.referenceId)
      ) {
        continue;
      }

      latestActivityByReferenceId.set(activity.referenceId, {
        metadata: activity.metadata,
      });
    }

    const now = Date.now();
    const normalizedPositions: LegacyStakeMigrationRecord[] = positions.map(
      (position) => {
        const metadata =
          latestActivityByReferenceId.get(position.id)?.metadata ?? null;
        const metadataRecord =
          metadata && typeof metadata === 'object' && !Array.isArray(metadata)
            ? (metadata as Record<string, unknown>)
            : null;

        return {
          legacyStakeId: position.id,
          walletAddress: position.user.walletAddress,
          network: network === 'mainnet' ? 'mainnet' : 'devnet',
          tokenTicker: position.tokenTicker,
          tokenName: position.tokenName ?? null,
          amount: toNumber(position.amount),
          amountUsd: toNumber(position.amountUsd),
          periodLabel: position.periodLabel,
          periodDays: position.periodDays,
          apy: position.apy,
          rewardToken: position.rewardToken,
          rewardEstimate: toNumber(position.rewardEstimate),
          startedAt: position.startedAt.toISOString(),
          unlockAt: position.unlockAt.toISOString(),
          claimedAt: position.claimedAt?.toISOString() ?? null,
          status: position.status,
          maturedAtExport: position.unlockAt.getTime() <= now,
          sourceMode:
            typeof metadataRecord?.sourceMode === 'string'
              ? metadataRecord.sourceMode
              : null,
          prepareSessionId:
            typeof metadataRecord?.prepareSessionId === 'string'
              ? metadataRecord.prepareSessionId
              : null,
          preparedMessageHash:
            typeof metadataRecord?.preparedMessageHash === 'string'
              ? metadataRecord.preparedMessageHash
              : null,
          executionSignature:
            typeof metadataRecord?.executionSignature === 'string'
              ? metadataRecord.executionSignature
              : null,
        };
      },
    );

    const checksumSha256 = createHash('sha256')
      .update(JSON.stringify(normalizedPositions))
      .digest('hex');

    const manifest: LegacyStakeMigrationManifest = {
      network,
      generatedAt: new Date().toISOString(),
      positionCount: normalizedPositions.length,
      activeCount: normalizedPositions.filter(
        (position) => !position.maturedAtExport,
      ).length,
      maturedClaimableCount: normalizedPositions.filter(
        (position) => position.maturedAtExport,
      ).length,
      checksumSha256,
    };

    return {
      manifest,
      positions: normalizedPositions,
    };
  }
}
