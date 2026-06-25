import {
  encodeFunctionData,
  encodePacked,
  getAddress,
  keccak256,
  parseAbi,
  type Address,
  type Hex,
} from "viem";

import { B20_POLICY_SCOPES, B20_ROLES } from "./constants.ts";
import type { NormalizedB20Config } from "./config.ts";

const b20AdminAbi = parseAbi([
  "function grantRole(bytes32 role,address account)",
  "function updateSupplyCap(uint256 newSupplyCap)",
  "function updateContractURI(string newUri)",
  "function updatePolicy(bytes32 policyScope,uint64 newPolicyId)",
]);

export type DeploymentPlan = {
  chainId: number;
  network: string;
  variant: "asset" | "stablecoin";
  deployer: Address;
  predictedAddress: Address;
  saltInput: string;
  saltHash: Hex;
  factoryReadiness: {
    isB20Expected: boolean;
    isB20InitializedExpected: false;
    activationFeature: Hex | null;
  };
  token: {
    name: string;
    symbol: string;
    decimals: number;
    currency?: string;
    contractURI: string;
  };
  supplyCap: {
    human: string;
    raw: string;
  };
  roles: NormalizedB20Config["roles"];
  policies: NormalizedB20Config["policies"];
  initCalls: { label: string; data: Hex }[];
  warnings: string[];
  configDigest: Hex;
};

export function createDeploymentPlan(config: NormalizedB20Config, deployer: string): DeploymentPlan {
  const deployerAddress = getAddress(deployer);
  const initCalls = buildInitCalls(config);
  const planWithoutDigest = {
    chainId: config.network.chainId,
    network: config.network.name,
    variant: config.token.variant,
    deployer: deployerAddress,
    predictedAddress: predictB20Address(config.token.variant, deployerAddress, config.token.saltHash),
    saltInput: config.token.salt,
    saltHash: config.token.saltHash,
    factoryReadiness: {
      isB20Expected: true,
      isB20InitializedExpected: false as const,
      activationFeature: null,
    },
    token: {
      name: config.token.name,
      symbol: config.token.symbol,
      decimals: config.token.decimals,
      currency: config.token.variant === "stablecoin" ? config.token.currency : undefined,
      contractURI: config.token.contractURI,
    },
    supplyCap: {
      human: config.token.supplyCap,
      raw: config.token.supplyCapRaw.toString(),
    },
    roles: config.roles,
    policies: config.policies,
    initCalls,
    warnings: config.warnings,
  };

  return {
    ...planWithoutDigest,
    configDigest: keccak256(new TextEncoder().encode(stableStringify(planWithoutDigest))),
  };
}

export function predictB20Address(variant: "asset" | "stablecoin", deployer: Address, saltHash: Hex): Address {
  const variantByte = variant === "asset" ? "00" : "01";
  const entropy = keccak256(encodePacked(["address", "bytes32"], [deployer, saltHash])).slice(-18);
  return getAddress(`0xB2000000000000000000${variantByte}${entropy}`);
}

function buildInitCalls(config: NormalizedB20Config): DeploymentPlan["initCalls"] {
  const roleTuples: readonly (readonly [string, Hex, Address])[] = [
    ["grant MINT_ROLE", B20_ROLES.MINT_ROLE, config.roles.minter],
    ["grant BURN_ROLE", B20_ROLES.BURN_ROLE, config.roles.burner],
    ["grant BURN_BLOCKED_ROLE", B20_ROLES.BURN_BLOCKED_ROLE, config.roles.burnBlocked],
    ["grant PAUSE_ROLE", B20_ROLES.PAUSE_ROLE, config.roles.pauser],
    ["grant UNPAUSE_ROLE", B20_ROLES.UNPAUSE_ROLE, config.roles.unpauser],
    ["grant METADATA_ROLE", B20_ROLES.METADATA_ROLE, config.roles.metadata],
    ...(config.roles.operator ? [["grant OPERATOR_ROLE", B20_ROLES.OPERATOR_ROLE, config.roles.operator] as const] : []),
  ];
  const roleCalls: DeploymentPlan["initCalls"] = roleTuples.map(([label, role, account]) => ({
    label,
    data: encodeFunctionData({ abi: b20AdminAbi, functionName: "grantRole", args: [role, account] }),
  }));

  const configCalls: DeploymentPlan["initCalls"] = [
    {
      label: "set supply cap",
      data: encodeFunctionData({
        abi: b20AdminAbi,
        functionName: "updateSupplyCap",
        args: [config.token.supplyCapRaw],
      }),
    },
    {
      label: "set contract URI",
      data: encodeFunctionData({
        abi: b20AdminAbi,
        functionName: "updateContractURI",
        args: [config.token.contractURI],
      }),
    },
  ];

  for (const [scope, policyId] of Object.entries(config.policies)) {
    const policyScope = scopeToBytes32(scope);
    configCalls.push({
      label: `attach ${scope} policy`,
      data: encodeFunctionData({
        abi: b20AdminAbi,
        functionName: "updatePolicy",
        args: [policyScope, policyId],
      }),
    });
  }

  return [...roleCalls, ...configCalls];
}

function scopeToBytes32(scope: string): Hex {
  switch (scope) {
    case "sender":
      return B20_POLICY_SCOPES.TRANSFER_SENDER_POLICY;
    case "receiver":
      return B20_POLICY_SCOPES.TRANSFER_RECEIVER_POLICY;
    case "executor":
      return B20_POLICY_SCOPES.TRANSFER_EXECUTOR_POLICY;
    case "mintReceiver":
      return B20_POLICY_SCOPES.MINT_RECEIVER_POLICY;
    default:
      throw new Error(`Unsupported policy scope: ${scope}`);
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, item: unknown) => {
    if (typeof item === "bigint") {
      return item.toString();
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
    }
    return item;
  });
}
