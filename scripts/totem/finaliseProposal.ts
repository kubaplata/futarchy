import {autocratClient, totem,} from "./index";
import {Totem, PROGRAM_ID as TOTEM_PROGRAM_ID, Statement, Dispute} from "../../totem_sdk/src/generated";
import {PublicKey} from "@solana/web3.js";
import BN from "bn.js";

export default async function finaliseProposal() {
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
        proposal
    } = await Dispute
        .fromAccountAddress(
            autocratClient.provider.connection,
            dispute
        );

    console.log("Finalising dispute");
    const tx = await autocratClient
        .finalizeProposal(proposal);

    console.log(`Tx: ${tx}`);
}