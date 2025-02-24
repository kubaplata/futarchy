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
    createDisputeStatementInstruction, createInitializeTotemInstruction, Dispute,
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
import {sha256} from "@noble/hashes/sha256";
import createLookupTables from "./createLookupTables.js";

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

async function disputeStatement() {
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

    const {
        statement: statementString
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

    const lookupTable = await createLookupTables(
        autocratClient.provider.connection,
        keypair,
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

    console.log(tx0);
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const vaultUsdcMintIx = autocratClient
        .vaultClient
        .initializeVaultIx(question, storedDao.usdcMint, 2);

    console.log(passBaseMint.toString());
    console.log(passQuoteMint.toString());
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

    const tx1 = await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );

    console.log(tx1);
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
    console.log(a);

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
    console.log(b);

    // this is how many original tokens are created
    const lpTokens = quoteTokensToLP;

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

    return await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );
}

async function createTotemDao() {

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
                twapMaxObservationChangePerUpdate: new BN(0)
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

    return await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );
}

async function proposeStatement() {
    const {
        statements
    } = await Totem.fromAccountAddress(
        autocratClient.provider.connection,
        totem
    );

    console.log(statements.toString());

    const [statement] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("statement"),
            new BN(statements).toArrayLike(Buffer, "le", 8)
        ],
        TOTEM_PROGRAM_ID
    );

    console.log(statement.toString());

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

    return await signAndSendTransaction(
        message,
        autocratClient.provider.connection,
        true,
        [keypair]
    );
}

async function passProposal() {
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

    console.log(slotsPerProposal.toString());

    console.log({
        usdcMint: usdcMint.toString(),
        tokenMint: tokenMint.toString()
    });

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

    console.log(slotEnqueued.toString());

    const {
        baseMint,
        quoteMint
    } = await autocratClient.ammClient.getAmm(passAmm);

    const {
        baseMint: failBaseMint,
        quoteMint: failQuoteMint
    } = await autocratClient.ammClient.getAmm(failAmm);

    console.log({
        baseMint: baseMint.toString(),
        quoteMint: quoteMint.toString(),
        failQuoteMint: failQuoteMint.toString(),
        failBaseMint: failBaseMint.toString()
    });

    const {
        conditionalTokenMints,
        underlyingTokenAccount,
        underlyingTokenMint
    } = await autocratClient
        .vaultClient
        .fetchVault(quoteVault);

    const a = await autocratClient
        .vaultClient
        .splitTokensIx(
            question,
            quoteVault,
            underlyingTokenMint,
            new BN(1500 * Math.pow(10, 6)),
            2,
            keypair.publicKey
        ).rpc();

    console.log({split: a});

    const tx = await autocratClient
        .ammClient
        .swapIx(
            passAmm,
            baseMint,
            quoteMint,
            { buy: {} },
            new BN(1500).muln(1_000_000),
            new BN(0)
        )
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
        ])
        .rpc({
            skipPreflight: true
        });

    const tx2 = await autocratClient
        .ammClient
        .swapIx(
            failAmm,
            baseMint,
            quoteMint,
            { buy: {} },
            new BN(100).muln(1_000_000),
            new BN(0)
        )
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
        ])
        .rpc({
            skipPreflight: true
        });

    console.log(tx2);
    return tx;
}

(async () => {
    // const {
    //     tokenMint,
    //     usdcMint
    // } = await autocratClient.getDao(totemDao);

    // const {
    //     question,
    //     quoteVault,
    //     passAmm,
    //     failAmm,
    //     baseVault,
    //     dao,
    //     proposer,
    //     failLpTokensLocked,
    //     nonce
    // } = await autocratClient.getProposal(new PublicKey("DHeutMkAZLy2LrQAeV7whvr2RJhV463rc1zkT6FxPa46"));


    // console.log(tokenMint.toString());
    //
    // const ata = getAssociatedTokenAddressSync(
    //     tokenMint,
    //     autocratClient.provider.publicKey,
    // );
    //
    // const ataUsdc = getAssociatedTokenAddressSync(
    //     usdcMint,
    //     autocratClient.provider.publicKey,
    // );
    //
    // // await createAssociatedTokenAccount(
    // //     autocratClient.provider.connection,
    // //     keypair,
    // //     tokenMint,
    // //     keypair.publicKey
    // // );
    // //
    // // await createAssociatedTokenAccount(
    // //     autocratClient.provider.connection,
    // //     keypair,
    // //     usdcMint,
    // //     keypair.publicKey
    // // );
    // //
    // // await new Promise(resolve => setTimeout(resolve, 10_000));
    //
    // const tx = await mintTo(
    //     autocratClient.provider.connection,
    //     keypair,
    //     new PublicKey("EBeGvD4h9yV6YHPaNabZ3cJUTEQvnS7HW3QBSwPSDrty"),
    //     ata,
    //     autocratClient.provider.publicKey,
    //     3000 * Math.pow(10, 6),
    //     []
    // );
    // const tx2 = await mintTo(
    //     autocratClient.provider.connection,
    //     keypair,
    //     usdcMint,
    //     ataUsdc,
    //     autocratClient.provider.publicKey,
    //     3000 * Math.pow(10, 6),
    //     []
    // );
    // console.log(tx, tx2);

    // const proposeTx = await proposeStatement();
    // console.log({ proposeTx });
    // await new Promise((resolve) => setTimeout(resolve, 30_000));
    // const disputeTx = await disputeStatement();
    //
    // console.log({
    //     proposeTx,
    //     disputeTx
    // });

    // const d = await createTotemDao();
    // console.log(d);

    // console.log(
    //     await passProposal()
    // );
})();

// (async () => {
//     console.log(
//         await passProposal()
//     );
// })();

// (async () => {
//     const {
//         statements
//     } = await Totem.fromAccountAddress(
//         autocratClient.provider.connection,
//         totem
//
//     );
//
//     const [statement] = PublicKey.findProgramAddressSync(
//         [
//             Buffer.from("statement"),
//             new BN(statements).subn(1).toArrayLike(Buffer, "le", 8)
//         ],
//         TOTEM_PROGRAM_ID
//     );
//
//     const {
//         dao
//     } = await Totem.fromAccountAddress(
//         autocratClient.provider.connection,
//         totem
//     );
//
//     const {
//         usdcMint: tokenMint
//     } = await autocratClient.getDao(dao);
//
//     const {
//         disputes
//     } = await Statement.fromAccountAddress(
//         autocratClient.provider.connection,
//         statement
//     );
//
//     const [dispute] = PublicKey.findProgramAddressSync(
//         [
//             Buffer.from("dispute"),
//             statement.toBuffer()
//         ],
//         TOTEM_PROGRAM_ID
//     );
//
//     const {
//         proposal
//     } = await Dispute.fromAccountAddress(
//         autocratClient.provider.connection,
//         dispute
//     );
//
//     const {
//         passAmm
//     } = await autocratClient.getProposal(proposal);
//
//     const {
//         baseMint,
//         quoteMint
//     } = await autocratClient.ammClient.getAmm(passAmm);
//
//     const ata = getAssociatedTokenAddressSync(
//         tokenMint,
//         keypair.publicKey,
//     );
//
//     // await createAssociatedTokenAccount(
//     //     autocratClient.provider.connection,
//     //     keypair,
//     //     baseMint,
//     //     keypair.publicKey,
//     // );
//
//     const ix = createMintToInstruction(
//         tokenMint,
//         ata,
//         autocratClient.provider.publicKey,
//         30_000 * Math.pow(10, 6),
//     );
//
//     const {
//         lastValidBlockHeight,
//         blockhash
//     } = await autocratClient.provider.connection.getLatestBlockhash();
//
//     const message = new TransactionMessage({
//         recentBlockhash: blockhash,
//         instructions: [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }), ix],
//         payerKey: keypair.publicKey
//     }).compileToV0Message();
//
//     const tx = await signAndSendTransaction(
//         message,
//         autocratClient.provider.connection,
//         true,
//         [keypair]
//     );
//
//     console.log(tx);
// })();

(async () => {
    console.log(
        await passProposal()
    );
})();

// (async () => {
//     const {
//         dao,
//         statements
//     } = await Totem.fromAccountAddress(
//         autocratClient.provider.connection,
//         totem
//     );
//
//     const [statement] = PublicKey
//         .findProgramAddressSync(
//             [
//                 Buffer.from("statement"),
//                 new BN(statements).subn(1).toArrayLike(Buffer, "le", 8)
//             ],
//             TOTEM_PROGRAM_ID
//         );
//
//     const [dispute] = PublicKey
//         .findProgramAddressSync(
//             [
//                 Buffer.from("dispute"),
//                 statement.toBuffer()
//             ],
//             TOTEM_PROGRAM_ID
//         );
//
//     const {
//         proposal
//     } = await Dispute
//         .fromAccountAddress(
//             autocratClient.provider.connection,
//             dispute
//         );
//
//     const {
//         tokenMint,
//         usdcMint
//     } = await autocratClient
//         .getDao(dao);
//
//     const {
//         passAmm,
//         failAmm
//     } = await autocratClient
//         .getProposal(proposal);
//
//     await autocratClient
//         .ammClient
//         .crankThatTwap(passAmm);
//
//     await autocratClient
//         .ammClient
//         .crankThatTwap(failAmm);
//
//     const txId = await autocratClient
//         .finalizeProposal(proposal);
//         // .preInstructions([
//         //     ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
//         // ])
//         // .rpc({
//         //     skipPreflight: true
//         // });
//
//     console.log(txId);
// })();