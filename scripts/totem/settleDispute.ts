import {autocratClient, totem} from "./index";
import {Dispute, PROGRAM_ID as TOTEM_PROGRAM_ID, Totem} from "../../totem_sdk/src/generated";
import {PublicKey} from "@solana/web3.js";
import BN from "bn.js";

export default async function settleDispute() {
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

    const {
        state,
    } = await autocratClient
        .getProposal(proposal);

    console.log(`Executed: ${state.executed}`);
    console.log(`Failed: ${state.failed}`);
    console.log(`Passed: ${state.passed}`);
    console.log(`Pending: ${state.pending}`);

    console.log("Executing proposal callback instruction");
    const tx = await autocratClient
        .executeProposal(proposal);

    console.log(`Tx: ${tx}`);
}