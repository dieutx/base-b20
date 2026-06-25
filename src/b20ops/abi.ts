import { parseAbi } from "viem";

export const B20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function supplyCap() view returns (uint256)",
  "function contractURI() view returns (string)",
  "function currency() view returns (string)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function policyId(bytes32 policyScope) view returns (uint64)",
  "function isPaused(uint8 feature) view returns (bool)",
  "function pausedFeatures() view returns (uint8[])",
  "function transfer(address to,uint256 amount) returns (bool)",
  "function transferWithMemo(address to,uint256 amount,bytes32 memo) returns (bool)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function transferFrom(address from,address to,uint256 amount) returns (bool)",
  "function transferFromWithMemo(address from,address to,uint256 amount,bytes32 memo) returns (bool)",
  "function mintWithMemo(address to,uint256 amount,bytes32 memo)",
  "function burnWithMemo(uint256 amount,bytes32 memo)",
  "function burnBlocked(address from,uint256 amount)",
  "function pause(uint8[] features)",
  "function unpause(uint8[] features)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
  "event Memo(address indexed caller,bytes32 indexed memo)",
]);

export const B20_FACTORY_ABI = parseAbi([
  "function createB20(uint8 variant,bytes32 salt,bytes params,bytes[] initCalls) payable returns (address token)",
  "function getB20Address(uint8 variant,address sender,bytes32 salt) view returns (address)",
  "function isB20(address token) view returns (bool)",
  "function isB20Initialized(address token) view returns (bool)",
]);

export const POLICY_REGISTRY_ABI = parseAbi([
  "function policyExists(uint64 policyId) view returns (bool)",
  "function isAuthorized(uint64 policyId,address account) view returns (bool)",
  "function policyAdmin(uint64 policyId) view returns (address)",
  "function pendingPolicyAdmin(uint64 policyId) view returns (address)",
  "function createPolicy(address admin,uint8 policyType) returns (uint64)",
  "function createPolicyWithAccounts(address admin,uint8 policyType,address[] accounts) returns (uint64)",
  "function updateAllowlist(uint64 policyId,bool allowed,address[] accounts)",
  "function updateBlocklist(uint64 policyId,bool blocked,address[] accounts)",
  "function stageUpdateAdmin(uint64 policyId,address newAdmin)",
  "function finalizeUpdateAdmin(uint64 policyId)",
  "function renounceAdmin(uint64 policyId)",
]);

export const ACTIVATION_REGISTRY_ABI = parseAbi(["function isActivated(bytes32 feature) view returns (bool)"]);
