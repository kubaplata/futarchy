/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { Status, statusBeet } from '../types/Status'

/**
 * Arguments used to create {@link Statement}
 * @category Accounts
 * @category generated
 */
export type StatementArgs = {
  index: beet.bignum
  creator: web3.PublicKey
  statement: string
  status: Status
  disputes: beet.bignum
  createdAt: beet.bignum
}

export const statementDiscriminator = [202, 2, 247, 46, 97, 244, 139, 209]
/**
 * Holds the data for the {@link Statement} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class Statement implements StatementArgs {
  private constructor(
    readonly index: beet.bignum,
    readonly creator: web3.PublicKey,
    readonly statement: string,
    readonly status: Status,
    readonly disputes: beet.bignum,
    readonly createdAt: beet.bignum
  ) {}

  /**
   * Creates a {@link Statement} instance from the provided args.
   */
  static fromArgs(args: StatementArgs) {
    return new Statement(
      args.index,
      args.creator,
      args.statement,
      args.status,
      args.disputes,
      args.createdAt
    )
  }

  /**
   * Deserializes the {@link Statement} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [Statement, number] {
    return Statement.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link Statement} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<Statement> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find Statement account at ${address}`)
    }
    return Statement.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'totAWMiimTLs7yTLAfWtJMmtNKmT5xpU6YM8vAYoqZ5'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, statementBeet)
  }

  /**
   * Deserializes the {@link Statement} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [Statement, number] {
    return statementBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link Statement} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return statementBeet.serialize({
      accountDiscriminator: statementDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link Statement} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: StatementArgs) {
    const instance = Statement.fromArgs(args)
    return statementBeet.toFixedFromValue({
      accountDiscriminator: statementDiscriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link Statement} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: StatementArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      Statement.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link Statement} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      index: (() => {
        const x = <{ toNumber: () => number }>this.index
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      creator: this.creator.toBase58(),
      statement: this.statement,
      status: this.status.__kind,
      disputes: (() => {
        const x = <{ toNumber: () => number }>this.disputes
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      createdAt: (() => {
        const x = <{ toNumber: () => number }>this.createdAt
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const statementBeet = new beet.FixableBeetStruct<
  Statement,
  StatementArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['index', beet.u64],
    ['creator', beetSolana.publicKey],
    ['statement', beet.utf8String],
    ['status', statusBeet],
    ['disputes', beet.u64],
    ['createdAt', beet.u64],
  ],
  Statement.fromArgs,
  'Statement'
)
