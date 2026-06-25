import {
  decodeEventLog,
  encodeEventTopics,
  isAddressEqual,
  parseAbiItem,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

export type B20RawLog = {
  address: Address;
  transactionHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  blockHash: Hex;
  topics: readonly (Hex | readonly Hex[] | null)[];
  data: Hex;
};

export type MemoTransferPair = {
  chainId?: number;
  tokenAddress: Address;
  transactionHash: Hex;
  primaryLogIndex: number;
  memoLogIndex: number;
  blockNumber: bigint;
  blockHash: Hex;
  fromAddress: Address;
  toAddress: Address;
  callerAddress: Address;
  amountRaw: bigint;
  memoBytes32: Hex;
  kind: "transfer" | "mint" | "burn";
};

export type PaymentExpectation = {
  token: Address;
  merchant: Address;
  expectedAmountRaw: bigint;
  memoBytes32: Hex;
  payer?: Address;
  executor?: Address;
};

export type PaymentValidation = { ok: true } | { ok: false; reason: string };

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 amount)");
const memoEvent = parseAbiItem("event Memo(address indexed caller, bytes32 indexed memo)");
const transferTopic = encodeEventTopics({ abi: [transferEvent], eventName: "Transfer" })[0];
const memoTopic = encodeEventTopics({ abi: [memoEvent], eventName: "Memo" })[0];

export function pairMemoTransfers(logs: readonly B20RawLog[]): MemoTransferPair[] {
  const sorted = [...logs].sort((left, right) => left.logIndex - right.logIndex);
  const byIndex = new Map(sorted.map((log) => [log.logIndex, log]));
  const pairs: MemoTransferPair[] = [];

  for (const log of sorted) {
    if (topic0(log) !== memoTopic) {
      continue;
    }
    const previous = byIndex.get(log.logIndex - 1);
    if (!previous || previous.address.toLowerCase() !== log.address.toLowerCase()) {
      continue;
    }
    if (topic0(previous) !== transferTopic) {
      continue;
    }

    const transfer = decodeEventLog({
      abi: [transferEvent],
      data: previous.data,
      topics: previous.topics as [Hex, ...Hex[]],
      eventName: "Transfer",
    });
    const memo = decodeEventLog({
      abi: [memoEvent],
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
      eventName: "Memo",
    });
    const fromAddress = transfer.args.from;
    const toAddress = transfer.args.to;
    pairs.push({
      tokenAddress: log.address,
      transactionHash: log.transactionHash,
      primaryLogIndex: previous.logIndex,
      memoLogIndex: log.logIndex,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      fromAddress,
      toAddress,
      callerAddress: memo.args.caller,
      amountRaw: transfer.args.amount,
      memoBytes32: memo.args.memo,
      kind: classifyTransfer(fromAddress, toAddress),
    });
  }

  return pairs;
}

export function validatePaymentPair(pair: MemoTransferPair, expectation: PaymentExpectation): PaymentValidation {
  if (!isAddressEqual(pair.tokenAddress, expectation.token)) {
    return { ok: false, reason: "wrong token" };
  }
  if (pair.kind !== "transfer") {
    return { ok: false, reason: `not a direct or pull payment transfer: ${pair.kind}` };
  }
  if (!isAddressEqual(pair.toAddress, expectation.merchant)) {
    return { ok: false, reason: "wrong merchant" };
  }
  if (pair.amountRaw !== expectation.expectedAmountRaw) {
    return { ok: false, reason: "wrong amount" };
  }
  if (pair.memoBytes32.toLowerCase() !== expectation.memoBytes32.toLowerCase()) {
    return { ok: false, reason: "wrong memo" };
  }
  if (expectation.payer && !isAddressEqual(pair.fromAddress, expectation.payer)) {
    return { ok: false, reason: "wrong payer" };
  }
  if (expectation.executor && !isAddressEqual(pair.callerAddress, expectation.executor)) {
    return { ok: false, reason: "wrong executor" };
  }
  return { ok: true };
}

function classifyTransfer(from: Address, to: Address): MemoTransferPair["kind"] {
  if (isAddressEqual(from, zeroAddress)) {
    return "mint";
  }
  if (isAddressEqual(to, zeroAddress)) {
    return "burn";
  }
  return "transfer";
}

function topic0(log: B20RawLog): string | undefined {
  const first = log.topics[0];
  return typeof first === "string" ? first.toLowerCase() : undefined;
}
