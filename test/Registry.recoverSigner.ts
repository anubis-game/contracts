import { Address } from "viem";
import { DepositSignature } from "./src/Signature";
import { Deploy } from "./src/Deploy";
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestSignature } from "./src/Signature";

describe("Registry", function () {
  describe("recoverSigner", function () {
    it("should sign message and recover signer address for deposit", async function () {
      const { Registry, Signer } = await loadFixture(Deploy);

      const grd = Signer(0);
      const wal = Signer(1);
      const sig = Signer(2);
      // const pla = Signer(3);
      const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

      const sgn = await DepositSignature({
        signer: sig,
        timestamp: tim,
        wallet: wal.address as Address,
      });

      {
        const msg = await Registry.depositMessage(tim, wal);
        const rec = await Registry.recoverSigner(msg, sgn);
        expect(rec).to.equal(sig.address);
      }
    });

    it("should sign message and recover signer address for request", async function () {
      const { Registry, Signer } = await loadFixture(Deploy);

      const grd = Signer(0);
      // const wal = Signer(1);
      const sig = Signer(2);
      const pla = Signer(3);
      const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

      const sgn = await RequestSignature({
        signer: sig,
        timestamp: tim,
        guardian: grd.address as Address,
        player: pla.address as Address,
      });

      {
        const msg = await Registry.requestMessage(grd, tim, pla);
        const rec = await Registry.recoverSigner(msg, sgn);
        expect(rec).to.equal(sig.address);
      }
    });
  });
});
