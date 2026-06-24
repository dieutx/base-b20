# Base B20 Wallet Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Codespaces-ready repo that deploys a Base B20 token through MetaMask, OKX, or another injected browser wallet, with CLI fallback docs.

**Architecture:** A Vite/TypeScript app handles wallet discovery, network switching, B20 ABI encoding, factory calls, minting, and balance verification. Foundry files remain as a transparent CLI fallback for users who intentionally choose private-key based deployment.

**Tech Stack:** Vite, TypeScript, Vitest, viem, Base Foundry.

---

## File Structure

- `package.json`: app scripts and dependencies.
- `tsconfig.json`, `vite.config.ts`, `index.html`: Vite/TypeScript project wiring.
- `src/b20.ts`: pure B20 constants, ABI fragments, param/init-call encoding helpers, amount parsing.
- `src/b20.test.ts`: tests for B20 encoding and amount parsing.
- `src/wallets.ts`: EIP-6963 provider discovery with `window.ethereum` fallback.
- `src/main.ts`: browser UI, wallet connection, deploy/mint/verify actions.
- `src/styles.css`: compact application styling.
- `script/CreateToken.s.sol`, `foundry.toml`: CLI fallback.
- `.env.example`, `.gitignore`, `docs/security.md`, `README.md`: safe configuration and guide.

## Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/styles.css`

- [ ] **Step 1: Add Node/Vite project files**

Create the project with scripts:

```json
{
  "name": "base-b20",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "viem": "^2.45.2"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.2.7",
    "vitest": "^4.0.16"
  }
}
```

- [ ] **Step 2: Add simple HTML and CSS shell**

Create a single-page app with a form, status panels, and action buttons. Keep the UI dense and instructional, with no marketing hero.

## Task 2: B20 Encoding Logic

**Files:**
- Create: `src/b20.test.ts`
- Create: `src/b20.ts`

- [ ] **Step 1: Write tests first**

Test that:

- asset params encode the version/name/symbol/admin/decimals tuple
- init calls include `grantRole(MINT_ROLE, account)` and `updateSupplyCap(cap)`
- `parseTokenAmount("1000", 18)` returns `1000000000000000000000n`
- invalid decimals outside `6..18` throw

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: fail because `src/b20.ts` does not exist yet.

- [ ] **Step 3: Implement B20 helpers**

Implement constants:

- `B20_FACTORY_ADDRESS = "0xB20f000000000000000000000000000000000000"`
- `BASE_SEPOLIA_CHAIN_ID = 84532`
- `MINT_ROLE = keccak256(toBytes("MINT_ROLE"))`

Implement helpers with viem:

- `encodeAssetCreateParams`
- `encodeGrantMintRole`
- `encodeUpdateSupplyCap`
- `buildAssetInitCalls`
- `parseTokenAmount`
- `makeSalt`

- [ ] **Step 4: Run tests and fix until green**

Run: `npm test`

Expected: all tests pass.

## Task 3: Wallet Discovery and UI Actions

**Files:**
- Create: `src/wallets.ts`
- Create: `src/main.ts`

- [ ] **Step 1: Add EIP-6963 discovery**

Listen for `eip6963:announceProvider`, dispatch `eip6963:requestProvider`, store provider metadata, and fallback to `window.ethereum` when no EIP-6963 wallet is announced.

- [ ] **Step 2: Add wallet actions**

Use viem `custom(provider)` with a wallet client for:

- request accounts
- switch/add Base Sepolia
- predict B20 address via public client read call
- deploy with `createB20(uint8,bytes32,bytes,bytes[])`
- mint with `mint(address,uint256)`
- verify with `balanceOf(address)`

- [ ] **Step 3: Build to catch TypeScript errors**

Run: `npm run build`

Expected: build succeeds.

## Task 4: CLI Fallback and Safe Config

**Files:**
- Create: `foundry.toml`
- Create: `script/CreateToken.s.sol`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `docs/security.md`

- [ ] **Step 1: Add Foundry fallback files**

Use Base Foundry config and `CreateToken.s.sol` based on Base docs. The script reads `ACCOUNT_ADDRESS`, `TOKEN_NAME`, `TOKEN_SYMBOL`, `TOKEN_SALT`, `TOKEN_DECIMALS`, and `SUPPLY_CAP`.

- [ ] **Step 2: Add safe config templates**

`.env.example` must contain placeholders only. `.gitignore` must exclude `.env`, `broadcast/`, `cache/`, `out/`, `node_modules/`, and `dist/`.

- [ ] **Step 3: Add security guide**

Explain that wallet deploy requires no private key in Codespaces; CLI deploy should use a dedicated deploy wallet and never commit `.env`.

## Task 5: Codespaces Guide and Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Include:

- create private repo `dieutx/base-b20`
- open Codespaces
- run `npm install`
- run `npm run dev`
- open forwarded URL in a normal browser with MetaMask/OKX
- connect wallet, switch Base Sepolia, deploy, mint, verify
- optional Chainstack RPC note
- optional CLI fallback
- no-secret checklist

- [ ] **Step 2: Verify**

Run:

```bash
npm test
npm run build
rg -n "<private-key-like-hex-or-api-key-pattern>" .
```

Expected: tests/build pass; secret scan finds no real key.
