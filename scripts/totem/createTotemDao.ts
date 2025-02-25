import {ComputeBudgetProgram, Keypair, SystemProgram, TransactionMessage} from "@solana/web3.js";
import {createMint} from "@solana/spl-token";
import {createInitializeTotemInstruction, PROGRAM_ID as TOTEM_PROGRAM_ID} from "../../totem_sdk/src/generated";
import {AUTOCRAT_PROGRAM_ID, PriceMath} from "@metadaoproject/futarchy/v0.4";
import BN from "bn.js";
import signAndSendTransaction from "./signAndSendTransaction";
import { autocratClient, keypair, totem, totemDao } from "./index";

export async function createTotemDao() {
    const mintKeypair = Keypair.generate();
    const mint = await createMint(
        autocratClient.provider.connection,
        keypair,
        keypair.publicKey,
        keypair.publicKey,
        6,
        mintKeypair
    );

    const usdcKeypair = Keypair.generate();
    const usdc = await createMint(
        autocratClient.provider.connection,
        keypair,
        keypair.publicKey,
        keypair.publicKey,
        6,
        usdcKeypair
    );

    console.log(`Created mints. Base: ${mint.toString()}, USDC: ${usdc.toString()}`);

    console.log(`Creating totemDAO`);

    const scaledPrice = PriceMath.getAmmPrice(
        1000,
        6,
        6
    );

    const ix = createInitializeTotemInstruction(
        {
            totem,
            totemDao,
            tokenMint: mintKeypair.publicKey,
            usdcMint: usdcKeypair.publicKey,
            autocratProgram: AUTOCRAT_PROGRAM_ID,
            signer: keypair.publicKey,
            systemProgram: SystemProgram.programId
        },
        {
            args: {
                slotsPerChallengePeriod: new BN(1000),
                slotsPerProposal: new BN(300),
                passThresholdBps: 5000,
                minBaseFutarchicLiquidity: new BN(0),
                minQuoteFutarchicLiquidity: new BN(0),
                twapInitialObservation: new BN(0),
                twapMaxObservationChangePerUpdate: scaledPrice.divn(50)
            }
        },
        TOTEM_PROGRAM_ID
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