import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const walletAddr = "0xC4b9190C160253071375c4d3e4f2574E8Bb57FD5";

const onlyGoalsToken = buildModule("onlyRankerToken", (m) => {
    const token = m.contract("RankersToken");
    m.call(token, "mint", [walletAddr, BigInt(1000000000000000)]);

    return { token };
});

export default onlyGoalsToken;
