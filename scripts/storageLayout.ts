import { storageLayout } from "hardhat";

//
//     npx hardhat run ./scripts/storageLayout.ts
//
const main = async () => {
  try {
    await storageLayout.export();
  } catch (error) {
    console.error("Error:", error);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
