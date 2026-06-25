import { describe, expect, test } from "vitest";

import { normalizeB20Config } from "./config";
import { createDeploymentPlan } from "./deploymentPlan";

const roles = {
  admin: "0x1111111111111111111111111111111111111111",
  minter: "0x2222222222222222222222222222222222222222",
  burner: "0x3333333333333333333333333333333333333333",
  burnBlocked: "0x3333333333333333333333333333333333333333",
  pauser: "0x4444444444444444444444444444444444444444",
  unpauser: "0x5555555555555555555555555555555555555555",
  metadata: "0x6666666666666666666666666666666666666666",
  operator: "0x8888888888888888888888888888888888888888",
  policyAdmin: "0x7777777777777777777777777777777777777777",
};

describe("B20 deployment plan", () => {
  test("contains deterministic review fields and a stable config digest", () => {
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
        salt: "dieutx-b20-v3",
        supplyCap: "1000000",
        contractURI: "ipfs://bafybeigdyrzt",
      },
      roles,
      policies: { sender: 0n, receiver: 0n, executor: 0n, mintReceiver: 0n },
      signer: { mode: "safe-proposal" },
      mainnet: { locked: true },
    });

    const plan = createDeploymentPlan(config, "0x9999999999999999999999999999999999999999");

    expect(plan.chainId).toBe(84532);
    expect(plan.variant).toBe("asset");
    expect(plan.saltHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(plan.predictedAddress).toMatch(/^0xB200/i);
    expect(plan.supplyCap.raw).toBe("1000000000000000000000000");
    expect(plan.configDigest).toMatch(/^0x[a-f0-9]{64}$/);
    expect(plan.initCalls.length).toBeGreaterThan(1);
  });
});
