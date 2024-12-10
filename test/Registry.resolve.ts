import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Resolve } from "./src/Deploy";

describe("Registry", function () {
  describe("resolve", function () {
    it("should update balances for players and protocol", async function () {
      await loadFixture(Resolve);
    });
  });
});
