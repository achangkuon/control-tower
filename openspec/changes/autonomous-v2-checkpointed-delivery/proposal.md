# Proposal: Local-first autonomous execution with checkpointed delivery

## Intent

Define cross-plan Autonomous V2 local execution and checkpointed GitHub delivery. S2.3 proved authority-scoped Main-store/CAS primitives; PR #78 delivery evidence demonstrated byte/mode-preserving reconciliation and re-verification. Plan 2/S2.3 and `installable-v1-autonomous-v2-split` remain unchanged.

## Scope

### In Scope
- Versioned global policy with fixed safety floors.
- Project Policy/Jornada snapshots, budgets, and bounded, audited, user-authorized exceptions.
- Plan-agnostic enforcement, candidate evidence/recovery, and a single-project, single-host pilot.
- Plan at most two Sesiones ahead; reject excess and require the predecessor's integrated base for execution.

### Out of Scope
- Automatic merge, speculative delivery, or existing V2 split changes.
- Concurrent hosts, adaptive budgets, dashboards, or multi-repository campaigns.
- Additional unproven Sesión IDs or reopened Plan 2 work.

## Capabilities

- New: `autonomous-v2-checkpointed-delivery` policy, candidate, delivery, successor, and conformance contracts.
- Modified: none; `autonomous-control-tower-v2` remains a dependency.

## Approach

Use global defaults/floors, project Policy/Jornada configuration, and Tower enforcement. One planning Sesión is one PR; domain `slice_id` identifies scope. Immutable `candidate_revision` freezes project/plan/Sesión/artifact identity, base/result/tree/commit/head/target, assignment, `host_epoch`, Policy/Jornada revisions, verification digest, and required check/review configuration.

Delivery creates the automatic final local commit, verifies its exact commit/tree, freezes the candidate, then performs one idempotent push and PR open/update. Publication appends effect/check/review/authorization outcomes without changing identity. Code/result/tree/commit/head, base, target, policy, assignment, `host_epoch`, or required-configuration changes require reconciliation, re-verification, and a successor. Merge needs exact human authorization bound to candidate plus current ledger. Waiting reasons are `quota_exhausted` for explicit quota/billing, `provider_unavailable` for explicit outage/5xx or timeout after read-only probe, and `checks_pending` for normal incomplete checks; ambiguity is blocked `unknown`, never bypass.

## Affected Areas

| Area | Future work |
|---|---|
| Plan 3 C/D | Workspace and Policy/Jornada inputs |
| Plan 4 E | Host fencing/local evidence |
| Plan 5 F/G | Delivery and integrated-base continuation |
| Plan 7 | End-to-end conformance |

## Risks

| Risk | Mitigation |
|---|---|
| Duplicate/stale effects | Candidate CAS, idempotency, read-only reconciliation |
| Weakened safety | Fixed floors; bounded authorization/audit |

## Rollback

Disable the policy revision and remote effects, restore prior pointers, and retain candidates/evidence.

## Dependencies

V1 contracts, verified S2.4 Registry Storage and XDG Path Resolution (PR #88, closed by PR #90), `autonomous-control-tower-v2`, Main ArtifactRefs/Policy authority, and human merge authorization. Later unenumerated Change B responsibilities are not a dependency of S3.1.

## Success Criteria

- [ ] Zero early remote or duplicate push/PR effects.
- [ ] Complete candidate identity and ledger evidence.
- [ ] Reject stale/non-integrated execution; classify Actions exhaustion as operational waiting.
