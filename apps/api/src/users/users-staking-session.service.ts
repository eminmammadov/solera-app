import { BadRequestException, Injectable } from '@nestjs/common';
import { getSharedRedisJsonCache } from '../common/redis-cache';
import type { WalletStakePreparationPayload } from './users.types';

export interface ResolvedStakeQuote {
  tokenTicker: string;
  tokenName: string | null;
  tokenMintAddress: string | null;
  amount: number;
  amountUsd: number;
  periodLabel: string;
  periodDays: number;
  apy: number;
  priceSnapshotUsd: number;
  raPriceSnapshotUsd: number;
  principalRa: number;
  rewardRa: number;
  finalRaPayout: number;
}

export interface PreparedStakeSession extends ResolvedStakeQuote {
  sessionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  mode: 'ONCHAIN_PREPARED';
  instruction: WalletStakePreparationPayload['instruction'];
  transactionBase64: string | null;
  messageHash: string | null;
  lastValidBlockHeight: number | null;
  startedAt: string;
  unlockAt: string;
  expiresAt: string;
}

export interface PreparedClaimSession {
  sessionId: string;
  stakePositionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  transactionBase64: string;
  messageHash: string;
  lastValidBlockHeight: number;
  grossRewardRa: number;
  netRewardRa: number;
  claimFeeRa: number;
  expiresAt: string;
}

export const STAKE_SIGNED_SOURCE_MODE = 'ONCHAIN_PREPARED';

const STAKE_PREPARE_EXPIRED_MESSAGE =
  'Prepared stake session expired. Please confirm stake again.';
const CLAIM_PREPARE_EXPIRED_MESSAGE =
  'Prepared claim session expired. Please confirm claim again.';

@Injectable()
export class UsersStakingSessionService {
  private readonly redisJsonCache = getSharedRedisJsonCache();

  async savePreparedStakeSession(session: PreparedStakeSession, ttlMs: number) {
    await this.redisJsonCache.set(
      this.buildPrepareCacheKey(session.sessionId),
      session,
      ttlMs,
    );
  }

  async savePreparedClaimSession(session: PreparedClaimSession, ttlMs: number) {
    await this.redisJsonCache.set(
      this.buildClaimPrepareCacheKey(session.sessionId),
      session,
      ttlMs,
    );
  }

  async loadPreparedStakeSession(
    sessionId: string,
  ): Promise<PreparedStakeSession> {
    const session = await this.redisJsonCache.get<PreparedStakeSession>(
      this.buildPrepareCacheKey(sessionId),
    );
    if (!session) {
      throw new BadRequestException(STAKE_PREPARE_EXPIRED_MESSAGE);
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException(STAKE_PREPARE_EXPIRED_MESSAGE);
    }
    return session;
  }

  async loadPreparedClaimSession(
    sessionId: string,
  ): Promise<PreparedClaimSession> {
    const session = await this.redisJsonCache.get<PreparedClaimSession>(
      this.buildClaimPrepareCacheKey(sessionId),
    );
    if (!session) {
      throw new BadRequestException(CLAIM_PREPARE_EXPIRED_MESSAGE);
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException(CLAIM_PREPARE_EXPIRED_MESSAGE);
    }
    return session;
  }

  validatePreparedStakeSession(
    session: PreparedStakeSession,
    input: {
      walletAddress: string;
      network: 'devnet' | 'mainnet';
      tokenTicker: string;
      amount: number;
      periodLabel: string;
    },
  ): ResolvedStakeQuote {
    const requestedTicker = input.tokenTicker.trim().toUpperCase();
    const requestedPeriod = input.periodLabel.trim().toUpperCase();

    if (
      session.walletAddress !== input.walletAddress ||
      session.network !== input.network
    ) {
      throw new BadRequestException(
        'Prepared stake session no longer matches this wallet.',
      );
    }
    if (session.tokenTicker !== requestedTicker) {
      throw new BadRequestException(
        'Prepared stake token does not match the selected token.',
      );
    }
    if (session.periodLabel !== requestedPeriod) {
      throw new BadRequestException(
        'Prepared stake period changed. Prepare stake again.',
      );
    }
    if (Math.abs(session.amount - input.amount) > 0.0000001) {
      throw new BadRequestException(
        'Prepared stake amount changed. Prepare stake again.',
      );
    }

    return {
      tokenTicker: session.tokenTicker,
      tokenName: session.tokenName,
      tokenMintAddress: session.tokenMintAddress,
      amount: session.amount,
      amountUsd: session.amountUsd,
      periodLabel: session.periodLabel,
      periodDays: session.periodDays,
      apy: session.apy,
      priceSnapshotUsd: session.priceSnapshotUsd,
      raPriceSnapshotUsd: session.raPriceSnapshotUsd,
      principalRa: session.principalRa,
      rewardRa: session.rewardRa,
      finalRaPayout: session.finalRaPayout,
    };
  }

  private buildPrepareCacheKey(sessionId: string) {
    return `users:stake:prepare:${sessionId}`;
  }

  private buildClaimPrepareCacheKey(sessionId: string) {
    return `users:claim:prepare:${sessionId}`;
  }
}
