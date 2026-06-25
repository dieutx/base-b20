import { describe, expect, test } from "vitest";

import { createMemo } from "./memo";
import { B20OperationsStore } from "./workflows";

const token = "0xB200000000000000000000000000000000000001";
const merchant = "0x9999999999999999999999999999999999999999";
const user = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("B20 operations workflows", () => {
  test("creates payment intents idempotently by idempotency key", () => {
    const store = new B20OperationsStore();
    const memo = createMemo({ namespace: "PAYMENT", reference: "order-1" });

    const first = store.createOrder({
      idempotencyKey: "order-key-1",
      externalReference: "INV-1",
      chainId: 84532,
      tokenAddress: token,
      merchantAddress: merchant,
      expectedAmountRaw: 100n,
      decimalsSnapshot: 18,
      memo,
    });
    const second = store.createOrder({
      idempotencyKey: "order-key-1",
      externalReference: "INV-1-retry",
      chainId: 84532,
      tokenAddress: token,
      merchantAddress: merchant,
      expectedAmountRaw: 100n,
      decimalsSnapshot: 18,
      memo,
    });

    expect(second.id).toBe(first.id);
    expect(store.auditEvents).toHaveLength(1);
  });

  test("tracks issuance approval without minting from public request", () => {
    const store = new B20OperationsStore();
    const memo = createMemo({ namespace: "MINT", reference: "issuance-1" });
    const request = store.requestIssuance({
      idempotencyKey: "mint-key-1",
      chainId: 84532,
      tokenAddress: token,
      recipientAddress: user,
      amountRaw: 100n,
      memo,
      requestedBy: "ops-user",
    });

    expect(request.status).toBe("requested");
    const approved = store.approveIssuance(request.id, "approver-user");
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe("approver-user");
  });

  test("requires sender policy block before freeze-and-seize approval", () => {
    const store = new B20OperationsStore();
    const opened = store.openFreezeCase({
      chainId: 84532,
      tokenAddress: token,
      targetAddress: user,
      amountRaw: 50n,
      openedBy: "compliance-user",
      caseReferenceHash: createMemo({ namespace: "POLICY", reference: "case-1" }).memoBytes32,
    });

    expect(() => store.approveSeizure(opened.id, "approver-user")).toThrow("sender policy");
    store.markAddressBlocked(opened.id, "tx-1");
    expect(store.approveSeizure(opened.id, "approver-user").status).toBe("seizure_approved");
  });
});
