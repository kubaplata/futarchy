use anchor_lang::{prelude::*, solana_program::nonce::state};
use crate::{state::*, STATEMENT_SEED, TOTEM_SEED};

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct CreateStatementArgs {
    statement: String
}

pub fn create_statement(
    ctx: Context<CreateStatement>,
    args: CreateStatementArgs
) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let totem = &mut ctx.accounts.totem;
    let statement = &mut ctx.accounts.statement;

    statement.statement = args.statement;
    statement.creator = signer.key();
    statement.index = totem.statements;
    statement.status = Status::Proposed;
    statement.disputes = 0;

    totem.statements += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    args: CreateStatementArgs
)]
pub struct CreateStatement<'info> {
    #[account(
        mut
    )]
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
        init,
        payer = signer,
        seeds = [
            STATEMENT_SEED.as_bytes(),
            &totem.statements.to_le_bytes()
        ],
        bump,
        space = Statement::size(&args.statement)
    )]
    pub statement: Account<'info, Statement>,

    #[account()]
    pub system_program: Program<'info, System>,
}