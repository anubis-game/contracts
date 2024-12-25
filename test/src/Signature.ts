import { Address } from "viem";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Hex } from "viem";

interface DepositArguments {
  signer: HardhatEthersSigner;
  timestamp: number;
  wallet: Address;
}

export const DepositSignature = async (arg: DepositArguments): Promise<Hex> => {
  const msg = ["deposit", arg.timestamp.toString(), arg.wallet.toLowerCase()].join("-");
  return (await arg.signer.signMessage(msg)) as Hex;
};

interface RequestArguments {
  signer: HardhatEthersSigner;
  timestamp: number;
  guardian: Address;
  player: Address;
}

export const RequestSignature = async (arg: RequestArguments): Promise<Hex> => {
  const msg = ["request", arg.timestamp.toString(), arg.guardian.toLowerCase(), arg.player.toLowerCase()].join("-");
  return (await arg.signer.signMessage(msg)) as Hex;
};
