import { describe, expect, test } from "vitest";

import { deriveWorkflowSteps, formatPausedFeatures, formatPolicySummary, formatRoleSummary } from "./uiSafe.ts";

describe("safe B20 UI summaries", () => {
  test("formats connected roles without exposing admin write actions", () => {
    expect(formatRoleSummary([])).toBe("none");
    expect(formatRoleSummary(["MINT", "PAUSE"])).toBe("MINT, PAUSE");
  });

  test("formats policy IDs by scope", () => {
    expect(
      formatPolicySummary([
        ["sender", 0n],
        ["receiver", 7n],
      ]),
    ).toBe("sender: 0\nreceiver: 7");
  });

  test("formats paused B20 features", () => {
    expect(formatPausedFeatures([])).toBe("none");
    expect(formatPausedFeatures([0, 2, 9])).toBe("TRANSFER, BURN, FEATURE_9");
  });

  test("derives a realistic test workflow from wallet, token, memo, and receipt state", () => {
    expect(
      deriveWorkflowSteps({
        walletConnected: false,
        tokenLoaded: false,
        memoReady: false,
        receiptChecked: false,
      }).map((step) => step.state),
    ).toEqual(["current", "blocked", "blocked", "blocked"]);

    expect(
      deriveWorkflowSteps({
        walletConnected: true,
        tokenLoaded: true,
        memoReady: true,
        receiptChecked: false,
      }).map((step) => step.state),
    ).toEqual(["done", "done", "done", "current"]);
  });
});
