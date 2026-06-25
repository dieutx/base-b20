import type { Hex } from "viem";

import type { MemoRecord } from "./memo.ts";

export type OrderStatus =
  | "created"
  | "awaiting_payment"
  | "detected"
  | "confirming"
  | "paid"
  | "expired"
  | "cancelled"
  | "refunded";

export type OrderRecord = {
  id: string;
  idempotencyKey: string;
  externalReference: string;
  chainId: number;
  tokenAddress: string;
  merchantAddress: string;
  expectedAmountRaw: bigint;
  decimalsSnapshot: number;
  memoBytes32: Hex;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type IssuanceStatus =
  | "requested"
  | "compliance_review"
  | "business_review"
  | "approved"
  | "signing"
  | "broadcast"
  | "confirming"
  | "completed"
  | "rejected"
  | "failed"
  | "cancelled";

export type IssuanceRequest = {
  id: string;
  idempotencyKey: string;
  chainId: number;
  tokenAddress: string;
  recipientAddress: string;
  amountRaw: bigint;
  memoBytes32: Hex;
  status: IssuanceStatus;
  requestedBy: string;
  approvedBy?: string;
  txHash?: Hex;
  createdAt: string;
  updatedAt: string;
};

export type FreezeCaseStatus =
  | "opened"
  | "reviewed"
  | "address_blocked"
  | "seizure_approved"
  | "burn_broadcast"
  | "confirmed"
  | "closed";

export type FreezeCase = {
  id: string;
  chainId: number;
  tokenAddress: string;
  targetAddress: string;
  amountRaw: bigint;
  caseReferenceHash: Hex;
  status: FreezeCaseStatus;
  openedBy: string;
  approvedBy?: string;
  blockTxReference?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  operation: string;
  subjectId: string;
  actor?: string;
  at: string;
  inputHash?: Hex;
};

export class B20OperationsStore {
  readonly orders = new Map<string, OrderRecord>();
  readonly issuanceRequests = new Map<string, IssuanceRequest>();
  readonly freezeCases = new Map<string, FreezeCase>();
  readonly auditEvents: AuditEvent[] = [];
  private readonly idempotency = new Map<string, string>();

  createOrder(input: {
    idempotencyKey: string;
    externalReference: string;
    chainId: number;
    tokenAddress: string;
    merchantAddress: string;
    expectedAmountRaw: bigint;
    decimalsSnapshot: number;
    memo: MemoRecord;
  }): OrderRecord {
    const existingId = this.idempotency.get(`order:${input.idempotencyKey}`);
    if (existingId) {
      return this.mustGet(this.orders, existingId);
    }
    const now = timestamp();
    const order: OrderRecord = {
      id: makeId("ord", this.orders.size + 1),
      idempotencyKey: input.idempotencyKey,
      externalReference: input.externalReference,
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
      merchantAddress: input.merchantAddress,
      expectedAmountRaw: input.expectedAmountRaw,
      decimalsSnapshot: input.decimalsSnapshot,
      memoBytes32: input.memo.memoBytes32,
      status: "awaiting_payment",
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(order.id, order);
    this.idempotency.set(`order:${input.idempotencyKey}`, order.id);
    this.audit("order.created", order.id);
    return order;
  }

  requestIssuance(input: {
    idempotencyKey: string;
    chainId: number;
    tokenAddress: string;
    recipientAddress: string;
    amountRaw: bigint;
    memo: MemoRecord;
    requestedBy: string;
  }): IssuanceRequest {
    const existingId = this.idempotency.get(`issuance:${input.idempotencyKey}`);
    if (existingId) {
      return this.mustGet(this.issuanceRequests, existingId);
    }
    const now = timestamp();
    const request: IssuanceRequest = {
      id: makeId("iss", this.issuanceRequests.size + 1),
      idempotencyKey: input.idempotencyKey,
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
      recipientAddress: input.recipientAddress,
      amountRaw: input.amountRaw,
      memoBytes32: input.memo.memoBytes32,
      status: "requested",
      requestedBy: input.requestedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.issuanceRequests.set(request.id, request);
    this.idempotency.set(`issuance:${input.idempotencyKey}`, request.id);
    this.audit("issuance.requested", request.id, input.requestedBy);
    return request;
  }

  approveIssuance(id: string, approvedBy: string): IssuanceRequest {
    const request = this.mustGet(this.issuanceRequests, id);
    if (request.status !== "requested" && request.status !== "business_review" && request.status !== "compliance_review") {
      throw new Error(`Issuance request ${id} cannot be approved from ${request.status}.`);
    }
    request.status = "approved";
    request.approvedBy = approvedBy;
    request.updatedAt = timestamp();
    this.audit("issuance.approved", request.id, approvedBy);
    return request;
  }

  openFreezeCase(input: {
    chainId: number;
    tokenAddress: string;
    targetAddress: string;
    amountRaw: bigint;
    openedBy: string;
    caseReferenceHash: Hex;
  }): FreezeCase {
    const now = timestamp();
    const freezeCase: FreezeCase = {
      id: makeId("frz", this.freezeCases.size + 1),
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
      targetAddress: input.targetAddress,
      amountRaw: input.amountRaw,
      caseReferenceHash: input.caseReferenceHash,
      status: "opened",
      openedBy: input.openedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.freezeCases.set(freezeCase.id, freezeCase);
    this.audit("freeze.opened", freezeCase.id, input.openedBy);
    return freezeCase;
  }

  markAddressBlocked(id: string, blockTxReference: string): FreezeCase {
    const freezeCase = this.mustGet(this.freezeCases, id);
    freezeCase.status = "address_blocked";
    freezeCase.blockTxReference = blockTxReference;
    freezeCase.updatedAt = timestamp();
    this.audit("freeze.address_blocked", freezeCase.id);
    return freezeCase;
  }

  approveSeizure(id: string, approvedBy: string): FreezeCase {
    const freezeCase = this.mustGet(this.freezeCases, id);
    if (freezeCase.status !== "address_blocked") {
      throw new Error("Freeze-and-seize requires target address to be denied by sender policy before approval.");
    }
    freezeCase.status = "seizure_approved";
    freezeCase.approvedBy = approvedBy;
    freezeCase.updatedAt = timestamp();
    this.audit("freeze.seizure_approved", freezeCase.id, approvedBy);
    return freezeCase;
  }

  private audit(operation: string, subjectId: string, actor?: string): void {
    this.auditEvents.push({
      id: makeId("aud", this.auditEvents.length + 1),
      operation,
      subjectId,
      actor,
      at: timestamp(),
    });
  }

  private mustGet<T>(map: Map<string, T>, id: string): T {
    const value = map.get(id);
    if (!value) {
      throw new Error(`Record not found: ${id}`);
    }
    return value;
  }
}

function makeId(prefix: string, sequence: number): string {
  return `${prefix}_${sequence.toString().padStart(6, "0")}`;
}

function timestamp(): string {
  return new Date().toISOString();
}
