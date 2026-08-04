# Proposal: Autonomous V2 Role-Routed Continuation

## Intent

Amend the existing Autonomous V2 implementation plan with explicit role-routed continuation. This change is only the SDD delta carrier: it creates no parallel product, Plan, orchestrator, or execution flow. It closes ambiguous authority, capability discovery, stale-report, and next-assignment behavior before V2 implementation continues.

## Scope

**In scope:** reconcile V2 planning; define the per-project Agent Capability Registry, role-visible contracts, routing, recovery proofs, failure escalation, the project delivery policy that resolves configurable gates, and compatibility sequence.

**Non-goals:** implementation; duplicate orchestration; parallel V2 flows; direct Support-to-worker communication; worker self-assignment; Policy routing/dispatch authority; merge without a resolved current authorization; rewriting completed Sesiones or Installable V1 boundaries.

## Actors and Flow

`Worker evidence → Main reconciliation → Support proposal → Policy eligibility → Main assignment`. Main alone reconciles, assigns, dispatches, and coordinates delivery. Support is read-only, returns one ranked priority plus alternatives, and drafts a brief; it executes as a native subagent Main spawns inside its own session, so it holds no Tower registration, no lock, and no channel to any Worker. Policy evaluates approved intent/Jornada. Workers only execute assignments and never select a successor; a Worker's reported next step is evidence Main re-derives and compares, never an assignment.

## Configurable Gates

There are exactly five safety floors, and they are non-negotiable: no-early-mutation, candidate immutability after freeze, append-only ledger, sole-Main authority, and no worker self-assignment. Fail-closed validation of every binding is a property of the whole system rather than a sixth floor, and is required regardless. Project policy resolves the rest — merge authorization, delivery shape, planning ceiling, and documentation close depth — declared once per project and bound to each candidate by revision and digest. Absent, unparseable, or unbound policy fails closed to the most restrictive setting. Neither policy nor a bounded exception MAY relax a safety floor; a bounded exception is granted by a human, expires with its Jornada, and reaches only the configurable surface.

## Decision Audit

| Area | Status | Canonical reference / amendment |
|---|---|---|
| Main authority | unchanged | [`autonomous-control-tower-v2/spec.md`](../installable-v1-autonomous-v2-split/specs/autonomous-control-tower-v2/spec.md) |
| Support boundary | extended | [Plan 3 `S3.2`](../../plans/plan-3/STATUS.md): automatic post-checkpoint/on-demand analysis, executed as a Main-spawned native subagent |
| Policy/Jornada | clarified | [Plan 3 `S3.2`](../../plans/plan-3/STATUS.md): eligibility, never routing |
| Continuous continuation | superseded | [Plan 5 `S5.3`](../../plans/plan-5/STATUS.md): replace direct next-scope enablement with the approved flow. Its proposal shell was deleted in `613a45d`; the intent lives in that STATUS |
| Agent registry/routing | extended | [RFC §§4–5](../../rfc/sdd-tower-implementation-v1.md): per-project, Main-owned capability registry |
| Worker recovery | extended | [`control-tower-recovery-rollback/spec.md`](../autonomous-continuation-control-tower/specs/control-tower-recovery-rollback/spec.md): automatic reassignment only after exact proof |
| Checkpoint safety floors | unchanged | [`autonomous-v2-checkpointed-delivery/spec.md`](../autonomous-v2-checkpointed-delivery/specs/autonomous-v2-checkpointed-delivery/spec.md): no-early-mutation, freeze immutability, append-only ledger, sole-Main authority, no worker self-assignment |
| Delivery shape and merge authorization | amended | This change's delta: resolved from the project's declared delivery policy, failing closed to human authorization |
| Planning horizon | amended | This change's delta: ceiling resolved from delivery policy, default two; eligibility is role-routed |

## Capabilities

**New:** `agent-capability-registry` — versioned, Main-owned discovery and role permissions; `sdd-tower-next-slice-continuation` — role-routed continuation.

**Modified:** `autonomous-control-tower-v2`; `autonomous-v2-checkpointed-delivery`.

**Required host capability:** Main MUST be able to spawn a native subagent with an isolated context that returns structured output validatable against `support-proposal-v1`. A host without it MUST NOT run autonomous continuation; manual Tower operation stays available. This is a hard requirement, not a degraded fallback — a second continuation path would double the behaviour under test.

## Rules, Failure, and Compatibility

Contracts/reports bind identity, version, source/base, availability/expiry, caller, and schemas. Missing, stale, unavailable, mismatched, or drifted inputs fail closed. Policy denial blocks; Support validates any evidence-backed alternative; a human decides. No executable scope reports the minimum decision gap. Jornada expansion, material drift, irreversible actions, and denial alternatives remain human-gated. Merge requires an explicit current authorization whose authorizing party the project delivery policy resolves, defaulting to a human when that policy is absent, unparseable, or unbound.

Later implementation work must revise Plan 3 `S3.2`, Plan 4 `S4.1`, Plan 5 `S5.1`/`S5.2`/`S5.3`, and Plan 7 `S7.1`; `S8.4` remains unchanged. Preserve delivered bytes/state. First establish authority, contracts, registry, and planning integration; only then enable automatic dispatch or recovery.

## Risks, Rollback, and Success

Risks: shadow authority, stale routing, or compatibility drift. Mitigate with sole-Main writes, version binding, and fail-closed validation. Roll back new planning deltas/pointers, disable routing, retain evidence, and return to manual V2 continuation.

- [ ] Every affected decision has one classification and a canonical reference that resolves to an existing artifact.
- [ ] Zero non-Main assignments/dispatches and zero stale-report reuse.
- [ ] All automatic continuation stays inside an approved Jornada; every merge carries a current authorization from the party the project delivery policy resolves.
- [ ] No safety floor is reachable by project policy, Jornada snapshot, or bounded exception.
