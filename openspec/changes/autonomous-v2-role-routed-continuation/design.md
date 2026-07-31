# Design: Autonomous V2 Role-Routed Continuation

## Technical Approach

Add a Main-owned orchestration layer around the delivered Tower. `core.mjs` remains the sole SQLite authority; `createContinuationDispatcher` transports opaque work, while validation and routing stay outside `core.mjs`/`mcp.mjs`. Existing v1 and completed-Sesión bytes remain valid.

| Component | Ownership boundary |
|---|---|
| Worker | Executes one assignment; emits evidence; never selects a successor. |
| Main | Sole registry writer, reconciler, invoker, assigner, dispatcher, and delivery coordinator. |
| Support | Main-invoked read-only analysis; one ranked proposal plus alternatives; Main-only output. |
| Policy | Evaluates eligibility against approved intent/Jornada; cannot plan, select a worker, or dispatch. |
| Jornada | Human-approved scope, limits, expiry, operations, and host fence. |
| Capability Registry | One project-scoped, versioned registry; metadata grants visibility/invocation compatibility, never authority. |

## Data Flow

```text
Worker complete/checkpoint
  -> Main verifies Tower result + Git/OpenSpec/base/runtime and freezes ReconciledCheckpoint
  -> Main resolves Support capability -> SupportProposal (automatic, or Main on-demand)
  -> Main resolves Policy capability -> PolicyReport ALLOW/DENY
  -> Main revalidates every binding -> Assignment -> Tower publish/dispatch -> Worker claim
```

On `DENY`, Policy may attach a non-authoritative alternative brief. Main sends it to Support for scope/dependency/conflict validation; a human adopts or rejects it. Adoption starts fresh reconciliation, and Main alone assigns. `NO_SCOPE` returns the minimum missing decision/evidence and no assignment.

## Interfaces and Lifecycle

New records are strict, canonically digested JSON-schema contracts, immutable after issue.

| Contract | Required binding / lifecycle |
|---|---|
| `agent-capability-registry-v1` | Project/Main identity; registry and entry revisions; caller identity/role; capability; input/output schema IDs; source ref/digest; availability window/expiry. CAS update invalidates all older bindings. |
| `reconciled-checkpoint-v1` | Assignment/generation, checkpoint/result, repository/root/common-dir/remote/ref, base/result, manifest, candidate/ledger, runtime projection, host epoch, Jornada, registry/capability revisions; `VALID` or terminal `INVALID`. |
| `support-proposal-v1` | Checkpoint and registry bindings, caller=`MAIN`, primary, alternatives, conflicts, evidence, expiry; `EXECUTABLE`, `NO_SCOPE`, or `STALE`. |
| `policy-report-v2` | Proposal/checkpoint, Policy capability, Jornada/manifest/runtime bindings, `ALLOW`/`DENY`, rationale, gates, optional alternative brief, expiry. V1 remains readable. |
| `assignment-v2` | Exact approved proposal/report/checkpoint/capability/Jornada/base/host/attempt and expiry; Main signature/attestation. V1 remains readable. |
| `recovery-proof-v1` | Old claim/delivery/assignment, generation, disposition, termination pairing, effect/rollback read-back, repository/workspace/base/mode, runtime and current role bindings. |

Resolution authorizes only the exact caller and visible role. Any missing, malformed, cross-project, unavailable, expired, version/schema/source mismatch, base/runtime drift, inactive Jornada, horizon greater than two, predecessor not integrated, Policy denial, or absent scope fails closed before mutation. New forecast codes are deterministic (`CT_ROLE_FORBIDDEN`, `CT_REPORT_STALE`, `CT_NO_EXECUTABLE_SCOPE`, `CT_POLICY_DENIED`, `CT_HORIZON_EXCEEDED`); existing recovery failures retain `CT_RECOVERY_REQUIRED`/fence errors.

## Architecture Decisions

| Option | Tradeoff and decision |
|---|---|
| Embed routing in Tower | Rejected: violates plan opacity. Tower receives opaque refs/digests only. |
| Let Policy route or Support dispatch | Rejected: creates shadow authority. Main remains the only dispatcher. |
| Extend v1 schemas in place | Rejected: risks historical bytes. Add versioned contracts and mappings. |
| Reuse stale reports after a registry edit | Rejected: cheaper but unsafe; exact revision/digest invalidation is mandatory. |

## Integration and Forecast File Changes

Reuse `contracts/{validate,canonicalize,schema-registry}.mjs`, `main-store/{authority,store}.mjs`, `registry/store.mjs`, `core.mjs` recovery transactions, and `validTerminationPairing`. Forecast additions: `capabilities/registry.mjs`, `continuation/{reconcile,support,policy,coordinator,recovery}.mjs`, six schemas above, and matching `test/{capabilities,continuation}/**`. `main-store/store.mjs` gains Main-only CAS records; Tower changes only for an opaque atomic recover-and-reassign fence.

Recovery first persists the immutable proof/assignment intent, then one Tower SQLite transaction verifies current Main, state/generation, paired HOST+MCP termination, `NOT_STARTED` or fully read-back `ROLLED_BACK`, no unknown effect, and bound digests; it closes old ownership, increments generation, and creates exactly one assignment-bound delivery. Failure leaves no new delivery and preserves evidence.

## Security, Observability, and Testing

Audit every resolution/invalidation with actor, project, role, revisions, evidence digest, result, reason, and time; expose no secrets. Unit RED tests cover role filtering, expiry/schema drift, denial alternatives, no-scope, horizon, and deterministic invalidation. Integration RED tests cover automatic/on-demand Support, CAS races, base/runtime drift, Main-only dispatch, and recovery atomicity. Conformance proves no self-assignment, direct Support-to-Worker path, all-to-all channel, stale reuse, automatic merge, or ungated expansion/drift/exception/irreversible action.

## Threat Matrix

| Boundary | Applicability, safe/failure behavior, planned RED |
|---|---|
| Documentation-like paths | N/A — no executable classification changes. |
| Git repository selection | Applicable — canonical bound root/ref only; reject injected `git -C`, escaping relative paths, foreign absolute roots, or base mismatch; RED each selector. |
| Commit state | N/A — existing candidate commit semantics are unchanged. |
| Push state | N/A — push semantics are unchanged. |
| PR commands | N/A — PR composition is unchanged. |

## Migration / Rollout

Sequence authority/contracts/registry, then dry-run reports, dispatch, and recovery. Later planning under the 800-line auto-forecast review budget must amend S3.2, S4.1, S5.1–S5.3, and S7.1; S8.4 and completed Sesiones stay closed. Rollback disables role routing, stops new assignments, retains records/evidence, and returns to manual V2 continuation; every merge remains human-approved.

## Open Questions

None.
