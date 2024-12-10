import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "hardhat-storage-layout";

import { HardhatUserConfig } from "hardhat/config";
import { zeroHash } from "viem";

const ALCHEMY_API_KEY_ARBITRUM_SEPOLIA = process.env.ALCHEMY_API_KEY_ARBITRUM_SEPOLIA || "";
const ETHERSCAN_ARBITRUM_API_KEY = process.env.ETHERSCAN_ARBITRUM_API_KEY || "";
const DEPLOYER_ARBITRUM_PRIVATE_KEY = process.env.DEPLOYER_ARBITRUM_PRIVATE_KEY || zeroHash;

const config: HardhatUserConfig = {
  etherscan: {
    apiKey: {
      arbitrumSepolia: ETHERSCAN_ARBITRUM_API_KEY,
    },
  },
  gasReporter: {
    enabled: true,
    noColors: true,
  },
  networks: {
    "arbitrum-sepolia": {
      url: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY_ARBITRUM_SEPOLIA}`,
      accounts: [DEPLOYER_ARBITRUM_PRIVATE_KEY],
    },
    localhost: {
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
    enabled: false,
  },
};

export default config;
