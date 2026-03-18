#![allow(deprecated)]

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("Fc724ry7NhsVVQqRtpQKLWBNCStX4whjFqcvoLXkqf6N");

const SWAP_NODE_CONFIG_SEED: &[u8] = b"swap-node-config";
const INPUT_VAULT_SEED: &[u8] = b"input-vault";
const FUNDING_BATCH_SEED: &[u8] = b"funding-batch";
const RA_MICRO_DECIMALS: u8 = 6;

#[program]
pub mod swap_node {
    use super::*;

    pub fn initialize_swap_node(
        ctx: Context<InitializeSwapNode>,
        args: InitializeSwapNodeArgs,
    ) -> Result<()> {
        let config = &mut ctx.accounts.swap_node_config;
        config.version = 1;
        config.bump = ctx.bumps.swap_node_config;
        config.paused = false;
        config.operator_authority = args.operator_authority;
        config.multisig_authority = args.multisig_authority;
        config.stake_pool_program = args.stake_pool_program;
        config.ra_mint = args.ra_mint;
        config.stake_reward_vault = args.stake_reward_vault;
        config.reserved = [0; 32];
        Ok(())
    }

    pub fn update_swap_node_config(
        ctx: Context<UpdateSwapNodeConfig>,
        args: UpdateSwapNodeConfigArgs,
    ) -> Result<()> {
        let config = &mut ctx.accounts.swap_node_config;
        require!(
            config.can_write(ctx.accounts.authority.key()),
            SwapNodeError::UnauthorizedAuthority
        );

        config.stake_pool_program = args.stake_pool_program;
        config.ra_mint = args.ra_mint;
        config.stake_reward_vault = args.stake_reward_vault;
        Ok(())
    }

    pub fn ensure_input_vault(_ctx: Context<EnsureInputVault>) -> Result<()> {
        Ok(())
    }

    pub fn approve_funding_batch(
        ctx: Context<ApproveFundingBatch>,
        args: ApproveFundingBatchArgs,
    ) -> Result<()> {
        let config = &ctx.accounts.swap_node_config;
        require!(
            config.can_write(ctx.accounts.authority.key()),
            SwapNodeError::UnauthorizedAuthority
        );
        require!(!config.paused, SwapNodeError::ProgramPaused);
        require!(
            args.approved_input_amount_raw >= args.planned_reward_amount_raw,
            SwapNodeError::InvalidFundingAmount
        );

        let batch = &mut ctx.accounts.funding_batch;
        batch.version = 1;
        batch.bump = ctx.bumps.funding_batch;
        batch.status = FundingBatchStatus::Approved;
        batch.input_mint = ctx.accounts.input_mint.key();
        batch.reward_vault = config.stake_reward_vault;
        batch.operator_authority = ctx.accounts.authority.key();
        batch.batch_seed = args.batch_seed;
        batch.approved_input_amount_raw = args.approved_input_amount_raw;
        batch.planned_reward_amount_raw = args.planned_reward_amount_raw;
        batch.funded_reward_amount_raw = 0;
        batch.created_at = Clock::get()?.unix_timestamp;
        batch.executed_at = 0;
        batch.cancelled_at = 0;
        batch.reserved = [0; 32];
        Ok(())
    }

    pub fn execute_funding_batch(
        ctx: Context<ExecuteFundingBatch>,
        args: ExecuteFundingBatchArgs,
    ) -> Result<()> {
        let config = &ctx.accounts.swap_node_config;
        let batch = &mut ctx.accounts.funding_batch;

        require!(
            config.can_write(ctx.accounts.authority.key()),
            SwapNodeError::UnauthorizedAuthority
        );
        require!(!config.paused, SwapNodeError::ProgramPaused);
        require!(
            batch.status == FundingBatchStatus::Approved,
            SwapNodeError::FundingBatchNotReady
        );
        require_keys_eq!(
            batch.input_mint,
            ctx.accounts.input_mint.key(),
            SwapNodeError::InvalidInputMint
        );
        require_keys_eq!(
            config.ra_mint,
            ctx.accounts.input_mint.key(),
            SwapNodeError::InvalidInputMint
        );
        require_keys_eq!(
            batch.reward_vault,
            ctx.accounts.reward_vault.key(),
            SwapNodeError::InvalidRewardVault
        );
        require_keys_eq!(
            config.stake_reward_vault,
            ctx.accounts.reward_vault.key(),
            SwapNodeError::InvalidRewardVault
        );
        require!(
            ctx.accounts.funding_source_ata.owner == ctx.accounts.authority.key(),
            SwapNodeError::InvalidFundingSourceAccount
        );
        require!(
            ctx.accounts.funding_source_ata.mint == ctx.accounts.input_mint.key(),
            SwapNodeError::InvalidFundingSourceAccount
        );
        require!(
            ctx.accounts.reward_vault.owner == ctx.accounts.reward_vault_authority.key(),
            SwapNodeError::InvalidRewardVault
        );
        require!(
            ctx.accounts.reward_vault.mint == config.ra_mint,
            SwapNodeError::InvalidRewardVault
        );
        require!(
            ctx.accounts.input_mint.decimals == RA_MICRO_DECIMALS,
            SwapNodeError::InvalidRaMintDecimals
        );
        require!(
            args.funded_reward_amount_raw > 0
                && args.funded_reward_amount_raw <= batch.approved_input_amount_raw,
            SwapNodeError::InvalidFundingAmount
        );

        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.funding_source_ata.to_account_info(),
                    mint: ctx.accounts.input_mint.to_account_info(),
                    to: ctx.accounts.reward_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            args.funded_reward_amount_raw,
            ctx.accounts.input_mint.decimals,
        )?;

        batch.status = FundingBatchStatus::Executed;
        batch.funded_reward_amount_raw = args.funded_reward_amount_raw;
        batch.executed_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn cancel_funding_batch(ctx: Context<CancelFundingBatch>) -> Result<()> {
        let config = &ctx.accounts.swap_node_config;
        let batch = &mut ctx.accounts.funding_batch;
        require!(
            config.can_write(ctx.accounts.authority.key()),
            SwapNodeError::UnauthorizedAuthority
        );
        require!(
            batch.status == FundingBatchStatus::Approved,
            SwapNodeError::FundingBatchNotReady
        );

        batch.status = FundingBatchStatus::Cancelled;
        batch.cancelled_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeSwapNode<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + SwapNodeConfig::LEN,
        seeds = [SWAP_NODE_CONFIG_SEED],
        bump
    )]
    pub swap_node_config: Account<'info, SwapNodeConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSwapNodeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [SWAP_NODE_CONFIG_SEED],
        bump = swap_node_config.bump
    )]
    pub swap_node_config: Account<'info, SwapNodeConfig>,
}

#[derive(Accounts)]
pub struct EnsureInputVault<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [SWAP_NODE_CONFIG_SEED],
        bump = swap_node_config.bump
    )]
    pub swap_node_config: Account<'info, SwapNodeConfig>,
    pub input_mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [INPUT_VAULT_SEED, input_mint.key().as_ref()],
        bump
    )]
    /// CHECK: Canonical PDA authority for this input vault.
    pub input_vault_authority: UncheckedAccount<'info>,
    #[account(
        constraint = input_vault.owner == input_vault_authority.key() @ SwapNodeError::InvalidInputVault,
        constraint = input_vault.mint == input_mint.key() @ SwapNodeError::InvalidInputVault
    )]
    pub input_vault: InterfaceAccount<'info, TokenAccount>,
}

#[derive(Accounts)]
#[instruction(args: ApproveFundingBatchArgs)]
pub struct ApproveFundingBatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [SWAP_NODE_CONFIG_SEED],
        bump = swap_node_config.bump
    )]
    pub swap_node_config: Account<'info, SwapNodeConfig>,
    pub input_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + FundingBatch::LEN,
        seeds = [FUNDING_BATCH_SEED, input_mint.key().as_ref(), args.batch_seed.as_ref()],
        bump
    )]
    pub funding_batch: Account<'info, FundingBatch>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteFundingBatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [SWAP_NODE_CONFIG_SEED],
        bump = swap_node_config.bump
    )]
    pub swap_node_config: Account<'info, SwapNodeConfig>,
    pub input_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [FUNDING_BATCH_SEED, input_mint.key().as_ref(), funding_batch.batch_seed.as_ref()],
        bump = funding_batch.bump
    )]
    pub funding_batch: Account<'info, FundingBatch>,
    #[account(mut)]
    pub funding_source_ata: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Reward vault authority is validated against the reward vault token account owner.
    pub reward_vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub reward_vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CancelFundingBatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [SWAP_NODE_CONFIG_SEED],
        bump = swap_node_config.bump
    )]
    pub swap_node_config: Account<'info, SwapNodeConfig>,
    pub input_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [FUNDING_BATCH_SEED, input_mint.key().as_ref(), funding_batch.batch_seed.as_ref()],
        bump = funding_batch.bump
    )]
    pub funding_batch: Account<'info, FundingBatch>,
}

#[account]
pub struct SwapNodeConfig {
    pub version: u8,
    pub bump: u8,
    pub paused: bool,
    pub operator_authority: Pubkey,
    pub multisig_authority: Pubkey,
    pub stake_pool_program: Pubkey,
    pub ra_mint: Pubkey,
    pub stake_reward_vault: Pubkey,
    pub reserved: [u8; 32],
}

impl SwapNodeConfig {
    pub const LEN: usize = 195;

    pub fn can_write(&self, authority: Pubkey) -> bool {
        authority == self.operator_authority || authority == self.multisig_authority
    }
}

#[account]
pub struct FundingBatch {
    pub version: u8,
    pub bump: u8,
    pub status: FundingBatchStatus,
    pub reserved0: u8,
    pub input_mint: Pubkey,
    pub reward_vault: Pubkey,
    pub operator_authority: Pubkey,
    pub batch_seed: [u8; 16],
    pub approved_input_amount_raw: u64,
    pub planned_reward_amount_raw: u64,
    pub funded_reward_amount_raw: u64,
    pub created_at: i64,
    pub executed_at: i64,
    pub cancelled_at: i64,
    pub reserved: [u8; 32],
}

impl FundingBatch {
    pub const LEN: usize = 196;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum FundingBatchStatus {
    Approved,
    Executed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeSwapNodeArgs {
    pub operator_authority: Pubkey,
    pub multisig_authority: Pubkey,
    pub stake_pool_program: Pubkey,
    pub ra_mint: Pubkey,
    pub stake_reward_vault: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateSwapNodeConfigArgs {
    pub stake_pool_program: Pubkey,
    pub ra_mint: Pubkey,
    pub stake_reward_vault: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ApproveFundingBatchArgs {
    pub batch_seed: [u8; 16],
    pub approved_input_amount_raw: u64,
    pub planned_reward_amount_raw: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecuteFundingBatchArgs {
    pub funded_reward_amount_raw: u64,
}

#[error_code]
pub enum SwapNodeError {
    #[msg("Authority is not allowed to manage this swap-node runtime.")]
    UnauthorizedAuthority,
    #[msg("Swap-node funding is paused.")]
    ProgramPaused,
    #[msg("Input vault token account is invalid.")]
    InvalidInputVault,
    #[msg("Input mint is invalid for the current funding batch.")]
    InvalidInputMint,
    #[msg("Reward vault does not match the swap-node config.")]
    InvalidRewardVault,
    #[msg("Funding source token account is invalid.")]
    InvalidFundingSourceAccount,
    #[msg("Funding batch is not ready for this operation.")]
    FundingBatchNotReady,
    #[msg("Funding amount is invalid for this batch.")]
    InvalidFundingAmount,
    #[msg("RA mint decimals are incompatible with the current funding model.")]
    InvalidRaMintDecimals,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_pubkey(byte: u8) -> Pubkey {
        Pubkey::new_from_array([byte; 32])
    }

    #[test]
    fn swap_node_config_allows_operator_writes() {
        let operator = test_pubkey(1);
        let config = SwapNodeConfig {
            version: 1,
            bump: 255,
            paused: false,
            operator_authority: operator,
            multisig_authority: test_pubkey(2),
            stake_pool_program: test_pubkey(3),
            ra_mint: test_pubkey(4),
            stake_reward_vault: test_pubkey(5),
            reserved: [0; 32],
        };

        assert!(config.can_write(operator));
    }

    #[test]
    fn swap_node_config_allows_multisig_writes() {
        let multisig = test_pubkey(2);
        let config = SwapNodeConfig {
            version: 1,
            bump: 255,
            paused: false,
            operator_authority: test_pubkey(1),
            multisig_authority: multisig,
            stake_pool_program: test_pubkey(3),
            ra_mint: test_pubkey(4),
            stake_reward_vault: test_pubkey(5),
            reserved: [0; 32],
        };

        assert!(config.can_write(multisig));
        assert!(!config.can_write(test_pubkey(9)));
    }

    #[test]
    fn funding_batch_length_constant_is_large_enough() {
        assert!(FundingBatch::LEN >= 196);
    }
}
