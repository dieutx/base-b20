import type { Hex } from "viem";

export function hasDeployedCode(code: Hex | undefined): boolean {
  return code !== undefined && code !== "0x";
}
