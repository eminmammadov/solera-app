export const STAKING_GLOBAL_CONFIG_SEED = 'global-config';
export const STAKING_TOKEN_CONFIG_SEED = 'token-config';
export const STAKING_POSITION_SEED = 'stake-position';
export const STAKING_FUNDING_BATCH_SEED = 'funding-batch';
export const STAKING_SWAP_NODE_INPUT_VAULT_SEED = 'input-vault';
export const STAKING_SWAP_NODE_CONFIG_SEED = 'swap-node-config';

export const DEVNET_NETWORK = 'devnet' as const;
export const MAINNET_NETWORK = 'mainnet' as const;

export const STAKING_PROGRAM_ENV = {
  devnet: {
    stakePoolProgramId: 'STAKING_STAKE_POOL_PROGRAM_ID_DEVNET',
    swapNodeProgramId: 'STAKING_SWAP_NODE_PROGRAM_ID_DEVNET',
    rewardVault: 'STAKING_RA_REWARD_VAULT_DEVNET',
  },
  mainnet: {
    stakePoolProgramId: 'STAKING_STAKE_POOL_PROGRAM_ID_MAINNET',
    swapNodeProgramId: 'STAKING_SWAP_NODE_PROGRAM_ID_MAINNET',
    rewardVault: 'STAKING_RA_REWARD_VAULT_MAINNET',
  },
} as const;
