use anchor_lang::{prelude::*, InstructionData};
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token::{
    Token,
    Mint,
};
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use autocrat::instruction::InitializeDao as InitializeDaoInstructionData;
use autocrat::program::Autocrat;
use autocrat::InitializeDaoParams;
use autocrat::accounts::InitializeDAO as InitializeDaoAccounts;
use autocrat::Dao;
use crate::constants::*;
use crate::state::*;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct InitializeTotemArgs {
    pub twap_initial_observation: u128,
    pub twap_max_observation_change_per_update: u128,
    pub min_quote_futarchic_liquidity: u64,
    pub min_base_futarchic_liquidity: u64,
    pub pass_threshold_bps: Option<u16>,
    pub slots_per_proposal: Option<u64>,
    pub slots_per_challenge_period: Option<u64>,
}

pub fn initialize_totem(
    ctx: Context<InitializeTotem>,
    args: InitializeTotemArgs
) -> Result<()> {

    let InitializeTotemArgs {
        min_base_futarchic_liquidity,
        min_quote_futarchic_liquidity,
        pass_threshold_bps,
        slots_per_proposal,
        twap_initial_observation,
        twap_max_observation_change_per_update,
        slots_per_challenge_period
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
        params: InitializeDaoParams {
            min_base_futarchic_liquidity,
            min_quote_futarchic_liquidity,
            pass_threshold_bps,
            slots_per_proposal,
            twap_initial_observation,
            twap_max_observation_change_per_update
        }
    };

    let account_metas: Vec<AccountMeta> = accounts
        .to_account_metas(None)
        .iter()
        .map(|acc| AccountMeta { pubkey: acc.pubkey, is_signer: acc.is_signer || acc.pubkey == totem_dao.key(), is_writable: acc.is_writable })
        .collect();

    let instruction = Instruction::new_with_bytes(
        autocrat_program.key(), 
        &InitializeDaoInstructionData::data(&data), 
        account_metas
    );

    let signer_seeds = &[
        TOTEM_DAO_SEED.as_bytes(),
        &[ctx.bumps.totem_dao]
    ];

    invoke_signed(
        &instruction, 
        &[
            totem_dao.to_account_info(),
            signer.to_account_info(),
            system_program.to_account_info(),
            token_mint.to_account_info(),
            usdc_mint.to_account_info()
        ],
        &[signer_seeds]
    )?;

    totem.admin = signer.key();
    totem.dao = totem_dao.key();
    totem.statements = 0;
    totem.slots_per_challenge_period = match slots_per_challenge_period {
        Some(slots) => slots,
        None => DEFAULT_SLOTS_PER_CHALLENGE_PERIOD
    };

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

    /// CHECK: inherit security from metadao
    #[account(
        mut,
        seeds = [
            TOTEM_DAO_SEED.as_bytes()
        ],
        bump
    )]
    pub totem_dao: AccountInfo<'info>,

    #[account()]
    pub token_mint: Account<'info, Mint>,

    #[account()]
    pub usdc_mint: Account<'info, Mint>,

    #[account()]
    pub autocrat_program: Program<'info, Autocrat>,

    #[account()]
    pub system_program: Program<'info, System>,
}