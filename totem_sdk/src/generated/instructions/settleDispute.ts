/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  SettleDisputeArgs,
  settleDisputeArgsBeet,
} from '../types/SettleDisputeArgs'

/**
 * @category Instructions
 * @category SettleDispute
 * @category generated
 */
export type SettleDisputeInstructionArgs = {
  args: SettleDisputeArgs
}
/**
 * @category Instructions
 * @category SettleDispute
 * @category generated
 */
export const settleDisputeStruct = new beet.BeetArgsStruct<
  SettleDisputeInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', settleDisputeArgsBeet],
  ],
  'SettleDisputeInstructionArgs'
)
/**
 * Accounts required by the _settleDispute_ instruction
 *
 * @property [_writable_, **signer**] signer
 * @property [_writable_] totem
 * @property [_writable_] dispute
 * @property [] proposal (optional)
 * @property [_writable_] statement
 * @property [] totemDao
 * @category Instructions
 * @category SettleDispute
 * @category generated
 */
export type SettleDisputeInstructionAccounts = {
  signer: web3.PublicKey
  totem: web3.PublicKey
  dispute: web3.PublicKey
  proposal?: web3.PublicKey
  statement: web3.PublicKey
  totemDao: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const settleDisputeInstructionDiscriminator = [
  155, 147, 5, 44, 20, 204, 146, 43,
]

/**
 * Creates a _SettleDispute_ instruction.
 *
 * Optional accounts that are not provided default to the program ID since
 * this was indicated in the IDL from which this instruction was generated.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category SettleDispute
 * @category generated
 */
export function createSettleDisputeInstruction(
  accounts: SettleDisputeInstructionAccounts,
  args: SettleDisputeInstructionArgs,
  programId = new web3.PublicKey('totAWMiimTLs7yTLAfWtJMmtNKmT5xpU6YM8vAYoqZ5')
) {
  const [data] = settleDisputeStruct.serialize({
    instructionDiscriminator: settleDisputeInstructionDiscriminator,
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
      pubkey: accounts.dispute,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.proposal ?? programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.statement,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.totemDao,
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
