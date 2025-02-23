use anchor_lang::prelude::*;
use autocrat::Dao;
use crate::state::*;
use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SettleDisputeArgs {
    pub statement: u64,
}

pub fn settle_dispute(
    ctx: Context<SettleDispute>,
    args: SettleDisputeArgs
) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
#[instruction(
    args: SettleDisputeArgs
)]
pub struct SettleDispute <'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            TOTEM_SEED.as_bytes()
        ],
        bump
    )]
    pub totem: Account<'info, Totem>,

    #[account(
        mut,
        seeds = [
            DISPUTE_SEED.as_bytes(),
            statement.key().as_ref()
        ],
        bump
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [
            STATEMENT_SEED.as_bytes(),
            &args.statement.to_le_bytes()
        ],
        bump
    )]
    pub statement: Account<'info, Statement>,

    #[account()]
    pub totem_dao: Account<'info, Dao>,

    #[account()]
    pub source_of_truth: AccountInfo<'info>,
}