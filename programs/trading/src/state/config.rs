use anchor_lang::prelude::*;

/// Trading program configuration
#[account]
pub struct TradingConfig {
    pub authority: Pubkey,          // 32 — admin authority
    pub maintenance_mode: bool,     // 1  — pause/unpause trading
    pub market: Pubkey,             // 32 — main market PDA
    pub created_at: i64,            // 8  — initialization timestamp
    pub updated_at: i64,            // 8  — last config update
    pub total_trades: u64,          // 8  — cumulative trade counter
    pub total_volume: u64,          // 8  — cumulative trade volume
}

impl TradingConfig {
    pub const LEN: usize =
        32 +    // authority
        1 +     // maintenance_mode
        32 +    // market
        8 +     // created_at
        8 +     // updated_at
        8 +     // total_trades
        8;      // total_volume

    /// Check if system is operational (not in maintenance mode)
    pub fn is_operational(&self) -> bool {
        !self.maintenance_mode
    }
}
