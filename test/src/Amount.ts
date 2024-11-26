import { parseUnits } from "viem";

export const Amount = (num: number, dec: number = 18): bigint => {
  return parseUnits(num.toString(), dec);
};
