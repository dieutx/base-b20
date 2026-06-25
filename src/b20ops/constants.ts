import { keccak256, toBytes, type Address, type Hex } from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_MAINNET_CHAIN_ID = 8453;

export const B20_FACTORY_ADDRESS = "0xB20f000000000000000000000000000000000000" as const satisfies Address;
export const ACTIVATION_REGISTRY_ADDRESS = "0x8453000000000000000000000000000000000001" as const satisfies Address;
export const POLICY_REGISTRY_ADDRESS = "0x8453000000000000000000000000000000000002" as const satisfies Address;

export const B20_FEATURES = {
  asset: keccak256(toBytes("base.b20_asset")),
  stablecoin: keccak256(toBytes("base.b20_stablecoin")),
} as const satisfies Record<string, Hex>;

export const B20_ROLES = {
  DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
  MINT_ROLE: keccak256(toBytes("MINT_ROLE")),
  BURN_ROLE: keccak256(toBytes("BURN_ROLE")),
  BURN_BLOCKED_ROLE: keccak256(toBytes("BURN_BLOCKED_ROLE")),
  PAUSE_ROLE: keccak256(toBytes("PAUSE_ROLE")),
  UNPAUSE_ROLE: keccak256(toBytes("UNPAUSE_ROLE")),
  METADATA_ROLE: keccak256(toBytes("METADATA_ROLE")),
  OPERATOR_ROLE: keccak256(toBytes("OPERATOR_ROLE")),
} as const satisfies Record<string, Hex>;

export const B20_POLICY_SCOPES = {
  TRANSFER_SENDER_POLICY: keccak256(toBytes("TRANSFER_SENDER_POLICY")),
  TRANSFER_RECEIVER_POLICY: keccak256(toBytes("TRANSFER_RECEIVER_POLICY")),
  TRANSFER_EXECUTOR_POLICY: keccak256(toBytes("TRANSFER_EXECUTOR_POLICY")),
  MINT_RECEIVER_POLICY: keccak256(toBytes("MINT_RECEIVER_POLICY")),
} as const satisfies Record<string, Hex>;

export const POLICY_SENTINELS = {
  ALWAYS_ALLOW: 0n,
  ALWAYS_BLOCK: (1n << 56n) | 1n,
} as const;
