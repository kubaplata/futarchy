import {AnchorProvider, Program} from "@coral-xyz/anchor";
import {Totem} from "../../target/types/totem";
import TotemIdl from "../../target/idl/totem.json";
import * as anchor from "@coral-xyz/anchor";
import {
    ComputeBudgetProgram,
    Keypair,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction,
    createAssociatedTokenAccountInstruction,
    createInitializeMint2Instruction,
    createInitializeMintInstruction,
    createMint, createMintToInstruction,
    getAssociatedTokenAddressSync, MINT_SIZE,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
    AutocratClient,
    getProposalAddr, getQuestionAddr,
    InstructionUtils,
    PriceMath,
    AUTOCRAT_PROGRAM_ID
} from "@metadaoproject/futarchy/v0.4";
import {BN} from "bn.js";
import exp from "node:constants";
import {expect} from "chai";
import createLookupTables from "../../scripts/totem/createLookupTables";
import {sha256} from "@noble/hashes/sha256";

describe("totem", function () {
    this.timeout(60_000);

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = new Program<Totem>(
        TotemIdl,
        new PublicKey("totoRorVC1BCmAMFvxM55t9RjPMsGeTTVdUgGC9AF8g"),
        provider
    );

    const mintKeypair = Keypair.generate();
    const usdcKeypair = Keypair.generate();

    let autocratClient: AutocratClient = AutocratClient.createClient({
        provider: anchor.AnchorProvider.env(),
    });

    const [totemDao] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("totem_dao")
        ],
        program.programId
    );

    const [proposer] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("proposer")
        ],
        program.programId
    );

    const [totem] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("totem")
        ],
        program.programId
    );


    let startSlot;

    it('Initializes a DAO', async () => {
        const tokenAccountInstruction = SystemProgram.createAccount({
            programId: TOKEN_PROGRAM_ID,
            space: MINT_SIZE,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE),
            fromPubkey: provider.publicKey,
            newAccountPubkey: mintKeypair.publicKey
        });
        const tokenInstruction = createInitializeMint2Instruction(
            mintKeypair.publicKey,
            6,
            provider.publicKey,
            provider.publicKey,
        );
        const usdcAccountInstruction = SystemProgram.createAccount({
            programId: TOKEN_PROGRAM_ID,
            space: MINT_SIZE,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE),
            fromPubkey: provider.publicKey,
            newAccountPubkey: usdcKeypair.publicKey
        });
        const usdcInstruction = createInitializeMint2Instruction(
            usdcKeypair.publicKey,
            6,
            provider.publicKey,
            provider.publicKey,
        );

        const { blockhash } = await provider.connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: provider.publicKey,
            instructions: [
                tokenAccountInstruction,
                tokenInstruction,
                usdcAccountInstruction,
                usdcInstruction,
            ],
            recentBlockhash: blockhash
        }).compileToV0Message();
        let transaction = new VersionedTransaction(message);
        transaction.sign([usdcKeypair, mintKeypair]);
        transaction = await provider.wallet.signTransaction(transaction);
        await provider.sendAndConfirm(transaction);

        const scaledPrice = PriceMath.getAmmPrice(
            1000,
            6,
            6
        );

        await program
            .methods
            .initializeTotem({
                slotsPerChallengePeriod: new BN(1000),
                slotsPerProposal: new BN(300),
                passThresholdBps: 5000,
                minBaseFutarchicLiquidity: new BN(0),
                minQuoteFutarchicLiquidity: new BN(0),
                twapInitialObservation: new BN(0),
                twapMaxObservationChangePerUpdate: scaledPrice.divn(50)
            })
            .accounts({
                tokenMint: mintKeypair.publicKey,
                usdcMint: usdcKeypair.publicKey,
                totem,
                autocratProgram: AUTOCRAT_PROGRAM_ID,
                signer: provider.publicKey,
                systemProgram: SystemProgram.programId,
                totemDao
            })
            .rpc();

        const {
            slotsPerChallengePeriod,
            dao,
            admin,
            statements,
            totalDisputes
        } = await program
            .account
            .totem
            .fetch(totem);

        expect(dao.toString()).eq(totemDao.toString());
        expect(slotsPerChallengePeriod.toNumber()).eq(1000);
        expect(admin.toString()).eq(provider.publicKey.toString());
        expect(statements.toNumber()).eq(0);
        expect(totalDisputes.toNumber()).eq(0);
    });

    it('Proposes a statement', async () => {
        const {
            slotsPerChallengePeriod,
            dao,
            admin,
            statements,
            totalDisputes
        } = await program
            .account
            .totem
            .fetch(totem);

        const [statement] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("statement"),
                    new BN(statements).toArrayLike(Buffer, "le", 8)
                ],
                program.programId
            );

        const statementSlot = await provider.connection.getSlot();

        await program
            .methods
            .createStatement({
                statement: "Test statement."
            })
            .accounts({
                totem,
                systemProgram: SystemProgram.programId,
                signer: provider.publicKey,
                statement
            })
            .rpc();

        const {
            statement: statementContent,
            index,
            creator,
            status,
            createdAt,
            disputes
        } = await program
            .account
            .statement
            .fetch(statement);

        expect(index.toNumber()).eq(statements.toNumber());
        expect(disputes.toNumber()).eq(0);
        expect(creator.toString()).eq(provider.publicKey.toString());
        expect(statementContent).eq("Test statement.");
        expect(status.disputed).eq(undefined);
        expect(status.settled).eq(undefined);
        expect(status.proposed).not.eq(undefined);
        expect(createdAt.toNumber())
            .approximately(
                statementSlot,
                20 // 20 slots = 8 seconds, but this doesnt matter that much
            );
    });

    it("Mints DAO base and USDC tokens", async () => {
        const {
            usdcMint,
            tokenMint
        } = await autocratClient
            .getDao(totemDao);

        const baseAta = getAssociatedTokenAddressSync(
            tokenMint,
            provider.publicKey
        );

        const usdcAta = getAssociatedTokenAddressSync(
            usdcMint,
            provider.publicKey
        );

        const ataIx1 = createAssociatedTokenAccountIdempotentInstruction(
            provider.publicKey,
            baseAta,
            provider.publicKey,
            tokenMint
        );

        const ataIx2 = createAssociatedTokenAccountIdempotentInstruction(
            provider.publicKey,
            usdcAta,
            provider.publicKey,
            usdcMint
        );

        const ix1 = createMintToInstruction(
            tokenMint,
            baseAta,
            provider.publicKey,
            300_000 * Math.pow(10, 6)
        );

        const ix2 = createMintToInstruction(
            usdcMint,
            usdcAta,
            provider.publicKey,
            300_000 * Math.pow(10, 6)
        );

        const {
            blockhash
        } = await provider.connection.getLatestBlockhash();

        const message = new TransactionMessage({
            instructions: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
                ataIx1,
                ataIx2,
                ix1,
                ix2
            ],
            payerKey: provider.publicKey,
            recentBlockhash: blockhash
        }).compileToV0Message();

        let transaction = new VersionedTransaction(message);
        transaction = await provider.wallet.signTransaction(transaction);
        await provider.sendAndConfirm(transaction);
    });

    it('Disputes a statement', async () => {
        const {
            statements,
            dao
        } = await program
            .account
            .totem
            .fetch(totem);

        const {
            treasury
        } = await autocratClient
            .getDao(dao);

        const [statement] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("statement"),
                    new BN(statements).subn(1).toArrayLike(Buffer, "le", 8)
                ],
                program.programId
            );

        const [dispute] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("dispute"),
                    statement.toBuffer()
                ],
                program.programId
            );

        const {
            twapInitialObservation,
            twapMaxObservationChangePerUpdate,
            usdcMint,
            tokenMint
        } = await autocratClient
            .getDao(dao);

        const nonce = new BN(Math.floor(Math.random() * 5000));
        let [proposal] = getProposalAddr(
            autocratClient.autocrat.programId,
            proposer,
            nonce
        );

        const {
            passAmm,
            failAmm,
            question,
            baseVault,
            quoteVault,
            failLp: failLpMint,
            passLp: passLpMint,
            failQuoteMint,
            failBaseMint,
            passQuoteMint,
            passBaseMint,
        } = autocratClient
            .getProposalPdas(
                proposal,
                tokenMint,
                usdcMint,
                dao
            );

        const lookupTable = await createLookupTables(
            autocratClient.provider.connection,
            provider,
            [
                baseVault,
                quoteVault,
                passAmm,
                failAmm,
                passBaseMint,
                passQuoteMint,
                failBaseMint,
                failQuoteMint,
                failLpMint,
                passLpMint
            ]
        );

        await autocratClient
            .vaultClient
            .initializeQuestionIx(
                sha256(`Will ${proposal} pass?/FAIL/PASS`),
                proposal,
                2
            )
            .rpc();

        const vaultUsdcMintIx = autocratClient
            .vaultClient
            .initializeVaultIx(question, usdcMint, 2);


        const ammBaseIx= autocratClient
            .ammClient
            .initializeAmmIx(
                passBaseMint,
                passQuoteMint,
                twapInitialObservation,
                twapMaxObservationChangePerUpdate
            );

        const ammQuoteIx = autocratClient
            .ammClient
            .initializeAmmIx(
                failBaseMint,
                failQuoteMint,
                twapInitialObservation,
                twapMaxObservationChangePerUpdate
            );

        const vaultTokenMintIx = autocratClient
            .vaultClient
            .initializeVaultIx(question, tokenMint, 2);

        const instructions = await InstructionUtils.getInstructions(
            vaultTokenMintIx,
            vaultUsdcMintIx,
            ammBaseIx,
            ammQuoteIx
        );

        const { blockhash } = await provider.connection.getLatestBlockhash();
        const message = new TransactionMessage({
            recentBlockhash: blockhash,
            instructions,
            payerKey: provider.publicKey
        }).compileToV0Message(
            [(await provider.connection.getAddressLookupTable(lookupTable)).value]
        );

        let transaction = new VersionedTransaction(message);
        transaction = await provider.wallet.signTransaction(transaction);
        await provider.sendAndConfirm(transaction);

        const failLpVaultAccount = getAssociatedTokenAddressSync(
            failLpMint,
            treasury,
            true
        );

        const passLpVaultAccount = getAssociatedTokenAddressSync(
            passLpMint,
            treasury,
            true
        );

        const failLpUserAccount = getAssociatedTokenAddressSync(
            failLpMint,
            proposer,
            true
        );

        const passLpUserAccount = getAssociatedTokenAddressSync(
            passLpMint,
            proposer,
            true
        );

        const baseTokensToLP = new BN(1000 * Math.pow(10, 6));
        const quoteTokensToLP = new BN(1000 * Math.pow(10, 6));

        await autocratClient.vaultClient
            .splitTokensIx(
                question,
                baseVault,
                tokenMint,
                baseTokensToLP,
                2
            )
            .postInstructions(
                await InstructionUtils.getInstructions(
                    autocratClient.vaultClient.splitTokensIx(
                        question,
                        quoteVault,
                        usdcMint,
                        quoteTokensToLP,
                        2
                    )
                )
            )
            .rpc();

        await autocratClient.ammClient
            .addLiquidityIx(
                passAmm,
                passBaseMint,
                passQuoteMint,
                quoteTokensToLP,
                baseTokensToLP,
                new BN(0)
            )
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
            .rpc();

        const initPassLpVaultAccount = createAssociatedTokenAccountInstruction(
            provider.publicKey,
            passLpVaultAccount,
            treasury,
            passLpMint
        );

        const initPassLpUserAccount = createAssociatedTokenAccountInstruction(
            provider.publicKey,
            passLpUserAccount,
            proposer,
            passLpMint
        );

        const initFailLpUserAccount = createAssociatedTokenAccountInstruction(
            provider.publicKey,
            failLpUserAccount,
            proposer,
            failLpMint
        );

        const initFailLpVaultAccount = createAssociatedTokenAccountInstruction(
            provider.publicKey,
            failLpVaultAccount,
            treasury,
            failLpMint
        );

        await program
            .methods
            .disputeStatement({
                descriptionUrl: "https://rizzler.eu/",
                nonce,
                twapMaxObservationChangePerUpdate,
                twapInitialObservation,
                statement: statements.subn(1)
            })
            .accounts({
                proposal,
                passLpMint,
                failLpMint,
                dispute,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                passLpVaultAccount,
                failLpVaultAccount,
                failLpUserAccount,
                passLpUserAccount,
                question,
                baseVault,
                quoteVault,
                failAmm,
                passAmm,
                autocratProgram: AUTOCRAT_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                signer: provider.publicKey,
                statement,
                totem,
                proposer,
                totemDao,
            })
            .preInstructions([
                initFailLpUserAccount,
                initFailLpVaultAccount,
                initPassLpUserAccount,
                initPassLpVaultAccount,
            ])
            .rpc();
    });

    it('Passes the dispute.', async () => {
        const {
            statements
        } = await program
            .account
            .totem
            .fetch(totem);

        const [statement] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("statement"),
                    statements.toArrayLike(Buffer, "le", 8)
                ],
                program.programId
            );

        const [dispute] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("dispute"),
                    statement.toBuffer()
                ],
                program.programId
            );

        const {
            proposal
        } = await program
            .account
            .dispute
            .fetch(dispute);

        const {
            passAmm,
            failAmm,
            question,
            baseVault,
            quoteVault,
            state,
            slotEnqueued
        } = await autocratClient.getProposal(proposal);

        const {
            baseMint,
            quoteMint
        } = await autocratClient.ammClient.getAmm(passAmm);

        const {
            conditionalTokenMints,
            underlyingTokenAccount,
            underlyingTokenMint
        } = await autocratClient
            .vaultClient
            .fetchVault(quoteVault);

        await autocratClient
            .vaultClient
            .splitTokensIx(
                question,
                quoteVault,
                underlyingTokenMint,
                new BN(15000 * Math.pow(10, 6)),
                2,
                provider.publicKey
            )
            .rpc();

        await autocratClient
            .ammClient
            .swapIx(
                passAmm,
                baseMint,
                quoteMint,
                { buy: {} },
                new BN(15_000).muln(1_000_000),
                new BN(0)
            )
            .rpc();
    });
});