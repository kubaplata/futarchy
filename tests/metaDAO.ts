import * as anchor from "@project-serum/anchor";

import { expect, assert } from "chai";

import {
  randomMemberName,
  sampleProposalAccountsAndInstructions,
  initializeSampleProposal,
  executeSampleProposal,
  initializeSampleConditionalExpression,
  initializeSampleConditionalVault,
} from "./testUtils";

import { MetaDao as MetaDAO } from "../target/types/meta_dao";
import { ProgramFacade } from "./programFacade";
import { PDAGenerator } from "./pdaGenerator";

export type Program = anchor.Program<MetaDAO>;
export type PublicKey = anchor.web3.PublicKey;
export type Signer = anchor.web3.Signer;

describe("meta_dao", async function () {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MetaDao as Program;

  let programFacade: ProgramFacade;
  let metaDAO: PublicKey;
  before(async function () {
    programFacade = new ProgramFacade(program);
    metaDAO = await programFacade.getOrCreateMetaDAO();
  });

  describe("#initialize_member", async function () {
    it("initializes members", async function () {
      await programFacade.initializeMember(randomMemberName());
    });
  });

  describe("#initialize_meta_dao", async function () {
    it("initializes the Meta-DAO", async function () {
      assert.isNotNull(metaDAO);
    });
  });

  describe("#initialize_proposal", async function () {
    it("initializes proposals", async function () {
      await initializeSampleProposal(programFacade);
    });

    it("rejects proposals that have non-members as signers", async function () {
      const [proposalAccounts, proposalInstructions] =
        sampleProposalAccountsAndInstructions(
          program,
          metaDAO,
          await programFacade.initializeMember(randomMemberName())
        );

      proposalInstructions[0]["signer"] = {
        kind: { member: {} },
        pubkey: await programFacade.initializeMember(randomMemberName()),
        pdaBump: 200,
      };
      await programFacade
        .initializeProposal(metaDAO, proposalInstructions, proposalAccounts)
        .then(
          () =>
            assert.fail(
              "proposal failed to throw when there was a non-member signer"
            ),
          (e) => assert.equal(e.error.errorCode.code, "InactiveMember")
        );
    });

    it("rejects proposals that mis-configure Meta-DAO signer objects", async function () {
      const [proposalAccounts, proposalInstructions] =
        sampleProposalAccountsAndInstructions(
          program,
          metaDAO,
          await programFacade.initializeMember(randomMemberName())
        );

      proposalInstructions[0]["signer"] = {
        kind: { metaDao: {} },
        pubkey: await programFacade.initializeMember(randomMemberName()),
        pdaBump: 255,
      };
      await programFacade
        .initializeProposal(metaDAO, proposalInstructions, proposalAccounts)
        .then(
          () =>
            assert.fail(
              "proposal failed to throw when there was an invalid Meta-DAO signer"
            ),
          (e) => assert.equal(e.error.errorCode.code, "InvalidMetaDAOSigner")
        );
    });

    it("", async function () {});
  });

  describe("#execute_proposal", async function () {
    it("executes proposals", async function () {
      const [proposal, memberToAdd] = await initializeSampleProposal(
        programFacade
      );

      await executeSampleProposal(proposal, memberToAdd, programFacade);
    });

    it("", async function () {});

    it("", async function () {});
  });

  describe("#initialize_conditional_expression", async function () {
    it("initializes conditional expressions", async function () {
      const [proposal] = await initializeSampleProposal(programFacade);

      await programFacade.initializeConditionalExpression(proposal, true);
      await programFacade.initializeConditionalExpression(proposal, false);
    });
  });

  describe.only("#initialize_conditional_vault", async function () {
    it("initializes conditional vaults", async function () {
      await initializeSampleConditionalVault(programFacade);
    });

    it("checks that `conditional_token_mint` and `underlying_token_mint` have the same number of decimals", async function () {
      const [conditionalExpression] = await initializeSampleConditionalExpression(programFacade);

      const [underlyingTokenMint] = await programFacade.createMint(3);

      await programFacade
        .initializeConditionalVault(conditionalExpression, underlyingTokenMint)
        .then(
          () =>
            assert.fail(
              "program didn't block a `conditional_token_mint` that used different decimals than the `underlying_token_mint`"
            ),
          (e) => assert.equal(e.error.errorCode.code, "ConstraintMintDecimals")
        );
    });

    it("checks that `vault_underlying_token_account` is owned by the vault", async function () {
      const [conditionalExpression] = await initializeSampleConditionalExpression(programFacade);

      const [underlyingTokenMint] = await programFacade.createMint();

      const maliciousUser = anchor.web3.Keypair.generate();

      const maliciousVaultUnderlyingTokenAccount =
        await programFacade.createTokenAccount(
          underlyingTokenMint,
          maliciousUser.publicKey
        );

      await programFacade
        .initializeConditionalVault(
          conditionalExpression,
          underlyingTokenMint,
          maliciousVaultUnderlyingTokenAccount
        )
        .then(
          () =>
            assert.fail(
              "program didn't block a `vault_underlying_token_account` that wasn't owned by the vault"
            ),
          (e) => assert.equal(e.error.errorCode.code, "ConstraintTokenOwner")
        );
    });

    it("checks that `vault_underlying_token_account` matches `underlying_token_mint`", async function () {
      const [conditionalExpression] = await initializeSampleConditionalExpression(programFacade);

      const [underlyingTokenMint] = await programFacade.createMint();

      const [vaultUnderlyingTokenAccountMint] =
        await programFacade.createMint();

      await programFacade
        .initializeConditionalVault(
          conditionalExpression,
          underlyingTokenMint,
          undefined,
          vaultUnderlyingTokenAccountMint
        )
        .then(
          () =>
            assert.fail(
              "program didn't block a `vault_underlying_token_account` with a mint other than `underlying_token_mint`"
            ),
          (e) => assert.equal(e.error.errorCode.code, "ConstraintTokenMint")
        );
    });

    it("checks that the vault is the mint authority of `conditional_token_mint`", async function () {
      const [conditionalExpression] = await initializeSampleConditionalExpression(programFacade);

      const [underlyingTokenMint] = await programFacade.createMint();

      // vault isn't the mint authority of this one
      const [maliciousConditionalTokenMint] = await programFacade.createMint();

      await programFacade
        .initializeConditionalVault(
          conditionalExpression,
          underlyingTokenMint,
          undefined,
          undefined,
          maliciousConditionalTokenMint
        )
        .then(
          () =>
            assert.fail(
              "program didn't block a `conditional_token_mint` that had a mint authority other than the vault"
            ),
          (e) =>
            assert.equal(e.error.errorCode.code, "ConstraintMintMintAuthority")
        );
    });
  });

  describe("#initialize_deposit_slip", async function () {
    it("initializes deposit slips", async function () {});
  });

  describe("#mint_conditional_tokens", async function () {
    it("", async function () {});

    it("", async function () {});

    it("", async function () {});
  });

  describe("#redeem_conditional_tokens_for_underlying_tokens", async function () {
    it("", async function () {});

    it("", async function () {});

    it("", async function () {});
  });

  describe("#redeem_deposit_slip_for_underlying_tokens", async function () {
    it("", async function () {});

    it("", async function () {});

    it("", async function () {});
  });

  describe("#", async function () {
    it("", async function () {});

    it("", async function () {});

    it("", async function () {});
  });
});
