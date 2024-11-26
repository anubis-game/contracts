import { Address } from "viem";
import { Amount } from "./Amount";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { network } from "hardhat";

export const Deploy = async () => {
  const sig = await ethers.getSigners();

  const Stablecoin = await ethers.deployContract("Stablecoin", [18]);
  const Registry = await ethers.deployContract("Registry", [sig[0].address, await Stablecoin.getAddress()]);

  const add = await Registry.getAddress();

  return {
    Address: (ind: number): Address => {
      return sig[ind].address as Address;
    },
    Balance: async (ind: number[], amn: number | number[]) => {
      await Promise.all(ind.map(async (x, i) => {
        const val = Amount(Array.isArray(amn) ? amn[i] : amn);
        await Stablecoin.mint(sig[x].address, val);
        await Stablecoin.connect(sig[x]).approve(add, val);
      }));
    },
    Registry: Registry,
    Signer: (ind: number) => {
      return sig[ind];
    },
    Stablecoin: Stablecoin,
  };
};
