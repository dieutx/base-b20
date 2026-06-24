# Base B20 Token Deployment Repo Design

## Goal

Create a private-ready GitHub repository for `dieutx/base-b20` that explains and packages a Base B20 token deployment flow for GitHub Codespaces. The primary path must let users connect a browser wallet such as MetaMask or OKX from the Codespaces forwarded URL and deploy without placing a private key in Codespaces. The repository must be easy to follow, runnable by a non-expert, and must never commit private keys, real RPC credentials, or other sensitive data.

## Sources

- Base docs: `https://docs.base.org/get-started/launch-b20-token`
- Chainstack docs: `https://docs.chainstack.com/docs/base-tutorial-deploy-a-b20-token`

The design keeps the documented Base Foundry path as an auditable CLI fallback, but the primary UX is a small browser app. The browser app calls the B20 factory precompile through an injected EIP-1193 wallet provider, so the transaction executes on the connected wallet/network and the private key stays inside the wallet.

## Repository Structure

- `README.md`: clear Codespaces-first guide from repo creation through wallet connect, deploy, mint, and verify.
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/*`: Vite/TypeScript web app for wallet-based B20 deployment.
- `foundry.toml`: Base Foundry configuration with `base = true` and `base-std` remappings.
- `script/CreateToken.s.sol`: parameterized B20 Asset creation script using `B20FactoryLib`.
- `.env.example`: placeholder-only environment template.
- `.gitignore`: excludes `.env`, Foundry output, broadcast files, caches, editor noise, and dependency folders.
- `docs/security.md`: short security guide for private keys, Codespaces secrets, and funded deploy wallets.

## Wallet Deploy UX

The web app provides:

- wallet discovery with EIP-6963 when wallets support it, plus a `window.ethereum` fallback
- visible wallet/account/network status
- Base Sepolia switch/add-network action
- token form fields for name, symbol, decimals, salt, supply cap, and optional initial mint amount
- deterministic address preview using `getB20Address`
- deploy button that calls `createB20`
- optional mint button after deploy
- balance verification after mint

The browser must be opened in the user's normal desktop browser from the Codespaces forwarded port. Wallet extensions generally do not work inside an IDE simple browser.

## Token Defaults

The default token is a B20 Asset token:

- Name: `DieuTX B20`
- Symbol: `DIEUTX`
- Decimals: `18`
- Supply cap: `1_000_000e18`
- Initial mint example: `1_000e18`

The web app uses the connected wallet account as initial admin and minter. The Solidity script reads configuration from environment variables where useful, with safe defaults for display values. In both paths, the deploy account is both initial admin and minter, matching the quickstart pattern.

## Network Guidance

The README recommends Base Sepolia first:

- Public RPC fallback: `https://sepolia.base.org`
- Chain ID: `84532`
- Chainstack endpoint can replace the public RPC for reliability.

Mainnet guidance is cautious: Base mainnet should only be used after confirming B20/Beryl support and only with a dedicated funded deploy wallet.

## Secrets Model

No real secret is stored in the repo. The wallet path requires no private key in Codespaces. Users sign deploy and mint transactions from MetaMask, OKX, or another injected wallet.

Users only need `.env` for the CLI fallback. If they use CLI, they must create `.env` locally or in Codespaces from `.env.example`, preferably from GitHub Codespaces secrets or by pasting into an untracked `.env`.

The `.gitignore` explicitly excludes `.env`, broadcast artifacts, and cache directories because broadcast files can reveal deployment metadata and local traces.

## Commands

The README documents direct web-app commands:

- install dependencies
- start Vite in Codespaces
- open the forwarded URL in a browser with MetaMask/OKX
- connect wallet
- switch to Base Sepolia
- deploy token
- mint and verify balance

The README also documents direct CLI fallback commands instead of hiding them behind wrapper scripts:

- install Base Foundry
- install `base-std`
- check balance
- deploy with `base-forge script`
- capture `TOKEN_ADDRESS`
- mint with `base-cast send`
- verify with `base-cast call`

Direct commands keep the flow auditable and easier to debug.

## Verification

Local verification for this repo includes:

- Confirm no private key values are committed.
- Run TypeScript checks for the wallet app.
- Build the Vite app.
- Confirm the Solidity script compiles once Base Foundry and `base-std` are installed.
- Confirm README commands match the config and filenames.

Live deployment cannot be verified without a funded wallet and wallet extension access.
