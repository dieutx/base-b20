import { describe, expect, test } from "vitest";

import {
  deriveWorkflowSteps,
  formatPausedFeatures,
  formatPolicySummary,
  formatRoleSummary,
  getAppModes,
  getWebAppTestFlow,
  getUiMemoNamespaces,
  isTransferMemoNamespace,
} from "./uiSafe.ts";

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

  test("keeps memo namespaces aligned with the UI operation that can execute them", () => {
    expect(getUiMemoNamespaces("transfer")).toEqual(["PAYMENT", "REDEEM"]);
    expect(getUiMemoNamespaces("mint")).toEqual(["MINT"]);
    expect(getUiMemoNamespaces("guarded")).toEqual(["BURN", "POLICY"]);
    expect(isTransferMemoNamespace("PAYMENT")).toBe(true);
    expect(isTransferMemoNamespace("MINT")).toBe(false);
  });

  test("describes the web app test flow without dangerous admin actions", () => {
    const flow = getWebAppTestFlow();
    expect(flow.map((step) => step.title)).toEqual([
      "Connect",
      "Deploy or load",
      "Mint with memo",
      "Transfer or redeem",
      "Reconcile",
      "Inspect governance",
    ]);
    expect(flow.flatMap((step) => [step.action, step.expected]).join(" ")).not.toMatch(
      /burnBlocked|renounce|unpause|grant role|policy mutation/i,
    );
  });

  test("defines focused app modes in the intended user flow order", () => {
    expect(getAppModes().map((mode) => mode.id)).toEqual(["deploy", "mint", "transfer", "reconcile", "status"]);
    expect(getAppModes().map((mode) => mode.label)).toEqual([
      "Deploy",
      "Mint",
      "Transfer/Redeem",
      "Reconcile",
      "Status",
    ]);
  });
});
