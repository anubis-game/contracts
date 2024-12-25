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
    it("should deposit balance multiple times", async function () {
      const { Balance, Registry, Signer, Stablecoin } = await loadFixture(Deploy);

      const pro = Signer(0);
      const grd = Signer(1);
      const wal = Signer(2);
      const sig = Signer(3);
      const pla = Signer(4);
      const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

      {
        expect(await Stablecoin.balanceOf(pro.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(grd.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(wal.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(sig.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(pla.address)).to.equal(0);
      }

      {
        await Balance([wal], Amount(30));
      }

      {
        expect(await Stablecoin.balanceOf(pro.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(grd.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(wal.address)).to.equal(Amount(30));
        expect(await Stablecoin.balanceOf(sig.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(pla.address)).to.equal(0);
      }

      {
        const res = await Registry.searchBalance(wal.address);
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(0); // available
        expect(res[2]).to.equal(0); // historic
      }

      {
        const res = await Registry.searchSigner(wal.address);
        expect(res[0]).to.equal(zeroAddress);
        expect(res[1]).to.equal(zeroAddress);
      }

      const sg1 = await DepositSignature({
        signer: sig,
        timestamp: tim,
        wallet: wal.address as Address,
      });

      {
        await Registry.connect(wal).deposit(Amount(10), tim, sig.address, sg1);
        await Registry.connect(wal).deposit(Amount(5), tim, sig.address, sg1);
        await Registry.connect(wal).deposit(Amount(10), tim, sig.address, sg1);
        await Registry.connect(wal).deposit(Amount(5), tim, sig.address, sg1);
      }

      // After the deposit, the registry contract should own the deposited
      // tokens and the Wallet address should not have any stablecoin balance
      // anymore.
      {
        expect(await Stablecoin.balanceOf(pro.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(grd.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(wal.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(sig.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(pla.address)).to.equal(0);
      }

      // After the deposit, the Wallet address should have the full available
      // balance accounted for.
      {
        const res = await Registry.searchBalance(wal.address);
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(Amount(30)); // available
        expect(res[2]).to.equal(0); // historic
      }

      // Test for the internal mapping between Wallet and Signer address.
      {
        const res = await Registry.searchSigner(wal.address);
        expect(res[0]).to.equal(wal.address);
        expect(res[1]).to.equal(sig.address);
      }
    });
  });
});
