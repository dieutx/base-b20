import { describe, expect, test } from "vitest";

import { assertMainnetOperationAllowed, type SignerMode } from "./signer";

describe("B20 signer and mainnet guard", () => {
  test("allows Sepolia local test signing", () => {
    expect(() =>
      assertMainnetOperationAllowed({
        chainId: 84532,
        environment: "testnet",
        signerMode: "local-test-key",
        dryRun: false,
      }),
    ).not.toThrow();
  });

  test("blocks mainnet broadcast by default", () => {
    expect(() =>
      assertMainnetOperationAllowed({
        chainId: 8453,
        environment: "production",
        signerMode: "safe-proposal",
        dryRun: false,
      }),
    ).toThrow("Mainnet broadcast is disabled");
  });

  test.each<SignerMode>(["local-test-key", "keystore"])("blocks plaintext signer mode %s on mainnet", (signerMode) => {
    expect(() =>
      assertMainnetOperationAllowed({
        chainId: 8453,
        environment: "production",
        signerMode,
        dryRun: true,
        confirmationPhrase: "PLAN MAINNET B20",
        expectedConfirmationPhrase: "PLAN MAINNET B20",
      }),
    ).toThrow("production signer");
  });
});
