import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Dispute, Request, InitializeTotemArgs, Statement } from "../generated";
import BN from "bn.js";
export declare class Totem {
    connection: Connection;
    signer: PublicKey;
    private autocratClient;
    private totem;
    private totemDao;
    private proposer;
    private lookupTable?;
    private accountFromBuffer;
    constructor(connection: Connection, signer: PublicKey, lookupTable?: PublicKey);
    createToken(): Promise<{
        instructions: TransactionInstruction[];
        keypair: Keypair;
    }>;
    initializeDao(args: InitializeTotemArgs): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
    }>;
    deriveStatement(index: number | BN): PublicKey;
    deriveDispute(statement: PublicKey): PublicKey;
    proposeStatement(statement: string): Promise<TransactionInstruction>;
    disputeStatement(index: number | BN): Promise<TransactionInstruction[][]>;
    settleDispute(statementId: number | BN): Promise<TransactionInstruction>;
    private deriveRequest;
    private deriveFeeCollector;
    requestStatement(question: string, fee: BN): Promise<TransactionInstruction>;
    fetchStatements(): Promise<{
        pubkey: PublicKey;
        account: Statement;
    }[]>;
    fetchDisputes(): Promise<{
        pubkey: PublicKey;
        account: Dispute;
    }[]>;
    fetchRequests(): Promise<{
        pubkey: PublicKey;
        account: Request;
    }[]>;
}
