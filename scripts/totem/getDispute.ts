import {Dispute, PROGRAM_ID as TOTEM_PROGRAM_ID, Statement, Totem} from "../../totem_sdk/src/generated";
import {autocratClient, totem} from "./index";
import {PublicKey} from "@solana/web3.js";
import BN from "bn.js";

export default async function getDispute() {
    const {
        statements
    } = await Totem
        .fromAccountAddress(
            autocratClient.provider.connection,
            totem
        );

    const [statement] = PublicKey
        .findProgramAddressSync(
            [
                Buffer.from("statement"),
                new BN(statements).subn(1).toArrayLike(Buffer, "le", 8)
            ],
            TOTEM_PROGRAM_ID
        );

    const [dispute] = PublicKey
        .findProgramAddressSync(
            [
                Buffer.from("dispute"),
                statement.toBuffer()
            ],
            TOTEM_PROGRAM_ID
        );

    const {
        status
    } = await Statement
        .fromAccountAddress(
            autocratClient.provider.connection,
            statement
        );

    const {

    } = await Dispute
        .fromAccountAddress(
            autocratClient.provider.connection,
            dispute
        );

    return status;
}