#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${1:-config/b20/base-sepolia.asset.json}"
if [[ "${CHAIN_ID:-84532}" != "84532" ]]; then
  echo "Refusing smoke test: CHAIN_ID must be 84532 for Base Sepolia." >&2
  exit 1
fi

node --experimental-strip-types scripts/b20/cli.ts preflight "$CONFIG_PATH"
echo "Run script/b20/SmokeB20.s.sol manually with base-forge after funding the test signer."
