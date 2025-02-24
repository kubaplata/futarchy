use anchor_lang::prelude::*;

#[account]
pub struct Dispute {
    pub statement: Pubkey,
    pub index: u64,
    pub proposal: Pubkey,
}

impl Dispute {
    pub const SIZE: usize = 8 + 2 * 32 + 8;
}