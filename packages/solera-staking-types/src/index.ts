export type RuntimeNetwork = "devnet" | "mainnet";

export type StakeDuration = "7D" | "1M" | "3M" | "6M" | "12M";

export type StakePositionStatus =
  | "ACTIVE"
  | "CLAIMABLE"
  | "CLAIMED"
  | "CANCELLED"
  | "MIGRATED_CLAIMABLE";

export interface StakeQuoteSnapshot {
  network: RuntimeNetwork;
  inputMint: string;
  inputAmountAtomic: string;
  duration: StakeDuration;
  principalRaAtomic: string;
  rewardRaAtomic: string;
  finalRaPayoutAtomic: string;
  expiresAt: string;
  configVersion: string;
}

export interface TokenStakeRuntimeConfig {
  network: RuntimeNetwork;
  inputMint: string;
  enabled: boolean;
  minStakeUsd: number;
  maxStakeUsd: number;
  apr7d: number;
  apr1m: number;
  apr3m: number;
  apr6m: number;
  apr12m: number;
}

export interface DeployedProgramRegistry {
  network: RuntimeNetwork;
  stakePoolProgramId: string;
  swapNodeProgramId: string;
  rewardMint: string;
  rewardVault: string;
}
