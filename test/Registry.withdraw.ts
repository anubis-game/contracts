import { Amount } from "./src/Amount";
import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Game } from "./src/Game";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("withdraw", function () {
    it("should allow signer 4 to withdraw their funds only", async function () {
      const { Address, Balance, Registry, Signer, Stablecoin } = await loadFixture(Deploy);

      const reg = await Registry.getAddress();

      {
        await Balance([2, 3, 4, 5], 10);
        await Registry.connect(Signer(2)).enterGame(Game(1234));
        await Registry.connect(Signer(3)).enterGame(Game(1234));
        await Registry.connect(Signer(4)).enterGame(Game(1234));
        await Registry.connect(Signer(5)).enterGame(Game(1234));
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(4));
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(3))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(4))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(5))).to.equal(Amount(9));
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

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(4));
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(3))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(4))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(5))).to.equal(Amount(9));
      }


      {
        await Registry.connect(Signer(4)).withdraw(Amount(0.1));
      }

      {
        const res = await Registry.searchBalance(Address(4));
        expect(res[0]).to.equal(Amount(1.4)); // allocated
        expect(res[1]).to.equal(Amount(0.3)); // available                    // -0.1
        expect(res[2]).to.equal(Amount(0.4)); // historic
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(3.9));        // -0.1
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(3))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(4))).to.equal(Amount(9.1)); // +0.1
        expect(await Stablecoin.balanceOf(Address(5))).to.equal(Amount(9));
      }

      {
        await Registry.connect(Signer(4)).withdraw(Amount(0.3));
      }

      {
        const res = await Registry.searchBalance(Address(4));
        expect(res[0]).to.equal(Amount(1.4)); // allocated
        expect(res[1]).to.equal(0);           // available                    // -0.3
        expect(res[2]).to.equal(Amount(0.4)); // historic
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(3.6));        // -0.3
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(3))).to.equal(Amount(9));
        expect(await Stablecoin.balanceOf(Address(4))).to.equal(Amount(9.4)); // +0.3
        expect(await Stablecoin.balanceOf(Address(5))).to.equal(Amount(9));
      }
    });
  });
});
