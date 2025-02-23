use anchor_lang::prelude::*;

#[account]
pub struct Totem {
    pub dao: Pubkey,
    pub admin: Pubkey,
    pub statements: u64,
    // only needed as nonce for proposals
    pub total_disputes: u64,
}

impl Totem {
    pub const SIZE: usize = 8 + 2 * 32 + 8;
}