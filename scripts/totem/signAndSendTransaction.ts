import {Connection, Keypair, MessageV0, TransactionMessage, VersionedTransaction} from "@solana/web3.js";

export default async function signAndSendTransaction(
    message: MessageV0,
    connection: Connection,
    skipPreflight?: boolean,
    signers?: Keypair[],
) {
    const {
        lastValidBlockHeight,
        blockhash
    } = await connection.getLatestBlockhash();

    const transaction = new VersionedTransaction(message);

    transaction.sign(signers);

    const txid = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight }
    );

    await connection.confirmTransaction({
        lastValidBlockHeight,
        blockhash,
        signature: txid
    }, "confirmed");

    return txid;
}