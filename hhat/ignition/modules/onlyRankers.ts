import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const rankersTokenAddr = "0x0bB0b3bf86776a4bAB597A3A84A9591B13cF9d7a";

const onlyGoals = buildModule("onlyRankers", (m) => {
    const goal = m.contract("Rankers", [rankersTokenAddr]);

    return { goal };
});

export default onlyGoals;
