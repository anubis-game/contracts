import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Registry", function () {
  describe("UpdateBeneficiary", function () {
    it("should allow the beneficiary to update itself", async function () {
      const { Address, Registry, Signer } = await loadFixture(Deploy);

      // From 0 to 7.
      {
        await Registry.connect(Signer(0)).UpdateBeneficiary(Address(7));

        expect(await Registry.beneficiary()).to.equal(Address(7));
      }

      // From 7 to 5.
      {
        await Registry.connect(Signer(7)).UpdateBeneficiary(Address(5));

        expect(await Registry.beneficiary()).to.equal(Address(5));
      }

      // From 5 back to 0.
      {
        await Registry.connect(Signer(5)).UpdateBeneficiary(Address(0));

        expect(await Registry.beneficiary()).to.equal(Address(0));
      }
    });
  });
});
