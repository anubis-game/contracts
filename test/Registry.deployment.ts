import { expect } from "chai";
import { ethers } from "hardhat";
import { Amount } from "./src/Amount";

describe("Registry", function () {
  describe("deployment", function () {
    it("should deploy contract with 0.1 buyin", async function () {
      const sig = await ethers.getSigners();

      const Stablecoin6 = await ethers.deployContract("Stablecoin", [6]);

      const Registry = await ethers.deployContract("Registry", [
        sig[0].address, //                                Owner Address
        await Stablecoin6.getAddress(), //                Token Address
        Amount(0.1, 6), //                                Buyin Amount
      ]);

      expect(await Registry.buyin()).to.equal(100000); // 0.1 Stablecoin with 6 decimals
    });
  });
});
