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
    ["memo", "Memo payment"],
    ["receipt", "Reconcile"],
  ] as const;
  const firstIncomplete = states.findIndex((done) => !done);

  return labels.map(([key, label], index) => ({
    key,
    label,
    state: states[index] ? "done" : index === firstIncomplete ? "current" : "blocked",
  }));
}
