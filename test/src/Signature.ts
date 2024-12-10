import { Address } from "viem";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Hex } from "viem";

interface Arguments {
  guardian: Address;
  signer: HardhatEthersSigner;
  player: Address;
  timestamp: number;
}

export const Signature = async (arg: Arguments): Promise<Hex> => {
  const msg = ["request", arg.guardian.toLowerCase(), arg.timestamp.toString(), arg.player.toLowerCase()].join("-");
  return (await arg.signer.signMessage(msg)) as Hex;
};
