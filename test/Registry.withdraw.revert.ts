import { Amount } from "./src/Amount";
import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Game } from "./src/Game";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

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

      it("if signer 4 has not enough funds", async function () {
        const { Address, Balance, Registry, Signer } = await loadFixture(Deploy);

        {
          await Balance([2, 3, 4, 5], 10);
          await Registry.connect(Signer(2)).enterGame(Game(1234));
          await Registry.connect(Signer(3)).enterGame(Game(1234));
          await Registry.connect(Signer(4)).enterGame(Game(1234));
          await Registry.connect(Signer(5)).enterGame(Game(1234));
        }

        await Registry.connect(Signer(7)).guardianResolve(
          Game(1234),
          Kill(1001),
          Address(4), // win
          Address(5), // los
        );

        // Signer 4 won against signer 5.
        {
          const res = await Registry.searchBalance(Address(4));
          expect(res[0]).to.equal(Amount(1.4)); // allocated
          expect(res[1]).to.equal(Amount(0.4)); // available
          expect(res[2]).to.equal(Amount(0.4)); // historic
        }

        // Arithmetic operation overflowed outside of an unchecked block.
        {
          const txn = Registry.connect(Signer(4)).withdraw(Amount(0.5));
          await expect(txn).to.be.revertedWithPanic(0x11);
        }

        // Arithmetic operation overflowed outside of an unchecked block.
        {
          const txn = Registry.connect(Signer(4)).withdraw(Amount(13));
          await expect(txn).to.be.revertedWithPanic(0x11);
        }
      });
    });
  });
});
