import { ethers } from "hardhat";
import { formatUnits } from "viem";

//
//     npx hardhat run ./scripts/stblTotalSupply.ts --network localhost
//
const main = async () => {
  const Stablecoin = await ethers.getContractAt("Stablecoin", "0x5FbDB2315678afecb367f032d93F642f64180aa3");

  try {
    const tot = await Stablecoin.totalSupply();
    const sym = await Stablecoin.symbol();
    const dec = await Stablecoin.decimals();
    console.log(sym, "Total Supply:", formatUnits(tot, Number(dec)));
  } catch (err) {
    console.error("Error:", err);
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
