import { Hex } from "viem";
import { keccak256 } from "viem";
import { stringToBytes } from "viem";

export const Role = (rol: string): Hex => {
  if (rol == "DEFAULT_ADMIN_ROLE") return "0x0000000000000000000000000000000000000000000000000000000000000000";
  return keccak256(stringToBytes(rol));
};
