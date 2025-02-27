import {
    AccountInfo,
    ComputeBudgetProgram,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {
    AMM_PROGRAM_ID,
    AUTOCRAT_PROGRAM_ID,
    AutocratClient,
    CONDITIONAL_VAULT_PROGRAM_ID, getProposalAddr, InstructionUtils, sleep
} from "@metadaoproject/futarchy/v0.4";
import {AnchorProvider} from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/browser/src/nodewallet";
import {
    createCreateStatementInstruction,
    createDisputeStatementInstruction,
    createInitializeTotemInstruction,
    createRequestStatementInstruction,
    createSettleDisputeInstruction,
    Dispute,
    Request,
    disputeDiscriminator,
    InitializeTotemArgs,
    PROGRAM_ID as TOTEM_PROGRAM_ID,
    Statement,
    statementDiscriminator,
    Totem as TotemCore, requestDiscriminator
} from "../generated";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createInitializeMintInstruction,
    getAssociatedTokenAddressSync,
    MINT_SIZE,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import BN from "bn.js";
import {sha256} from "@noble/hashes/sha256";

type TotemAccount = TotemCore | Statement | Dispute | Request;

export class Totem {
    connection: Connection;
    signer: PublicKey;
    private autocratClient: AutocratClient;
    private totem: PublicKey;
    private totemDao: PublicKey;
    private proposer: PublicKey;
    private lookupTable?: PublicKey;

    private accountFromBuffer<T extends TotemAccount>(
        schema: { fromAccountInfo: (accountInfo: AccountInfo<Buffer>) => [T, number] },
        accountInfo: AccountInfo<Buffer>
    ): T {
        return schema.fromAccountInfo(accountInfo)[0];
    }

    constructor(
        connection: Connection,
        signer: PublicKey,
        lookupTable?: PublicKey,
    ) {
        const fakeWallet = new NodeWallet(Keypair.generate());

        const anchorProvider = new AnchorProvider(
            connection,
            fakeWallet,
            {
                skipPreflight: false,
            }
        );

        const autocratClient = new AutocratClient(
            anchorProvider,
            AUTOCRAT_PROGRAM_ID,
            CONDITIONAL_VAULT_PROGRAM_ID,
            AMM_PROGRAM_ID,
            [] // TODO: add lookup tables
        );

        this.connection = connection;
        this.signer = signer;
        this.autocratClient = autocratClient;

        const [totem] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("totem")
                ],
                TOTEM_PROGRAM_ID
            );

        const [totemDao] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("totem_dao")
                ],
                TOTEM_PROGRAM_ID
            );

        const [proposer] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("proposer")
                ],
                TOTEM_PROGRAM_ID
            );

        this.totem = totem;
        this.totemDao = totemDao;
        this.proposer = proposer;
        this.lookupTable = lookupTable;
    }

    async createToken() {
        const keypair = Keypair.generate();

        const lamports = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        const createAccountIx = SystemProgram.createAccount({
            newAccountPubkey: keypair.publicKey,
            fromPubkey: this.signer,
            lamports,
            programId: TOKEN_PROGRAM_ID,
            space: MINT_SIZE
        });

        const ix = createInitializeMintInstruction(
            keypair.publicKey,
            6,
            this.signer,
            this.signer
        );

        return {
            instructions: [createAccountIx, ix],
            keypair
        }
    }

    async initializeDao(
        args: InitializeTotemArgs
    ) {
        const createBaseToken = await this.createToken();
        const createUsdcToken = await this.createToken();

        const ix = createInitializeTotemInstruction(
            {
                signer: this.signer,
                totem: this.totem,
                totemDao: this.totemDao,
                usdcMint: createUsdcToken.keypair.publicKey,
                tokenMint: createBaseToken.keypair.publicKey,
                systemProgram: SystemProgram.programId,
                autocratProgram: AUTOCRAT_PROGRAM_ID,
            },
            {
                args
            }
        );

        return {
            instructions: [...createBaseToken.instructions, ...createUsdcToken.instructions, ix],
            signers: [createBaseToken.keypair, createUsdcToken.keypair]
        }
    }

    deriveStatement(index: number | BN) {
        const [statement] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("statement"),
                    new BN(index).toArrayLike(Buffer, "le", 8)
                ],
                TOTEM_PROGRAM_ID
            );

        return statement;
    }

    deriveDispute(statement: PublicKey) {
        const [dispute] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("dispute"),
                    statement.toBuffer()
                ],
                TOTEM_PROGRAM_ID
            );

        return dispute;
    }

    async proposeStatement(
        statement: string,
    ) {
        const {
            statements
        } = await TotemCore
            .fromAccountAddress(
                this.connection,
                this.totem
            );

        const ix = createCreateStatementInstruction(
            {
                totem: this.totem,
                statement: this.deriveStatement(new BN(statements.toString())),
                systemProgram: SystemProgram.programId,
                signer: this.signer
            },
            {
                args: {
                    statement
                }
            }
        );

        return ix;
    }

    async disputeStatement(index: number | BN) {
        const statement = this.deriveStatement(index);
        const dispute = this.deriveDispute(statement);

        const {
            treasury,
            twapInitialObservation,
            twapMaxObservationChangePerUpdate,
            usdcMint,
            tokenMint
        } = await this.autocratClient
            .getDao(this.totemDao);

        const nonce = new BN(Math.floor(Math.random() * 5000));

        let [proposal] = getProposalAddr(
            this.autocratClient.autocrat.programId,
            this.proposer,
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
        } = this.autocratClient
            .getProposalPdas(
                proposal,
                tokenMint,
                usdcMint,
                this.totemDao
            );

        const transactions: TransactionInstruction[][] = [];

        const {
            instructions: initializeQuestionInstructions
        } = await this.autocratClient
            .vaultClient
            .initializeQuestionIx(
                sha256(`Will ${proposal} pass?/FAIL/PASS`),
                proposal,
                2
            )
            .transaction();

        transactions.push(initializeQuestionInstructions);

        const vaultUsdcMintIx = this.autocratClient
            .vaultClient
            .initializeVaultIx(question, usdcMint, 2);

        const vaultTokenMintIx = this.autocratClient
            .vaultClient
            .initializeVaultIx(question, tokenMint, 2);

        const ammBaseIx = this.autocratClient
            .ammClient
            .initializeAmmIx(
                passBaseMint,
                passQuoteMint,
                twapInitialObservation,
                twapMaxObservationChangePerUpdate
            );

        const ammQuoteIx = this.autocratClient
            .ammClient
            .initializeAmmIx(
                failBaseMint,
                failQuoteMint,
                twapInitialObservation,
                twapMaxObservationChangePerUpdate
            );

        const instructions = await InstructionUtils.getInstructions(
            vaultTokenMintIx,
            vaultUsdcMintIx,
            ammBaseIx,
            ammQuoteIx
        );

        transactions.push(instructions);

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
            this.proposer,
            true
        );

        const passLpUserAccount = getAssociatedTokenAddressSync(
            passLpMint,
            this.proposer,
            true
        );

        const baseTokensToLP = new BN(1000 * Math.pow(10, 6));
        const quoteTokensToLP = new BN(1000 * Math.pow(10, 6));

        const {
            instructions: splitTokensInstructions
        } = await this.autocratClient.vaultClient
            .splitTokensIx(
                question,
                baseVault,
                tokenMint,
                baseTokensToLP,
                2
            )
            .postInstructions(
                await InstructionUtils.getInstructions(
                    this.autocratClient.vaultClient.splitTokensIx(
                        question,
                        quoteVault,
                        usdcMint,
                        quoteTokensToLP,
                        2
                    )
                )
            )
            .transaction();

        transactions.push(splitTokensInstructions);

        const {
            instructions: addLiquidityInstructions
        } = await this.autocratClient.ammClient
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
                    this.autocratClient.ammClient.addLiquidityIx(
                        failAmm,
                        failBaseMint,
                        failQuoteMint,
                        quoteTokensToLP,
                        baseTokensToLP,
                        new BN(0)
                    )
                )
            )
            .transaction();

        transactions.push(addLiquidityInstructions);

        const initPassLpVaultAccount = createAssociatedTokenAccountIdempotentInstruction(
            this.signer,
            passLpVaultAccount,
            treasury,
            passLpMint
        );

        const initPassLpUserAccount = createAssociatedTokenAccountIdempotentInstruction(
            this.signer,
            passLpUserAccount,
            this.proposer,
            passLpMint
        );

        const initFailLpUserAccount = createAssociatedTokenAccountIdempotentInstruction(
            this.signer,
            failLpUserAccount,
            this.proposer,
            failLpMint
        );

        const initFailLpVaultAccount = createAssociatedTokenAccountIdempotentInstruction(
            this.signer,
            failLpVaultAccount,
            treasury,
            failLpMint
        );

        const disputeInstruction = createDisputeStatementInstruction(
            {
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
                signer: this.signer,
                statement,
                totem: this.totem,
                proposer: this.proposer,
                totemDao: this.totemDao,
            },
            {
                args: {
                    statement: index,
                    nonce,
                    descriptionUrl: "there is no url",
                    twapInitialObservation,
                    twapMaxObservationChangePerUpdate
                }
            },
            TOTEM_PROGRAM_ID
        );

        transactions.push([
            initPassLpVaultAccount,
            initPassLpUserAccount,
            initFailLpVaultAccount,
            initFailLpUserAccount,
            disputeInstruction
        ]);

        return transactions;
    }

    async settleDispute(statementId: number | BN) {
        const statement = this.deriveStatement(statementId);
        const dispute = this.deriveDispute(statement);

        const {
            proposal
        } = await Dispute
            .fromAccountAddress(
                this.connection,
                dispute
            );

        const ix = createSettleDisputeInstruction(
            {
                dispute,
                signer: this.signer,
                totem: this.totem,
                totemDao: this.totemDao,
                statement,
                proposal
            },
            {
                args: {
                    statement: statementId,
                }
            }
        );

        return ix;
    }

    private deriveRequest(requestId: number | BN) {
        const [request] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("request"),
                    new BN(requestId).toArrayLike(Buffer, "le", 8)
                ],
                TOTEM_PROGRAM_ID
            );

        return request;
    }

    private deriveFeeCollector(request: PublicKey) {
        const [feeCollector] = PublicKey
            .findProgramAddressSync(
                [
                    Buffer.from("fee_collector"),
                    request.toBuffer()
                ],
                TOTEM_PROGRAM_ID
            );

        return feeCollector;
    }

    async requestStatement(
        question: string,
        fee: BN
    ) {
        const {
            requests
        } = await TotemCore
            .fromAccountAddress(
                this.connection,
                this.totem
            );

        const request = this.deriveRequest(
            new BN(requests.toString())
        );

        const feeCollector = this.deriveFeeCollector(request);

        return createRequestStatementInstruction(
            {
                request,
                totem: this.totem,
                systemProgram: SystemProgram.programId,
                signer: this.signer,
                feeCollector,
            },
            {
                args: {
                    question,
                    fee
                }
            },
            TOTEM_PROGRAM_ID
        );
    }

    async fetchStatements() {
        const accounts = await Statement
            .gpaBuilder(TOTEM_PROGRAM_ID)
            .addFilter("accountDiscriminator", statementDiscriminator)
            .run(this.connection);

        return accounts.map(({ pubkey, account }) => ({ pubkey, account: this.accountFromBuffer(Statement, account) }));
    }

    async fetchDisputes() {
        const accounts = await Dispute
            .gpaBuilder(TOTEM_PROGRAM_ID)
            .addFilter("accountDiscriminator", disputeDiscriminator)
            .run(this.connection);

        return accounts.map(({ pubkey, account }) => ({ pubkey, account: this.accountFromBuffer(Dispute, account) }));
    }

    async fetchRequests() {
        const accounts = await Request
            .gpaBuilder(TOTEM_PROGRAM_ID)
            .addFilter("accountDiscriminator", requestDiscriminator)
            .run(this.connection);

        return accounts.map(({ pubkey, account }) => ({ pubkey, account: this.accountFromBuffer(Request, account) }));
    }


}