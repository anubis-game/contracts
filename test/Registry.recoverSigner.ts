import { Address } from "viem";
import { Deploy } from "./src/Deploy";
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Signature } from "./src/Signature";

describe("Registry", function () {
  describe("recoverSigner", function () {
    it("should sign message and recover signer address", async function () {
      const { Registry, Signer } = await loadFixture(Deploy);

      const grd = Signer(0);
      // const wal = Signer(1);
      const sig = Signer(2);
      const pla = Signer(3);
      const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

      const sgn = await Signature({
        guardian: grd.address as Address,
        signer: sig,
        player: pla.address as Address,
        timestamp: tim,
      });

      {
        const msg = await Registry.requestMessage(grd, tim, pla);
        const add = await Registry.recoverSigner(msg, sgn);
        expect(add).to.equal(sig.address);
      }
    });
  });
});
