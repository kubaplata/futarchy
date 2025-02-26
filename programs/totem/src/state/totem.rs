use anchor_lang::prelude::*;

#[account]
pub struct Totem {
    pub dao: Pubkey,
    pub slots_per_challenge_period: u64,
    pub admin: Pubkey,
    pub statements: u64,
    pub requests: u64,
    // only needed as nonce for proposals
    pub total_disputes: u64,
}

impl Totem {
    pub const SIZE: usize = 8 + 2 * 32 + 4 * 8;
}