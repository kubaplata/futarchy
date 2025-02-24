use amm::instructions::CreateAmmArgs;
use amm::program::Amm as AmmProgram;
use amm::state::Amm;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::lamports;
use anchor_lang::solana_program::nonce::state;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    self, Mint, TokenAccount
};
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_lang::InstructionData;
use anchor_spl::token::Token;
use anchor_spl::token_2022::spl_token_2022::solana_zk_token_sdk::curve25519::scalar::Zeroable;
use autocrat::program::Autocrat;
use autocrat::Dao;
use autocrat::Proposal;
use autocrat::accounts::InitializeProposal as InitializeProposalAccounts;
use autocrat::instruction::InitializeProposal as InitializeProposalInstructionData;
use autocrat::InitializeProposalParams;
use autocrat::ProposalAccount;
use autocrat::ProposalInstruction;
use conditional_vault::Question;
use crate::state::*;
use crate::constants::*;
use crate::instruction::SettleDispute as SettleDisputeInstructionData;
use crate::accounts::SettleDispute as SettleDisputeAccounts;
use crate::settle_dispute::SettleDisputeArgs;
use amm::instruction::CreateAmm as CreateAmmInstructionData;
use amm::accounts::CreateAmm as CreateAmmAccounts;
use conditional_vault::instruction::InitializeQuestion as InitializeQuestionInstructionData;
use conditional_vault::accounts::InitializeQuestion as InitializeQuestionAccounts;
use conditional_vault::state::ConditionalVault;
use crate::error::TotemError;
use anchor_lang::system_program::{
    transfer,
    Transfer
};

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct DisputeStatementArgs {
    pub statement: u64,
    pub nonce: u64,
    pub description_url: String,
    pub twap_initial_observation: u128,
    pub twap_max_observation_change_per_update: u128,
}

pub fn dispute_statement(
    ctx: Context<DisputeStatement>,
    args: DisputeStatementArgs
) -> Result<()> {
    let DisputeStatementArgs {
        description_url,
        nonce,
        statement: statement_id,
        twap_initial_observation: _,
        twap_max_observation_change_per_update: __
    } = args;

    let signer = &ctx.accounts.signer;
    let totem_dao = &ctx.accounts.totem_dao;
    let statement = &mut ctx.accounts.statement;
    let totem = &mut ctx.accounts.totem;
    let dispute = &mut ctx.accounts.dispute;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let proposal = &ctx.accounts.proposal;
    let question = &ctx.accounts.question;
    let fail_amm = &ctx.accounts.fail_amm;
    let pass_amm = &ctx.accounts.pass_amm;
    let base_vault = &ctx.accounts.base_vault;
    let pass_lp_mint = &ctx.accounts.pass_lp_mint;
    let fail_lp_mint = &ctx.accounts.fail_lp_mint;
    let pass_lp_user_account = &ctx.accounts.pass_lp_user_account;
    let fail_lp_user_account = &ctx.accounts.fail_lp_user_account;
    let quote_vault = &ctx.accounts.quote_vault;
    let fail_lp_vault_account = &ctx.accounts.fail_lp_vault_account;
    let pass_lp_vault_account = &ctx.accounts.pass_lp_vault_account;
    let autocrat_program = &ctx.accounts.autocrat_program;
    let proposer = &ctx.accounts.proposer;

    let clock = Clock::get()?;

    require!(
        statement.created_at + totem.slots_per_challenge_period > clock.slot,
        TotemError::ChallengePeriodEnded
    );

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

    let inner_instruction_data = SettleDisputeInstructionData {
        args: SettleDisputeArgs {
            statement: statement_id
        }
    };

    let inner_instruction_accounts = SettleDisputeAccounts {
        dispute: dispute.key(),
        signer: totem_dao.treasury.key(), // this should be settlement authority
        totem: totem.key(),
        statement: statement.key(),
        totem_dao: totem_dao.key(),
        proposal: Some(proposal.key()),
    };

    let inner_instruction = ProposalInstruction {
        program_id: crate::id(),
        data: SettleDisputeInstructionData::data(&inner_instruction_data),
        accounts: inner_instruction_accounts
            .to_account_metas(None)
            .iter()
            .map(| acc| ProposalAccount {
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
                pubkey: acc.pubkey
            })
            .collect()
    };

    let instruction_data = InitializeProposalInstructionData {
        params: InitializeProposalParams {
            description_url,
            fail_lp_tokens_to_lock: 0,
            instruction: inner_instruction,
            nonce,
            pass_lp_tokens_to_lock: 0
        }
    };

    let instruction_accounts = InitializeProposalAccounts {
        token_program: token_program.key(),
        system_program: system_program.key(),
        dao: totem_dao.key(),
        proposal: proposal.key(),
        base_vault: base_vault.key(),
        fail_amm: fail_amm.key(),
        fail_lp_mint: fail_lp_mint.key(),
        fail_lp_user_account: fail_lp_user_account.key(),
        fail_lp_vault_account: fail_lp_vault_account.key(),
        pass_amm: pass_amm.key(),
        pass_lp_mint: pass_lp_mint.key(),
        pass_lp_user_account: pass_lp_user_account.key(),
        pass_lp_vault_account: pass_lp_vault_account.key(),
        proposer: proposer.key(),
        question: question.key(),
        quote_vault: quote_vault.key()
    };

    let metas = instruction_accounts
        .to_account_metas(None)
        .iter()
        .map(|acc| AccountMeta { is_signer: acc.is_signer || acc.pubkey == proposer.key(), is_writable: acc.is_writable, pubkey: acc.pubkey })
        .collect();

    let instruction = Instruction::new_with_bytes(
        autocrat_program.key(), 
        &InitializeProposalInstructionData::data(&instruction_data),
        metas
    );

    let signer_seeds = &[
        PROPOSER_SEED.as_bytes(),
        &[ctx.bumps.proposer]
    ];

    invoke_signed(
        &instruction, 
        &[
            proposer.to_account_info(),
            token_program.to_account_info(),
            system_program.to_account_info(),
            totem_dao.to_account_info(),
            proposal.to_account_info(),
            base_vault.to_account_info(),
            fail_amm.to_account_info(),
            fail_lp_mint.to_account_info(),
            fail_lp_user_account.to_account_info(),
            fail_lp_vault_account.to_account_info(),
            pass_amm.to_account_info(),
            pass_lp_mint.to_account_info(),
            pass_lp_user_account.to_account_info(),
            pass_lp_vault_account.to_account_info(),
            quote_vault.to_account_info(),
            question.to_account_info(),
        ],
        &[signer_seeds]
    )?;

    statement.status = Status::Disputed;
    statement.disputes += 1;
    dispute.proposal = proposal.key();
    totem.total_disputes += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    args: DisputeStatementArgs
)]
pub struct DisputeStatement<'info> {
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
        mut,
        address = totem.dao
    )]
    pub totem_dao: Account<'info, Dao>,

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
        init,
        payer = signer,
        seeds = [
            // One dispute per statement, not sure if should allow more
            DISPUTE_SEED.as_bytes(),
            statement.key().as_ref()
        ],
        bump,
        space = Dispute::SIZE
    )]
    pub dispute: Account<'info, Dispute>,

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