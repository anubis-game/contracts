import { Amount } from "./src/Amount";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Resolve } from "./src/Deploy";

describe("Registry", function () {
  describe("withdraw", function () {
    it("should allow signer 2 to withdraw their funds", async function () {
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
        expect(res[1]).to.equal(Amount(9)); // available
        expect(res[2]).to.equal(0); // historic
      }

      {
        await Registry.connect(Signer(2)).withdraw(Amount(3));
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(27)); //            -3
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(3)); //      +3
      }

      {
        const res = await Registry.searchBalance(Address(2));
        expect(res[0]).to.equal(Amount(1)); // allocated
        expect(res[1]).to.equal(Amount(6)); // available                            -3
        expect(res[2]).to.equal(0); // historic
      }

      {
        await Registry.connect(Signer(2)).withdraw(Amount(6));
      }

      {
        expect(await Stablecoin.balanceOf(reg)).to.equal(Amount(21)); //            -6
        expect(await Stablecoin.balanceOf(Address(2))).to.equal(Amount(9)); //      +6
      }

      {
        const res = await Registry.searchBalance(Address(2));
        expect(res[0]).to.equal(Amount(1)); // allocated
        expect(res[1]).to.equal(0); // available                                    -6
        expect(res[2]).to.equal(0); // historic
      }
    });
  });
});
