use anchor_lang::prelude::*;

#[account]
pub struct Request {
    pub question: String,
    pub creator: Pubkey,
    pub statement: Option<Pubkey>,
}

impl Request {
    pub fn size(question: &String) -> usize {
        (4 + question.len()) + 32 + (1 + 32)
    }
}