# Design: Autonomous V2 Role-Routed Continuation

## Technical Approach

Add a Main-owned orchestration layer around the delivered Tower. `core.mjs` remains the sole SQLite authority; `createContinuationDispatcher` transports opaque work, while validation and routing stay outside `core.mjs`/`mcp.mjs`. Existing v1 and completed-Sesión bytes remain valid.

| Component | Ownership boundary |
|---|---|
| Worker | Executes one assignment; emits evidence; never selects a successor. Its reported next step is a claim Main re-derives and compares, never an assignment. |
| Main | Sole registry writer, reconciler, invoker, assigner, dispatcher, and delivery coordinator. |
| Support | Read-only analysis producing one ranked proposal plus alternatives. Runs as a native subagent Main spawns in its own session: no Tower registration, no lock, no Worker channel, cold context per invocation. |
| Policy | Evaluates eligibility against approved intent/Jornada; cannot plan, select a worker, or dispatch. |
| Jornada | Human-approved scope, limits, expiry, operations, and host fence. |
| Delivery Policy | Project-declared, read once and bound by revision/digest; resolves merge authorization, delivery shape, planning ceiling, and documentation close depth. Never relaxes a safety floor. |
| Capability Registry | One project-scoped, versioned registry; metadata grants visibility/invocation compatibility, never authority. Support needs no entry — it is in-process to Main. |

## Data Flow

```text
Worker complete/checkpoint (+ next-step claim)
  -> Main verifies Tower result + Git/OpenSpec/base/runtime and freezes ReconciledCheckpoint
  -> Main spawns the Support subagent -> SupportProposal (automatic, or Main on-demand)
  -> Main compares the Worker claim against the independently derived proposal
  -> Main resolves Policy capability -> PolicyReport ALLOW/DENY
  -> Main revalidates every binding -> Assignment -> Tower publish/dispatch -> Worker claim
```

### Deriving the next Módulo

Module close is lightweight by project policy: it records continuity without updating plan documentation. Derivation therefore reads two sources with different lifetimes, and neither is narrative memory.

| Input | Source | Cadence | Authority |
|---|---|---|---|
| Which Sesión is open | `STATUS.md` Sesiones table | session close | Yes — git-verifiable by digest |
| Which Módulos it has, in order | `STATUS.md` Módulos table | planning time, static | Yes — does not change during execution |
| Which Módulos are fulfilled | `ct_delivery`/`ct_claim` ledger | per Módulo, transactional | Yes — immutable by trigger |
| Narrative continuity | Engram | per Módulo | No — upsert-keyed and not content-addressed |

The next Módulo is the first entry of the ordered enumeration absent from the fulfilled set whose predecessor is integrated. The Worker's claim is compared against that result: agreement raises confidence at near-zero cost; disagreement fails closed, because it means the plan is ambiguous or moved under execution.

The ledger binds `handoff_id`, not a plan coordinate such as `M8.8.4`. That translation lives in Main-owned continuation records, never in `core.mjs`, preserving plan opacity.

On `DENY`, Policy may attach a non-authoritative alternative brief. Main sends it to Support for scope/dependency/conflict validation; a human adopts or rejects it. Adoption starts fresh reconciliation, and Main alone assigns. `NO_SCOPE` returns the minimum missing decision/evidence and no assignment.

## Interfaces and Lifecycle

New records are strict, canonically digested JSON-schema contracts, immutable after issue.

| Contract | Required binding / lifecycle |
|---|---|
| `agent-capability-registry-v1` | Project/Main identity; registry and entry revisions; caller identity/role; capability; input/output schema IDs; source ref/digest; availability window/expiry. CAS update invalidates all older bindings. |
| `reconciled-checkpoint-v1` | Assignment/generation, checkpoint/result, repository/root/common-dir/remote/ref, base/result, manifest, candidate/ledger, runtime projection, host epoch, Jornada, registry/capability revisions; `VALID` or terminal `INVALID`. |
| `support-proposal-v1` | Checkpoint binding, caller=`MAIN`, plan-enumeration and ledger digests the derivation read, the Worker claim it was compared against, primary, alternatives, conflicts, evidence, expiry; `EXECUTABLE`, `NO_SCOPE`, `CLAIM_MISMATCH`, or `STALE`. Main persists it; the subagent is in-process and holds no registry entry. |
| `delivery-policy-v1` | Project identity, source path/digest, revision, merge authorizing party, delivery shape, planning ceiling, documentation close depth per unit; unresolved fields fail closed to their most restrictive value. |
| `policy-report-v2` | Proposal/checkpoint, Policy capability, Jornada/manifest/runtime bindings, `ALLOW`/`DENY`, rationale, gates, optional alternative brief, expiry. V1 remains readable. |
| `assignment-v2` | Exact approved proposal/report/checkpoint/capability/Jornada/base/host/attempt and expiry; Main signature/attestation. V1 remains readable. |
| `recovery-proof-v1` | Old claim/delivery/assignment, generation, disposition, termination pairing, effect/rollback read-back, repository/workspace/base/mode, runtime and current role bindings. |

Resolution authorizes only the exact caller and visible role. Any missing, malformed, cross-project, unavailable, expired, version/schema/source mismatch, base/runtime drift, inactive Jornada, horizon beyond the resolved ceiling, predecessor not integrated, Policy denial, unresolved delivery policy, Worker claim disagreeing with the derived proposal, or absent scope fails closed before mutation. New forecast codes are deterministic (`CT_ROLE_FORBIDDEN`, `CT_REPORT_STALE`, `CT_NO_EXECUTABLE_SCOPE`, `CT_POLICY_DENIED`, `CT_HORIZON_EXCEEDED`, `CT_POLICY_UNRESOLVED`, `CT_CLAIM_MISMATCH`, `CT_HOST_CAPABILITY_MISSING`); existing recovery failures retain `CT_RECOVERY_REQUIRED`/fence errors.

## Architecture Decisions

| Option | Tradeoff and decision |
|---|---|
| Embed routing in Tower | Rejected: violates plan opacity. Tower receives opaque refs/digests only. |
| Let Policy route or Support dispatch | Rejected: creates shadow authority. Main remains the only dispatcher. |
| Extend v1 schemas in place | Rejected: risks historical bytes. Add versioned contracts and mappings. |
| Reuse stale reports after a registry edit | Rejected: cheaper but unsafe; exact revision/digest invalidation is mandatory. |
| Support as a long-lived Tower session | Rejected: it makes the loop depend on that session staying alive, needs a registered role the lock machinery would accept as a transfer target, and carries warm context that drifts against a fail-closed staleness rule. |
| Support as a Main-spawned native subagent | Accepted: no registration, no lock eligibility, no Worker channel — the Support-to-Worker prohibition becomes structural rather than policed. Cold context per invocation reads current bytes, which suits staleness. Main's separation of duties never rested on Support, which analyses; Policy constrains, and it stays a separate actor with its own contract. |
| Keep an inline fallback for hosts without subagents | Rejected: a second continuation path doubles the behaviour under test for a branch that never runs on supported hosts. Declared a required host capability instead. |
| Human merge as a product invariant | Rejected: it encodes one team's workflow as product law. This repo itself delivers by direct push (`AGENTS.md`). Merge authorization is project policy that fails closed to a human. |
| Derive module progress from Engram | Rejected: `topic_key` upserts and observations are not content-addressed against repo state, so a fail-closed gate cannot bind them. The immutable Tower ledger carries it. |

## Integration and Forecast File Changes

Reuse `contracts/{validate,canonicalize,schema-registry}.mjs`, `main-store/{authority,store}.mjs`, `registry/store.mjs`, `core.mjs` recovery transactions, and `validTerminationPairing`. Forecast additions: `capabilities/registry.mjs`, `continuation/{reconcile,support,policy,coordinator,recovery}.mjs`, six schemas above, and matching `test/{capabilities,continuation}/**`. `main-store/store.mjs` gains Main-only CAS records; Tower changes only for an opaque atomic recover-and-reassign fence.

Recovery first persists the immutable proof/assignment intent, then one Tower SQLite transaction verifies current Main, state/generation, paired HOST+MCP termination, `NOT_STARTED` or fully read-back `ROLLED_BACK`, no unknown effect, and bound digests; it closes old ownership, increments generation, and creates exactly one assignment-bound delivery. Failure leaves no new delivery and preserves evidence.

## Security, Observability, and Testing

Audit every resolution/invalidation with actor, project, role, revisions, evidence digest, result, reason, and time; expose no secrets. Unit RED tests cover role filtering, expiry/schema drift, denial alternatives, no-scope, resolved horizon, delivery-policy resolution and its fail-closed defaults, Worker-claim comparison, and deterministic invalidation. Integration RED tests cover automatic/on-demand Support subagent invocation, CAS races, base/runtime drift, Main-only dispatch, next-Módulo derivation against a `STATUS.md` unchanged since the last session close, and recovery atomicity. Conformance proves no self-assignment, direct Support-to-Worker path, all-to-all channel, stale reuse, merge without a resolved current authorization, safety floor reachable by policy or exception, or ungated expansion/drift/exception/irreversible action.

## Threat Matrix

| Boundary | Applicability, safe/failure behavior, planned RED |
|---|---|
| Documentation-like paths | N/A — no executable classification changes. |
| Git repository selection | Applicable — canonical bound root/ref only; reject injected `git -C`, escaping relative paths, foreign absolute roots, or base mismatch; RED each selector. |
| Commit state | N/A — existing candidate commit semantics are unchanged. |
| Push state | Applicable — delivery shape is now policy-resolved. A policy naming direct push MUST NOT bypass the commit/verify/freeze ordering floor or reach the target before `DELIVERY_READY`; RED both. |
| PR commands | Applicable — PR composition is unchanged, but opening one is now conditional on the resolved delivery shape. Unresolved policy MUST NOT default to opening a PR; RED the unresolved path. |
| Delivery policy source | Applicable — the policy file is read from the canonical bound root only, by digest. Reject symlinked, escaping, or foreign-root policy files, and treat an unparseable block as unresolved rather than empty; RED each. |

## Migration / Rollout

Sequence authority/contracts/registry and delivery-policy resolution, then dry-run reports, dispatch, and recovery. Later planning under the 800-line auto-forecast review budget must amend S3.2, S4.1, S5.1–S5.3, and S7.1; S8.4 and completed Sesiones stay closed. Projects without a declared delivery policy keep today's behaviour, because every unresolved field fails closed to its most restrictive value. Rollback disables role routing, stops new assignments, retains records/evidence, and returns to manual V2 continuation; merge authorization reverts to requiring a human.

## Open Questions

None.
