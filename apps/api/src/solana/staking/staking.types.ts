export type RuntimeNetwork = 'devnet' | 'mainnet';

export interface StakingProgramRegistryEntry {
  network: RuntimeNetwork;
  stakePoolProgramId: string | null;
  swapNodeProgramId: string | null;
  rewardVaultAddress: string | null;
  isReady: boolean;
}

export interface StakingMainnetHardeningSnapshot {
  network: 'mainnet';
  registryReady: boolean;
  configuredMultisigAuthority: string | null;
  requireMultisigAuthority: boolean;
  allowBootstrapActions: boolean;
  allowConfigUpdates: boolean;
  allowFundingBatch: boolean;
  readyForBootstrap: boolean;
  readyForConfigUpdates: boolean;
  readyForFundingBatch: boolean;
  warnings: string[];
}

export interface StakingMirrorHealthSnapshot {
  configured: boolean;
  available: boolean;
  driver: 'postgres';
  target: 'devnet';
  latencyMs: number | null;
  message: string;
}

export interface StakingMirrorSyncResult {
  network: RuntimeNetwork;
  target: 'devnet';
  writtenConfigs: number;
  runtimeWritten: boolean;
  message: string;
}

export interface TokenStakeConfigProjection {
  tokenId: string;
  ticker: string;
  tokenName: string;
  network: RuntimeNetwork;
  sourceNetwork: 'global' | RuntimeNetwork;
  mintAddress: string | null;
  enabled: boolean;
  minStakeUsd: number;
  maxStakeUsd: number;
  apr7dBps: number;
  apr1mBps: number;
  apr3mBps: number;
  apr6mBps: number;
  apr12mBps: number;
  requiredSeeds: {
    globalConfig: string;
    tokenConfig: string;
  };
  syncStatus: 'ready' | 'missing_mint' | 'program_not_configured';
}

export interface AdminStakingRuntimeSnapshot {
  activeNetwork: RuntimeNetwork;
  programs: StakingProgramRegistryEntry;
  mirror: StakingMirrorHealthSnapshot;
  mainnetHardening: StakingMainnetHardeningSnapshot;
  availableTokenConfigs: number;
  globalConfigPda: string | null;
  globalConfigInitialized: boolean;
  swapNodeConfigPda: string | null;
  swapNodeInitialized: boolean;
  fundingOverview: StakingFundingOverview;
  cutoverPolicy: StakingCutoverPolicySnapshot;
  migrationSnapshot: StakingMigrationSnapshotSummary;
}

export interface StakingCutoverPolicySnapshot {
  migrationWindowActive: boolean;
  freezeLegacyStakeWrites: boolean;
  freezeLegacyClaimWrites: boolean;
  reason: string | null;
}

export interface LegacyStakeMigrationManifest {
  network: RuntimeNetwork;
  generatedAt: string;
  positionCount: number;
  activeCount: number;
  maturedClaimableCount: number;
  checksumSha256: string;
}

export interface LegacyStakeMigrationPreviewPosition {
  legacyStakeId: string;
  walletAddress: string;
  tokenTicker: string;
  amount: number;
  rewardEstimate: number;
  unlockAt: string;
  maturedAtExport: boolean;
  sourceMode: string | null;
  executionSignature: string | null;
}

export interface StakingMigrationSnapshotSummary {
  network: RuntimeNetwork;
  manifest: LegacyStakeMigrationManifest;
  previewPositions: LegacyStakeMigrationPreviewPosition[];
  omittedPositions: number;
  hasLegacyPositions: boolean;
}

export interface StakingDerivedAddresses {
  globalConfigPda: string;
  tokenConfigPda: string;
}

export interface StakingInstructionAccountMeta {
  name: string;
  address: string | null;
  isSigner: boolean;
  isWritable: boolean;
}

export interface PreparedAnchorInstructionPayload {
  programId: string;
  instructionName: string;
  discriminatorHex: string;
  dataBase64: string;
  accounts: StakingInstructionAccountMeta[];
}

export interface StakePositionDerivedAddresses extends StakingDerivedAddresses {
  userStakePositionPda: string;
  userInputAta: string;
  swapNodeVaultPda: string;
  swapNodeVaultAta: string;
  rewardVaultAddress: string;
}

export interface TokenStakeSyncPreparation {
  network: RuntimeNetwork;
  action: 'UPSERT_TOKEN_STAKE_CONFIG';
  token: TokenStakeConfigProjection;
  programs: StakingProgramRegistryEntry;
  derivedAddresses: StakingDerivedAddresses | null;
  instructionPayload: PreparedAnchorInstructionPayload | null;
  requiresOperatorSignature: boolean;
  requiresMultisigApproval: boolean;
  mirrorSyncRecommended: boolean;
  preparedAt: string;
}

export interface StakingFundingOverview {
  rewardVaultBalanceRa: number;
  activePositions: number;
  claimablePositions: number;
  totalOpenLiabilityRa: number;
  claimableLiabilityRa: number;
  pendingFundingDeficitRa: number;
  coverageRatio: number | null;
  pendingBatches: number;
  executedBatches: number;
  cancelledBatches: number;
  lastBatchAt: string | null;
}

export interface FundingBatchProjection {
  batchId: string;
  runtimeNetwork: RuntimeNetwork;
  status: 'APPROVED' | 'EXECUTED' | 'CANCELLED';
  inputMintAddress: string;
  inputTicker: string | null;
  plannedRewardRa: number;
  fundedRewardRa: number;
  approvedInputAmountRaw: string;
  transactionSignature: string | null;
  explorerUrl: string | null;
  createdAt: string;
  executedAt: string | null;
  cancelledAt: string | null;
}

export interface PreparedAdminStakingExecution {
  network: RuntimeNetwork;
  action:
    | 'INITIALIZE_GLOBAL_CONFIG'
    | 'UPDATE_GLOBAL_CONFIG'
    | 'INITIALIZE_SWAP_NODE'
    | 'UPDATE_SWAP_NODE_CONFIG'
    | 'UPSERT_TOKEN_STAKE_CONFIG'
    | 'EXECUTE_FUNDING_BATCH';
  sessionId: string;
  walletAddress: string;
  instructionPayload: PreparedAnchorInstructionPayload;
  transactionBase64: string;
  messageHash: string;
  lastValidBlockHeight: number;
  expiresAt: string;
}

export interface AdminStakingExecutionPayload {
  sessionId: string;
  network: RuntimeNetwork;
  action:
    | 'INITIALIZE_GLOBAL_CONFIG'
    | 'UPDATE_GLOBAL_CONFIG'
    | 'INITIALIZE_SWAP_NODE'
    | 'UPDATE_SWAP_NODE_CONFIG'
    | 'UPSERT_TOKEN_STAKE_CONFIG'
    | 'EXECUTE_FUNDING_BATCH';
  signature: string;
  explorerUrl: string;
  confirmedAt: string;
  slot: number | null;
}
