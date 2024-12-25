import { Address } from "viem";
import { Amount } from "./src/Amount";
import { Deploy } from "./src/Deploy";
import { DepositSignature } from "./src/Signature";
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { zeroAddress } from "viem";

describe("Registry", function () {
  describe("deposit", function () {
    describe("revert", function () {
      it("if wrong wallet", async function () {
        const { Balance, Registry, Signer } = await loadFixture(Deploy);

        // const pro = Signer(0);
        // const grd = Signer(1);
        const wal = Signer(2);
        const sig = Signer(3);
        // const pla = Signer(4);
        const fak = Signer(5);
        const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

        {
          await Balance([fak], Amount(10));
        }

        const sg1 = await DepositSignature({
          signer: sig,
          timestamp: tim,
          wallet: wal.address as Address,
        });

        {
          const txn = Registry.connect(fak).deposit(Amount(10), tim, sig.address, sg1);
          await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
        }

        {
          const res = await Registry.searchSigner(fak.address);
          expect(res[0]).to.equal(zeroAddress);
          expect(res[1]).to.equal(zeroAddress);
        }

        {
          const res = await Registry.searchSigner(wal.address);
          expect(res[0]).to.equal(zeroAddress);
          expect(res[1]).to.equal(zeroAddress);
        }
      });
    });
  });
});
