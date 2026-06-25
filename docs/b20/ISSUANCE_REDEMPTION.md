# Issuance And Redemption

## Issuance

Issuance is never a direct public HTTP mint. The minimum workflow is:

`requested -> compliance_review/business_review -> approved -> signing -> broadcast -> confirming -> completed`

Controls:

- idempotency key per request
- RBAC for requester and approver
- mainnet dual control
- check mint receiver policy, mint pause, supply cap, recipient, and signer role before signing
- use `mintWithMemo`
- complete only after finality
- reconcile `totalSupply` against the internal ledger

## Redemption

Recommended flow for this repo is custody-style redemption:

`requested -> tokens_received/locked -> burn_signing -> burn_broadcast -> confirming -> offchain_settlement -> completed`

Users should not be assumed to have `BURN_ROLE`. The application should detect or receive token transfer into a redemption wallet with a memo, then an authorized burner executes `burnWithMemo`.

Do not put bank account data, email, names, or settlement details in the memo. Store a reference hash only.
