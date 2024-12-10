import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestForWallet } from "./src/Deploy";

describe("Registry", function () {
  describe("request", function () {
    it("should update balances for players and protocol", async function () {
      await loadFixture(RequestForWallet([2]));
    });
  });
});
