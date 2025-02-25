import {Dispute, PROGRAM_ID as TOTEM_PROGRAM_ID, Statement, Totem} from "../../totem_sdk/src/generated";
import {ComputeBudgetProgram, PublicKey} from "@solana/web3.js";
import BN from "bn.js";
import { autocratClient, totem, totemDao, keypair } from "./index";

export default async function passDispute() {
    const {
        statements
    } = await Totem
        .fromAccountAddress(
            autocratClient.provider.connection,
            totem
        );

    const [statement] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("statement"),
            new BN(statements).subn(1).toArrayLike(Buffer, "le", 8)
        ],
        TOTEM_PROGRAM_ID
    );

    const {
        disputes
    } = await Statement.fromAccountAddress(
        autocratClient.provider.connection,
        statement
    );

    const [dispute] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("dispute"),
            statement.toBuffer()
        ],
        TOTEM_PROGRAM_ID
    );

    const {
        usdcMint,
        tokenMint,
        slotsPerProposal
    } = await autocratClient.getDao(totemDao);

    const {
        proposal
    } = await Dispute.fromAccountAddress(
        autocratClient.provider.connection,
        dispute
    );

    const {
        passAmm,
        failAmm,
        question,
        baseVault,
        quoteVault,
        state,
        slotEnqueued
    } = await autocratClient.getProposal(proposal);

    const {
        baseMint,
        quoteMint
    } = await autocratClient.ammClient.getAmm(passAmm);

    const {
        baseMint: failBaseMint,
        quoteMint: failQuoteMint
    } = await autocratClient.ammClient.getAmm(failAmm);

    const {
        conditionalTokenMints,
        underlyingTokenAccount,
        underlyingTokenMint
    } = await autocratClient
        .vaultClient
        .fetchVault(quoteVault);

    console.log("Splitting tokens");
    const a = await autocratClient
        .vaultClient
        .splitTokensIx(
            question,
            quoteVault,
            underlyingTokenMint,
            new BN(15000 * Math.pow(10, 6)),
            2,
            keypair.publicKey
        )
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 })
        ])
        .rpc();
    console.log(`Tx: ${a}`);

    console.log("Buying pass market");
    const tx = await autocratClient
        .ammClient
        .swapIx(
            passAmm,
            baseMint,
            quoteMint,
            { buy: {} },
            new BN(15_000).muln(1_000_000),
            new BN(0)
        )
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
        ])
        .rpc({
            skipPreflight: true
        });

    console.log(`Tx: ${tx}`);
}