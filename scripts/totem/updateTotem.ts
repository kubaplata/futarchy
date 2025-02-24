import {ComputeBudgetProgram, PublicKey, TransactionMessage} from "@solana/web3.js";
import {AUTOCRAT_PROGRAM_ID} from "@metadaoproject/futarchy/v0.4";
import {createUpdateTotemInstruction, PROGRAM_ID as TOTEM_PROGRAM_ID} from "../../totem_sdk/src/generated";
import signAndSendTransaction from "./signAndSendTransaction";
import {autocratClient, keypair, totem, totemDao} from "./index";

export default async function updateTotem() {
    const [treasury] = PublicKey
        .findProgramAddressSync(
            [totemDao.toBuffer()],
            AUTOCRAT_PROGRAM_ID
        );

    console.log("Updating totem");
    const ix = createUpdateTotemInstruction(
        {
            totem,
            totemDao,
            signer: keypair.publicKey,
            autocratProgram: AUTOCRAT_PROGRAM_ID,
            treasury,
        },
        {
            args: {
                twapMaxObservationChangePerUpdate: 100,
                twapInitialObservation: null,
                passThresholdBps: null,
                slotsPerProposal: null,
                slotsPerChallengePeriod: null,
                minQuoteFutarchicLiquidity: null,
                minBaseFutarchicLiquidity: null
            }
        },
        TOTEM_PROGRAM_ID
    );

    const {
        blockhash
    } = await autocratClient.provider.connection.getLatestBlockhash();

    const message = new TransactionMessage({
        recentBlockhash: blockhash,
        payerKey: keypair.publicKey,
        instructions: [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
            ix
        ]
    }).compileToV0Message();

    const tx= await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );

    console.log(`Tx: ${tx}`);
}