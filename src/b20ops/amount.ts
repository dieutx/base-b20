export const UINT128_MAX = (1n << 128n) - 1n;

export type ParseAmountOptions = {
  maxUint128?: boolean;
};

export function parseTokenUnits(input: string, decimals: number, options: ParseAmountOptions = {}): bigint {
  assertDecimals(decimals);
  const value = input.trim();
  if (value === "") {
    throw new Error("Amount is required.");
  }
  if (value.startsWith("-")) {
    throw new Error("Amount must be non-negative.");
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a plain decimal string.");
  }

  const [wholePart, fractionalPart = ""] = value.split(".");
  if (fractionalPart.length > decimals) {
    throw new Error(`Amount has too many decimal places for ${decimals} decimals.`);
  }

  const paddedFraction = fractionalPart.padEnd(decimals, "0");
  const raw = BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
  if (options.maxUint128 && raw > UINT128_MAX) {
    throw new Error("Amount exceeds the B20 uint128 supply cap ceiling.");
  }
  return raw;
}

export function formatTokenUnits(raw: bigint, decimals: number): string {
  assertDecimals(decimals);
  if (raw < 0n) {
    throw new Error("Amount must be non-negative.");
  }

  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;
  if (fraction === 0n || decimals === 0) {
    return whole.toString();
  }

  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fractionText}`;
}

function assertDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error("Decimals must be an integer from 0 to 18.");
  }
}
