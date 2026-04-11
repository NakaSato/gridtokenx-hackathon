use anchor_lang::prelude::*;

/// TokenConfig PDA — stores configuration for both GRID and GRX tokens
/// seeds: [b"token_config"]
#[account]
pub struct TokenConfig {
    pub authority: Pubkey,
    pub registry_program: Pubkey,
    pub registry_authority: Pubkey,
    pub grid_mint: Pubkey,
    pub grx_mint: Pubkey,
    pub grx_initial_supply: u64,
    pub grx_total_burned: u64,
    pub created_at: i64,
}

/// MeterReading — stored reading data (not actively used in instructions)
#[account(zero_copy)]
#[repr(C)]
pub struct MeterReading {
    pub meter_owner: Pubkey,
    pub meter_serial: [u8; 32],
    pub energy_generated_kwh: u64,
    pub energy_consumed_kwh: u64,
    pub timestamp: i64,
    pub voltage: u16,
    pub current: u16,
    pub power_factor: u16,
    pub temperature: i16,
    pub bump: u8,
    pub _padding: [u8; 7],
}
