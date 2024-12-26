import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("constants", function () {
    it("should expose BASIS_TOTAL as the total amount of basis points", async function () {
      const { Registry } = await loadFixture(Deploy);

      expect(await Registry.BASIS_TOTAL()).to.equal(10_000);
    });

    it("should expose VERSION constant", async function () {
      const { Registry } = await loadFixture(Deploy);

      expect(await Registry.VERSION()).to.equal("v0.3.0");
    });
  });
});
