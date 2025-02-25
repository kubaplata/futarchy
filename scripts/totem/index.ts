import {AutocratClient, AUTOCRAT_PROGRAM_ID, getProposalAddr, InstructionUtils} from "@metadaoproject/futarchy/v0.4";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
    ComputeBudgetProgram,
    Keypair,
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    TransactionMessage, VersionedTransaction
} from "@solana/web3.js";
import {
    createCreateStatementInstruction,
    createDisputeStatementInstruction, createInitializeTotemInstruction, createUpdateTotemInstruction, Dispute,
    PROGRAM_ID as TOTEM_PROGRAM_ID, Statement,
    Totem
} from "../../totem_sdk/src/generated";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction, createMint, createMintToInstruction,
    getAssociatedTokenAddressSync, mintTo,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import signAndSendTransaction from "./signAndSendTransaction.js";
import bs58 from "bs58";
import {createTotemDao} from "./createTotemDao";
import proposeStatement from "./proposeStatement";
import disputeStatement from "./disputeStatement";
import mintTotemDaoTokens from "./mintTotemDaoTokens";
import passDispute from "./passDispute";
import crankProposal from "./crankProposal";
import finaliseProposal from "./finaliseProposal";
import settleDispute from "./settleDispute";
import getDispute from "./getDispute";

const keypair = Keypair.fromSecretKey(
    Uint8Array.from(
        bs58.decode(process.env.SECRET_KEY)
    )
);

let autocratClient: AutocratClient = AutocratClient.createClient({
    provider: anchor.AnchorProvider.env(),
});

const [totemDao] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("totem_dao")
    ],
    TOTEM_PROGRAM_ID
);

const [proposer] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("proposer")
    ],
    TOTEM_PROGRAM_ID
);

const [totem] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("totem")
    ],
    TOTEM_PROGRAM_ID
);

export {
    totemDao,
    proposer,
    totem,
    autocratClient,
    keypair,
}

function sleep(s: number) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function testFullFlow() {
    await createTotemDao();
    await sleep(10);

    await mintTotemDaoTokens();
    await sleep(10);

    await proposeStatement();
    await sleep(10);

    await disputeStatement();
    await sleep(10);

    await passDispute();
    await sleep(10);

    await crankProposal();
    await sleep(10);

    await finaliseProposal();
    await sleep(10);

    await settleDispute();
    const statementStatus = await getDispute();
    console.log(
        statementStatus.__kind,
        statementStatus.__kind === "Settled"
            ? "as " + statementStatus.fields[0]
            : null
    );
}

(async () => {
    await testFullFlow();
})();