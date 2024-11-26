import { Deploy } from "./src/Deploy";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Role } from "./src/Role";

describe("Registry", function () {
  describe("grantRole", function () {
    it("should grant roles using DEFAULT_ADMIN_ROLE", async function () {
      const { Address, Registry, Signer } = await loadFixture(Deploy);

      {
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(7))).to.equal(false);
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(9))).to.equal(false);
      }

      {
        await Registry.connect(Signer(0)).grantRole(Role("DEFAULT_ADMIN_ROLE"), Address(7));
      }

      {
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(7))).to.equal(true); // granted
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(9))).to.equal(false);
      }

      {
        await Registry.connect(Signer(0)).grantRole(Role("DEFAULT_ADMIN_ROLE"), Address(9));
      }

      {
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(7))).to.equal(true);
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(9))).to.equal(true); // granted
      }

      {
        await Registry.connect(Signer(0)).revokeRole(Role("DEFAULT_ADMIN_ROLE"), Address(7));
      }

      {
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(7))).to.equal(false); // revoked
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(9))).to.equal(true);
      }

      {
        await Registry.connect(Signer(0)).revokeRole(Role("DEFAULT_ADMIN_ROLE"), Address(5)); // invalid
      }

      {
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(7))).to.equal(false);
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(9))).to.equal(true);
      }

      {
        await Registry.connect(Signer(0)).revokeRole(Role("DEFAULT_ADMIN_ROLE"), Address(9));
      }

      {
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(7))).to.equal(false);
        expect(await Registry.hasRole(Role("DEFAULT_ADMIN_ROLE"), Address(9))).to.equal(false); // revoked
      }
    });

    it("should not grant roles using the wrong role", async function () {
      const { Address, Registry, Signer } = await loadFixture(Deploy);

      {
        expect(await Registry.hasRole(Role("BOT_ROLE"), Address(7))).to.equal(false);
        expect(await Registry.hasRole(Role("BOT_ROLE"), Address(9))).to.equal(false);
      }

      {
        await Registry.connect(Signer(0)).grantRole(Role("WRONG_ROLE"), Address(7));
      }

      {
        expect(await Registry.hasRole(Role("BOT_ROLE"), Address(7))).to.equal(false);
        expect(await Registry.hasRole(Role("BOT_ROLE"), Address(9))).to.equal(false);
      }

      {
        await Registry.connect(Signer(0)).revokeRole(Role("WRONG_ROLE"), Address(7));
      }

      {
        expect(await Registry.hasRole(Role("BOT_ROLE"), Address(7))).to.equal(false);
        expect(await Registry.hasRole(Role("BOT_ROLE"), Address(9))).to.equal(false);
      }
    });

    it("should revoke DEFAULT_ADMIN_ROLE forever", async function () {
      const { Address, Registry, Signer } = await loadFixture(Deploy);

      // Signer 0 is the only owner.
      {
        expect(await Registry.getRoleMemberCount(Role("DEFAULT_ADMIN_ROLE"))).to.equal(1);
      }

      {
        await Registry.connect(Signer(0)).revokeRole(Role("DEFAULT_ADMIN_ROLE"), Address(0));
      }

      // There is no owner anymore.
      {
        expect(await Registry.getRoleMemberCount(Role("DEFAULT_ADMIN_ROLE"))).to.equal(0);
      }
    });
  });
});
