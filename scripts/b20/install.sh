#!/usr/bin/env bash
set -euo pipefail

if ! command -v base-forge >/dev/null 2>&1; then
  echo "base-forge is required. Install Base Foundry with base-foundryup first." >&2
  exit 127
fi

base-forge install base/base-std@4658f1b7b54ccc61b036adc32830594018ea507e --no-git
base-forge install foundry-rs/forge-std@257559546b763ec5fa7371fb77fef9102db86446 --no-git
echo "Pinned B20 Foundry dependencies installed."
