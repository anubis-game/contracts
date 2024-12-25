import { Address } from "viem";
import { Amount } from "./Amount";
import { DepositSignature } from "./Signature";
import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Kill } from "./Kill";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RequestSignature } from "./Signature";

export const Deploy = async () => {
  const sig = await ethers.getSigners();

  const Stablecoin = await ethers.deployContract("Stablecoin", [18]);
  const Registry = await ethers.deployContract("Registry", [
    sig[0].address, //                Owner Address
    await Stablecoin.getAddress(), // Token Address
    Amount(1), //                     Buyin Amount (1 token with 18 decimals)
  ]);

  const add = await Registry.getAddress();

  return {
    Address: (ind: number): Address => {
      return sig[ind].address as Address;
    },
    Balance: async (ind: HardhatEthersSigner[], amn: bigint | bigint[]) => {
      await Promise.all(
        ind.map(async (x, i) => {
          const val = Array.isArray(amn) ? amn[i] : amn;

          await Stablecoin.mint(x.address, val);
          await Stablecoin.connect(x).approve(add, val);
        })
      );
    },
    Registry: Registry,
    Signer: (ind: number) => {
      return sig[ind];
    },
    Stablecoin: Stablecoin,
  };
};

export const RequestForWallet = (ind: number[]) => {
  const requestForWalletFixture = async () => {
    const { Address, Balance, Registry, Signer, Stablecoin } = await loadFixture(Deploy);

    for (const x of ind) {
      const pro = Signer(0);
      const grd = Signer(1);
      const wal = Signer(x);
      const sig = Signer(x + 1);
      const pla = Signer(x + 2);
      const tim = (await ethers.provider.getBlock("latest"))?.timestamp || 0;

      {
        expect(await Stablecoin.balanceOf(pro.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(grd.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(wal.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(sig.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(pla.address)).to.equal(0);
      }

      {
        await Balance([wal], Amount(10));
      }

      {
        expect(await Stablecoin.balanceOf(pro.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(grd.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(wal.address)).to.equal(Amount(10));
        expect(await Stablecoin.balanceOf(sig.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(pla.address)).to.equal(0);
      }

      {
        const res = await Registry.searchBalance(wal.address);
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(0); // available
        expect(res[2]).to.equal(0); // historic
      }

      const sg1 = await DepositSignature({
        signer: sig,
        timestamp: tim,
        wallet: wal.address as Address,
      });

      {
        await Registry.connect(wal).deposit(Amount(10), tim, sig.address, sg1);
      }

      // After the deposit, the registry contract should own the deposited
      // tokens and the Wallet address should not have any stablecoin balance
      // anymore.
      {
        expect(await Stablecoin.balanceOf(pro.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(grd.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(wal.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(sig.address)).to.equal(0);
        expect(await Stablecoin.balanceOf(pla.address)).to.equal(0);
      }

      // After the deposit, the Wallet address should have the full available
      // balance accounted for.
      {
        const res = await Registry.searchBalance(wal.address);
        expect(res[0]).to.equal(0); // allocated
        expect(res[1]).to.equal(Amount(10)); // available
        expect(res[2]).to.equal(0); // historic
      }

      const sg2 = await RequestSignature({
        signer: sig,
        timestamp: tim,
        guardian: grd.address as Address,
        player: pla.address as Address,
      });

      {
        await Registry.connect(pla).request(grd, tim, wal, sg2);
      }

      // After the request, the Wallet address should have allocated some buy-in
      // amount, which got deducted from the available balance.
      {
        const res = await Registry.searchBalance(wal.address);
        expect(res[0]).to.equal(Amount(1)); // allocated
        expect(res[1]).to.equal(Amount(9)); // available
        expect(res[2]).to.equal(0); // historic
      }
    }

    return { Address, Balance, Registry, Signer, Stablecoin };
  };

  return requestForWalletFixture;
};

export const Resolve = async () => {
  const { Address, Balance, Registry, Signer, Stablecoin } = await loadFixture(RequestForWallet([2, 5, 8]));

  {
    const txn = Registry.connect(Signer(1)).resolve(
      Kill(1001),
      Address(5), // win
      Address(8) // los
    );

    await expect(txn).to.emit(Registry, "Resolve").withArgs(
      Address(1),
      Kill(1001),
      Address(5),
      Address(8),
      Amount(0.4), // Signer 5 had a buy-in of 1.0, less 0.2 in fees (0.8), half made available (0.4).
      Amount(1) // Signer 8 had a buy-in of 1.0 and lost it all.
    );
  }

  // Signer 0 is the protocol owner that earned some fees.
  {
    const res = await Registry.searchBalance(Address(0));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(Amount(0.1)); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 1 is the guarduian and earned some fees.
  {
    const res = await Registry.searchBalance(Address(1));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(Amount(0.1)); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 2 is playing the game.
  {
    const res = await Registry.searchBalance(Address(2));
    expect(res[0]).to.equal(Amount(1)); // allocated
    expect(res[1]).to.equal(Amount(9)); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 3 is not playing the game.
  {
    const res = await Registry.searchBalance(Address(3));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(0); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 4 is not playing the game.
  {
    const res = await Registry.searchBalance(Address(4));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(0); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 5 won against signer 8.
  {
    const res = await Registry.searchBalance(Address(5));
    expect(res[0]).to.equal(Amount(1.4)); // allocated
    expect(res[1]).to.equal(Amount(9.4)); // available
    expect(res[2]).to.equal(Amount(0.4)); // historic
  }

  // Signer 6 is not playing the game.
  {
    const res = await Registry.searchBalance(Address(6));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(0); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 7 is not playing the game.
  {
    const res = await Registry.searchBalance(Address(7));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(0); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 8 lost against signer 5.
  {
    const res = await Registry.searchBalance(Address(8));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(Amount(9)); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 9 is not playing the game.
  {
    const res = await Registry.searchBalance(Address(9));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(0); // available
    expect(res[2]).to.equal(0); // historic
  }

  // Signer 10 is not playing the game.
  {
    const res = await Registry.searchBalance(Address(10));
    expect(res[0]).to.equal(0); // allocated
    expect(res[1]).to.equal(0); // available
    expect(res[2]).to.equal(0); // historic
  }

  return { Address, Balance, Registry, Signer, Stablecoin };
};
