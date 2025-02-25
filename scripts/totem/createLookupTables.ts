import {
    AddressLookupTableProgram,
    MessageV0,
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
    Connection,
    Keypair
} from "@solana/web3.js";
import {AnchorProvider} from "@coral-xyz/anchor";

export default async function createLookupTables(
    connection: Connection,
    signer: AnchorProvider,
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

    let transaction = new VersionedTransaction(message);
    transaction = await signer.wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(transaction.serialize());

    await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
    });

    return lookupTableAddress;
}