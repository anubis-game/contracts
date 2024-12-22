import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

//
//     npx hardhat ignition deploy ./ignition/modules/localhost/Registry.ts --network localhost
//
const Module = buildModule("Registry", (m) => {
  return {
    Claims: m.contract("Registry", [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Owner Address (Hardhat Deployer Wallet)
      "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Token Address (Stablecoin on Hardhat Node)
      100000, //                                       Buyin Amount  (0.1 USDC with 6 decimals)
    ]),
  };
});

export default Module;
