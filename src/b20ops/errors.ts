export type B20ErrorCode =
  | "POLICY_FORBIDS"
  | "FEATURE_PAUSED"
  | "INSUFFICIENT_BALANCE"
  | "INSUFFICIENT_ALLOWANCE"
  | "SUPPLY_CAP_EXCEEDED"
  | "UNAUTHORIZED_ROLE"
  | "POLICY_NOT_FOUND"
  | "FEATURE_NOT_ACTIVE"
  | "USER_REJECTED"
  | "RPC_OR_NETWORK"
  | "UNKNOWN";

export type DecodedB20Error = {
  code: B20ErrorCode;
  message: string;
};

export function decodeB20Error(error: unknown): DecodedB20Error {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  if (code === 4001) {
    return { code: "USER_REJECTED", message: "User rejected the wallet request." };
  }
  if (/PolicyForbids/i.test(message)) {
    return { code: "POLICY_FORBIDS", message: "A B20 policy forbids this sender, receiver, executor, or mint receiver." };
  }
  if (/ContractPaused|paused/i.test(message)) {
    return { code: "FEATURE_PAUSED", message: "The B20 feature needed for this operation is paused." };
  }
  if (/InsufficientBalance/i.test(message)) {
    return { code: "INSUFFICIENT_BALANCE", message: "The source account does not have enough token balance." };
  }
  if (/InsufficientAllowance/i.test(message)) {
    return { code: "INSUFFICIENT_ALLOWANCE", message: "The spender allowance is too low." };
  }
  if (/SupplyCapExceeded/i.test(message)) {
    return { code: "SUPPLY_CAP_EXCEEDED", message: "Minting would exceed the configured B20 supply cap." };
  }
  if (/AccessControlUnauthorizedAccount|Unauthorized/i.test(message)) {
    return { code: "UNAUTHORIZED_ROLE", message: "The signer lacks the required B20 role." };
  }
  if (/PolicyNotFound|nonexistent policy/i.test(message)) {
    return { code: "POLICY_NOT_FOUND", message: "The configured policy ID does not exist." };
  }
  if (/FeatureNotActivated/i.test(message)) {
    return { code: "FEATURE_NOT_ACTIVE", message: "The B20 feature is not active on this network yet." };
  }
  if (/chain|network|rpc|resource not available|too many errors/i.test(message)) {
    return { code: "RPC_OR_NETWORK", message: "The wallet or RPC network is unavailable or mismatched." };
  }
  return { code: "UNKNOWN", message };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

function getErrorCode(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "code" in error ? Number(error.code) : undefined;
}
