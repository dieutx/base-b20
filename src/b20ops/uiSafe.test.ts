import { describe, expect, test } from "vitest";

import { formatPausedFeatures, formatPolicySummary, formatRoleSummary } from "./uiSafe.ts";

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
});
