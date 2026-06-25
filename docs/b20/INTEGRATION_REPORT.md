# B20 Integration Report

## Repository Findings

- Frontend: Vite + TypeScript browser app in `src/` and `index.html`.
- Backend/API: none.
- Database/ORM/migrations: none before this change.
- Auth/RBAC: none before this change.
- Package manager: npm with `package-lock.json`.
- Workspace layout: single package, no monorepo.
- Environment: `.env.example` for CLI fallback; browser wallet flow avoids private keys.
- Logging/metrics/queue/cron: none before this change.
- Tests/CI: Vitest tests; no CI workflow present.
- Web3 stack: `viem` exists. Foundry config exists with `base = true`, but Base Foundry binaries are not installed in this environment.
- Existing domain models: no order, invoice, payment, wallet, compliance, ledger, or user model.
- Reference repo `b20-realistic-demo`: not present in this workspace.

## B20 Mapping

| B20 area | Integration in this repo |
| --- | --- |
| Chain workspace | Root Foundry config plus `script/b20/*.s.sol` and pinned dependency metadata in `chain/b20/dependencies.lock`. |
| B20 client library | `src/b20ops/abi.ts`, `client.ts`, `config.ts`, `amount.ts`, `memo.ts`, `errors.ts`. |
| Issuer/admin service | Pure workflow/store model in `src/b20ops/workflows.ts`; production API must wrap it with auth/RBAC. |
| Payment service | Memo codec and adjacent-log reconciler in `src/b20ops/memo.ts` and `reconciliation.ts`. |
| Event indexer/reconciler | Pure pairing/validation logic plus SQL cursor schema. |
| Database schema | Portable SQL in `migrations/b20/001_b20_core.sql`. |
| API routes | Not added because the repo has no backend framework. Runbook documents required endpoints. |
| Frontend/admin UI | Existing wallet deployer remains compatible; operational modules are separate. |
| Test and CI | Vitest tests added for pure logic; Base Foundry commands added for environments with `base-forge`. |

## Assumptions

- This repo remains a lightweight browser-wallet deployer plus operations toolkit, not a full backend service.
- Production private keys are never stored in `.env`; production should use Safe, hardware wallet, MPC/HSM, KMS, or remote signer.
- Mainnet deployment is plan-only in this repo. The deploy script refuses chain ID `8453`.
- SQL schema is a baseline migration to adapt when a real DB framework is introduced.
- Policy IDs in config must be created and verified before attach; built-in `0` is allowed.

## Official References Checked

- Base Launch B20 Token documentation.
- Base B20 Native Token Standard documentation.
- Base Accept B20 Payments documentation.
- `base/base-std` interfaces at commit `4658f1b7b54ccc61b036adc32830594018ea507e`.
