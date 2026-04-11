#![allow(deprecated)]

//! GridTokenX Energy Token Program — Dual-Token Architecture
//!
//! Manages two tokens:
//! - **GRID**: Energy settlement token (1 GRID = 1 kWh P2P solar), inflationary
//! - **GRX**: AI credit token, fixed supply 100M, DEX-priced, deflationary (burn on AI redemption)
//!
//! Token flow: P2P Trade → GRID minted → GRID→GRX swap → GRX→USDC (DEX) → USDC burned for AI credits
//! One-way only: no GRX→GRID reverse path.

use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        self as token_interface, Burn as BurnInterface, Mint as MintInterface,
        MintTo as MintToInterface, TokenAccount as TokenAccountInterface, TokenInterface,
        TransferChecked as TransferCheckedInterface,
    },
};
use mpl_token_metadata::instructions::CreateV1CpiBuilder;
use mpl_token_metadata::types::{PrintSupply, TokenStandard};

pub mod error;
pub mod events;
pub mod state;

pub use error::EnergyTokenError;
pub use events::*;
pub use state::*;

// Import compute_fn! macro when localnet feature is enabled
#[cfg(feature = "localnet")]
use compute_debug::{compute_checkpoint, compute_fn};

// No-op versions for non-localnet builds
#[cfg(not(feature = "localnet"))]
macro_rules! compute_fn {
    ($name:expr => $block:block) => {
        $block
    };
}
#[cfg(not(feature = "localnet"))]
macro_rules! compute_checkpoint {
    ($name:expr) => {};
}

declare_id!("B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH");

pub const DECIMALS: u8 = 9;

/// GRX total supply at genesis — 100,000,000 tokens
pub const GRX_INITIAL_SUPPLY: u64 = 100_000_000 * 10u64.pow(DECIMALS as u32);

#[program]
pub mod energy_token {
    use super::*;

    // ── Initialization ─────────────────────────────────────────

    /// Step 1: Create GRID and GRX mints (authority = wallet)
    pub fn init_mints(_ctx: Context<InitMints>) -> Result<()> {
        msg!("Mints created with wallet authority");
        Ok(())
    }

    /// Step 2: Create TokenConfig + GRX vault, transfer mint authority, mint GRX
    pub fn init_vault_and_config(
        ctx: Context<InitVaultAndConfig>,
        registry_program_id: Pubkey,
        registry_authority: Pubkey,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let tc = &ctx.accounts.token_config;

        // Write TokenConfig data
        let config = TokenConfig {
            authority: ctx.accounts.authority.key(),
            registry_program: registry_program_id,
            registry_authority: registry_authority,
            grid_mint: ctx.accounts.grid_mint.key(),
            grx_mint: ctx.accounts.grx_mint.key(),
            grx_initial_supply: GRX_INITIAL_SUPPLY,
            grx_total_burned: 0,
            created_at: clock.unix_timestamp,
        };
        let data = borsh::to_vec(&config)?;
        tc.data.borrow_mut()[..data.len()].copy_from_slice(&data);

        // Mint GRX to vault (authority = wallet for Alpha)
        token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token_interface::MintTo {
                    mint: ctx.accounts.grx_mint.to_account_info(),
                    to: ctx.accounts.grx_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            GRX_INITIAL_SUPPLY,
        )?;

        Ok(())
    }

    /// Legacy: Initialize both GRID and GRX tokens in one instruction (may stack overflow)
    pub fn initialize_dual_token(
        ctx: Context<InitializeDualToken>,
        registry_program_id: Pubkey,
        registry_authority: Pubkey,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let tc = &ctx.accounts.token_config;
        let bump = ctx.bumps.token_config;

        // Write TokenConfig borsh-serialized data
        let config = TokenConfig {
            authority: ctx.accounts.authority.key(),
            registry_program: registry_program_id,
            registry_authority: registry_authority,
            grid_mint: ctx.accounts.grid_mint.key(),
            grx_mint: ctx.accounts.grx_mint.key(),
            grx_initial_supply: GRX_INITIAL_SUPPLY,
            grx_total_burned: 0,
            created_at: clock.unix_timestamp,
        };
        let data = borsh::to_vec(&config)?;
        tc.data.borrow_mut()[..data.len()].copy_from_slice(&data);

        // Mint GRX to vault
        let seeds = &[b"token_config".as_ref(), &[bump]];
        let signer = &[&seeds[..]];
        let cpi = token_interface::MintTo {
            mint: ctx.accounts.grx_mint.to_account_info(),
            to: ctx.accounts.grx_vault.to_account_info(),
            authority: tc.to_account_info(),
        };
        token_interface::mint_to(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer),
            GRX_INITIAL_SUPPLY,
        )?;

        Ok(())
    }

    /// Mint initial GRX supply to vault (called after initialize_dual_token)
    pub fn mint_grx_to_vault(ctx: Context<MintGrxToVault>) -> Result<()> {
        compute_fn!("mint_grx_to_vault" => {
            let seeds = &[b"token_config".as_ref(), &[ctx.bumps.token_config]];
            let signer = &[&seeds[..]];

            let cpi_accounts = token_interface::MintTo {
                mint: ctx.accounts.grx_mint.to_account_info(),
                to: ctx.accounts.grx_vault.to_account_info(),
                authority: ctx.accounts.token_config.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token_interface::mint_to(cpi_ctx, GRX_INITIAL_SUPPLY)?;
        });
        Ok(())
    }

    // ── Metadata ───────────────────────────────────────────────

    /// Add Metaplex metadata to the GRX mint
    pub fn create_grx_metadata(ctx: Context<CreateGrxMetadata>) -> Result<()> {
        compute_fn!("create_grx_metadata" => {
            let name = String::from("GridTokenX Energy Credit");
            let symbol = String::from("GRX");
            let uri = String::from("https://gridtokenx.com/metadata/grx.json");

            if ctx.accounts.metadata_program.executable {
                CreateV1CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info())
                    .metadata(&ctx.accounts.metadata.to_account_info())
                    .mint(&ctx.accounts.grx_mint.to_account_info(), true)
                    .authority(&ctx.accounts.authority.to_account_info())
                    .payer(&ctx.accounts.payer.to_account_info())
                    .update_authority(&ctx.accounts.authority.to_account_info(), true)
                    .system_program(&ctx.accounts.system_program.to_account_info())
                    .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
                    .spl_token_program(Some(&ctx.accounts.token_program.to_account_info()))
                    .name(name)
                    .symbol(symbol)
                    .uri(uri)
                    .seller_fee_basis_points(0)
                    .decimals(9)
                    .token_standard(TokenStandard::Fungible)
                    .print_supply(PrintSupply::Zero)
                    .invoke()?;
            }
        });
        Ok(())
    }

    // ── GRID: Energy Settlement Token ─────────────────────────

    /// Mint GRID tokens to a recipient
    /// Called by Registry program via CPI after P2P trade settlement
    /// 1 GRID = 1 kWh verified energy traded
    pub fn mint_grid(ctx: Context<MintGrid>, amount: u64, token_config_bump: u8) -> Result<()> {
        compute_fn!("mint_grid" => {
            let config = &ctx.accounts.token_config;

            // Only Registry program or admin authority can mint GRID
            let is_registry = ctx.accounts.authority.key() == config.registry_authority;
            require!(
                ctx.accounts.authority.key() == config.authority || is_registry,
                EnergyTokenError::UnauthorizedAuthority
            );
            drop(config);

            let now = Clock::get()?.unix_timestamp;

            let seeds = &[b"token_config".as_ref(), &[token_config_bump]];
            let signer_seeds = &[&seeds[..]];

            let cpi_accounts = MintToInterface {
                mint: ctx.accounts.grid_mint.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.token_config.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

            token_interface::mint_to(cpi_ctx, amount)?;

            emit!(GridTokensMinted {
                recipient: ctx.accounts.destination.key(),
                amount,
                timestamp: now,
            });
        });
        Ok(())
    }

    /// Transfer GRID tokens between verified platform users
    pub fn transfer_grid(ctx: Context<TransferGrid>, amount: u64) -> Result<()> {
        compute_fn!("transfer_grid" => {
            let cpi_accounts = TransferCheckedInterface {
                from: ctx.accounts.from_token_account.to_account_info(),
                mint: ctx.accounts.grid_mint.to_account_info(),
                to: ctx.accounts.to_token_account.to_account_info(),
                authority: ctx.accounts.from_authority.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            token_interface::transfer_checked(cpi_ctx, amount, DECIMALS)?;
        });
        Ok(())
    }

    // ── GRID → GRX: One-Way Conversion ────────────────────────

    /// Swap GRID to GRX (one-way, irreversible)
    ///
    /// Rate: 1 GRID = 1 GRX at default (oracle can adjust)
    /// GRID is burned, GRX is minted to recipient.
    ///
    /// **Auto-swap default:** In production, the Registry program calls this atomically
    /// during P2P settlement. Prosumers receive USDC, never holding GRX.
    ///
    /// **Optional: hold GRX** — prosumers can call this directly to receive GRX
    /// instead of the auto-swap path.
    pub fn swap_grid_to_grx(ctx: Context<SwapGridToGrx>, grid_amount: u64, token_config_bump: u8) -> Result<()> {
        compute_fn!("swap_grid_to_grx" => {
            let now = Clock::get()?.unix_timestamp;

            // Step 1: Burn GRID from user's account
            let cpi_burn = BurnInterface {
                mint: ctx.accounts.grid_mint.to_account_info(),
                from: ctx.accounts.grid_from.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            token_interface::burn(CpiContext::new(cpi_program.clone(), cpi_burn), grid_amount)?;

            // Step 2: Mint GRX to user (1:1 default rate)
            let grx_amount = grid_amount;

            let seeds = &[b"token_config".as_ref(), &[token_config_bump]];
            let signer_seeds = &[&seeds[..]];

            let cpi_mint = MintToInterface {
                mint: ctx.accounts.grx_mint.to_account_info(),
                to: ctx.accounts.grx_to.to_account_info(),
                authority: ctx.accounts.token_config.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_mint, signer_seeds);
            token_interface::mint_to(cpi_ctx, grx_amount)?;

            emit!(GridSwappedToGrx {
                user: ctx.accounts.user.key(),
                grid_burned: grid_amount,
                grx_minted: grx_amount,
                timestamp: now,
            });
        });
        Ok(())
    }

    // ── GRX: AI Credit Token ──────────────────────────────────

    /// Burn GRX tokens for AI credit redemption (deflationary)
    ///
    /// This is the core anti-velocity mechanism. GRX tokens are permanently
    /// destroyed, creating deflationary pressure proportional to AI credit demand.
    pub fn burn_grx(ctx: Context<BurnGrx>, amount: u64) -> Result<()> {
        compute_fn!("burn_grx" => {
            let cpi_accounts = BurnInterface {
                mint: ctx.accounts.grx_mint.to_account_info(),
                from: ctx.accounts.grx_from.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            token_interface::burn(CpiContext::new(cpi_program, cpi_accounts), amount)?;

            // Update total burned in config
            let config = &ctx.accounts.token_config;
            let total_burned = config.grx_total_burned;
            drop(config);

            let now = Clock::get()?.unix_timestamp;
            emit!(GrxBurned {
                user: ctx.accounts.authority.key(),
                amount,
                total_burned,
                timestamp: now,
            });
        });
        Ok(())
    }

    /// Transfer GRX tokens between verified platform users
    pub fn transfer_grx(ctx: Context<TransferGrx>, amount: u64) -> Result<()> {
        compute_fn!("transfer_grx" => {
            let cpi_accounts = TransferCheckedInterface {
                from: ctx.accounts.from_token_account.to_account_info(),
                mint: ctx.accounts.grx_mint.to_account_info(),
                to: ctx.accounts.to_token_account.to_account_info(),
                authority: ctx.accounts.from_authority.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            token_interface::transfer_checked(cpi_ctx, amount, DECIMALS)?;
        });
        Ok(())
    }

    // ── Admin ─────────────────────────────────────────────────

    /// Add a REC validator to the system (disabled for Alpha)
    pub fn add_rec_validator(
        _ctx: Context<AddRecValidator>,
        _validator_pubkey: Pubkey,
        _authority_name: String,
    ) -> Result<()> {
        Err(error!(EnergyTokenError::UnauthorizedAuthority))
    }

    /// Sync total supply tracking from canonical SPL Mint accounts
    pub fn sync_supplies(ctx: Context<SyncSupplies>) -> Result<()> {
        compute_fn!("sync_supplies" => {
            let config = &ctx.accounts.token_config;
            let now = Clock::get()?.unix_timestamp;

            emit!(SuppliesSynced {
                grid_supply: ctx.accounts.grid_mint.supply,
                grx_supply: ctx.accounts.grx_mint.supply,
                grx_burned: config.grx_total_burned,
                timestamp: now,
            });
        });
        Ok(())
    }
}

// ── Account Structs ───────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitMints<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [b"grid_mint"],
        bump,
        mint::decimals = DECIMALS,
        mint::authority = authority,
        mint::token_program = token_program,
    )]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        init,
        payer = authority,
        seeds = [b"grx_mint"],
        bump,
        mint::decimals = DECIMALS,
        mint::authority = authority,
        mint::token_program = token_program,
    )]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct InitVaultAndConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    #[account(mut)]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        init,
        payer = authority,
        space = 224,
        seeds = [b"token_config"],
        bump
    )]
    pub token_config: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = grx_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub grx_vault: InterfaceAccount<'info, TokenAccountInterface>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct InitializeDualToken<'info> {
    #[account(
        init,
        payer = authority,
        space = 224,
        seeds = [b"token_config"],
        bump
    )]
    pub token_config: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [b"grid_mint"],
        bump,
        mint::decimals = DECIMALS,
        mint::authority = token_config,
        mint::token_program = token_program,
    )]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        init,
        payer = authority,
        seeds = [b"grx_mint"],
        bump,
        mint::decimals = DECIMALS,
        mint::authority = token_config,
        mint::token_program = token_program,
    )]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = grx_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub grx_vault: InterfaceAccount<'info, TokenAccountInterface>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintGrxToVault<'info> {
    #[account(mut, seeds = [b"token_config"], bump)]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    #[account(mut)]
    pub grx_vault: InterfaceAccount<'info, TokenAccountInterface>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CreateGrxMetadata<'info> {
    /// CHECK: GRX mint — validated by token_config seed
    #[account(mut)]
    pub grx_mint: AccountInfo<'info>,

    /// CHECK: TokenConfig PDA
    pub token_config: AccountInfo<'info>,

    /// CHECK: Metaplex metadata PDA
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    /// CHECK: Metaplex metadata program
    pub metadata_program: UncheckedAccount<'info>,
    /// CHECK: Sysvar instructions
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct MintGrid<'info> {
    #[account(mut)]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    pub token_config: Account<'info, TokenConfig>,

    #[account(
        mut,
        token::token_program = token_program,
    )]
    pub destination: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    /// CHECK: Recipient owner
    pub destination_owner: AccountInfo<'info>,

    pub authority: Signer<'info>,

    /// CHECK: REC Validator co-signer (required when validators are registered)
    pub rec_validator: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferGrid<'info> {
    #[account(
        mut,
        token::token_program = token_program,
    )]
    pub from_token_account: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    #[account(
        mut,
        token::token_program = token_program,
    )]
    pub to_token_account: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    #[account(mut)]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    pub from_authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SwapGridToGrx<'info> {
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    #[account(mut)]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    #[account(mut)]
    pub grid_from: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    #[account(mut)]
    pub grx_to: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    /// CHECK: User who owns GRID and receives GRX
    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct BurnGrx<'info> {
    #[account(mut)]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub grx_from: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    pub authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct TransferGrx<'info> {
    #[account(
        mut,
        token::token_program = token_program,
    )]
    pub from_token_account: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    #[account(
        mut,
        token::token_program = token_program,
    )]
    pub to_token_account: Box<InterfaceAccount<'info, TokenAccountInterface>>,

    #[account(mut)]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    pub from_authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct AddRecValidator<'info> {
    #[account(mut)]
    pub token_config: Account<'info, TokenConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SyncSupplies<'info> {
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub grid_mint: InterfaceAccount<'info, MintInterface>,

    #[account(mut)]
    pub grx_mint: InterfaceAccount<'info, MintInterface>,

    pub authority: Signer<'info>,
}
