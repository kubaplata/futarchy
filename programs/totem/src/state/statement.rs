use anchor_lang::prelude::*;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, Debug, Default, PartialEq)]
pub enum Status {
    #[default]
    Proposed,
    Disputed,
    Settled(bool)
}

#[account]
pub struct Statement {
    pub index: u64,
    pub creator: Pubkey,
    pub statement: String,
    pub status: Status,
    pub disputes: u64, // not needed i guess?
    pub created_at: u64,
}

impl Statement {
    pub fn size(statement: &String) -> usize {
        8 + 8 + 32 + (4 + statement.len()) + 2 + 2 * 8
    }
}