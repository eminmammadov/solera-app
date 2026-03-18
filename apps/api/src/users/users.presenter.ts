import {
  StakePositionStatus,
  WalletActivityStatus,
  WalletActivityType,
  WalletUserRole,
} from '@prisma/client';
import { NumericLike, toNumber } from '../common/numeric';
import { formatDateTimeForUi, formatNumber } from './users.utils';
import type {
  WalletExplorerActivityPayload,
  WalletProfileTransactionPayload,
  WalletSessionPayload,
  WalletStakePositionPayload,
  WalletUserSummary,
} from './users.types';

interface WalletUserSummarySource {
  id: string;
  walletAddress: string;
  role: WalletUserRole;
  isBlocked: boolean;
  blockedAt: Date | null;
  blockMessage: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  firstSeenCountry: string | null;
  lastSeenCountry: string | null;
  totalSessionSeconds: number;
  totalStakePositions: number;
  activeStakePositions: number;
  totalStakedAmountUsd: NumericLike;
}

interface WalletSessionSource {
  id: string;
  startedAt: Date;
  lastSeenAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
  isOnline: boolean;
}

interface WalletStakePositionSource {
  id: string;
  tokenTicker: string;
  tokenName: string | null;
  amount: NumericLike;
  amountUsd: NumericLike;
  periodLabel: string;
  periodDays: number;
  apy: number;
  rewardToken: string;
  rewardEstimate: NumericLike;
  status: StakePositionStatus;
  startedAt: Date;
  unlockAt: Date;
  claimedAt: Date | null;
  user: { walletAddress: string };
}

interface WalletExplorerActivitySource {
  id: string;
  eventHash: string;
  type: WalletActivityType;
  status: WalletActivityStatus;
  walletAddress: string;
  tokenTicker: string;
  tokenName: string | null;
  amount: NumericLike;
  amountUsd: NumericLike;
  createdAt: Date;
}

interface WalletProfileActivitySource {
  id: string;
  type: WalletActivityType;
  status: WalletActivityStatus;
  amount: NumericLike;
  tokenTicker: string;
  createdAt: Date;
}

export const toWalletUserSummary = (
  user: WalletUserSummarySource,
  isOnline: boolean,
): WalletUserSummary => ({
  id: user.id,
  walletAddress: user.walletAddress,
  role: user.role,
  isBlocked: user.isBlocked,
  blockedAt: user.blockedAt ? user.blockedAt.toISOString() : null,
  blockMessage: user.blockMessage,
  firstSeenAt: user.firstSeenAt.toISOString(),
  lastSeenAt: user.lastSeenAt.toISOString(),
  firstSeenCountry: user.firstSeenCountry,
  lastSeenCountry: user.lastSeenCountry,
  totalSessionSeconds: user.totalSessionSeconds,
  totalStakePositions: user.totalStakePositions,
  activeStakePositions: user.activeStakePositions,
  totalStakedAmountUsd: toNumber(user.totalStakedAmountUsd),
  isOnline,
});

export const toWalletSessionPayload = (
  session: WalletSessionSource,
): WalletSessionPayload => ({
  id: session.id,
  startedAt: session.startedAt.toISOString(),
  lastSeenAt: session.lastSeenAt.toISOString(),
  endedAt: session.endedAt ? session.endedAt.toISOString() : null,
  durationSeconds: session.durationSeconds,
  ipAddress: session.ipAddress,
  countryCode: session.countryCode,
  userAgent: session.userAgent,
  isOnline: session.isOnline,
});

export const toStakePositionPayload = (
  position: WalletStakePositionSource,
): WalletStakePositionPayload => ({
  id: position.id,
  walletAddress: position.user.walletAddress,
  tokenTicker: position.tokenTicker,
  tokenName: position.tokenName,
  amount: toNumber(position.amount),
  amountUsd: toNumber(position.amountUsd),
  periodLabel: position.periodLabel,
  periodDays: position.periodDays,
  apy: position.apy,
  rewardToken: position.rewardToken,
  rewardEstimate: toNumber(position.rewardEstimate),
  status: position.status,
  startedAt: position.startedAt.toISOString(),
  unlockAt: position.unlockAt.toISOString(),
  claimedAt: position.claimedAt ? position.claimedAt.toISOString() : null,
});

const toProfileActivityStatus = (
  status: WalletActivityStatus,
): WalletProfileTransactionPayload['status'] => {
  if (status === WalletActivityStatus.FAILED) return 'Failed';
  if (status === WalletActivityStatus.PENDING) return 'Pending';
  return 'Completed';
};

const toProfileActivityType = (
  type: WalletActivityType,
): WalletProfileTransactionPayload['type'] => {
  switch (type) {
    case WalletActivityType.STAKE:
      return 'Stake';
    case WalletActivityType.CLAIM:
      return 'Claim';
    case WalletActivityType.DEPOSIT:
      return 'Deposit';
    case WalletActivityType.WITHDRAW:
      return 'Withdraw';
    case WalletActivityType.CONVERT:
    default:
      return 'Convert';
  }
};

export const buildExplorerAmountDisplay = (activity: {
  type: WalletActivityType;
  amount: NumericLike;
  tokenTicker: string;
}): string => {
  const amount = Math.max(0, toNumber(activity.amount));
  const formatted = formatNumber(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
  const prefix =
    activity.type === WalletActivityType.CLAIM ||
    activity.type === WalletActivityType.DEPOSIT
      ? '+'
      : '-';

  return `${prefix}${formatted} ${activity.tokenTicker}`;
};

export const toExplorerActivityPayload = (
  activity: WalletExplorerActivitySource,
): WalletExplorerActivityPayload => ({
  id: activity.id,
  eventHash: activity.eventHash,
  type: activity.type,
  status: activity.status,
  walletAddress: activity.walletAddress,
  tokenTicker: activity.tokenTicker,
  tokenName: activity.tokenName,
  amount: toNumber(activity.amount),
  amountUsd: toNumber(activity.amountUsd),
  amountDisplay: buildExplorerAmountDisplay(activity),
  createdAt: activity.createdAt.toISOString(),
});

export const toProfileTransactionPayload = (
  activity: WalletProfileActivitySource,
): WalletProfileTransactionPayload => ({
  id: activity.id,
  type: toProfileActivityType(activity.type),
  amount: buildExplorerAmountDisplay(activity),
  date: formatDateTimeForUi(activity.createdAt),
  status: toProfileActivityStatus(activity.status),
});
