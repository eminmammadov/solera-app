#![allow(deprecated)]

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("HP67PeCaUW7Jtr33t43TJq5G2E2AuAztBmJj4hTg9LUc");

const GLOBAL_CONFIG_SEED: &[u8] = b"global-config";
const TOKEN_CONFIG_SEED: &[u8] = b"token-config";
const POSITION_SEED: &[u8] = b"stake-position";
const APR_COUNT: usize = 5;
const RA_MICRO_DECIMALS: u8 = 6;

#[program]
pub mod stake_pool {
    use super::*;

    pub fn initialize_global_config(
        ctx: Context<InitializeGlobalConfig>,
        args: InitializeGlobalConfigArgs,
    ) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;
        global_config.version = 1;
        global_config.bump = ctx.bumps.global_config;
        global_config.paused = false;
        global_config.active_network = args.active_network;
        global_config.operator_authority = args.operator_authority;
        global_config.multisig_authority = args.multisig_authority;
        global_config.reward_vault = args.reward_vault;
        global_config.ra_mint = args.ra_mint;
        global_config.swap_node_program = args.swap_node_program;
        global_config.reserved = [0; 32];
        Ok(())
    }

    pub fn update_global_config(
        ctx: Context<UpdateGlobalConfig>,
        args: UpdateGlobalConfigArgs,
    ) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;
        require!(
            global_config.can_write(ctx.accounts.authority.key()),
            StakePoolError::UnauthorizedAuthority
        );

        global_config.active_network = args.active_network;
        global_config.reward_vault = args.reward_vault;
        global_config.ra_mint = args.ra_mint;
        global_config.swap_node_program = args.swap_node_program;
        Ok(())
    }

    pub fn upsert_token_stake_config(
        ctx: Context<UpsertTokenStakeConfig>,
        args: UpsertTokenStakeConfigArgs,
    ) -> Result<()> {
        let global_config = &ctx.accounts.global_config;
        require!(
            global_config.can_write(ctx.accounts.authority.key()),
            StakePoolError::UnauthorizedAuthority
        );

        let token_config = &mut ctx.accounts.token_config;
        token_config.version = 1;
        token_config.bump = ctx.bumps.token_config;
        token_config.enabled = args.enabled;
        token_config.reserved0 = 0;
        token_config.global_config = global_config.key();
        token_config.token_mint = ctx.accounts.token_mint.key();
        token_config.min_stake_usd_micros = args.min_stake_usd_micros;
        token_config.max_stake_usd_micros = args.max_stake_usd_micros;
        token_config.apr_bps = args.apr_bps;
        token_config.config_version = args.config_version;
        token_config.updated_at = Clock::get()?.unix_timestamp;
        token_config.reserved = [0; 32];
        Ok(())
    }

    pub fn create_stake_position(
        ctx: Context<CreateStakePosition>,
        args: CreateStakePositionArgs,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let global_config = &ctx.accounts.global_config;
        let token_config = &ctx.accounts.token_config;

        require!(!global_config.paused, StakePoolError::ProgramPaused);
        require!(token_config.enabled, StakePoolError::TokenDisabled);
        require_keys_eq!(
            token_config.global_config,
            global_config.key(),
            StakePoolError::InvalidGlobalConfig
        );
        require_keys_eq!(
            token_config.token_mint,
            ctx.accounts.input_mint.key(),
            StakePoolError::InvalidInputMint
        );
        require_keys_eq!(
            global_config.reward_vault,
            ctx.accounts.reward_vault.key(),
            StakePoolError::InvalidRewardVault
        );
        require_keys_eq!(
            global_config.swap_node_program,
            ctx.accounts.swap_node_program.key(),
            StakePoolError::InvalidSwapNodeProgram
        );
        require!(
            ctx.accounts.user_input_ata.owner == ctx.accounts.owner.key(),
            StakePoolError::InvalidUserInputAccount
        );
        require!(
            ctx.accounts.user_input_ata.mint == ctx.accounts.input_mint.key(),
            StakePoolError::InvalidUserInputAccount
        );
        require!(
            ctx.accounts.swap_node_vault.owner == ctx.accounts.swap_node_vault_authority.key(),
            StakePoolError::InvalidSwapNodeVault
        );
        require!(
            ctx.accounts.swap_node_vault.mint == ctx.accounts.input_mint.key(),
            StakePoolError::InvalidSwapNodeVault
        );
        require!(
            ctx.accounts.reward_vault.owner == global_config.key(),
            StakePoolError::InvalidRewardVault
        );
        require!(
            ctx.accounts.reward_vault.mint == global_config.ra_mint,
            StakePoolError::InvalidRewardVault
        );
        require!(
            args.amount_usd_micros >= token_config.min_stake_usd_micros,
            StakePoolError::BelowMinimumStake
        );
        require!(
            args.amount_usd_micros <= token_config.max_stake_usd_micros,
            StakePoolError::AboveMaximumStake
        );

        let expected_apr = token_config.apr_bps_for_period(args.period_days)?;
        require!(
            args.apr_bps == expected_apr,
            StakePoolError::InvalidAprSnapshot
        );

        let expected_final = args
            .principal_ra_micros
            .checked_add(args.reward_ra_micros)
            .ok_or(StakePoolError::MathOverflow)?;
        require!(
            expected_final == args.final_ra_payout_micros,
            StakePoolError::InvalidPayoutSnapshot
        );
        require!(args.unlock_at > now, StakePoolError::InvalidUnlockAt);

        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.user_input_ata.to_account_info(),
                    mint: ctx.accounts.input_mint.to_account_info(),
                    to: ctx.accounts.swap_node_vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            args.input_amount_raw,
            args.input_token_decimals,
        )?;

        let stake_position = &mut ctx.accounts.user_stake_position;
        stake_position.version = 1;
        stake_position.bump = ctx.bumps.user_stake_position;
        stake_position.status = StakePositionStatus::Active;
        stake_position.period_days = args.period_days;
        stake_position.apr_bps = args.apr_bps;
        stake_position.owner = ctx.accounts.owner.key();
        stake_position.global_config = global_config.key();
        stake_position.token_config = token_config.key();
        stake_position.input_mint = ctx.accounts.input_mint.key();
        stake_position.session_seed = args.session_seed;
        stake_position.input_amount_raw = args.input_amount_raw;
        stake_position.input_token_decimals = args.input_token_decimals;
        stake_position.amount_ui_micros = args.amount_ui_micros;
        stake_position.amount_usd_micros = args.amount_usd_micros;
        stake_position.principal_ra_micros = args.principal_ra_micros;
        stake_position.reward_ra_micros = args.reward_ra_micros;
        stake_position.final_ra_payout_micros = args.final_ra_payout_micros;
        stake_position.started_at = now;
        stake_position.unlock_at = args.unlock_at;
        stake_position.claimed_at = 0;
        stake_position.reserved = [0; 32];
        Ok(())
    }

    pub fn claim_stake_position(
        ctx: Context<ClaimStakePosition>,
        args: ClaimStakePositionArgs,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let global_config = &ctx.accounts.global_config;
        let stake_position = &mut ctx.accounts.stake_position;

        require_keys_eq!(
            global_config.reward_vault,
            ctx.accounts.reward_vault.key(),
            StakePoolError::InvalidRewardVault
        );
        require_keys_eq!(
            global_config.ra_mint,
            ctx.accounts.ra_mint.key(),
            StakePoolError::InvalidRaMint
        );
        require!(
            ctx.accounts.reward_vault.owner == global_config.key(),
            StakePoolError::InvalidRewardVault
        );
        require!(
            ctx.accounts.reward_vault.mint == ctx.accounts.ra_mint.key(),
            StakePoolError::InvalidRewardVault
        );
        require!(
            ctx.accounts.user_reward_ata.owner == ctx.accounts.owner.key(),
            StakePoolError::InvalidUserRewardAccount
        );
        require!(
            ctx.accounts.user_reward_ata.mint == ctx.accounts.ra_mint.key(),
            StakePoolError::InvalidUserRewardAccount
        );
        require!(
            ctx.accounts.ra_mint.decimals == RA_MICRO_DECIMALS,
            StakePoolError::InvalidRaMintDecimals
        );
        require!(
            stake_position.status == StakePositionStatus::Active,
            StakePoolError::StakeAlreadyFinalized
        );
        require!(now >= stake_position.unlock_at, StakePoolError::StakeNotReady);
        require!(
            args.claim_fee_ra_micros
                .checked_add(args.net_payout_ra_micros)
                .ok_or(StakePoolError::MathOverflow)?
                == args.reward_gross_ra_micros,
            StakePoolError::InvalidClaimSettlement
        );
        require!(
            args.reward_gross_ra_micros == stake_position.final_ra_payout_micros,
            StakePoolError::InvalidClaimSettlement
        );

        let signer_seeds: &[&[u8]] = &[
            GLOBAL_CONFIG_SEED,
            &[global_config.bump],
        ];
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.reward_vault.to_account_info(),
                    mint: ctx.accounts.ra_mint.to_account_info(),
                    to: ctx.accounts.user_reward_ata.to_account_info(),
                    authority: ctx.accounts.global_config.to_account_info(),
                },
                &[signer_seeds],
            ),
            args.net_payout_ra_micros,
            ctx.accounts.ra_mint.decimals,
        )?;

        stake_position.status = StakePositionStatus::Claimed;
        stake_position.claimed_at = now;
        Ok(())
    }

    pub fn migrate_legacy_position(_ctx: Context<MigrateLegacyPosition>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGlobalConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalConfig::LEN,
        seeds = [GLOBAL_CONFIG_SEED],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGlobalConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
pub struct UpsertTokenStakeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    /// CHECK: Token mint identity is snapshotted and used as PDA seed.
    pub token_mint: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + TokenStakeConfig::LEN,
        seeds = [TOKEN_CONFIG_SEED, token_mint.key().as_ref()],
        bump
    )]
    pub token_config: Account<'info, TokenStakeConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: CreateStakePositionArgs)]
pub struct CreateStakePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Box<Account<'info, GlobalConfig>>,
    #[account(
        seeds = [TOKEN_CONFIG_SEED, input_mint.key().as_ref()],
        bump = token_config.bump
    )]
    pub token_config: Box<Account<'info, TokenStakeConfig>>,
    #[account(
        init,
        payer = owner,
        space = 8 + StakePosition::LEN,
        seeds = [POSITION_SEED, owner.key().as_ref(), args.session_seed.as_ref()],
        bump
    )]
    pub user_stake_position: Box<Account<'info, StakePosition>>,
    pub input_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub user_input_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: swap-node vault authority PDA for the deposited input token account.
    pub swap_node_vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub swap_node_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Swap-node program identity is validated against global config.
    pub swap_node_program: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimStakePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Box<Account<'info, GlobalConfig>>,
    #[account(
        mut,
        seeds = [POSITION_SEED, owner.key().as_ref(), stake_position.session_seed.as_ref()],
        bump = stake_position.bump,
        constraint = stake_position.owner == owner.key() @ StakePoolError::UnauthorizedOwner,
        constraint = stake_position.global_config == global_config.key() @ StakePoolError::InvalidGlobalConfig
    )]
    pub stake_position: Box<Account<'info, StakePosition>>,
    #[account(mut)]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub user_reward_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub ra_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MigrateLegacyPosition<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalConfig {
    pub version: u8,
    pub bump: u8,
    pub paused: bool,
    pub active_network: u8,
    pub operator_authority: Pubkey,
    pub multisig_authority: Pubkey,
    pub reward_vault: Pubkey,
    pub ra_mint: Pubkey,
    pub swap_node_program: Pubkey,
    pub reserved: [u8; 32],
}

impl GlobalConfig {
    pub const LEN: usize = 196;

    pub fn can_write(&self, authority: Pubkey) -> bool {
        authority == self.operator_authority || authority == self.multisig_authority
    }
}

#[account]
pub struct TokenStakeConfig {
    pub version: u8,
    pub bump: u8,
    pub enabled: bool,
    pub reserved0: u8,
    pub global_config: Pubkey,
    pub token_mint: Pubkey,
    pub min_stake_usd_micros: u64,
    pub max_stake_usd_micros: u64,
    pub apr_bps: [u16; APR_COUNT],
    pub config_version: u32,
    pub updated_at: i64,
    pub reserved: [u8; 32],
}

impl TokenStakeConfig {
    pub const LEN: usize = 138;

    pub fn apr_bps_for_period(&self, period_days: u16) -> Result<u16> {
        let index = match period_days {
            7 => 0,
            30 => 1,
            90 => 2,
            180 => 3,
            365 => 4,
            _ => return err!(StakePoolError::UnsupportedPeriod),
        };
        Ok(self.apr_bps[index])
    }
}

#[account]
pub struct StakePosition {
    pub version: u8,
    pub bump: u8,
    pub status: StakePositionStatus,
    pub input_token_decimals: u8,
    pub period_days: u16,
    pub apr_bps: u16,
    pub owner: Pubkey,
    pub global_config: Pubkey,
    pub token_config: Pubkey,
    pub input_mint: Pubkey,
    pub session_seed: [u8; 32],
    pub input_amount_raw: u64,
    pub amount_ui_micros: u64,
    pub amount_usd_micros: u64,
    pub principal_ra_micros: u64,
    pub reward_ra_micros: u64,
    pub final_ra_payout_micros: u64,
    pub started_at: i64,
    pub unlock_at: i64,
    pub claimed_at: i64,
    pub reserved: [u8; 32],
}

impl StakePosition {
    pub const LEN: usize = 272;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum StakePositionStatus {
    Active,
    Claimed,
    Cancelled,
    Migrated,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeGlobalConfigArgs {
    pub active_network: u8,
    pub operator_authority: Pubkey,
    pub multisig_authority: Pubkey,
    pub reward_vault: Pubkey,
    pub ra_mint: Pubkey,
    pub swap_node_program: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateGlobalConfigArgs {
    pub active_network: u8,
    pub reward_vault: Pubkey,
    pub ra_mint: Pubkey,
    pub swap_node_program: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpsertTokenStakeConfigArgs {
    pub enabled: bool,
    pub min_stake_usd_micros: u64,
    pub max_stake_usd_micros: u64,
    pub apr_bps: [u16; APR_COUNT],
    pub config_version: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateStakePositionArgs {
    pub session_seed: [u8; 32],
    pub input_amount_raw: u64,
    pub input_token_decimals: u8,
    pub amount_ui_micros: u64,
    pub amount_usd_micros: u64,
    pub principal_ra_micros: u64,
    pub reward_ra_micros: u64,
    pub final_ra_payout_micros: u64,
    pub apr_bps: u16,
    pub period_days: u16,
    pub unlock_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ClaimStakePositionArgs {
    pub reward_gross_ra_micros: u64,
    pub net_payout_ra_micros: u64,
    pub claim_fee_ra_micros: u64,
}

#[error_code]
pub enum StakePoolError {
    #[msg("Authority is not allowed to update this staking config.")]
    UnauthorizedAuthority,
    #[msg("Stake pool is paused.")]
    ProgramPaused,
    #[msg("Selected token is not enabled for staking.")]
    TokenDisabled,
    #[msg("Token config does not match the active global config.")]
    InvalidGlobalConfig,
    #[msg("Input mint does not match the token staking config.")]
    InvalidInputMint,
    #[msg("Reward vault does not match global config.")]
    InvalidRewardVault,
    #[msg("Swap-node program does not match global config.")]
    InvalidSwapNodeProgram,
    #[msg("Stake amount is below the configured minimum.")]
    BelowMinimumStake,
    #[msg("Stake amount is above the configured maximum.")]
    AboveMaximumStake,
    #[msg("APR snapshot does not match current token config.")]
    InvalidAprSnapshot,
    #[msg("Final payout snapshot is invalid.")]
    InvalidPayoutSnapshot,
    #[msg("Unlock timestamp is invalid.")]
    InvalidUnlockAt,
    #[msg("Arithmetic overflow.")]
    MathOverflow,
    #[msg("Unsupported staking period.")]
    UnsupportedPeriod,
    #[msg("Stake position owner does not match signer.")]
    UnauthorizedOwner,
    #[msg("Stake position is not ready to claim.")]
    StakeNotReady,
    #[msg("Stake position was already finalized.")]
    StakeAlreadyFinalized,
    #[msg("User input token account is invalid.")]
    InvalidUserInputAccount,
    #[msg("Swap-node vault token account is invalid.")]
    InvalidSwapNodeVault,
    #[msg("RA mint does not match global config.")]
    InvalidRaMint,
    #[msg("User reward token account is invalid.")]
    InvalidUserRewardAccount,
    #[msg("RA mint decimals are incompatible with the current payout model.")]
    InvalidRaMintDecimals,
    #[msg("Claim settlement values do not match the stored payout snapshot.")]
    InvalidClaimSettlement,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_pubkey(byte: u8) -> Pubkey {
        Pubkey::new_from_array([byte; 32])
    }

    #[test]
    fn global_config_allows_operator_writes() {
        let authority = test_pubkey(1);
        let config = GlobalConfig {
            version: 1,
            bump: 255,
            paused: false,
            active_network: 0,
            operator_authority: authority,
            multisig_authority: test_pubkey(2),
            reward_vault: test_pubkey(3),
            ra_mint: test_pubkey(4),
            swap_node_program: test_pubkey(5),
            reserved: [0; 32],
        };

        assert!(config.can_write(authority));
    }

    #[test]
    fn global_config_allows_multisig_writes() {
        let multisig = test_pubkey(9);
        let config = GlobalConfig {
            version: 1,
            bump: 255,
            paused: false,
            active_network: 0,
            operator_authority: test_pubkey(1),
            multisig_authority: multisig,
            reward_vault: test_pubkey(3),
            ra_mint: test_pubkey(4),
            swap_node_program: test_pubkey(5),
            reserved: [0; 32],
        };

        assert!(config.can_write(multisig));
        assert!(!config.can_write(test_pubkey(7)));
    }

    #[test]
    fn apr_snapshot_resolves_for_supported_periods() {
        let config = TokenStakeConfig {
            version: 1,
            bump: 255,
            enabled: true,
            reserved0: 0,
            global_config: test_pubkey(1),
            token_mint: test_pubkey(2),
            min_stake_usd_micros: 0,
            max_stake_usd_micros: 0,
            apr_bps: [12, 100, 420, 900, 1400],
            config_version: 1,
            updated_at: 0,
            reserved: [0; 32],
        };

        assert_eq!(config.apr_bps_for_period(7).unwrap(), 12);
        assert_eq!(config.apr_bps_for_period(30).unwrap(), 100);
        assert_eq!(config.apr_bps_for_period(90).unwrap(), 420);
        assert_eq!(config.apr_bps_for_period(180).unwrap(), 900);
        assert_eq!(config.apr_bps_for_period(365).unwrap(), 1400);
    }

    #[test]
    fn apr_snapshot_rejects_unknown_periods() {
        let config = TokenStakeConfig {
            version: 1,
            bump: 255,
            enabled: true,
            reserved0: 0,
            global_config: test_pubkey(1),
            token_mint: test_pubkey(2),
            min_stake_usd_micros: 0,
            max_stake_usd_micros: 0,
            apr_bps: [0; APR_COUNT],
            config_version: 1,
            updated_at: 0,
            reserved: [0; 32],
        };

        assert!(config.apr_bps_for_period(14).is_err());
    }
}
