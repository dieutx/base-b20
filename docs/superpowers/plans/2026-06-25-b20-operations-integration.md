# B20 Operations Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-oriented B20 operations foundation to the existing Vite/TypeScript deployer without inventing a backend stack.

**Architecture:** Keep the current browser wallet app intact, add reusable TypeScript B20 operations modules, Base Foundry scripts, portable SQL schema, and runbooks. Mainnet remains plan-only and Sepolia remains the first executable network.

**Tech Stack:** TypeScript, viem, Vitest, Vite, Base Foundry, Base Standard Library.

---

### Task 1: Repository Audit And Report

**Files:**
- Create: `docs/b20/INTEGRATION_REPORT.md`

- [x] Inspect package, Foundry, env, tests, and existing source layout.
- [x] Document missing backend, DB, auth, CI, queue, metrics, and domain models.
- [x] Map B20 components into the current repo shape.

### Task 2: Typed Operations Modules

**Files:**
- Create: `src/b20ops/amount.ts`
- Create: `src/b20ops/config.ts`
- Create: `src/b20ops/memo.ts`
- Create: `src/b20ops/reconciliation.ts`
- Create: `src/b20ops/workflows.ts`
- Create: `src/b20ops/signer.ts`
- Create: matching `*.test.ts`

- [x] Write failing tests for amount, memo, config, reconciliation, workflow, and signer guard behavior.
- [x] Implement decimal-safe amount parsing.
- [x] Implement namespaced bytes32 memo hashing with PII guard.
- [x] Implement Asset/Stablecoin config validation.
- [x] Implement adjacent-log Memo reconciliation.
- [x] Implement idempotent order, issuance, and freeze workflow primitives.
- [x] Implement mainnet signer guard.

### Task 3: Client, Plan, Scripts, And Config

**Files:**
- Create: `src/b20ops/abi.ts`
- Create: `src/b20ops/client.ts`
- Create: `src/b20ops/deploymentPlan.ts`
- Create: `scripts/b20/*.sh`
- Create: `scripts/b20/cli.ts`
- Create: `script/b20/*.s.sol`
- Modify: `package.json`
- Modify: `foundry.toml`

- [x] Add viem-compatible B20 client and error decoder.
- [x] Add deterministic deployment plan generation.
- [x] Add Sepolia preflight and plan CLI.
- [x] Add Base Foundry install/deploy/smoke command wrappers.
- [x] Add pinned dependency metadata for `base/base-std` and `forge-std`.

### Task 4: Persistence And Runbooks

**Files:**
- Create: `migrations/b20/001_b20_core.sql`
- Create: `docs/b20/*.md`

- [x] Add portable SQL schema for orders, payments, attempts, memos, issuance, redemption, freeze cases, cursors, and audit logs.
- [x] Document local development, Sepolia, mainnet, issuance/redemption, policy/freeze, incident response, and architecture.

### Task 5: Verification

- [x] Run targeted red/green tests during implementation.
- [x] Run Sepolia preflight without broadcasting.
- [ ] Run Base Foundry build/tests when `base-forge` is installed.
- [ ] Run Sepolia deploy/smoke only with funded testnet signer.
