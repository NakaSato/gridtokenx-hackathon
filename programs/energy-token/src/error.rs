use anchor_lang::prelude::*;

#[error_code]
pub enum EnergyTokenError {
    #[msg("Caller is not authorized to perform this action")]
    UnauthorizedAuthority,
    #[msg("REC validator not found in registered list")]
    RecValidatorNotFound,
    #[msg("REC validator already exists")]
    ValidatorAlreadyExists,
    #[msg("Maximum number of validators (5) reached")]
    MaxValidatorsReached,
    #[msg("Mathematical overflow detected")]
    MathOverflow,
    #[msg("Invalid metadata account provided")]
    InvalidMetadataAccount,
    #[msg("Insufficient token balance for operation")]
    InsufficientBalance,
}
