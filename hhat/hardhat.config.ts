import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";
import { baseSepolia } from "viem/chains";

const config: HardhatUserConfig = {
    networks: {
        sepolia: {
            url: `https://sepolia.infura.io/v3/${process.env.PROJECT_ID}` || "",
            chainId: 11155111,
            accounts: [process.env.PRIVATE_KEY || ""],
        },

        amoy: {
            url:
                `https://polygon-amoy.infura.io/v3/${process.env.PROJECT_ID}` ||
                "",
            chainId: 80002,
            accounts: {
                mnemonic: process.env.MNEMONIC || "",
            },
        },

        polygon: {
            url:
                `https://polygon-mainnet.infura.io/v3/${process.env.PROJECT_ID}` ||
                "",
            chainId: 137,
            accounts: {
                mnemonic: process.env.MNEMONIC || "",
            },
        },
        base: {
            url:
                `https://base-sepolia.infura.io/v3/${process.env.PROJECT_ID}` ||
                "",
            chainId: 84532,
            accounts: {
                mnemonic: process.env.MNEMONIC || "",
            },
        },
    },

    etherscan: {
        apiKey: {
            baseSepolia: "ZUUSM353GMD451DGHB4WCRFKXT92NUNNUD",
        },
    },

    sourcify: {
        enabled: false,
    },

    solidity: {
        version: "0.8.27",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
};

export default config;
