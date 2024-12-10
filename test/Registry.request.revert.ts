import { Address } from "viem";
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestForWallet } from "./src/Deploy";
import { Signature } from "./src/Signature";

describe("Registry", function () {
  describe("request", function () {
    describe("revert", function () {
      it("if entering the same game twice", async function () {
        const { Registry, Signer } = await loadFixture(RequestForWallet([2]));

        const grd = Signer(0);
        // const pro = Signer(1);
        const wal = Signer(2);
        const sig = Signer(3);
        const pla = Signer(4);
        const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

        const sgn = await Signature({
          guardian: grd.address as Address,
          signer: sig,
          player: pla.address as Address,
          timestamp: tim,
        });

        {
          const txn = Registry.connect(pla).request(grd, tim, wal, sgn);
          await expect(txn).to.be.revertedWithCustomError(Registry, "Process");
        }
      });
    });
  });
});
