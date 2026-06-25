import { keccak256, toBytes, type Hex } from "viem";

export const MEMO_NAMESPACES = ["PAYMENT", "MINT", "REDEEM", "BURN", "POLICY"] as const;

export type MemoNamespace = (typeof MEMO_NAMESPACES)[number];

export type MemoInput = {
  namespace: string;
  reference: string;
};

export type MemoRecord = {
  namespace: MemoNamespace;
  version: 1;
  reference: string;
  displayReference: string;
  canonicalPayload: string;
  memoBytes32: Hex;
};

export function isAllowedMemoNamespace(namespace: string): namespace is MemoNamespace {
  return MEMO_NAMESPACES.includes(namespace.toUpperCase() as MemoNamespace);
}

export function createMemo(input: MemoInput): MemoRecord {
  const namespace = input.namespace.toUpperCase();
  const reference = input.reference.trim();
  if (!isAllowedMemoNamespace(namespace)) {
    throw new Error(`Unsupported B20 memo namespace: ${input.namespace}`);
  }
  if (reference === "") {
    throw new Error("Memo reference is required.");
  }
  if (containsObviousPii(reference)) {
    throw new Error("Memo reference looks like PII. Store sensitive data offchain and hash only an opaque reference.");
  }

  const canonicalPayload = `${namespace}:v1:${reference}`;
  return {
    namespace,
    version: 1,
    reference,
    displayReference: reference.length > 24 ? `${reference.slice(0, 21)}...` : reference,
    canonicalPayload,
    memoBytes32: keccak256(toBytes(canonicalPayload)),
  };
}

function containsObviousPii(value: string): boolean {
  return /@/.test(value) || /\b\d{3}[-. ]?\d{2}[-. ]?\d{4}\b/.test(value);
}
