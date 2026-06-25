const PAUSED_FEATURE_LABELS = new Map<number, string>([
  [0, "TRANSFER"],
  [1, "MINT"],
  [2, "BURN"],
]);

export function formatRoleSummary(activeRoles: readonly string[]): string {
  return activeRoles.length > 0 ? activeRoles.join(", ") : "none";
}

export function formatPolicySummary(policies: readonly (readonly [string, bigint])[]): string {
  return policies.map(([scope, policyId]) => `${scope}: ${policyId.toString()}`).join("\n");
}

export function formatPausedFeatures(features: readonly (number | bigint)[]): string {
  if (features.length === 0) {
    return "none";
  }
  return features
    .map((feature) => Number(feature))
    .map((feature) => PAUSED_FEATURE_LABELS.get(feature) ?? `FEATURE_${feature}`)
    .join(", ");
}

export type WorkflowInput = {
  walletConnected: boolean;
  tokenLoaded: boolean;
  memoReady: boolean;
  receiptChecked: boolean;
};

export type WorkflowStep = {
  key: "wallet" | "token" | "memo" | "receipt";
  label: string;
  state: "done" | "current" | "blocked";
};

export function deriveWorkflowSteps(input: WorkflowInput): WorkflowStep[] {
  const states = [
    input.walletConnected,
    input.tokenLoaded,
    input.memoReady,
    input.receiptChecked,
  ];
  const labels = [
    ["wallet", "Wallet"],
    ["token", "Token"],
    ["memo", "Memo transfer"],
    ["receipt", "Reconcile"],
  ] as const;
  const firstIncomplete = states.findIndex((done) => !done);

  return labels.map(([key, label], index) => ({
    key,
    label,
    state: states[index] ? "done" : index === firstIncomplete ? "current" : "blocked",
  }));
}

export type UiMemoOperation = "transfer" | "mint" | "guarded";

const UI_MEMO_NAMESPACES = {
  transfer: ["PAYMENT", "REDEEM"],
  mint: ["MINT"],
  guarded: ["BURN", "POLICY"],
} as const satisfies Record<UiMemoOperation, readonly string[]>;

export function getUiMemoNamespaces(operation: UiMemoOperation): readonly string[] {
  return UI_MEMO_NAMESPACES[operation];
}

export function isTransferMemoNamespace(namespace: string): boolean {
  const normalized = namespace.toUpperCase();
  return UI_MEMO_NAMESPACES.transfer.some((allowed) => allowed === normalized);
}

export type WebAppTestFlowStep = {
  title: string;
  action: string;
  expected: string;
};

export function getWebAppTestFlow(): readonly WebAppTestFlowStep[] {
  return [
    {
      title: "Connect",
      action: "Connect MetaMask or another injected wallet, then switch to Base Sepolia.",
      expected: "The wallet step turns active and the account appears in Token workspace.",
    },
    {
      title: "Deploy or load",
      action: "Preview the deterministic address, deploy a new B20, or load an existing token.",
      expected: "Token identity, cap, supply, variant, and connected balance are readable.",
    },
    {
      title: "Mint with memo",
      action: "Set an issuance reference and mint testnet supply with a MINT memo.",
      expected: "A mint transaction confirms and the MINT memo hash is displayed.",
    },
    {
      title: "Transfer or redeem",
      action: "Create a PAYMENT or REDEEM memo, then send transferWithMemo to the recipient.",
      expected: "The transaction hash is copied into receipt reconciliation.",
    },
    {
      title: "Reconcile",
      action: "Check the receipt and match each Memo with the immediately previous Transfer.",
      expected: "The app reports matching log indexes and validation status.",
    },
    {
      title: "Inspect governance",
      action: "Refresh role, policy, and pause state after token operations.",
      expected: "The snapshot stays read-only; guarded workflows remain documented but locked.",
    },
  ];
}
