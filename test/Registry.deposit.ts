import { Deposit } from "./src/Deploy";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("Deposit", function () {
    it("should deposit balance multiple times", async function () {
      await loadFixture(Deposit);
    });
  });
});
