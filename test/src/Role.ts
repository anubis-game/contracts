import { Hex } from "viem";
import { keccak256 } from "viem";
import { stringToBytes } from "viem";
import { zeroHash } from "viem";

export const Role = (rol: string): Hex => {
  if (rol == "DEFAULT_ADMIN_ROLE") return zeroHash;
  return keccak256(stringToBytes(rol));
};
