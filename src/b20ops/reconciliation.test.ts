import { encodeAbiParameters, encodeEventTopics, parseAbiItem, zeroAddress, type Address, type Hex } from "viem";
import { describe, expect, test } from "vitest";

import { pairMemoTransfers, validatePaymentPair } from "./reconciliation";

const token = "0xB200000000000000000000000000000000000001" as Address;
const merchant = "0x9999999999999999999999999999999999999999" as Address;
const payer = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;
const other = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Address;
const memo = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 amount)");
const memoEvent = parseAbiItem("event Memo(address indexed caller, bytes32 indexed memo)");

function transferLog(logIndex: number, from: Address, to: Address, amount: bigint) {
  return {
    address: token,
    transactionHash: "0xabc" as Hex,
    logIndex,
    blockNumber: 10n,
    blockHash: "0xblock" as Hex,
    topics: encodeEventTopics({ abi: [transferEvent], eventName: "Transfer", args: { from, to } }),
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function memoLog(logIndex: number, caller: Address, memoBytes32: Hex) {
  return {
    address: token,
    transactionHash: "0xabc" as Hex,
    logIndex,
    blockNumber: 10n,
    blockHash: "0xblock" as Hex,
    topics: encodeEventTopics({ abi: [memoEvent], eventName: "Memo", args: { caller, memo: memoBytes32 } }),
    data: "0x" as Hex,
  };
}

describe("B20 payment reconciliation", () => {
  test("pairs each Memo with the immediately preceding Transfer", () => {
    const pairs = pairMemoTransfers([
      transferLog(3, payer, merchant, 100n),
      memoLog(4, payer, memo),
      transferLog(7, other, merchant, 200n),
      memoLog(8, other, memo),
    ]);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.primaryLogIndex).toBe(3);
    expect(pairs[1]?.primaryLogIndex).toBe(7);
  });

  test("does not pair a memo with a non-adjacent transfer", () => {
    const pairs = pairMemoTransfers([transferLog(1, payer, merchant, 100n), memoLog(3, payer, memo)]);

    expect(pairs).toHaveLength(0);
  });

  test("validates merchant, memo, and amount before marking a payment valid", () => {
    const [pair] = pairMemoTransfers([transferLog(1, payer, merchant, 100n), memoLog(2, payer, memo)]);
    expect(pair).toBeDefined();

    expect(validatePaymentPair(pair!, { token, merchant, expectedAmountRaw: 100n, memoBytes32: memo })).toEqual({
      ok: true,
    });
    expect(validatePaymentPair(pair!, { token, merchant: other, expectedAmountRaw: 100n, memoBytes32: memo }).ok).toBe(
      false,
    );
    expect(validatePaymentPair(pair!, { token, merchant, expectedAmountRaw: 101n, memoBytes32: memo }).ok).toBe(false);
  });

  test("supports mint and burn memo pairing without treating them as payments", () => {
    const mintPair = pairMemoTransfers([transferLog(1, zeroAddress, merchant, 100n), memoLog(2, payer, memo)])[0];
    const burnPair = pairMemoTransfers([transferLog(3, payer, zeroAddress, 50n), memoLog(4, payer, memo)])[0];

    expect(mintPair?.kind).toBe("mint");
    expect(burnPair?.kind).toBe("burn");
  });
});
