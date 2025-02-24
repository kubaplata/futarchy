use anchor_lang::prelude::*;
use autocrat::{cpi::{accounts::UpdateDao, update_dao}, program::Autocrat, Dao, UpdateDaoParams};
use crate::{Totem, TOTEM_DAO_SEED, TOTEM_SEED};
use crate::error::TotemError;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateTotemArgs {
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
        min_base_futarchic_liquidity,
        min_quote_futarchic_liquidity,
        pass_threshold_bps,
        slots_per_proposal,
        twap_initial_observation,
        twap_max_observation_change_per_update,
        slots_per_challenge_period
    } = args;

    let totem = &mut ctx.accounts.totem;
    let signer = &ctx.accounts.signer;
    let autocrat_program = &ctx.accounts.autocrat_program;
    let totem_dao = &ctx.accounts.totem_dao;
    let treasury = &ctx.accounts.treasury;

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

    let totem_dao_key = totem_dao.key();
    let signer_seeds = &[
        totem_dao_key.as_ref(),
        &[ctx.bumps.totem_dao]
    ];

    update_dao(
        CpiContext::new_with_signer(
            autocrat_program.to_account_info(), 
            UpdateDao {
                dao: totem_dao.to_account_info(),
                treasury: treasury.to_account_info()
            },
            &[signer_seeds]
        ), 
        UpdateDaoParams {
            slots_per_proposal,
            min_base_futarchic_liquidity,
            min_quote_futarchic_liquidity,
            pass_threshold_bps,
            twap_initial_observation,
            twap_max_observation_change_per_update
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

    #[account()]
    pub autocrat_program: Program<'info, Autocrat>,
}