# Base Sepolia Runbook

## Preflight

1. Install Base Foundry and dependencies.
2. Fill only testnet values in your shell:

```bash
export ACCOUNT_ADDRESS="0x..."
export PRIVATE_KEY="0x..." # testnet only
npm run b20:preflight:sepolia
```

Preflight checks RPC chain ID and B20 activation for the configured variant.

## Deployment

Review the plan first:

```bash
node --experimental-strip-types scripts/b20/cli.ts plan config/b20/base-sepolia.asset.json
```

Deploy only on Sepolia:

```bash
export ACCOUNT_ADDRESS="0x..."
export PRIVATE_KEY="0x..." # testnet only
npm run b20:deploy:sepolia
```

The deploy script refuses `8453`.

## Smoke Test

The smoke wrapper is guarded to Sepolia:

```bash
npm run b20:smoke:sepolia
```

Manual smoke sequence:

1. Preflight.
2. Deploy or select a fixture token.
3. Mint with memo.
4. Direct payment with memo.
5. Reconcile adjacent `Transfer`/`Memo`.
6. Block sender and confirm simulation fails.
7. Unblock and transfer.
8. Pause transfer and confirm failure.
9. Unpause.
10. Write the report under `deployments/b20/84532/`.
