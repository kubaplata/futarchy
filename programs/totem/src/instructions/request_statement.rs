use anchor_lang::prelude::*;
use crate::{state::*, constants::*};
use anchor_lang::system_program::{
    transfer,
    Transfer
};

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct RequestStatementArgs {
    pub question: String,
    pub fee: u64,
}

pub fn request_statement(
    ctx: Context<RequestStatement>,
    args: RequestStatementArgs
) -> Result<()> {
    let RequestStatementArgs {
        fee,
        question
    } = args;

    let fee_collector = &ctx.accounts.fee_collector;
    let signer = &ctx.accounts.signer;
    let system_program = &ctx.accounts.system_program;
    let request = &mut ctx.accounts.request;

    request.creator = signer.key();
    request.question = question;
    request.statement = None;

    transfer(
        CpiContext::new(
            system_program.to_account_info(),
            Transfer {
                from: signer.to_account_info(),
                to: fee_collector.to_account_info()
            }
        ), 
        fee
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    args: RequestStatementArgs
)]
pub struct RequestStatement<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            TOTEM_SEED.as_bytes(),
        ],
        bump
    )]
    pub totem: Account<'info, Totem>,

    #[account(
        init,
        payer = signer,
        seeds = [
            REQUEST_SEED.as_bytes(),
            &totem.requests.to_le_bytes()
        ],
        bump,
        space = Request::size(&args.question)
    )]
    pub request: Account<'info, Request>,

    /// CHECK: It's just to hold lamports
    #[account(
        seeds = [
            FEE_COLLECTOR_SEED.as_bytes(),
            request.key().as_ref()
        ],
        bump
    )]
    pub fee_collector: AccountInfo<'info>,

    #[account()]
    pub system_program: Program<'info, System>
}