import { describe, expect, test } from "vitest";

import { normalizeB20Config } from "./config";

const admin = "0x1111111111111111111111111111111111111111";
const minter = "0x2222222222222222222222222222222222222222";
const burner = "0x3333333333333333333333333333333333333333";
const pauser = "0x4444444444444444444444444444444444444444";
const unpauser = "0x5555555555555555555555555555555555555555";
const metadata = "0x6666666666666666666666666666666666666666";
const policyAdmin = "0x7777777777777777777777777777777777777777";
const operator = "0x8888888888888888888888888888888888888888";

describe("B20 typed config", () => {
  test("normalizes an Asset config and computes raw supply cap plus salt hash", () => {
    const config = normalizeB20Config({
      environment: "testnet",
      network: {
        name: "base-sepolia",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        finalityConfirmations: 6,
      },
      token: {
        variant: "asset",
        name: "DieuTX B20",
        symbol: "DIEUTX",
        decimals: 18,
        salt: "dieutx-b20-v2",
        supplyCap: "1000000",
        contractURI: "ipfs://bafybeigdyrzt",
      },
      roles: { admin, minter, burner, burnBlocked: burner, pauser, unpauser, metadata, operator, policyAdmin },
      policies: {},
      signer: { mode: "local-test-key" },
      mainnet: { locked: true },
    });

    expect(config.token.variant).toBe("asset");
    expect(config.token.supplyCapRaw).toBe(1_000_000n * 10n ** 18n);
    expect(config.token.saltHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  test("enforces Stablecoin invariants", () => {
    expect(() =>
      normalizeB20Config({
        environment: "testnet",
        network: {
          name: "base-sepolia",
          chainId: 84532,
          rpcUrl: "https://sepolia.base.org",
          explorerUrl: "https://sepolia.basescan.org",
          finalityConfirmations: 6,
        },
        token: {
          variant: "stablecoin",
          name: "Demo USD",
          symbol: "DUSD",
          decimals: 18,
          currency: "usd",
          salt: "stable-v1",
          supplyCap: "1000",
          contractURI: "https://issuer.example.invalid/metadata.json",
        },
        roles: { admin, minter, burner, burnBlocked: burner, pauser, unpauser, metadata, policyAdmin },
        policies: {},
        signer: { mode: "local-test-key" },
        mainnet: { locked: true },
      }),
    ).toThrow("Stablecoin");
  });

  test("blocks unsafe mainnet config", () => {
    expect(() =>
      normalizeB20Config({
        environment: "production",
        network: {
          name: "base-mainnet",
          chainId: 8453,
          rpcUrl: "https://mainnet.base.org",
          explorerUrl: "https://basescan.org",
          finalityConfirmations: 30,
        },
        token: {
          variant: "asset",
          name: "Mainnet Asset",
          symbol: "MAIN",
          decimals: 18,
          salt: "mainnet-v1",
          supplyCap: "1000000",
          contractURI: "https://issuer.example.invalid/metadata.json",
        },
        roles: {
          admin,
          minter: admin,
          burner: admin,
          burnBlocked: admin,
          pauser: admin,
          unpauser: admin,
          metadata: admin,
          operator: admin,
          policyAdmin: admin,
        },
        policies: {},
        signer: { mode: "local-test-key" },
        mainnet: { locked: false, confirmationPhrase: "DEPLOY MAINNET B20" },
      }),
    ).toThrow("mainnet");
  });
});
