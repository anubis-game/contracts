import { Address } from "viem";
import { DepositSignature } from "./src/Signature";
import { Deploy } from "./src/Deploy";
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestSignature } from "./src/Signature";
import { toHex } from "viem";

describe("Registry", function () {
  describe("recoverSigner", function () {
    it("should sign message and recover signer address for deposit", async function () {
      const { Registry, Signer } = await loadFixture(Deploy);

      // const grd = Signer(0);
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

    it("should recover signer address from static input", async function () {
      const { Registry } = await loadFixture(Deploy);

      const str = toHex(
        "request-1735819415-0x124e5659690596d39139add14d4a30dd9201907b-0x5a68a239acb7f43647f5da19a9904aeec87e7365"
      );

      const sgn =
        "0x0c603eabb538d2600b96faf74a0e05ad7b2cac9a8ff9f67edb0ce3221aacdc7750a0278f92262920b4b3531df2a4102025099cab500a01c22bd57ac8998bcd8d1c";

      {
        const rec = await Registry.recoverSigner(str, sgn);
        expect(rec).to.equal("0x3d02e24E075a939586Ac2613Be5AF69418a5807A");
      }
    });
  });
});
