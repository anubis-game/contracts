import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

//
//     npx hardhat ignition deploy ./ignition/modules/testnet/Registry.ts --network arbitrum-sepolia
//     npx hardhat verify --network arbitrum-sepolia ADDRESS "0xAD63B2262EB7D1591Ee8E6a85959a523dEce7983" "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" "100000"
//
const Module = buildModule("Registry", (m) => {
  return {
    Claims: m.contract("Registry", [
      "0xAD63B2262EB7D1591Ee8E6a85959a523dEce7983", // Owner Address (Arbitrum Deployer Wallet)
      "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Token Address (USDC on Arbitrum Sepolia)
      100000, //                                       Buyin Amount  (0.1 USDC with 6 decimals)
    ]),
  };
});

export default Module;
