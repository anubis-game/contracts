import { Amount } from "./src/Amount";
import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Game } from "./src/Game";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("enterGame", function () {
    it("should update balances for players and protocol", async function () {
      const { Address, Balance, Registry, Signer, Stablecoin } = await loadFixture(Deploy);

      const reg = await Registry.getAddress();

      {
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(0);
      }

      {
        await Balance([2], 10);
      }

      {
        const res = await Registry.searchBalance(Address(2));
        expect(res[0]).to.equal(Amount(0)); // allocated
        expect(res[1]).to.equal(0);         // available
        expect(res[2]).to.equal(0);         // historic
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(0));
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(10));
      }

      {
        await Registry.connect(Signer(2)).enterGame(Game(1234));
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(1));
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(9));
      }

      {
        const res = await Registry.searchBalance(Address(2));
        expect(res[0]).to.equal(Amount(1)); // allocated
        expect(res[1]).to.equal(0);         // available
        expect(res[2]).to.equal(0);         // historic
      }
    });
  });
});
