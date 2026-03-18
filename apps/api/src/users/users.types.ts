import {
  StakePositionStatus,
  WalletActivityStatus,
  WalletActivityType,
  WalletUserRole,
} from '@prisma/client';

export interface UsersRequestContext {
  requesterKey: string;
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
}

export interface WalletUserSummary {
  id: string;
  walletAddress: string;
  role: WalletUserRole;
  isBlocked: boolean;
  blockedAt: string | null;
  blockMessage: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  firstSeenCountry: string | null;
  lastSeenCountry: string | null;
  totalSessionSeconds: number;
  totalStakePositions: number;
  activeStakePositions: number;
  totalStakedAmountUsd: number;
  isOnline: boolean;
}

export interface WalletSessionPayload {
  id: string;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  durationSeconds: number;
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
  isOnline: boolean;
}

export interface WalletStakePositionPayload {
  id: string;
  walletAddress: string;
  tokenTicker: string;
  tokenName: string | null;
  amount: number;
  amountUsd: number;
  periodLabel: string;
  periodDays: number;
  apy: number;
  rewardToken: string;
  rewardEstimate: number;
  status: StakePositionStatus;
  startedAt: string;
  unlockAt: string;
  claimedAt: string | null;
}

export interface WalletStakeInstructionAccountPayload {
  name: string;
  address: string | null;
  isSigner: boolean;
  isWritable: boolean;
}

export interface WalletStakeInstructionPayload {
  programId: string;
  instructionName: string;
  discriminatorHex: string;
  dataBase64: string;
  accounts: WalletStakeInstructionAccountPayload[];
}

export interface WalletStakeQuotePayload {
  sessionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
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
  requiresWalletSignature: boolean;
  expiresAt: string;
}

export interface WalletStakePreparationPayload extends WalletStakeQuotePayload {
  mode: 'ONCHAIN_PREPARED';
  instruction: WalletStakeInstructionPayload | null;
  transactionBase64: string | null;
  messageHash: string | null;
  lastValidBlockHeight: number | null;
}

export interface WalletStakeExecutionPayload {
  sessionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  mode: 'ONCHAIN_EXECUTED';
  signature: string;
  explorerUrl: string;
  confirmedAt: string;
  slot: number | null;
}

export interface WalletClaimPreparationPayload {
  sessionId: string;
  stakePositionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  grossRewardRa: number;
  claimFeeRa: number;
  netRewardRa: number;
  requiresWalletSignature: boolean;
  transactionBase64: string | null;
  messageHash: string | null;
  lastValidBlockHeight: number | null;
  expiresAt: string;
}

export interface WalletClaimExecutionPayload {
  sessionId: string;
  stakePositionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  mode: 'ONCHAIN_EXECUTED';
  signature: string;
  explorerUrl: string;
  confirmedAt: string;
  slot: number | null;
}

export interface StartUserSessionPayload {
  sessionId: string;
  sessionKey: string | null;
  isNewUser: boolean;
  user: WalletUserSummary;
}

export interface HeartbeatUserSessionPayload {
  sessionId: string;
  replacedSession: boolean;
  lastSeenAt: string;
}

export interface EndUserSessionPayload {
  sessionId: string;
  closed: boolean;
  durationSeconds: number;
  totalSessionSeconds: number;
  endedAt: string;
}

export interface WalletUsersMetricsPayload {
  totalUsers: number;
  onlineUsers: number;
  activeUsers24h: number;
  totalStakePositions: number;
  activeStakePositions: number;
  totalStakedAmountUsd: number;
  averageSessionSeconds: number;
  topCountries: Array<{ country: string; users: number }>;
  generatedAt: string;
}

export interface AdminWalletUsersListPayload {
  total: number;
  limit: number;
  offset: number;
  items: WalletUserSummary[];
}

export interface AdminWalletUserDetailPayload {
  user: WalletUserSummary;
  sessions: WalletSessionPayload[];
  stakePositions: WalletStakePositionPayload[];
}

export interface DeleteWalletUserPayload {
  success: true;
  walletAddress: string;
}

export interface WalletAccessPayload {
  walletAddress: string;
  role: WalletUserRole;
  allowed: boolean;
  isBlocked: boolean;
  message: string | null;
}

export interface WalletAuthNoncePayload {
  message: string;
  nonce: string;
  expiresAt: string;
}

export interface WalletAuthVerifyPayload {
  accessToken: string;
  walletAddress: string;
  expiresInSeconds: number;
}

export interface WalletProfileActiveStakingPayload {
  id: string;
  remoteId: string;
  name: string;
  logo: string;
  stakedAmount: string;
  apr: string;
  earned: string;
  status: string;
  startedAt: number;
  endTime: number;
}

export interface WalletProfileTransactionPayload {
  id: string;
  type: string;
  amount: string;
  date: string;
  status: string;
}

export interface WalletProfilePortfolioTokenPayload {
  id: string;
  ticker: string;
  name: string;
  amount: number;
  priceUsd: number;
  logoUrl: string;
  change24h: number;
}

export interface WalletUserProfilePayload {
  walletAddress: string;
  exists: boolean;
  role: WalletUserRole;
  isBlocked: boolean;
  availableBalance: number;
  stakedBalance: number;
  totalEarned: number;
  totalEarnedUsd: number;
  portfolioValue: number;
  portfolioChange: number;
  activeStakings: WalletProfileActiveStakingPayload[];
  transactions: WalletProfileTransactionPayload[];
  portfolio: WalletProfilePortfolioTokenPayload[];
}

export interface WalletExplorerActivityPayload {
  id: string;
  eventHash: string;
  type: WalletActivityType;
  status: WalletActivityStatus;
  walletAddress: string;
  tokenTicker: string;
  tokenName: string | null;
  amount: number;
  amountUsd: number;
  amountDisplay: string;
  createdAt: string;
}

export interface WalletExplorerFeedStatsPayload {
  totalTransactions: number;
  last24hTransactions: number;
  totalVolumeUsd: number;
  activeUsers: number;
  generatedAt: string;
}

export interface WalletExplorerFeedPayload {
  items: WalletExplorerActivityPayload[];
  nextCursor: string | null;
  stats: WalletExplorerFeedStatsPayload;
}

export interface WalletHeaderRuntimeSettings {
  connectEnabled: boolean;
  network: 'devnet' | 'mainnet';
}

export interface UsersRaRuntimeSettings {
  logoUrl: string;
  tokenSymbol: string;
  tokenName: string;
  mintDevnet: string;
  mintMainnet: string;
  treasuryDevnet: string;
  treasuryMainnet: string;
  oraclePrimary: 'DEXSCREENER' | 'RAYDIUM';
  oracleSecondary: 'DEXSCREENER' | 'RAYDIUM' | null;
  stakeFeeBps: number;
  claimFeeBps: number;
  stakeMinUsd: number;
  stakeMaxUsd: number;
  convertMinUsd: number;
  convertMaxUsd: number;
  convertEnabled: boolean;
  convertProvider: 'RAYDIUM' | 'JUPITER';
  convertExecutionMode: 'AUTO' | 'SINGLE_TX_ONLY' | 'ALLOW_MULTI_TX';
  convertRoutePolicy: 'TOKEN_TO_SOL_TO_RA';
  convertSlippageBps: number;
  convertMaxTokensPerSession: number;
  convertPoolIdDevnet: string;
  convertPoolIdMainnet: string;
  convertQuoteMintDevnet: string;
  convertQuoteMintMainnet: string;
}

export interface WalletConvertPreparationLegPayload {
  legId: string;
  ticker: string;
  name: string;
  mintAddress: string;
  amount: number;
  amountUsd: number;
  quotedRaOut: number;
  quotedFeeRa: number;
  quotedFeeUsd: number;
  slippageBps: number;
  transactionBase64List: string[];
  transactionCount: number;
  expiresAt: string;
}

export interface WalletConvertPreviewTokenPayload {
  ticker: string;
  name: string;
  mintAddress: string;
  amount: number;
  amountUsd: number;
  quotedRaOut: number;
  quotedFeeRa: number;
  quotedFeeUsd: number;
  transactionCount: number;
}

export interface WalletConvertPreviewPayload {
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  maxTokensPerSession: number;
  hiddenTokenCount: number;
  unavailableCount: number;
  note: string | null;
  availableSolBalance: number;
  estimatedNetworkFeeSol: number;
  canExecute: boolean;
  feeWarning: string | null;
  tokens: WalletConvertPreviewTokenPayload[];
}

export interface WalletConvertPreparationPayload {
  sessionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  expiresAt: string;
  totalInputUsd: number;
  totalQuotedRaOut: number;
  totalFeeRa: number;
  totalFeeUsd: number;
  legs: WalletConvertPreparationLegPayload[];
}

export interface WalletConvertExecutionLegPayload {
  legId: string;
  ticker: string;
  status: 'COMPLETED' | 'FAILED';
  signature: string | null;
  signatures: string[];
  actualRaOut: number;
  feeRa: number;
  errorMessage: string | null;
}

export interface WalletConvertExecutionPayload {
  sessionId: string;
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  status: 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED';
  completedLegs: number;
  failedLegs: number;
  actualRaOut: number;
  totalFeeRa: number;
  totalFeeUsd: number;
  legs: WalletConvertExecutionLegPayload[];
  completedAt: string;
}

export interface AdminPortfolioEligibilityTokenPayload {
  ticker: string;
  name: string;
  isActive: boolean;
  mint: string | null;
  hasMint: boolean;
  isRaMint: boolean;
  walletAmount: number;
  visibleInPortfolio: boolean;
  reasons: string[];
}

export interface AdminPortfolioEligibilityUnknownMintPayload {
  mint: string;
  walletAmount: number;
}

export interface AdminPortfolioEligibilityPayload {
  walletAddress: string;
  network: 'devnet' | 'mainnet';
  ra: {
    mint: string;
    walletAmount: number;
    visibleInPortfolio: true;
  };
  summary: {
    activeTokens: number;
    configuredMints: number;
    eligibleVisibleTokens: number;
    configuredTokensWithBalance: number;
  };
  tokens: AdminPortfolioEligibilityTokenPayload[];
  unknownWalletMints: AdminPortfolioEligibilityUnknownMintPayload[];
}
