import { describe, expect, test } from "vitest";

import { createMemo, isAllowedMemoNamespace } from "./memo";

describe("B20 memo codec", () => {
  test("creates deterministic namespaced bytes32 memos", () => {
    const first = createMemo({ namespace: "PAYMENT", reference: "order-42" });
    const second = createMemo({ namespace: "PAYMENT", reference: "order-42" });

    expect(first.memoBytes32).toBe(second.memoBytes32);
    expect(first.canonicalPayload).toBe("PAYMENT:v1:order-42");
    expect(first.memoBytes32).toMatch(/^0x[a-f0-9]{64}$/);
    expect(first.displayReference).toBe("order-42");
  });

  test("separates domains for the same reference", () => {
    const payment = createMemo({ namespace: "PAYMENT", reference: "case-1" });
    const policy = createMemo({ namespace: "POLICY", reference: "case-1" });

    expect(payment.memoBytes32).not.toBe(policy.memoBytes32);
  });

  test("rejects unsupported namespaces and obvious PII", () => {
    expect(isAllowedMemoNamespace("PAYMENT")).toBe(true);
    expect(isAllowedMemoNamespace("EMAIL")).toBe(false);
    expect(() => createMemo({ namespace: "EMAIL", reference: "order-1" })).toThrow("namespace");
    expect(() => createMemo({ namespace: "PAYMENT", reference: "alice@example.com" })).toThrow("PII");
  });
});
