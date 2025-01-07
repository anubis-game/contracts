import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CompactAddressTest", function () {
  describe("lifecycle", function () {
    const Deploy = async () => {
      const List = await ethers.deployContract("CompactAddressTest");

      return { List };
    };

    it("should add, iterate, remove, and verify addresses", async function () {
      const { List } = await loadFixture(Deploy);

      // Create our test setup.

      const all = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
        "0x0000000000000000000000000000000000000004",
        "0x0000000000000000000000000000000000000005",
      ];

      for (const x of all) {
        await List.create(x);
      }

      // Verify that all addresses exist as expected.

      {
        expect(await List.length()).to.equal(all.length);
      }

      for (const x of all) {
        expect(await List.exists(x)).to.be.true;
      }

      for (let i = 0; i < all.length; i++) {
        expect(await List.search(i)).to.equal(all[i]);
      }

      // Remove address 003.

      const rem = all[2];
      await List.remove(rem);

      const fil = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000005",
        "0x0000000000000000000000000000000000000004",
      ];

      // Verify that the removed address is no longer part of our compact list,
      // and that the remaining addresses exist after all. Note that we changed
      // the internal order of addresses when we removed address 003, because
      // the last address 005 took its place instead.

      {
        expect(await List.length()).to.equal(all.length - 1);
        expect(await List.length()).to.equal(fil.length);
      }

      {
        expect(await List.exists(rem)).to.equal(false);
      }

      for (const x of fil) {
        expect(await List.exists(x)).to.equal(true);
      }

      for (let i = 0; i < fil.length; i++) {
        expect(fil).to.include(await List.search(i));
      }

      // Remove all remaining addresses and verify that our compact list is now
      // empty.

      for (const x of fil) {
        await List.remove(x);
      }

      {
        expect(await List.length()).to.equal(0);
      }
    });
  });
});
