# Proposal: Autonomous V2 Role-Routed Continuation

## Intent

Amend the existing Autonomous V2 implementation plan with explicit role-routed continuation. This change is only the SDD delta carrier: it creates no parallel product, Plan, orchestrator, or execution flow. It closes ambiguous authority, capability discovery, stale-report, and next-assignment behavior before V2 implementation continues.

## Scope

**In scope:** reconcile V2 planning; define the per-project Agent Capability Registry, role-visible contracts, routing, recovery proofs, failure escalation, and compatibility sequence.

**Non-goals:** implementation; duplicate orchestration; parallel V2 flows; direct Support-to-worker communication; worker self-assignment; Policy routing/dispatch authority; automatic merge; rewriting completed Sesiones or Installable V1 boundaries.

## Actors and Flow

`Worker evidence → Main reconciliation → Support proposal → Policy eligibility → Main assignment`. Main alone reconciles, assigns, dispatches, and coordinates delivery. Support is read-only, returns one ranked priority plus alternatives, and drafts a brief. Policy evaluates approved intent/Jornada. Workers only execute assignments.

## Decision Audit

| Area | Status | Canonical reference / amendment |
|---|---|---|
| Main authority | unchanged | [`autonomous-control-tower-v2/spec.md`](../installable-v1-autonomous-v2-split/specs/autonomous-control-tower-v2/spec.md) |
| Support boundary | extended | [`sdd-tower-main-policy-jornada/proposal.md`](../sdd-tower-main-policy-jornada/proposal.md): automatic post-checkpoint/on-demand analysis |
| Policy/Jornada | clarified | [Plan 3 `S3.2`](../../plans/plan-3/STATUS.md): eligibility, never routing |
| Continuous continuation | superseded | [`sdd-tower-continuous-slice-loop/proposal.md`](../sdd-tower-continuous-slice-loop/proposal.md): replace direct next-scope enablement with the approved flow |
| Agent registry/routing | extended | [RFC §§4–5](../../rfc/sdd-tower-implementation-v1.md): per-project, Main-owned capability registry |
| Worker recovery | extended | [`control-tower-recovery-rollback/spec.md`](../autonomous-continuation-control-tower/specs/control-tower-recovery-rollback/spec.md): automatic reassignment only after exact proof |
| Checkpoint/delivery/human gates | unchanged | [`autonomous-v2-checkpointed-delivery/spec.md`](../autonomous-v2-checkpointed-delivery/specs/autonomous-v2-checkpointed-delivery/spec.md) |
| Planning horizon | clarified | Same spec: ceiling remains two; eligibility is role-routed |

## Capabilities

**New:** `agent-capability-registry` — versioned, Main-owned discovery and role permissions; `sdd-tower-next-slice-continuation` — role-routed continuation.

**Modified:** `autonomous-control-tower-v2`; `autonomous-v2-checkpointed-delivery`.

## Rules, Failure, and Compatibility

Contracts/reports bind identity, version, source/base, availability/expiry, caller, and schemas. Missing, stale, unavailable, mismatched, or drifted inputs fail closed. Policy denial blocks; Support validates any evidence-backed alternative; a human decides. No executable scope reports the minimum decision gap. Jornada expansion, material drift, irreversible actions, exceptions, denial alternatives, and every merge remain human-gated.

Later implementation work must revise Plan 3 `S3.2`, Plan 4 `S4.1`, Plan 5 `S5.1`/`S5.2`/`S5.3`, and Plan 7 `S7.1`; `S8.4` remains unchanged. Preserve delivered bytes/state. First establish authority, contracts, registry, and planning integration; only then enable automatic dispatch or recovery.

## Risks, Rollback, and Success

Risks: shadow authority, stale routing, or compatibility drift. Mitigate with sole-Main writes, version binding, and fail-closed validation. Roll back new planning deltas/pointers, disable routing, retain evidence, and return to manual V2 continuation.

- [ ] Every affected decision has one classification and canonical reference.
- [ ] Zero non-Main assignments/dispatches and zero stale-report reuse.
- [ ] All automatic continuation stays inside an approved Jornada; every merge remains human-approved.
