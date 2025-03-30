import { toBytes } from "viem";

export const Kill = (num: number): Uint8Array => {
  return toBytes(num.toString(), { size: 16 });
};
