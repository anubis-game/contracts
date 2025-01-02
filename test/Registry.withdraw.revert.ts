import { Amount } from "./src/Amount";
import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Resolve } from "./src/Deploy";

describe("Registry", function () {
  describe("withdraw", function () {
    describe("revert", function () {
      it("if signer 0 has no funds", async function () {
        const { Registry, Signer } = await loadFixture(Deploy);

        const txn = Registry.connect(Signer(0)).withdraw(1);

        // Arithmetic operation overflowed outside of an unchecked block.
        await expect(txn).to.be.revertedWithPanic(0x11);
      });

      it("if signer 2 has no funds", async function () {
        const { Registry, Signer } = await loadFixture(Deploy);

        const txn = Registry.connect(Signer(2)).withdraw(Amount(15));

        // Arithmetic operation overflowed outside of an unchecked block.
        await expect(txn).to.be.revertedWithPanic(0x11);
      });

      it("if signer 2 has not enough funds", async function () {
        const { Address, Registry, Signer, Stablecoin } = await loadFixture(Resolve);

        const reg = await Registry.getAddress();

        // The Registry owns 30 tokens because Wallet 2, 5 and 8 have deposited 10
        // tokens each.
        {
          expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(30));
          expect(await Stablecoin.balanceOf(Address(2))).to.equal(0);
        }

        {
          const res = await Registry.searchBalance(Address(2));
          expect(res[0]).to.equal(Amount(1)); // allocated
          expect(res[1]).to.equal(Amount(9)); // deposited
          expect(res[2]).to.equal(0); // historic
        }

        // Arithmetic operation overflowed outside of an unchecked block.
        {
          const txn = Registry.connect(Signer(2)).withdraw(Amount(9.00001));
          await expect(txn).to.be.revertedWithPanic(0x11);
        }

        // Arithmetic operation overflowed outside of an unchecked block.
        {
          const txn = Registry.connect(Signer(2)).withdraw(Amount(13));
          await expect(txn).to.be.revertedWithPanic(0x11);
        }
      });
    });
  });
});
