import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestForWallet } from "./src/Deploy";

describe("Registry", function () {
  describe("Publish", function () {
    describe("revert", function () {
      it("if not participating in the game", async function () {
        const { Address, Registry, Signer } = await loadFixture(Deploy);

        const txn = Registry.connect(Signer(4)).Publish(Kill(1001), Address(3), Address(6));

        await expect(txn).to.be.revertedWithCustomError(Registry, "Process");
      });

      it("if reporting twice", async function () {
        const { Address, Registry, Signer } = await loadFixture(RequestForWallet([2, 5, 8])); // Wallet 2 is Player 4

        {
          const txn = Registry.connect(Signer(4)).Publish(Kill(1001), Address(5), Address(8));

          await expect(txn).to.emit(Registry, "WitnessPublish").withArgs(
            Address(4), // Player
            Address(1), // Guardian
            Kill(1001), // Kill
            Address(5), // Winner
            Address(8) //  Loser
          );
        }

        {
          const txn = Registry.connect(Signer(4)).Publish(Kill(1001), Address(5), Address(8));
          await expect(txn).to.be.revertedWithCustomError(Registry, "Process");
        }
      });
    });
  });
});
