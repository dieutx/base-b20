#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${1:-config/b20/base-sepolia.asset.json}"
if ! command -v base-forge >/dev/null 2>&1; then
  echo "base-forge is required. Run npm run b20:install after installing Base Foundry." >&2
  exit 127
fi
source <(node --experimental-strip-types scripts/b20/cli.ts env "$CONFIG_PATH")
if [[ "${CHAIN_ID:-84532}" != "84532" ]]; then
  echo "Refusing to deploy: CHAIN_ID must be 84532 for Base Sepolia." >&2
  exit 1
fi
if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY is required for Sepolia CLI deploy. Do not use this flow for production." >&2
  exit 1
fi

node --experimental-strip-types scripts/b20/cli.ts plan "$CONFIG_PATH"
base-forge script script/b20/DeployB20.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
