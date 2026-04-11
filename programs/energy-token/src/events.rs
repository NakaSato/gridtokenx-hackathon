use anchor_lang::prelude::*;

/// Emitted when GRID tokens are minted (1 GRID = 1 kWh energy traded)
#[event]
pub struct GridTokensMinted {
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

/// Emitted when GRID is swapped to GRX (one-way conversion)
#[event]
pub struct GridSwappedToGrx {
    pub user: Pubkey,
    pub grid_burned: u64,
    pub grx_minted: u64,
    pub timestamp: i64,
}

/// Emitted when GRX tokens are burned for AI credit redemption
#[event]
pub struct GrxBurned {
    pub user: Pubkey,
    pub amount: u64,
    pub total_burned: u64,
    pub timestamp: i64,
}

/// Emitted when token supplies are synced
#[event]
pub struct SuppliesSynced {
    pub grid_supply: u64,
    pub grx_supply: u64,
    pub grx_burned: u64,
    pub timestamp: i64,
}
