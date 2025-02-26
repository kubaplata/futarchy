use anchor_lang::prelude::*;

#[constant]
pub const TOTEM_SEED: &str = "totem";

#[constant]
pub const TOTEM_DAO_SEED: &str = "totem_dao";

#[constant]
pub const STATEMENT_SEED: &str = "statement";

#[constant]
pub const DISPUTE_SEED: &str = "dispute";

#[constant]
pub const PROPOSER_SEED: &str = "proposer";

#[constant]
pub const REQUEST_SEED: &str = "request";

#[constant]
pub const FEE_COLLECTOR_SEED: &str = "fee_collector";

#[constant]
pub const DEFAULT_SLOTS_PER_CHALLENGE_PERIOD: u64 = 24 * 60 * 6 * 25;