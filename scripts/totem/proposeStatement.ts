import {createCreateStatementInstruction, PROGRAM_ID as TOTEM_PROGRAM_ID, Totem} from "../../totem_sdk/src/generated";
import {ComputeBudgetProgram, PublicKey, SystemProgram, TransactionMessage} from "@solana/web3.js";
import BN from "bn.js";
import signAndSendTransaction from "./signAndSendTransaction";
import { autocratClient, totem, keypair } from "./index";

export default async function proposeStatement() {
    const {
        statements
    } = await Totem.fromAccountAddress(
        autocratClient.provider.connection,
        totem
    );

    const [statement] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("statement"),
            new BN(statements).toArrayLike(Buffer, "le", 8)
        ],
        TOTEM_PROGRAM_ID
    );


    console.log("Proposing statement");
    const ix = createCreateStatementInstruction(
        {
            statement,
            signer: keypair.publicKey,
            totem,
            systemProgram: SystemProgram.programId
        },
        {
            args: {
                statement: "test statement"
            }
        }
    );

    const {
        lastValidBlockHeight,
        blockhash
    } = await autocratClient.provider.connection.getLatestBlockhash();

    const message = new TransactionMessage({
        recentBlockhash: blockhash,
        instructions: [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }), ix],
        payerKey: autocratClient.provider.publicKey,
    }).compileToV0Message();

    const tx = await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );
    console.log(`Tx: ${tx}`);
}