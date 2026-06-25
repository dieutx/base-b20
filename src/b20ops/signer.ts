export type SignerMode = "local-test-key" | "keystore" | "safe-proposal" | "remote-signer" | "hardware-wallet";

export type MainnetGuardInput = {
  chainId: number;
  environment: "local" | "testnet" | "production";
  signerMode: SignerMode;
  dryRun: boolean;
  confirmationPhrase?: string;
  expectedConfirmationPhrase?: string;
};

export type SignerAdapter<SimulationRequest = unknown, SendRequest = unknown, SendResult = unknown> = {
  getAddress(): Promise<string>;
  simulate(request: SimulationRequest): Promise<unknown>;
  send(request: SendRequest): Promise<SendResult>;
  getMode(): SignerMode;
};

export function assertMainnetOperationAllowed(input: MainnetGuardInput): void {
  if (input.chainId !== 8453) {
    return;
  }
  if (!input.dryRun) {
    throw new Error("Mainnet broadcast is disabled by default. Generate a dry-run plan or Safe proposal only.");
  }
  if (input.environment !== "production") {
    throw new Error("Mainnet operations require production environment.");
  }
  if (input.signerMode === "local-test-key" || input.signerMode === "keystore") {
    throw new Error("mainnet production signer cannot use local-test-key or plaintext keystore mode.");
  }
  if (!input.expectedConfirmationPhrase || input.confirmationPhrase !== input.expectedConfirmationPhrase) {
    throw new Error("Mainnet operation requires the exact confirmation phrase.");
  }
}
