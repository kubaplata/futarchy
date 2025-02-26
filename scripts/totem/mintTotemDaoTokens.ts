import {autocratClient, keypair, totemDao} from "./index";
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    getAssociatedTokenAddressSync
} from "@solana/spl-token";
import {ComputeBudgetProgram, TransactionMessage} from "@solana/web3.js";
import signAndSendTransaction from "./signAndSendTransaction";

export default async function mintTotemDaoTokens() {
    const {
        usdcMint,
        tokenMint
    } = await autocratClient
        .getDao(totemDao);

    const baseAta = getAssociatedTokenAddressSync(
        tokenMint,
        keypair.publicKey
    );

    const usdcAta = await getAssociatedTokenAddressSync(
        usdcMint,
        keypair.publicKey
    );

    const ataIx1 = createAssociatedTokenAccountIdempotentInstruction(
        keypair.publicKey,
        baseAta,
        keypair.publicKey,
        tokenMint
    );

    const ataIx2 = createAssociatedTokenAccountIdempotentInstruction(
        keypair.publicKey,
        usdcAta,
        keypair.publicKey,
        usdcMint
    );

    const ix1 = createMintToInstruction(
        tokenMint,
        baseAta,
        keypair.publicKey,
        300_000 * Math.pow(10, 6)
    );

    const ix2 = createMintToInstruction(
        usdcMint,
        usdcAta,
        keypair.publicKey,
        300_000 * Math.pow(10, 6)
    );

    console.log("Minting DAO tokens.");
    const {
        blockhash
    } = await autocratClient.provider.connection.getLatestBlockhash();
    const message = new TransactionMessage({
        instructions: [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
            ataIx1,
            ataIx2,
            ix1,
            ix2
        ],
        payerKey: keypair.publicKey,
        recentBlockhash: blockhash
    }).compileToV0Message();

    const tx = await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );
    console.log(`Tx: ${tx}`);
}