# Mainnet Checklist

Mainnet is locked by default. This repository must not broadcast mainnet transactions.

Before a real mainnet change:

- Confirm chain ID `8453`.
- Use a controlled production RPC, not a public fallback.
- Use Safe, hardware wallet, MPC/HSM, KMS, or remote signer.
- Do not use `local-test-key` or plaintext private key mode.
- Generate a plan with:

```bash
npm run b20:plan:mainnet
```

- Review predicted address, salt hash, role matrix, policy IDs, init calls, and config digest.
- Verify policy IDs exist before attach.
- Ensure allowlist policies are not empty unless intentionally blocking all transfers.
- Confirm `MINT_RECEIVER_POLICY` allows bootstrap mint recipients.
- Require explicit change ticket and four-eyes approval.
- If using Safe, create a proposal payload instead of broadcasting.

The Solidity deploy script rejects mainnet. Any future mainnet broadcast command must require an exact confirmation phrase and separate protected environment.
