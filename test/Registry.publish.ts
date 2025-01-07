import { expect } from "chai";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestForWallet } from "./src/Deploy";

describe("Registry", function () {
  describe("publish", function () {
    it("should emit event", async function () {
      const { Address, Registry, Signer } = await loadFixture(RequestForWallet([2, 5, 8])); // Wallet 2 is Player 4

      const txn = Registry.connect(Signer(4)).Publish(Kill(1001), Address(5), Address(8));

      await expect(txn).to.emit(Registry, "WitnessPublish").withArgs(
        Address(4), // Player
        Address(1), // Guardian
        Kill(1001), // Kill
        Address(5), // Winner
        Address(8) //  Loser
      );
    });
  });
});
