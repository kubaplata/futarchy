/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'

/**
 * Arguments used to create {@link Dispute}
 * @category Accounts
 * @category generated
 */
export type DisputeArgs = {
  statement: web3.PublicKey
  index: beet.bignum
  proposal: web3.PublicKey
}

export const disputeDiscriminator = [36, 49, 241, 67, 40, 36, 241, 74]
/**
 * Holds the data for the {@link Dispute} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class Dispute implements DisputeArgs {
  private constructor(
    readonly statement: web3.PublicKey,
    readonly index: beet.bignum,
    readonly proposal: web3.PublicKey
  ) {}

  /**
   * Creates a {@link Dispute} instance from the provided args.
   */
  static fromArgs(args: DisputeArgs) {
    return new Dispute(args.statement, args.index, args.proposal)
  }

  /**
   * Deserializes the {@link Dispute} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [Dispute, number] {
    return Dispute.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link Dispute} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<Dispute> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find Dispute account at ${address}`)
    }
    return Dispute.fromAccountInfo(accountInfo, 0)[0]
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
    return beetSolana.GpaBuilder.fromStruct(programId, disputeBeet)
  }

  /**
   * Deserializes the {@link Dispute} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [Dispute, number] {
    return disputeBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link Dispute} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return disputeBeet.serialize({
      accountDiscriminator: disputeDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link Dispute}
   */
  static get byteSize() {
    return disputeBeet.byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link Dispute} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      Dispute.byteSize,
      commitment
    )
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link Dispute} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === Dispute.byteSize
  }

  /**
   * Returns a readable version of {@link Dispute} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      statement: this.statement.toBase58(),
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
      proposal: this.proposal.toBase58(),
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const disputeBeet = new beet.BeetStruct<
  Dispute,
  DisputeArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['statement', beetSolana.publicKey],
    ['index', beet.u64],
    ['proposal', beetSolana.publicKey],
  ],
  Dispute.fromArgs,
  'Dispute'
)
