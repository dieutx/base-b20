import {
  type Address,
  type Hex,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  toBytes,
} from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const B20_FACTORY_ADDRESS = "0xB20f000000000000000000000000000000000000" as const;
export const MINT_ROLE = keccak256(toBytes("MINT_ROLE"));

export const B20_FACTORY_ABI = parseAbi([
  "function createB20(uint8 variant, bytes32 salt, bytes params, bytes[] initCalls) payable returns (address token)",
  "function getB20Address(uint8 variant, address sender, bytes32 salt) view returns (address)",
]);

export const B20_TOKEN_ABI = parseAbi([
  "function grantRole(bytes32 role, address account)",
  "function updateSupplyCap(uint256 newSupplyCap)",
  "function mint(address to, uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const B20_ASSET_VARIANT = 0;

export type AssetCreateParams = {
  name: string;
  symbol: string;
  initialAdmin: Address | string;
  decimals: number;
};

export type AssetInitCallParams = {
  minter: Address | string;
  supplyCap: bigint;
};

export function assertB20Decimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 6 || decimals > 18) {
    throw new Error("Asset decimals must be an integer from 6 to 18.");
  }
}

export function assertAddress(value: Address | string, label: string): asserts value is Address {
  if (!isAddress(value)) {
    throw new Error(`${label} must be a valid EVM address.`);
  }
}

export function encodeAssetCreateParams(params: AssetCreateParams): Hex {
  assertAddress(params.initialAdmin, "initialAdmin");
  assertB20Decimals(params.decimals);
  if (params.name.trim() === "") {
    throw new Error("Token name is required.");
  }
  if (params.symbol.trim() === "") {
    throw new Error("Token symbol is required.");
  }

  return encodeAbiParameters(
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
    [
      {
        version: 1,
        name: params.name.trim(),
        symbol: params.symbol.trim(),
        initialAdmin: params.initialAdmin,
        decimals: params.decimals,
      },
    ],
  );
}

export function encodeGrantMintRole(minter: Address | string): Hex {
  assertAddress(minter, "minter");
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: "grantRole",
    args: [MINT_ROLE, minter],
  });
}

export function encodeUpdateSupplyCap(supplyCap: bigint): Hex {
  if (supplyCap < 0n) {
    throw new Error("Supply cap cannot be negative.");
  }
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: "updateSupplyCap",
    args: [supplyCap],
  });
}

export function buildAssetInitCalls(params: AssetInitCallParams): readonly [Hex, Hex] {
  return [encodeGrantMintRole(params.minter), encodeUpdateSupplyCap(params.supplyCap)];
}

export function makeSalt(input: string): Hex {
  const value = input.trim();
  if (isHex(value) && /^0x[a-fA-F0-9]{64}$/.test(value)) {
    return value;
  }
  if (value === "") {
    throw new Error("Salt is required.");
  }
  return keccak256(toBytes(value));
}

export function parseTokenAmount(input: string, decimals: number): bigint {
  assertB20Decimals(decimals);
  const value = input.trim();
  if (value === "") {
    return 0n;
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a non-negative decimal number.");
  }

  const [wholePart, fractionalPart = ""] = value.split(".");
  if (fractionalPart.length > decimals) {
    throw new Error(`Amount has too many decimal places for ${decimals} decimals.`);
  }

  const whole = BigInt(wholePart) * 10n ** BigInt(decimals);
  const paddedFraction = fractionalPart.padEnd(decimals, "0");
  const fraction = paddedFraction === "" ? 0n : BigInt(paddedFraction);
  return whole + fraction;
}
