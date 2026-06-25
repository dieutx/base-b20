import { describe, expect, test } from "vitest";

import { formatTokenUnits, parseTokenUnits } from "./amount";

describe("B20 amount parsing", () => {
  test("parses decimal strings without floating point math", () => {
    expect(parseTokenUnits("1.2345", 6)).toBe(1_234_500n);
    expect(parseTokenUnits("1000", 18)).toBe(1_000n * 10n ** 18n);
    expect(parseTokenUnits("0", 6)).toBe(0n);
  });

  test("rejects unsafe amount forms", () => {
    expect(() => parseTokenUnits("-1", 6)).toThrow("non-negative");
    expect(() => parseTokenUnits("1e6", 6)).toThrow("decimal string");
    expect(() => parseTokenUnits("1.0000001", 6)).toThrow("too many decimal places");
    expect(() => parseTokenUnits("", 6)).toThrow("required");
  });

  test("rejects values above the B20 uint128 supply cap ceiling when requested", () => {
    expect(() => parseTokenUnits("340282366920938463463374607431768211456", 0, { maxUint128: true })).toThrow(
      "uint128",
    );
  });

  test("formats raw units back to human units", () => {
    expect(formatTokenUnits(1_234_500n, 6)).toBe("1.2345");
    expect(formatTokenUnits(1_000n * 10n ** 18n, 18)).toBe("1000");
  });
});
