# Policy And Freeze

## Policy Scopes

B20 supports four policy scopes:

- `TRANSFER_SENDER_POLICY`
- `TRANSFER_RECEIVER_POLICY`
- `TRANSFER_EXECUTOR_POLICY`
- `MINT_RECEIVER_POLICY`

Always check `policyExists(policyId)` before attaching a custom policy. `isAuthorized` on a missing policy is not proof the policy is valid.

## Policy Administration

Use `createPolicyWithAccounts` when seeding initial members. Empty allowlists block everyone and must be previewed before attach. Policy admin transfer is two-step: stage, then finalize. Renouncing policy admin freezes the policy forever.

## Freeze And Seize

`burnBlocked` is not a one-click public button. Case workflow:

`opened -> reviewed -> address_blocked -> seizure_approved -> burn_broadcast -> confirmed -> closed`

Requirements:

- target must be denied by `TRANSFER_SENDER_POLICY`
- signer must hold `BURN_BLOCKED_ROLE`
- burn feature must not be paused
- mainnet requires dual approval
- log before/after balance, policy ID, actor, and tx hash
