import { expect } from "chai";
import { ethers } from "hardhat";
import { zeroAddress } from "viem";
import { Amount } from "./src/Amount";

describe("Registry", function () {
  describe("deployment", function () {
    describe("revert", function () {
      it("if owner address is empty", async function () {
        const Stablecoin6 = await ethers.deployContract("Stablecoin", [6]);
        const Registry = await ethers.getContractFactory("Registry");

        const txn = ethers.deployContract("Registry", [
          zeroAddress, //                    Owner Address
          await Stablecoin6.getAddress(), // Token Address
          Amount(1), //                      Buyin Amount
        ]);

        await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
      });

      it("if token contract is empty", async function () {
        const sig = await ethers.getSigners();
        const Registry = await ethers.getContractFactory("Registry");

        const txn = ethers.deployContract("Registry", [
          sig[0].address, // Owner Address
          zeroAddress, //    Token Address
          Amount(1), //      Buyin Amount
        ]);

        await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
      });

      it("if token decimals is below 6, 5", async function () {
        const sig = await ethers.getSigners();

        const Registry = await ethers.getContractFactory("Registry");
        const Stablecoin5 = await ethers.deployContract("Stablecoin", [5]);

        const txn = ethers.deployContract("Registry", [
          sig[0].address, //                 Owner Address
          await Stablecoin5.getAddress(), // Token Address
          Amount(1), //                      Buyin Amount
        ]);

        await expect(txn).to.be.revertedWithCustomError(Registry, "Balance");
      });

      it("if token decimals is below 6, 2", async function () {
        const sig = await ethers.getSigners();

        const Registry = await ethers.getContractFactory("Registry");
        const Stablecoin2 = await ethers.deployContract("Stablecoin", [2]);

        const txn = ethers.deployContract("Registry", [
          sig[0].address, //                 Owner Address
          await Stablecoin2.getAddress(), // Token Address
          Amount(1), //                      Buyin Amount
        ]);

        await expect(txn).to.be.revertedWithCustomError(Registry, "Balance");
      });

      it("if token contract is not ERC20", async function () {
        const sig = await ethers.getSigners();

        const txn = ethers.deployContract("Registry", [
          sig[0].address, // Owner Address
          sig[1].address, // Token Address
          Amount(1), //      Buyin Amount
        ]);

        await expect(txn).to.be.revertedWithoutReason();
      });
    });
  });
});
