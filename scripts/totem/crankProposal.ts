import {Totem, PROGRAM_ID as TOTEM_PROGRAM_ID, Dispute} from "../../totem_sdk/src/generated";
import {autocratClient, totem} from "./index";
import {PublicKey} from "@solana/web3.js";
import BN from "bn.js";
import {AUTOCRAT_PROGRAM_ID} from "@metadaoproject/futarchy/v0.4";

export default async function crankProposal() {
    const {
        dao,
        statements
    } = await Totem.fromAccountAddress(
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
        tokenMint,
        usdcMint,
        treasury
    } = await autocratClient
        .getDao(dao);

    const [derivedTreasury] = PublicKey
        .findProgramAddressSync(
            [
                dao.toBuffer()
            ],
            AUTOCRAT_PROGRAM_ID
        );

    console.log({ treasury: treasury.toString(), derivedTreasury: derivedTreasury.toString() });

    const {
        passAmm,
        failAmm
    } = await autocratClient
        .getProposal(proposal);

    const tx0 = await autocratClient
        .ammClient
        .crankThatTwap(passAmm);

    const tx1 = await autocratClient
        .ammClient
        .crankThatTwap(failAmm);

    console.log("Cranked fail&pass twaps");
    console.log(`Tx: ${tx0}`);
    console.log(`Tx: ${tx1}`);
}