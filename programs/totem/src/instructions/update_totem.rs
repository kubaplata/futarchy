use std::str::FromStr;

use anchor_lang::{prelude::*, solana_program::instruction::Instruction, InstructionData};
use autocrat::{cpi::{accounts::{InitializeProposal, UpdateDao as UpdateDaoAccounts}, initialize_proposal, update_dao}, instruction::UpdateDao as UpdateDaoInstruction, program::Autocrat, Dao, InitializeProposalParams, ProposalAccount, ProposalInstruction, UpdateDaoParams};
use crate::{Totem, TOTEM_DAO_SEED, TOTEM_SEED};
use crate::error::TotemError;
use anchor_spl::token::{
    TokenAccount,
    Mint,
    Token
};
use anchor_spl::associated_token::{
    AssociatedToken,
};
use crate::constants::*;
use anchor_lang::system_program::{
    transfer,
    Transfer
};
use amm::state::{ Amm };
use conditional_vault::state::{ ConditionalVault, Question };

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateTotemArgs {
    pub nonce: u64,
    pub slots_per_proposal: Option<u64>,
    pub min_base_futarchic_liquidity: Option<u64>,
    pub min_quote_futarchic_liquidity: Option<u64>,
    pub pass_threshold_bps: Option<u16>,
    pub twap_initial_observation: Option<u128>,
    pub twap_max_observation_change_per_update: Option<u128>,
    pub slots_per_challenge_period: Option<u64>,
}

pub fn update_totem(
    ctx: Context<UpdateTotem>,
    args: UpdateTotemArgs
) -> Result<()> {
    let UpdateTotemArgs {
        nonce,
        min_base_futarchic_liquidity,
        min_quote_futarchic_liquidity,
        pass_threshold_bps,
        slots_per_proposal,
        twap_initial_observation,
        twap_max_observation_change_per_update,
        slots_per_challenge_period
    } = args;

    // let totem = &mut ctx.accounts.totem;
    // let signer = &ctx.accounts.signer;
    // let autocrat_program = &ctx.accounts.autocrat_program;
    // let totem_dao = &ctx.accounts.totem_dao;
    // let treasury = &ctx.accounts.treasury;
    // let base_vault = &ctx.accounts.base_vault;

    let UpdateTotem {
        fail_amm,
            fail_lp_mint,
            fail_lp_user_account,
            fail_lp_vault_account,
            pass_amm,
            pass_lp_mint,
            pass_lp_user_account,
            pass_lp_vault_account,
            proposal,
            proposer,
            question,
            quote_vault,
            system_program,
            token_program,
            associated_token_program,
            autocrat_program,
            base_vault,
            signer,
            totem,
            totem_dao,
            treasury
    } = ctx.accounts;

    let rent = Rent::get()?;
    let lamports = rent
        .minimum_balance(2000);

    transfer(
        CpiContext::new(
            system_program.to_account_info(), 
            Transfer {
                from: signer.to_account_info(),
                to: proposer.to_account_info(),
            }
        ), 
        lamports
    )?;

    totem.slots_per_challenge_period = match slots_per_challenge_period {
        None => totem.slots_per_challenge_period,
        Some(slots) => slots
    };

    let (
        treasury_key, 
        _
    ) = Pubkey::find_program_address(
        &[totem_dao.key().as_ref()], 
        &autocrat_program.key()
    );

    require!(
        treasury_key.eq(&treasury.key()),
        TotemError::InvalidTreasury
    );

    let signer_seeds = &[
        PROPOSER_SEED.as_bytes(),
        &[ctx.bumps.proposer]
    ];

    let inner_instruction_data = UpdateDaoInstruction {
        dao_params: UpdateDaoParams {
            min_base_futarchic_liquidity,
            min_quote_futarchic_liquidity,
            pass_threshold_bps,
            slots_per_proposal,
            twap_initial_observation,
            twap_max_observation_change_per_update
        }
    };

    let inner_instruction_accounts = UpdateDaoAccounts {
        dao: totem_dao.to_account_info(),
        treasury: treasury.to_account_info()
    };

    let inner_instruction = ProposalInstruction {
        program_id: autocrat_program.key(), 
        data: UpdateDaoInstruction::data(&inner_instruction_data), 
        accounts: inner_instruction_accounts
            .to_account_metas(None)
            .iter()
            .map(|meta| ProposalAccount { is_signer: meta.pubkey.eq(&treasury.key()), is_writable: meta.is_writable, pubkey: meta.pubkey })
            .collect()
    };

    let description_url = String
        ::try_from("there's no url, i love you")
        .expect("this should never happen");
    
    initialize_proposal(
        CpiContext::new_with_signer(
            autocrat_program.to_account_info(), 
            InitializeProposal {
                base_vault: base_vault.to_account_info(),
                dao: totem_dao.to_account_info(),
                fail_amm: fail_amm.to_account_info(),
                fail_lp_mint: fail_lp_mint.to_account_info(),
                fail_lp_user_account: fail_lp_user_account.to_account_info(),
                fail_lp_vault_account: fail_lp_vault_account.to_account_info(),
                pass_amm: pass_amm.to_account_info(),
                pass_lp_mint: pass_lp_mint.to_account_info(),
                pass_lp_user_account: pass_lp_user_account.to_account_info(),
                pass_lp_vault_account: pass_lp_vault_account.to_account_info(),
                proposal: proposal.to_account_info(),
                proposer: proposer.to_account_info(),
                question: question.to_account_info(),
                quote_vault: quote_vault.to_account_info(),
                system_program: system_program.to_account_info(),
                token_program: token_program.to_account_info()
            },
            &[signer_seeds]
        ),
        InitializeProposalParams {
            description_url,
            fail_lp_tokens_to_lock: 0,
            instruction: inner_instruction,
            nonce,
            pass_lp_tokens_to_lock: 0
        }
    )?;

    Ok(())
}

#[derive(Accounts)] 
pub struct UpdateTotem<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        seeds = [
            TOTEM_SEED.as_bytes()
        ],
        bump,
        constraint = totem.admin == signer.key()
    )]
    pub totem: Account<'info, Totem>,

    #[account(
        mut,
        seeds = [
            TOTEM_DAO_SEED.as_bytes()
        ],
        bump
    )]
    pub totem_dao: Account<'info, Dao>,

    /// CHECK: Safe, derive and check address later
    #[account()]
    pub treasury: AccountInfo<'info>,

    /// CHECK: Rely on MetaDAO security
    #[account(
        mut
    )]
    pub proposal: AccountInfo<'info>,

    /// CHECK: its ok
    #[account(
        mut,
        seeds = [
            PROPOSER_SEED.as_bytes()
        ],
        bump
    )]
    pub proposer: AccountInfo<'info>,

    #[account()]
    pub question: Account<'info, Question>,

    #[account()]
    pub base_vault: Account<'info, ConditionalVault>,

    #[account()]
    pub pass_amm: Account<'info, Amm>,

    #[account()]
    pub fail_amm: Account<'info, Amm>,

    #[account()]
    pub pass_lp_mint: Box<Account<'info, Mint>>,

    #[account()]
    pub pass_lp_user_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub fail_lp_mint: Box<Account<'info, Mint>>,

    #[account()]
    pub fail_lp_user_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub pass_lp_vault_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub fail_lp_vault_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub quote_vault: Box<Account<'info, ConditionalVault>>,

    #[account()]
    pub autocrat_program: Program<'info, Autocrat>,

    #[account()]
    pub token_program: Program<'info, Token>,

    #[account()]
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account()]
    pub system_program: Program<'info, System>,
}