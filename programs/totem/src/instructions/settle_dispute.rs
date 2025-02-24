use anchor_lang::prelude::*;
use autocrat::Dao;
use autocrat::Proposal;
use autocrat::ProposalState;
use crate::error::TotemError;
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
    let statement = &mut ctx.accounts.statement;
    let proposal = &ctx.accounts.proposal;
    let totem = &ctx.accounts.totem;
    let totem_dao = &ctx.accounts.totem_dao;

    let clock = Clock::get()?;
    let slot = clock.slot;

    if (statement.status == Status::Disputed) {
        require!(
            proposal.is_some(),
            TotemError::InstructionMissingProposal
        );

        require!(
            proposal.as_ref().unwrap().slot_enqueued + totem_dao.slots_per_proposal < slot,
            TotemError::ProposalNotFinalised
        );

        let result = match proposal.as_ref().unwrap().state {
            ProposalState::Pending => Err(TotemError::ProposalNotFinalised),
            // If dispute failed, statement is true.
            ProposalState::Failed => Ok(true),
            // If dispute succeeded, statement is false.
            ProposalState::Passed => Ok(false),
            // This means settle_dispute has been already called (since it's the callback transaction if proposal has been executed)
            ProposalState::Executed => Err(TotemError::DisputeSettled)
        }?;

        statement.status = Status::Settled(result);
    } else {
        require!(
            slot > statement.created_at + totem.slots_per_challenge_period,
            TotemError::ChallengePeriodNotEnded
        );

        statement.status = Status::Settled(true);
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    args: SettleDisputeArgs
)]
pub struct SettleDispute <'info> {
    #[account(mut)]
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
        address = dispute.proposal
    )]
    pub proposal: Option<Account<'info, Proposal>>,

    #[account(
        mut,
        seeds = [
            STATEMENT_SEED.as_bytes(),
            &args.statement.to_le_bytes()
        ],
        bump
    )]
    pub statement: Account<'info, Statement>,

    #[account(
        address = totem.dao
    )]
    pub totem_dao: Account<'info, Dao>,
}