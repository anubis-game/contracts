import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { zeroAddress } from "viem";

describe("Registry", function () {
  describe("UpdateBeneficiary", function () {
    describe("revert", function () {
      it("if beneficiary is empty", async function () {
        const { Registry, Signer } = await loadFixture(Deploy);

        const txn = Registry.connect(Signer(0)).UpdateBeneficiary(zeroAddress);

        await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
      });

      it("if beneficiary is current beneficiary", async function () {
        const { Address, Registry, Signer } = await loadFixture(Deploy);

        const txn = Registry.connect(Signer(0)).UpdateBeneficiary(Address(0));

        await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
      });

      it("if old beneficiary tries to update beneficiary", async function () {
        const { Address, Registry, Signer } = await loadFixture(Deploy);

        await Registry.connect(Signer(0)).UpdateBeneficiary(Address(7));

        expect(await Registry.beneficiary()).to.equal(Address(7));

        const txn = Registry.connect(Signer(0)).UpdateBeneficiary(Address(9));

        await expect(txn).to.be.revertedWithCustomError(Registry, "Address");
      });
    });
  });
});
