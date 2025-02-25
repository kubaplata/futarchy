import {autocratClient, totem, totemDao,} from "./index";
import {Totem, PROGRAM_ID as TOTEM_PROGRAM_ID, Statement, Dispute} from "../../totem_sdk/src/generated";
import {PublicKey} from "@solana/web3.js";
import BN from "bn.js";

export default async function finaliseProposal() {
    const {
        statements
    } = await Totem
        .fromAccountAddress(
            autocratClient.provider.connection,
            totem
        );

    const [statement] = PublicKey
        .findProgramAddressSync(
            [
                Buffer.from("statement"),
                new BN(statements).subn(1).toArrayLike(Buffer, "le", 8)
            ],
            TOTEM_PROGRAM_ID
        );

    const [dispute] = PublicKey
        .findProgramAddressSync(
            [
                Buffer.from("dispute"),
                statement.toBuffer()
            ],
            TOTEM_PROGRAM_ID
        );

    const {
        proposal,
    } = await Dispute
        .fromAccountAddress(
            autocratClient.provider.connection,
            dispute
        );

    const {
        failAmm,
        passAmm,
    } = await autocratClient
        .getProposal(proposal);

    const passAmmData = await autocratClient
        .ammClient
        .getAmm(passAmm);

    console.log({
        lastUpdatedSlot: passAmmData.oracle.lastUpdatedSlot.toNumber(),
        createdAtSlot: passAmmData.createdAtSlot.toNumber()
    });

    let slotsPassedPassAmm = (passAmmData.oracle.lastUpdatedSlot.sub(passAmmData.createdAtSlot));
    let twapPassAmm = passAmmData.oracle.aggregator.div(slotsPassedPassAmm);

    // console.log({
    //     slotsPassedPassAmm: slotsPassedPassAmm.toNumber(),
    //     aggregatorPassAmm: passAmmData.oracle.aggregator.toNumber(),
    //     twapPassAmm: twapPassAmm.toNumber()
    // });

    const failAmmData = await autocratClient
        .ammClient
        .getAmm(failAmm);

    // console.log({
    //     lastUpdatedSlot: failAmmData.oracle.lastUpdatedSlot.toNumber(),
    //     createdAtSlot: failAmmData.createdAtSlot.toNumber()
    // });

    let slotsPassedFailAmm = (failAmmData.oracle.lastUpdatedSlot.sub(failAmmData.createdAtSlot));
    let twapFailAmm = failAmmData.oracle.aggregator.div(slotsPassedPassAmm);

    // console.log({
    //     slotsPassedFailAmm: slotsPassedFailAmm.toNumber(),
    //     aggregatorFailAmm: failAmmData.oracle.aggregator.toNumber(),
    //     twapFailAmm: twapFailAmm.toNumber()
    // });

    const {
        passThresholdBps
    } = await autocratClient
        .getDao(totemDao);

    const daoPassThresholdBps = passThresholdBps;
    const MAX_BPS = 10_000;
    const threshold = twapFailAmm
        .mul(new BN(MAX_BPS).add(new BN(daoPassThresholdBps)))
        .div(new BN(MAX_BPS));

    // console.log({
    //     threshold: threshold.toNumber(),
    //     pass: twapPassAmm.toNumber(),
    //     isOverThreshold: twapPassAmm.toNumber() > threshold.toNumber()
    // });

    console.log("Finalising dispute");
    const tx = await autocratClient
        .finalizeProposal(proposal);

    console.log(`Tx: ${tx}`);
}