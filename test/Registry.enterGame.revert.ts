import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Game } from "./src/Game";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("enterGame", function () {
    describe("revert", function () {
      it("if entering the same game twice", async function () {
        const { Balance, Registry, Signer } = await loadFixture(Deploy);

        {
          await Balance([2], 10);
        }

        {
          await Registry.connect(Signer(2)).enterGame(Game(1234));
        }

        {
          const txn = Registry.connect(Signer(2)).enterGame(Game(1234));
          await expect(txn).to.be.revertedWithCustomError(Registry, "Process");
        }
      });

      it("if entering multiple different games", async function () {
        const { Balance, Registry, Signer } = await loadFixture(Deploy);

        {
          await Balance([2], 10);
        }

        {
          await Registry.connect(Signer(2)).enterGame(Game(1234));
        }

        {
          const txn = Registry.connect(Signer(2)).enterGame(Game(5678));
          await expect(txn).to.be.revertedWithCustomError(Registry, "Process");
        }
      });
    });
  });
});
