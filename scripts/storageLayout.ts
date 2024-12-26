import { storageLayout } from "hardhat";

//
//     npx hardhat run ./scripts/storageLayout.ts
//
const main = async () => {
  try {
    await storageLayout.export();
  } catch (err) {
    console.error("Error:", err);
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
