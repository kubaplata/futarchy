/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  DisputeStatementArgs,
  disputeStatementArgsBeet,
} from '../types/DisputeStatementArgs'

/**
 * @category Instructions
 * @category DisputeStatement
 * @category generated
 */
export type DisputeStatementInstructionArgs = {
  args: DisputeStatementArgs
}
/**
 * @category Instructions
 * @category DisputeStatement
 * @category generated
 */
export const disputeStatementStruct = new beet.FixableBeetArgsStruct<
  DisputeStatementInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', disputeStatementArgsBeet],
  ],
  'DisputeStatementInstructionArgs'
)
/**
 * Accounts required by the _disputeStatement_ instruction
 *
 * @property [_writable_, **signer**] signer
 * @property [_writable_] totem
 * @property [_writable_] totemDao
 * @property [_writable_] statement
 * @property [_writable_] dispute
 * @property [_writable_] proposal
 * @property [_writable_] proposer
 * @property [] question
 * @property [] baseVault
 * @property [] passAmm
 * @property [] failAmm
 * @property [] passLpMint
 * @property [] passLpUserAccount
 * @property [] failLpMint
 * @property [] failLpUserAccount
 * @property [] passLpVaultAccount
 * @property [] failLpVaultAccount
 * @property [] quoteVault
 * @property [] autocratProgram
 * @property [] associatedTokenProgram
 * @category Instructions
 * @category DisputeStatement
 * @category generated
 */
export type DisputeStatementInstructionAccounts = {
  signer: web3.PublicKey
  totem: web3.PublicKey
  totemDao: web3.PublicKey
  statement: web3.PublicKey
  dispute: web3.PublicKey
  proposal: web3.PublicKey
  proposer: web3.PublicKey
  question: web3.PublicKey
  baseVault: web3.PublicKey
  passAmm: web3.PublicKey
  failAmm: web3.PublicKey
  passLpMint: web3.PublicKey
  passLpUserAccount: web3.PublicKey
  failLpMint: web3.PublicKey
  failLpUserAccount: web3.PublicKey
  passLpVaultAccount: web3.PublicKey
  failLpVaultAccount: web3.PublicKey
  quoteVault: web3.PublicKey
  autocratProgram: web3.PublicKey
  tokenProgram?: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  systemProgram?: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const disputeStatementInstructionDiscriminator = [
  75, 120, 205, 50, 228, 212, 207, 136,
]

/**
 * Creates a _DisputeStatement_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category DisputeStatement
 * @category generated
 */
export function createDisputeStatementInstruction(
  accounts: DisputeStatementInstructionAccounts,
  args: DisputeStatementInstructionArgs,
  programId = new web3.PublicKey('ttmtyv2RyZoWJ1Dvg54XLJJmayFbhJEZzo7WJxMBZy7')
) {
  const [data] = disputeStatementStruct.serialize({
    instructionDiscriminator: disputeStatementInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.signer,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.totem,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.totemDao,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.statement,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.dispute,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.proposal,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.proposer,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.question,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.baseVault,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.passAmm,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.failAmm,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.passLpMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.passLpUserAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.failLpMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.failLpUserAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.passLpVaultAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.failLpVaultAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.quoteVault,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.autocratProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.associatedTokenProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}
