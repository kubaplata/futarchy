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
 * Arguments used to create {@link Totem}
 * @category Accounts
 * @category generated
 */
export type TotemArgs = {
  dao: web3.PublicKey
  slotsPerChallengePeriod: beet.bignum
  admin: web3.PublicKey
  statements: beet.bignum
  totalDisputes: beet.bignum
}

export const totemDiscriminator = [83, 175, 123, 79, 123, 47, 196, 36]
/**
 * Holds the data for the {@link Totem} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class Totem implements TotemArgs {
  private constructor(
    readonly dao: web3.PublicKey,
    readonly slotsPerChallengePeriod: beet.bignum,
    readonly admin: web3.PublicKey,
    readonly statements: beet.bignum,
    readonly totalDisputes: beet.bignum
  ) {}

  /**
   * Creates a {@link Totem} instance from the provided args.
   */
  static fromArgs(args: TotemArgs) {
    return new Totem(
      args.dao,
      args.slotsPerChallengePeriod,
      args.admin,
      args.statements,
      args.totalDisputes
    )
  }

  /**
   * Deserializes the {@link Totem} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [Totem, number] {
    return Totem.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link Totem} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<Totem> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find Totem account at ${address}`)
    }
    return Totem.fromAccountInfo(accountInfo, 0)[0]
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
    return beetSolana.GpaBuilder.fromStruct(programId, totemBeet)
  }

  /**
   * Deserializes the {@link Totem} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [Totem, number] {
    return totemBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link Totem} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return totemBeet.serialize({
      accountDiscriminator: totemDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link Totem}
   */
  static get byteSize() {
    return totemBeet.byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link Totem} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      Totem.byteSize,
      commitment
    )
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link Totem} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === Totem.byteSize
  }

  /**
   * Returns a readable version of {@link Totem} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      dao: this.dao.toBase58(),
      slotsPerChallengePeriod: (() => {
        const x = <{ toNumber: () => number }>this.slotsPerChallengePeriod
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      admin: this.admin.toBase58(),
      statements: (() => {
        const x = <{ toNumber: () => number }>this.statements
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      totalDisputes: (() => {
        const x = <{ toNumber: () => number }>this.totalDisputes
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
export const totemBeet = new beet.BeetStruct<
  Totem,
  TotemArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['dao', beetSolana.publicKey],
    ['slotsPerChallengePeriod', beet.u64],
    ['admin', beetSolana.publicKey],
    ['statements', beet.u64],
    ['totalDisputes', beet.u64],
  ],
  Totem.fromArgs,
  'Totem'
)
