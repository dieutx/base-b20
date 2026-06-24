import { decodeAbiParameters, decodeFunctionData, isHex } from "viem";
import { describe, expect, test } from "vitest";

import {
  B20_TOKEN_ABI,
  MINT_ROLE,
  buildAssetInitCalls,
  encodeAssetCreateParams,
  parseTokenAmount,
} from "./b20";

const account = "0x1111111111111111111111111111111111111111";

describe("B20 encoding", () => {
  test("encodes Asset create params with version, identity, admin, and decimals", () => {
    const encoded = encodeAssetCreateParams({
      name: "DieuTX B20",
      symbol: "DIEUTX",
      initialAdmin: account,
      decimals: 18,
    });

    const [params] = decodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "version", type: "uint8" },
            { name: "name", type: "string" },
            { name: "symbol", type: "string" },
            { name: "initialAdmin", type: "address" },
            { name: "decimals", type: "uint8" },
          ],
        },
      ],
      encoded,
    );

    expect(params).toEqual({
      version: 1,
      name: "DieuTX B20",
      symbol: "DIEUTX",
      initialAdmin: account,
      decimals: 18,
    });
  });

  test("rejects Asset decimals outside the Base B20 range", () => {
    expect(() =>
      encodeAssetCreateParams({
        name: "Bad",
        symbol: "BAD",
        initialAdmin: account,
        decimals: 5,
      }),
    ).toThrow("decimals");

    expect(() =>
      encodeAssetCreateParams({
        name: "Bad",
        symbol: "BAD",
        initialAdmin: account,
        decimals: 19,
      }),
    ).toThrow("decimals");
  });

  test("builds init calls for mint role and supply cap", () => {
    const [grantMintRole, updateSupplyCap] = buildAssetInitCalls({
      minter: account,
      supplyCap: 1_000_000n * 10n ** 18n,
    });

    const grant = decodeFunctionData({
      abi: B20_TOKEN_ABI,
      data: grantMintRole,
    });
    expect(grant.functionName).toBe("grantRole");
    expect(grant.args).toEqual([MINT_ROLE, account]);

    const cap = decodeFunctionData({
      abi: B20_TOKEN_ABI,
      data: updateSupplyCap,
    });
    expect(cap.functionName).toBe("updateSupplyCap");
    expect(cap.args).toEqual([1_000_000n * 10n ** 18n]);
  });

  test("parses token amounts with the requested decimals", () => {
    expect(parseTokenAmount("1000", 18)).toBe(1_000n * 10n ** 18n);
    expect(parseTokenAmount("12.3456", 6)).toBe(12_345_600n);
    expect(parseTokenAmount("", 18)).toBe(0n);
  });

  test("rejects too many fractional digits", () => {
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow("too many decimal places");
  });

  test("returns hex init call data", () => {
    const calls = buildAssetInitCalls({ minter: account, supplyCap: 100n });
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => isHex(call))).toBe(true);
  });
});
