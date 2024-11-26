import { Amount } from "./src/Amount";
import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Game } from "./src/Game";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("guardianResolve", function () {
    it("should update balances for players and protocol", async function () {
      const { Address, Balance, Registry, Signer, Stablecoin } = await loadFixture(Deploy);

      const reg = await Registry.getAddress();

      {
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(0);
        expect(await Stablecoin.balanceOf(Address(3))).to.equal(0);
        expect(await Stablecoin.balanceOf(Address(4))).to.equal(0);
        expect(await Stablecoin.balanceOf(Address(5))).to.equal(0);
      }

      {
        await Balance([2, 3, 4, 5], 10);
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(0));
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(10));
        expect(await Stablecoin.balanceOf(Address(3))).to.equal(Amount(10));
        expect(await Stablecoin.balanceOf(Address(4))).to.equal(Amount(10));
        expect(await Stablecoin.balanceOf(Address(5))).to.equal(Amount(10));
      }

      {
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

      {
        const txn = Registry.connect(Signer(7)).guardianResolve(
          Game(1234),
          Kill(1001),
          Address(4), // win
          Address(5), // los
        );

        await expect(txn).to.emit(Registry, "Guardian").withArgs(
          Address(7),
          Game(1234),
          Kill(1001),
          Address(4),
          Address(5),
          Amount(0.4), // Signer 4 had a buy-in of 1.0, less 0.2 in fees (0.8), half made available (0.4).
          Amount(1),   // Signer 5 had a buy-in of 1.0 and lost it all.
        );
      }

      // Signer 0 is the protocol owner that earned some fees.
      {
        const res = await Registry.searchBalance(Address(0));
        expect(res[0]).to.equal(0);           // allocated
        expect(res[1]).to.equal(Amount(0.1)); // available
        expect(res[2]).to.equal(0);           // historic
      }

      // Signer 1 is not playing the game.
      {
        const res = await Registry.searchBalance(Address(1));
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(0); // available
        expect(res[2]).to.equal(0); // historic
      }

      // Signer 2 is playing the game.
      {
        const res = await Registry.searchBalance(Address(2));
        expect(res[0]).to.equal(Amount(1)); // allocated
        expect(res[1]).to.equal(0);         // available
        expect(res[2]).to.equal(0);         // historic
      }

      // Signer 3 is playing the game.
      {
        const res = await Registry.searchBalance(Address(3));
        expect(res[0]).to.equal(Amount(1)); // allocated
        expect(res[1]).to.equal(0);         // available
        expect(res[2]).to.equal(0);         // historic
      }

      // Signer 4 won against signer 5.
      {
        const res = await Registry.searchBalance(Address(4));
        expect(res[0]).to.equal(Amount(1.4)); // allocated
        expect(res[1]).to.equal(Amount(0.4)); // available
        expect(res[2]).to.equal(Amount(0.4)); // historic
      }

      // Signer 5 lost against signer 4.
      {
        const res = await Registry.searchBalance(Address(5));
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(0); // available
        expect(res[2]).to.equal(0); // historic
      }

      // Signer 6 is not playing the game.
      {
        const res = await Registry.searchBalance(Address(6));
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(0); // available
        expect(res[2]).to.equal(0); // historic
      }

      // Signer 7 is the guarduian and earned some fees.
      {
        const res = await Registry.searchBalance(Address(0));
        expect(res[0]).to.equal(0);           // allocated
        expect(res[1]).to.equal(Amount(0.1)); // available
        expect(res[2]).to.equal(0);           // historic
      }
    });
  });
});
