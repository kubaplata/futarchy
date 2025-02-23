use anchor_lang::{prelude::*, InstructionData};
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token::{
    Token,
    Mint,
};
use anchor_lang::solana_program::program::invoke;
use autocrat::instruction::InitializeDao as InitializeDaoInstructionData;
use autocrat::program::Autocrat;
use autocrat::InitializeDaoParams;
use autocrat::accounts::InitializeDAO as InitializeDaoAccounts;
use autocrat::Dao;
use crate::constants::*;
use crate::state::*;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct InitializeTotemArgs {
    dao_params: InitializeDaoParams
}

pub fn initialize_totem(
    ctx: Context<InitializeTotem>,
    args: InitializeTotemArgs
) -> Result<()> {

    let InitializeTotemArgs {
        dao_params
    } = args;

    let signer = &ctx.accounts.signer;
    let totem_dao = &ctx.accounts.totem_dao;
    let totem = &mut ctx.accounts.totem;
    let system_program = &ctx.accounts.system_program;
    let usdc_mint = &ctx.accounts.usdc_mint;
    let token_mint = &ctx.accounts.token_mint;
    let autocrat_program = &ctx.accounts.autocrat_program;

    let accounts = InitializeDaoAccounts {
        dao: totem_dao.key(),
        payer: signer.key(),
        system_program: system_program.key(),
        token_mint: token_mint.key(),
        usdc_mint: usdc_mint.key()
    };

    let data = InitializeDaoInstructionData {
        params: dao_params
    };

    let instruction = Instruction::new_with_bytes(
        autocrat_program.key(), 
        &InitializeDaoInstructionData::data(&data), 
        accounts.to_account_metas(None)
    );

    invoke(
        &instruction, 
        &[
            totem_dao.to_account_info(),
            signer.to_account_info(),
            system_program.to_account_info(),
            token_mint.to_account_info(),
            usdc_mint.to_account_info()
        ]
    )?;

    totem.admin = signer.key();
    totem.dao = totem_dao.key();
    totem.statements = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeTotem<'info> {
    #[account(
        mut
    )]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        seeds = [
            TOTEM_SEED.as_bytes()
        ],
        space = Totem::SIZE,
        bump,
    )]
    pub totem: Account<'info, Totem>,

    #[account()]
    pub totem_dao: Account<'info, Dao>,

    #[account()]
    pub token_mint: Account<'info, Mint>,

    #[account()]
    pub usdc_mint: Account<'info, Mint>,

    #[account()]
    pub autocrat_program: Program<'info, Autocrat>,

    #[account()]
    pub system_program: Program<'info, System>,
}