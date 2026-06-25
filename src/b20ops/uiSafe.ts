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
