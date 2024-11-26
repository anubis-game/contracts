import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Game } from "./src/Game";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("witnessReport", function () {
    it("should emit event", async function () {
      const { Address, Registry, Signer } = await loadFixture(Deploy);

      const txn = Registry.connect(Signer(2)).witnessReport(
        Address(7),
        Game(1234),
        Kill(1001),
        Address(4),
        Address(5),
      );

      await expect(txn).to.emit(Registry, "Witness").withArgs(
        Address(2),
        Address(7),
        Game(1234),
        Kill(1001),
        Address(4),
        Address(5),
      );
    });
  });
});
