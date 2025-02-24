import {
    AddressLookupTableProgram,
    MessageV0,
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
    Connection,
    Keypair
} from "@solana/web3.js";

export default async function createLookupTables(
    connection: Connection,
    signer: Keypair,
    addresses: PublicKey[]
) {
    const {
        lastValidBlockHeight,
        blockhash
    } = await connection.getLatestBlockhash();

    const slot = await connection.getSlot('finalized');

    const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        payer: signer.publicKey,
        authority: signer.publicKey,
        recentSlot: slot,
    });

    const extendIx = AddressLookupTableProgram.extendLookupTable({
        payer: signer.publicKey,
        lookupTable: lookupTableAddress,
        authority: signer.publicKey,
        addresses
    });

    const message = new TransactionMessage({
        payerKey: signer.publicKey,
        instructions: [createIx, extendIx],
        recentBlockhash: blockhash
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    transaction.sign([signer]);
    const signature = await connection.sendRawTransaction(transaction.serialize());

    await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
    });

    return lookupTableAddress;
}