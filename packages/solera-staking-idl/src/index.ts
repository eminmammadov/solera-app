export interface StakingProgramEnvKey {
  readonly network: "devnet" | "mainnet";
  readonly programName: "stake-pool" | "swap-node";
  readonly envKey: string;
}

export const STAKING_PROGRAM_ID_ENV_KEYS: StakingProgramEnvKey[] = [
  {
    network: "devnet",
    programName: "stake-pool",
    envKey: "STAKING_STAKE_POOL_PROGRAM_ID_DEVNET",
  },
  {
    network: "devnet",
    programName: "swap-node",
    envKey: "STAKING_SWAP_NODE_PROGRAM_ID_DEVNET",
  },
  {
    network: "mainnet",
    programName: "stake-pool",
    envKey: "STAKING_STAKE_POOL_PROGRAM_ID_MAINNET",
  },
  {
    network: "mainnet",
    programName: "swap-node",
    envKey: "STAKING_SWAP_NODE_PROGRAM_ID_MAINNET",
  },
];

export const STAKING_PLACEHOLDER_PROGRAM_ID =
  "11111111111111111111111111111111";
