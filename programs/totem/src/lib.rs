pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("ttmtyv2RyZoWJ1Dvg54XLJJmayFbhJEZzo7WJxMBZy7");

#[program]
pub mod totem {
    use super::*;

    pub fn initialize_totem(ctx: Context<InitializeTotem>, args: InitializeTotemArgs) -> Result<()> {
        instructions::initialize_totem(ctx, args)
    }

    pub fn create_statement(ctx: Context<CreateStatement>, args: CreateStatementArgs) -> Result<()> {
        instructions::create_statement(ctx, args)
    }

    pub fn dispute_statement(ctx: Context<DisputeStatement>, args: DisputeStatementArgs) -> Result<()> {
        instructions::dispute_statement(ctx, args)
    }

    pub fn settle_dispute(ctx: Context<SettleDispute>, args: SettleDisputeArgs) -> Result<()> {
        instructions::settle_dispute(ctx, args)
    }
}
