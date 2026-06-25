# Incident Response

Emergency controls are feature-specific:

- `TRANSFER`
- `MINT`
- `BURN`

Runbook:

1. Detect incident and create an incident ID.
2. Security pauser pauses only the required feature.
3. Record tx hash, actor, signer, chain, token, and reason.
4. Investigate role, policy, supply, and ledger drift.
5. Governance or unpauser reviews remediation.
6. Unpause with a signer different from the pauser where possible.

Public frontend routes must not call admin endpoints. Admin APIs require RBAC and audit logging.
