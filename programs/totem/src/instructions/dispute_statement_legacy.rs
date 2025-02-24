use amm::instructions::CreateAmmArgs;
use amm::program::Amm as AmmProgram;
use amm::state::Amm;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
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

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct DisputeStatementLegacyArgs {
    pub statement: u64,
    pub nonce: u64,
    pub description_url: String,
    pub twap_initial_observation: u128,
    pub twap_max_observation_change_per_update: u128,
}

pub fn dispute_statement_legacy(
    ctx: Context<DisputeStatementLegacy>,
    args: DisputeStatementLegacyArgs
) -> Result<()> {
    let DisputeStatementLegacyArgs {
        description_url,
        nonce,
        statement: statement_id,
        twap_initial_observation: _,
        twap_max_observation_change_per_update: __
    } = args;

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

    let clock = Clock::get()?;

    require!(
        statement.created_at + totem.slots_per_challenge_period > clock.slot,
        TotemError::ChallengePeriodEnded
    );

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
        proposal: Some(proposal.key())
    };

    let metas: Vec<ProposalAccount> = inner_instruction_accounts
        .to_account_metas(None)
        .iter()
        .map(| acc| ProposalAccount {
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
            pubkey: acc.pubkey
        })
        .collect();

    require!(
        proposal.instruction.program_id == crate::id(),
        TotemError::InvalidCallbackInstructionProgramId
    );

    for (index, account) in proposal.instruction.accounts.iter().enumerate() {
        require!(
            account.is_signer == metas[index].is_signer,
            TotemError::CallbackInstructionSignerMismatch
        );

        require!(
            account.is_writable == metas[index].is_writable,
            TotemError::CallbackInstructionWritableAccountMismatch
        );

        require!(
            account.pubkey.eq(&metas[index].pubkey),
            TotemError::CallbackInstructionAccountPubkeyMismatch
        );
    }

    require!(
        proposal.instruction.data.eq(&SettleDisputeInstructionData::data(&inner_instruction_data)),
        TotemError::InvalidCallbackInstructionData
    );

    statement.status = Status::Disputed;
    statement.disputes += 1;
    dispute.proposal = proposal.key();
    totem.total_disputes += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    args: DisputeStatementLegacyArgs
)]
pub struct DisputeStatementLegacy<'info> {
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
        mut,
        constraint = proposal.proposer == signer.key(),
        has_one = question,
        constraint = proposal.fail_amm == fail_amm.key(),
        constraint = proposal.pass_amm == pass_amm.key()
    )]
    pub proposal: Account<'info, Proposal>,

    #[account()]
    pub question: Account<'info, Question>,

    #[account()]
    pub base_vault: Account<'info, ConditionalVault>,

    #[account(
        mut,
        constraint = pass_amm.lp_mint == pass_lp_mint.key(),
        constraint = pass_amm.base_mint == totem_dao.token_mint,
    )]
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