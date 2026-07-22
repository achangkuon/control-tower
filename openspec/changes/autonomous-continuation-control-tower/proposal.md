# Proposal: Autonomous Continuation — Control Tower Track

## Intent

Add the approved Revision 11 continuation substrate to the standalone Control Tower while keeping it deterministic, plan-agnostic, OFF by default, and backward-compatible with Plan A at HEAD `71ab571`. This proposal does not redesign Revision 11.

## Scope

### In Scope
- Phase 0: immutable baseline/hash/version evidence and restore proof without changing production behavior.
- Original Slices 1–7: anchor/migration; identity/mode; Main/API contracts; delivery/claim; lifecycle/attestation/effects; recovery/rollback; root-only polling.
- CT-only independent verification of all 64 CT-R1…CT-R12 scenarios, plus existing fail-closed regressions, using isolated temporary Git/Tower roots.
- Preserve legacy `agent`, `message`, and `lock` tables, queue behavior, tools, readable OFF status, and OFF fail-closed/no-mutation guarantees.

### Out of Scope
- Servi-Task-U discovery, OpenSpec interpretation, ownership, one-unit policy, project rollout, runbooks, or policy scripts.
- Runtime mutation of the actual Tower during planning/tests; activation, delivery, or hostile same-UID protection.
- Apply, activation, commit, push, PR, remote work, or any authorization for them.

## Capabilities

### New Capabilities
- `control-tower-admin-authority`: canonical Main authority, exact API, idempotency, errors.
- `control-tower-identity-mode`: claimant identity, mode, lease, rollback epoch.
- `control-tower-delivery-claim`: peek, atomic claim, budget, provenance.
- `control-tower-completion-attestation`: lifecycle, evidence, effects, completion.
- `control-tower-recovery-rollback`: proof-bound recovery, suspension, redelivery.
- `control-tower-migration-polling`: anchor, additive migration, root-only polling.

### Modified Capabilities
- None.

## Approach

Extend the existing `core.mjs` SQLite authority with an additive continuation plane beside the unchanged legacy queue. Keep every mutation transactional and fenced; expose the exact approved contract through existing adapters. The later Servi-Task-U track is a dependent consumer of this exact CT API, identity, fence, evidence, and deterministic-error contract—not a Tower responsibility.

## Affected Areas

| Area | Impact |
|---|---|
| `core.mjs`, `mcp.mjs` | Additive schema and contract |
| `install.sh`, `bin/torre`, `plugin/tower-spike.js` | Explicit administration and root lifecycle |
| `test/{migration,identity,lifecycle,recovery,polling,fail-closed}.test.mjs` | 64-scenario CT verification |

## Risks

| Risk | Mitigation |
|---|---|
| Legacy/OFF regression | Preserve Plan A tests and fail closed |
| Duplicate or unsafe work | Atomic fences, attestations, proof-bound recovery |
| Core coupling | Ordered, rollbackable Slices 1–7 |

## Rollback Plan

Keep continuation OFF, quiesce and disposition live continuation records, retain audit evidence, and revert additive units to Plan A `71ab571`; legacy queue/tools remain available. Phase 0 separately proves the historical `f583df7` baseline restore without authorizing it.

## Dependencies

- Approved Revision 11 proposal/design/specs and Judgment Day Round 2 result.

## Success Criteria

- [ ] All 64 stable CT scenarios and fail-closed regressions pass under `bun test` against isolated fixtures.
- [ ] Actual Tower remains OFF and its runtime database is unchanged during planning/tests.
- [ ] Exact API/identity/fence/evidence/error contracts are consumable by the later Servi-Task-U track without Tower policy logic.
