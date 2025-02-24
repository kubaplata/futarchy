/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  InitializeTotemArgs,
  initializeTotemArgsBeet,
} from '../types/InitializeTotemArgs'

/**
 * @category Instructions
 * @category InitializeTotem
 * @category generated
 */
export type InitializeTotemInstructionArgs = {
  args: InitializeTotemArgs
}
/**
 * @category Instructions
 * @category InitializeTotem
 * @category generated
 */
export const initializeTotemStruct = new beet.FixableBeetArgsStruct<
  InitializeTotemInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', initializeTotemArgsBeet],
  ],
  'InitializeTotemInstructionArgs'
)
/**
 * Accounts required by the _initializeTotem_ instruction
 *
 * @property [_writable_, **signer**] signer
 * @property [_writable_] totem
 * @property [_writable_] totemDao
 * @property [] tokenMint
 * @property [] usdcMint
 * @property [] autocratProgram
 * @category Instructions
 * @category InitializeTotem
 * @category generated
 */
export type InitializeTotemInstructionAccounts = {
  signer: web3.PublicKey
  totem: web3.PublicKey
  totemDao: web3.PublicKey
  tokenMint: web3.PublicKey
  usdcMint: web3.PublicKey
  autocratProgram: web3.PublicKey
  systemProgram?: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const initializeTotemInstructionDiscriminator = [
  63, 198, 189, 186, 61, 95, 1, 58,
]

/**
 * Creates a _InitializeTotem_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category InitializeTotem
 * @category generated
 */
export function createInitializeTotemInstruction(
  accounts: InitializeTotemInstructionAccounts,
  args: InitializeTotemInstructionArgs,
  programId = new web3.PublicKey('ttmtyv2RyZoWJ1Dvg54XLJJmayFbhJEZzo7WJxMBZy7')
) {
  const [data] = initializeTotemStruct.serialize({
    instructionDiscriminator: initializeTotemInstructionDiscriminator,
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
      pubkey: accounts.tokenMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.usdcMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.autocratProgram,
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
