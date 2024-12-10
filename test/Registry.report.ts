import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { Kill } from "./src/Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("report", function () {
    it("should emit event", async function () {
      const { Address, Registry, Signer } = await loadFixture(Deploy);

      const txn = Registry.connect(Signer(2)).report(Address(0), Kill(1001), Address(4), Address(5));

      await expect(txn)
        .to.emit(Registry, "Report")
        .withArgs(Address(2), Address(0), Kill(1001), Address(4), Address(5));
    });
  });
});
