use anchor_lang::prelude::*;

#[account]
pub struct Dispute {
    statement: Pubkey,
    index: u64,
}