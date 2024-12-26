import { Amount } from "../test/src/Amount";
import { ethers } from "hardhat";
import { formatUnits } from "viem";

//
//     npx hardhat run ./scripts/stblMint.ts --network localhost
//
const main = async () => {
  const Stablecoin = await ethers.getContractAt("Stablecoin", "0x5FbDB2315678afecb367f032d93F642f64180aa3");

  const add = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const amo = 1000;

  try {
    const txn = await Stablecoin.mint(add, Amount(amo, 6));
    const bal = await Stablecoin.balanceOf(add);
    console.log(`Minted ${amo} tokens to ${add}. Total amount is now ${formatUnits(bal, 6)}`);
  } catch (err) {
    console.error("Error:", err);
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
