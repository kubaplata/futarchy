import {
    createDisputeStatementInstruction,
    PROGRAM_ID as TOTEM_PROGRAM_ID,
    Statement,
    Totem
} from "../../totem_sdk/src/generated";
import {ComputeBudgetProgram, PublicKey, SystemProgram, TransactionMessage} from "@solana/web3.js";
import BN from "bn.js";
import {AUTOCRAT_PROGRAM_ID, getProposalAddr, InstructionUtils} from "@metadaoproject/futarchy/v0.4";
import createLookupTables from "./createLookupTables";
import {sha256} from "@noble/hashes/sha256";
import signAndSendTransaction from "./signAndSendTransaction";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { autocratClient, totem, totemDao, keypair, proposer } from "./index";

export default async function disputeStatement() {
    const {
        totalDisputes,
        dao,
        statements
    } = await Totem.fromAccountAddress(
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

    const [dispute] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("dispute"),
            statement.toBuffer()
        ],
        TOTEM_PROGRAM_ID
    );

    const storedDao = await autocratClient.getDao(totemDao);
    const nonce = new BN(Math.random() * 84829);

    let [proposal] = getProposalAddr(
        autocratClient.autocrat.programId,
        proposer,
        nonce
    );

    const {
        baseVault,
        quoteVault,
        passAmm,
        failAmm,
        passBaseMint,
        passQuoteMint,
        failBaseMint,
        failQuoteMint,
        failLp,
        passLp,
        question
    } = autocratClient.getProposalPdas(
        proposal,
        storedDao.tokenMint,
        storedDao.usdcMint,
        totemDao
    );

    console.log("Creating lookup table.");
    const lookupTable = await createLookupTables(
        autocratClient.provider.connection,
        autocratClient.provider,
        [
            baseVault,
            quoteVault,
            passAmm,
            failAmm,
            passBaseMint,
            passQuoteMint,
            failBaseMint,
            failQuoteMint,
            failLp,
            passLp
        ]
    );

    await new Promise(resolve => setTimeout(resolve, 10_000));

    console.log("Initializing question.");
    const tx0 = await autocratClient
        .vaultClient
        .initializeQuestionIx(
            sha256(`Will ${proposal} pass?/FAIL/PASS`),
            proposal,
            2
        )
        .preInstructions(
            [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 })]
        ).rpc({
            skipPreflight: true
        });

    console.log(`Tx: ${tx0}`);
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const vaultUsdcMintIx = autocratClient
        .vaultClient
        .initializeVaultIx(question, storedDao.usdcMint, 2);


    const ammBaseIx= autocratClient
        .ammClient
        .initializeAmmIx(
            passBaseMint,
            passQuoteMint,
            storedDao.twapInitialObservation,
            storedDao.twapMaxObservationChangePerUpdate
        );

    const ammQuoteIx = autocratClient
        .ammClient
        .initializeAmmIx(
            failBaseMint,
            failQuoteMint,
            storedDao.twapInitialObservation,
            storedDao.twapMaxObservationChangePerUpdate
        );

    const instructions = await InstructionUtils.getInstructions(
        vaultUsdcMintIx,
        ammBaseIx,
        ammQuoteIx
    );

    const vaultTokenMintIx = autocratClient
        .vaultClient
        .initializeVaultIx(question, storedDao.tokenMint, 2);


    let {
        lastValidBlockHeight,
        blockhash
    } = await autocratClient.provider.connection.getLatestBlockhash();

    let message = new TransactionMessage({
        recentBlockhash: blockhash,
        instructions: [
            // questionIx,
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
            ...(await InstructionUtils.getInstructions(
                vaultTokenMintIx
            )),
            ...instructions,
        ],
        payerKey: autocratClient.provider.publicKey,
    }).compileToV0Message(
        [(await autocratClient
            .provider
            .connection
            .getAddressLookupTable(lookupTable))
            .value]
    );

    console.log("Initializing vaults & AMMs");
    const tx1 = await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );

    console.log(`Tx: ${tx1}`);
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const failLpVaultAccount = getAssociatedTokenAddressSync(
        failLp,
        storedDao.treasury,
        true
    );

    const passLpVaultAccount = getAssociatedTokenAddressSync(
        passLp,
        storedDao.treasury,
        true
    );

    const failLpUserAccount = getAssociatedTokenAddressSync(
        failLp,
        proposer,
        true
    );

    const passLpUserAccount = getAssociatedTokenAddressSync(
        passLp,
        proposer,
        true
    );

    const initPassLpVaultAccount = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        passLpVaultAccount,
        storedDao.treasury,
        passLp
    );

    const initPassLpUserAccount = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        passLpUserAccount,
        proposer,
        passLp
    );

    const initFailLpUserAccount = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        failLpUserAccount,
        proposer,
        failLp
    );

    const initFailLpVaultAccount = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        failLpVaultAccount,
        storedDao.treasury,
        failLp
    );

    const baseTokensToLP = new BN(1000 * Math.pow(10, 6));
    const quoteTokensToLP = new BN(1000 * Math.pow(10, 6));

    console.log("Adding liquidity.");
    const a = await autocratClient.vaultClient
        .splitTokensIx(
            question,
            baseVault,
            storedDao.tokenMint,
            baseTokensToLP,
            2
        )
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
        ])
        .postInstructions(
            await InstructionUtils.getInstructions(
                autocratClient.vaultClient.splitTokensIx(
                    question,
                    quoteVault,
                    storedDao.usdcMint,
                    quoteTokensToLP,
                    2
                )
            )
        )
        .rpc({
            skipPreflight: true,
        });

    const b = await autocratClient.ammClient
        .addLiquidityIx(
            passAmm,
            passBaseMint,
            passQuoteMint,
            quoteTokensToLP,
            baseTokensToLP,
            new BN(0)
        )
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
        ])
        .postInstructions(
            await InstructionUtils.getInstructions(
                autocratClient.ammClient.addLiquidityIx(
                    failAmm,
                    failBaseMint,
                    failQuoteMint,
                    quoteTokensToLP,
                    baseTokensToLP,
                    new BN(0)
                )
            )
        )
        .rpc({
            skipPreflight: true
        });

    console.log(`Tx: ${a}`);
    console.log(`Tx: ${b}`);

    console.log(`Disputing statement.`);
    const ix = createDisputeStatementInstruction(
        {
            proposal,
            passAmm,
            failAmm,
            quoteVault,
            question,
            autocratProgram: AUTOCRAT_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            passLpUserAccount,
            passLpVaultAccount,
            statement,
            totemDao,
            proposer,
            totem,
            dispute,
            signer: autocratClient.provider.publicKey,
            failLpMint: failLp,
            passLpMint: passLp,
            baseVault,
            failLpVaultAccount,
            failLpUserAccount,

        },
        {
            args: {
                statement: new BN(statements).subn(1),
                nonce,
                descriptionUrl: "https://rizzler.eu",
                twapInitialObservation: storedDao.twapInitialObservation,
                twapMaxObservationChangePerUpdate: storedDao.twapMaxObservationChangePerUpdate,
            }
        },
        TOTEM_PROGRAM_ID
    );

    const blockhashData = await autocratClient.provider.connection.getLatestBlockhash();
    message = new TransactionMessage({
        recentBlockhash: blockhashData.blockhash,
        instructions: [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
            initFailLpVaultAccount,
            initPassLpVaultAccount,
            initFailLpUserAccount,
            initPassLpUserAccount,
            ix
        ],
        payerKey: autocratClient.provider.publicKey,
    }).compileToV0Message();

    const tx3 = await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );
    console.log(`Tx: ${tx3}`);
}