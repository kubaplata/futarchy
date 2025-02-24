use anchor_lang::prelude::*;

#[error_code]
pub enum TotemError {
    #[msg("Challenge period ended. Statement cannot be disputed anymore.")]
    ChallengePeriodEnded,

    #[msg("Invalid public key of an account in callback instruction")]
    CallbackInstructionAccountPubkeyMismatch,

    #[msg("Callback instruction includes invalid Program ID")]
    InvalidCallbackInstructionProgramId,

    #[msg("Account in callback instruction violates signer constraint")]
    CallbackInstructionSignerMismatch,

    #[msg("Account in callback instruction violates writable constraint")]
    CallbackInstructionWritableAccountMismatch,

    #[msg("Callback instruction data is invalid")]
    InvalidCallbackInstructionData,

    #[msg("Proposal cannot be settled before finalisation.")]
    ProposalNotFinalised,

    #[msg("Dispute has been already settled.")]
    DisputeSettled,

    #[msg("Instruction is missing a proposal account.")]
    InstructionMissingProposal,

    #[msg("Statement cannot be settled before ending challenge period")]
    ChallengePeriodNotEnded,

    #[msg("Invalid treasury account")]
    InvalidTreasury,
}
