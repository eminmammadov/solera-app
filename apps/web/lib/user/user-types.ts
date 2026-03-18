export interface WalletUserMetrics {
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

export interface WalletAccessStatus {
  walletAddress: string;
  role: "USER" | "ADMIN";
  allowed: boolean;
  isBlocked: boolean;
  message: string | null;
}

export interface WalletProfileStake {
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

export interface WalletProfileTransaction {
  id: string;
  type: string;
  amount: string;
  date: string;
  status: string;
}

export interface WalletProfileTokenBalance {
  id: string;
  ticker: string;
  name: string;
  amount: number;
  priceUsd: number;
  logoUrl: string;
  change24h: number;
}

export interface WalletUserProfileResponse {
  walletAddress: string;
  exists: boolean;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  availableBalance: number;
  stakedBalance: number;
  totalEarned: number;
  totalEarnedUsd: number;
  portfolioValue: number;
  portfolioChange: number;
  activeStakings: WalletProfileStake[];
  transactions: WalletProfileTransaction[];
  portfolio: WalletProfileTokenBalance[];
}

export type WalletActivityType =
  | "STAKE"
  | "CLAIM"
  | "DEPOSIT"
  | "WITHDRAW"
  | "CONVERT";

export type WalletActivityStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface WalletExplorerActivity {
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

export interface WalletExplorerFeedStats {
  totalTransactions: number;
  last24hTransactions: number;
  totalVolumeUsd: number;
  activeUsers: number;
  generatedAt: string;
}

export interface WalletExplorerFeedResponse {
  items: WalletExplorerActivity[];
  nextCursor: string | null;
  stats: WalletExplorerFeedStats;
}

export interface TrackStakePositionInput {
  walletAddress: string;
  tokenTicker: string;
  tokenName?: string;
  amount: number;
  amountUsd: number;
  periodLabel: string;
  periodDays: number;
  apy: number;
  rewardEstimate: number;
  prepareSessionId: string;
  signedTransactionBase64: string;
  executionSignature: string;
  executionExplorerUrl?: string;
}

export interface TrackStakePositionResult {
  id: string;
}

export interface WalletStakeInstructionAccount {
  name: string;
  address: string | null;
  isSigner: boolean;
  isWritable: boolean;
}

export interface WalletStakeInstruction {
  programId: string;
  instructionName: string;
  discriminatorHex: string;
  dataBase64: string;
  accounts: WalletStakeInstructionAccount[];
}

export interface WalletStakeQuoteResponse {
  sessionId: string;
  walletAddress: string;
  network: "devnet" | "mainnet";
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

export interface WalletStakePreparationResponse
  extends WalletStakeQuoteResponse {
  mode: "ONCHAIN_PREPARED";
  instruction: WalletStakeInstruction | null;
  transactionBase64: string | null;
  messageHash: string | null;
  lastValidBlockHeight: number | null;
}

export interface WalletStakeExecutionResponse {
  sessionId: string;
  walletAddress: string;
  network: "devnet" | "mainnet";
  mode: "ONCHAIN_EXECUTED";
  signature: string;
  explorerUrl: string;
  confirmedAt: string;
  slot: number | null;
}

export interface WalletClaimPreparationResponse {
  sessionId: string;
  stakePositionId: string;
  walletAddress: string;
  network: "devnet" | "mainnet";
  grossRewardRa: number;
  claimFeeRa: number;
  netRewardRa: number;
  requiresWalletSignature: boolean;
  transactionBase64: string | null;
  messageHash: string | null;
  lastValidBlockHeight: number | null;
  expiresAt: string;
}

export interface WalletClaimExecutionResponse {
  sessionId: string;
  stakePositionId: string;
  walletAddress: string;
  network: "devnet" | "mainnet";
  mode: "ONCHAIN_EXECUTED";
  signature: string;
  explorerUrl: string;
  confirmedAt: string;
  slot: number | null;
}

export interface TrackWalletActivityInput {
  walletAddress: string;
  type: "DEPOSIT" | "WITHDRAW" | "CONVERT";
  tokenTicker: string;
  tokenName?: string;
  amount: number;
  amountUsd?: number;
  status?: WalletActivityStatus;
}

export interface StartSessionResult {
  sessionId: string;
  sessionKey: string | null;
}

export interface HeartbeatResult {
  sessionId: string;
  replacedSession: boolean;
}

export interface WalletConvertPreparationLeg {
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

export interface WalletConvertPreviewToken {
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

export interface WalletConvertPreviewResponse {
  walletAddress: string;
  network: "devnet" | "mainnet";
  maxTokensPerSession: number;
  hiddenTokenCount: number;
  unavailableCount: number;
  note: string | null;
  availableSolBalance: number;
  estimatedNetworkFeeSol: number;
  canExecute: boolean;
  feeWarning: string | null;
  tokens: WalletConvertPreviewToken[];
}

export interface WalletConvertPreparationResponse {
  sessionId: string;
  walletAddress: string;
  network: "devnet" | "mainnet";
  expiresAt: string;
  totalInputUsd: number;
  totalQuotedRaOut: number;
  totalFeeRa: number;
  totalFeeUsd: number;
  legs: WalletConvertPreparationLeg[];
}

export interface WalletConvertExecutionLeg {
  legId: string;
  ticker: string;
  status: "COMPLETED" | "FAILED";
  signature: string | null;
  signatures: string[];
  actualRaOut: number;
  feeRa: number;
  errorMessage: string | null;
}

export interface WalletConvertExecutionResponse {
  sessionId: string;
  walletAddress: string;
  network: "devnet" | "mainnet";
  status: "COMPLETED" | "PARTIAL_SUCCESS" | "FAILED";
  completedLegs: number;
  failedLegs: number;
  actualRaOut: number;
  totalFeeRa: number;
  totalFeeUsd: number;
  legs: WalletConvertExecutionLeg[];
  completedAt: string;
}

export type SessionErrorType = "unauthorized" | "forbidden" | "network";

export interface SessionApiError {
  type: SessionErrorType;
  status: number | null;
  message: string | null;
}

export interface SessionApiResult<TData> {
  success: boolean;
  data: TData | null;
  error: SessionApiError | null;
}
