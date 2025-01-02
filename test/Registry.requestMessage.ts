import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { toHex } from "viem";

describe("Registry", function () {
  describe("requestMessage", function () {
    it("should create request message", async function () {
      const { Registry } = await loadFixture(Deploy);

      const str = toHex(
        "request-1735819415-0x124e5659690596d39139add14d4a30dd9201907b-0x5a68a239acb7f43647f5da19a9904aeec87e7365"
      );

      const req = await Registry.requestMessage(
        "0x124E5659690596D39139adD14D4A30dd9201907b",
        1735819415,
        "0x5a68a239acb7f43647f5da19a9904aeec87e7365"
      );

      {
        expect(str).to.equal(req);
      }
    });
  });
});
