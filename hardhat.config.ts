import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "hardhat-storage-layout";

import { HardhatUserConfig } from "hardhat/config";

const ALCHEMY_API_KEY_BASE_SEPOLIA = process.env.ALCHEMY_API_KEY_BASE_SEPOLIA || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  etherscan: {
    apiKey: {
      baseSepolia: BASESCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: true,
    noColors: true,
  },
  networks: {
    "base-sepolia": {
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY_BASE_SEPOLIA}`,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    "localhost": {
      url: "http://127.0.0.1:8545",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
            details: {
              yul: true,
              yulDetails: {
                optimizerSteps: "u",
                stackAllocation: true,
              },
            },
          },
          viaIR: true,
        },
      },
    ],
  },
  sourcify: {
    enabled: false
  },
};

export default config;
