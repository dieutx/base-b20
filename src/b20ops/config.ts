import { getAddress, isAddress, keccak256, toBytes, type Address, type Hex } from "viem";

import { parseTokenUnits } from "./amount.ts";
import { BASE_MAINNET_CHAIN_ID } from "./constants.ts";
import type { SignerMode } from "./signer.ts";

export type B20Variant = "asset" | "stablecoin";
export type B20Environment = "local" | "testnet" | "production";

export type B20ConfigInput = {
  environment: B20Environment;
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    finalityConfirmations: number;
  };
  token:
    | {
        variant: "asset";
        name: string;
        symbol: string;
        decimals: number;
        currency?: never;
        salt: string;
        supplyCap: string;
        contractURI: string;
      }
    | {
        variant: "stablecoin";
        name: string;
        symbol: string;
        decimals?: number;
        currency: string;
        salt: string;
        supplyCap: string;
        contractURI: string;
      };
  roles: {
    admin: string;
    minter: string;
    burner: string;
    burnBlocked: string;
    pauser: string;
    unpauser: string;
    metadata: string;
    operator?: string;
    policyAdmin: string;
  };
  policies: Partial<Record<"sender" | "receiver" | "executor" | "mintReceiver", string | number | bigint>>;
  signer: {
    mode: SignerMode;
  };
  mainnet: {
    locked: boolean;
    confirmationPhrase?: string;
  };
};

export type NormalizedB20Config = Omit<B20ConfigInput, "roles" | "token" | "policies"> & {
  token: B20ConfigInput["token"] & {
    decimals: number;
    saltHash: Hex;
    supplyCapRaw: bigint;
  };
  roles: {
    admin: Address;
    minter: Address;
    burner: Address;
    burnBlocked: Address;
    pauser: Address;
    unpauser: Address;
    metadata: Address;
    operator?: Address;
    policyAdmin: Address;
  };
  policies: Partial<Record<"sender" | "receiver" | "executor" | "mintReceiver", bigint>>;
  warnings: string[];
};

export function normalizeB20Config(input: B20ConfigInput): NormalizedB20Config {
  validateNetwork(input);
  validateMetadataUri(input.token.contractURI, input.environment);
  const roles = normalizeRoles(input);
  const tokenDecimals = normalizeDecimals(input.token);
  const supplyCapRaw = parseTokenUnits(input.token.supplyCap, tokenDecimals, { maxUint128: true });
  const warnings = roleWarnings(roles);
  const mainnet = input.network.chainId === BASE_MAINNET_CHAIN_ID || input.environment === "production";
  if (mainnet) {
    validateMainnetConfig(input, roles);
  }

  return {
    ...input,
    token: {
      ...input.token,
      decimals: tokenDecimals,
      saltHash: normalizeSalt(input.token.salt),
      supplyCapRaw,
    },
    roles,
    policies: normalizePolicies(input.policies),
    warnings,
  };
}

function validateNetwork(input: B20ConfigInput): void {
  if (!Number.isInteger(input.network.chainId) || input.network.chainId <= 0) {
    throw new Error("network.chainId must be a positive integer.");
  }
  if (!/^https?:\/\/\S+$/i.test(input.network.rpcUrl)) {
    throw new Error("network.rpcUrl must be an HTTP(S) URL.");
  }
  if (!/^https?:\/\/\S+$/i.test(input.network.explorerUrl)) {
    throw new Error("network.explorerUrl must be an HTTP(S) URL.");
  }
  if (!Number.isInteger(input.network.finalityConfirmations) || input.network.finalityConfirmations < 0) {
    throw new Error("network.finalityConfirmations must be a non-negative integer.");
  }
}

function validateMetadataUri(uri: string, environment: B20Environment): void {
  if (!/^https:\/\/\S+$/i.test(uri) && !/^ipfs:\/\/\S+$/i.test(uri)) {
    throw new Error("token.contractURI must use https:// or ipfs://.");
  }
  if (environment === "production" && /REPLACE_ME|example\.com/i.test(uri)) {
    throw new Error("Production metadata URI cannot be a placeholder.");
  }
}

function normalizeDecimals(token: B20ConfigInput["token"]): number {
  if (token.variant === "stablecoin") {
    if (token.decimals !== undefined && token.decimals !== 6) {
      throw new Error("Stablecoin decimals are fixed at 6.");
    }
    if (!/^[A-Z]+$/.test(token.currency)) {
      throw new Error("Stablecoin currency must contain uppercase A-Z only.");
    }
    return 6;
  }
  if (!Number.isInteger(token.decimals) || token.decimals < 6 || token.decimals > 18) {
    throw new Error("Asset decimals must be an integer from 6 to 18.");
  }
  return token.decimals;
}

function normalizeRoles(input: B20ConfigInput): NormalizedB20Config["roles"] {
  const roles = {
    admin: normalizeAddress(input.roles.admin, "roles.admin"),
    minter: normalizeAddress(input.roles.minter, "roles.minter"),
    burner: normalizeAddress(input.roles.burner, "roles.burner"),
    burnBlocked: normalizeAddress(input.roles.burnBlocked, "roles.burnBlocked"),
    pauser: normalizeAddress(input.roles.pauser, "roles.pauser"),
    unpauser: normalizeAddress(input.roles.unpauser, "roles.unpauser"),
    metadata: normalizeAddress(input.roles.metadata, "roles.metadata"),
    policyAdmin: normalizeAddress(input.roles.policyAdmin, "roles.policyAdmin"),
  };

  if (input.token.variant === "asset") {
    return { ...roles, operator: normalizeAddress(input.roles.operator, "roles.operator") };
  }
  return roles;
}

function normalizeAddress(value: string | undefined, label: string): Address {
  if (!value || !isAddress(value) || /^0x0{40}$/i.test(value)) {
    throw new Error(`${label} must be a non-zero EVM address.`);
  }
  return getAddress(value);
}

function normalizePolicies(
  policies: B20ConfigInput["policies"],
): Partial<Record<"sender" | "receiver" | "executor" | "mintReceiver", bigint>> {
  const normalized: Partial<Record<"sender" | "receiver" | "executor" | "mintReceiver", bigint>> = {};
  for (const [scope, value] of Object.entries(policies)) {
    if (value === undefined || value === "") {
      continue;
    }
    const id = BigInt(value);
    if (id < 0n || id > (1n << 64n) - 1n) {
      throw new Error(`Policy ${scope} must fit uint64.`);
    }
    normalized[scope as keyof typeof normalized] = id;
  }
  return normalized;
}

function normalizeSalt(input: string): Hex {
  const value = input.trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(value)) {
    return value as Hex;
  }
  if (value === "" || /REPLACE_ME/i.test(value)) {
    throw new Error("token.salt is required and cannot be a placeholder.");
  }
  return keccak256(toBytes(value));
}

function validateMainnetConfig(input: B20ConfigInput, roles: NormalizedB20Config["roles"]): void {
  if (!input.mainnet.locked) {
    throw new Error("mainnet is locked by default; create a plan first and keep broadcast disabled.");
  }
  if (input.signer.mode === "local-test-key" || input.signer.mode === "keystore") {
    throw new Error("mainnet production signer cannot use local-test-key or plaintext keystore mode.");
  }
  if (/mainnet\.base\.org/i.test(input.network.rpcUrl)) {
    throw new Error("mainnet production config must use a controlled RPC endpoint, not the public fallback.");
  }
  if (sensitiveRoleConcentration(roles)) {
    throw new Error("mainnet roles must not all collapse to one EOA.");
  }
}

function sensitiveRoleConcentration(roles: NormalizedB20Config["roles"]): boolean {
  const values = [
    roles.admin,
    roles.minter,
    roles.burner,
    roles.burnBlocked,
    roles.pauser,
    roles.unpauser,
    roles.metadata,
    roles.operator,
    roles.policyAdmin,
  ].filter((value): value is Address => Boolean(value));
  return new Set(values.map((value) => value.toLowerCase())).size === 1;
}

function roleWarnings(roles: NormalizedB20Config["roles"]): string[] {
  const entries = Object.entries(roles).filter(([, value]) => Boolean(value));
  const grouped = new Map<string, string[]>();
  for (const [role, value] of entries) {
    const key = String(value).toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), role]);
  }
  return [...grouped.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([address, names]) => `${address} holds multiple sensitive roles: ${names.join(", ")}`);
}
