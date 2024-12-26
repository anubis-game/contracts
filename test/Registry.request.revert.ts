import { Address } from "viem";
import { Deposit } from "./src/Deploy";
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestForWallet } from "./src/Deploy";
import { RequestSignature } from "./src/Signature";

describe("Registry", function () {
  describe("request", function () {
    describe("revert", function () {
      it("if entering the same game twice", async function () {
        const { Registry, Signer } = await loadFixture(RequestForWallet([2]));

        // const pro = Signer(0);
        const grd = Signer(1);
        const wal = Signer(2);
        const sig = Signer(3);
        const pla = Signer(4);
        const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

        const sgn = await RequestSignature({
          signer: sig,
          timestamp: tim,
          guardian: grd.address as Address,
          player: pla.address as Address,
        });

        {
          const txn = Registry.connect(pla).request(grd, tim, wal, sgn);
          await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
        }
      });

      it("if the timestamp is too far in the future", async function () {
        const { Registry, Signer } = await loadFixture(Deposit);

        // const pro = Signer(0);
        const grd = Signer(1);
        const wal = Signer(2);
        const sig = Signer(3);
        const pla = Signer(4);
        const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
        const brk = tim + 61; // Simulate a timestamp 61 seconds in the future

        const sgn = await RequestSignature({
          signer: sig,
          timestamp: brk,
          guardian: grd.address as Address,
          player: pla.address as Address,
        });

        {
          const txn = Registry.connect(pla).request(grd, brk, wal, sgn);
          await expect(txn).to.be.revertedWithCustomError(Registry, "Process");
        }
      });
    });
  });
});
