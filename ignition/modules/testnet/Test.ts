import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

//
//     npx hardhat ignition deploy ./ignition/modules/testnet/Test.ts --network arbitrum-sepolia
//     npx hardhat verify --network arbitrum-sepolia <address>
//
const Module = buildModule("Test", (m) => {
  return {
    Claims: m.contract("Test"),
  };
});

export default Module;
