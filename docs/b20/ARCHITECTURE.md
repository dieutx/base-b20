# B20 Architecture

B20 is a Base-native ERC-20 superset implemented by precompiles. It is not a ticker named `$B20` and this repo does not deploy an ERC-20 replacement contract. Tokens are created through the singleton B20 Factory at `0xB20f000000000000000000000000000000000000`.

## Modules

- `src/b20ops/config.ts`: typed config validation for Asset and Stablecoin.
- `src/b20ops/deploymentPlan.ts`: deterministic plan, role matrix, init call list, config digest.
- `src/b20ops/client.ts`: viem-compatible read/write wrapper that simulates before writes.
- `src/b20ops/memo.ts`: namespaced memo hashing; no PII in memos.
- `src/b20ops/reconciliation.ts`: pairs `Memo` with the immediately previous primary event by log index.
- `src/b20ops/workflows.ts`: idempotent order, issuance, and freeze case workflow primitives.
- `script/b20/*.s.sol`: Base Foundry operational scripts.
- `migrations/b20/001_b20_core.sql`: portable persistence schema.

## Asset vs Stablecoin

Asset tokens support configurable decimals from 6 to 18 plus Asset-only capabilities such as operator role, multiplier, announcements, batch mint, and extra metadata. Stablecoin tokens always use 6 decimals and have an immutable uppercase currency code. Currency is self-declared metadata, not reserve proof.

## Security Boundaries

Application RBAC and onchain roles are separate. App roles should gate APIs before any signer adapter is called. Onchain roles must be least-privilege: admin, minter, burner, burnBlocked, pauser, unpauser, metadata, operator, and policy admin should not collapse into one production EOA.

## Payment Reconciliation

B20 emits `Memo` immediately after the primary event it annotates. The reconciler sorts receipt logs by `logIndex`, takes each token `Memo`, and pairs it only with the immediately preceding token `Transfer`. This supports multiple Transfer/Memo pairs in one transaction and prevents false positives where a memo exists in the receipt but the adjacent transfer has the wrong merchant, amount, token, payer, or executor.

Detected payments are not final. A production indexer must store block number and block hash, wait for the configured confirmation or safe/finalized policy, and mark orphaned logs if a reorg replaces the block. `migrations/b20/001_b20_core.sql` includes cursor and payment status fields for idempotent recovery.

## Known Limits

- This repo does not include a backend framework, so API endpoints and scheduled workers are documented but not exposed as HTTP routes.
- Base Foundry is required for Solidity build/live-precompile tests and is not bundled with npm.
- Permit support is exposed as an integration requirement; contract wallets should fall back to approve + transferFrom unless ERC-1271 support is added in the wallet layer.
