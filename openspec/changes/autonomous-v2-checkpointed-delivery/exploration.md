# Exploration: Autonomous V2 checkpointed delivery

## Executive decision

Create a **new related OpenSpec change**, `autonomous-v2-checkpointed-delivery`, to integrate the approved “Local-first autonomous execution with checkpointed delivery” architecture into Autonomous V2. Do not amend or resume `installable-v1-autonomous-v2-split` in this phase, and do not rewrite the approved umbrella PRD, RFC, or REQUIREMENTS in place. The new change should first establish a revisioned semantic map and then produce narrowly scoped deltas for the future Plan 3–5 and Plan 7 changes.

## Current State

The approved V2 contract already separates product interpretation from Tower mechanics. The Plan Manifest carries stable plan intent, `slice_id` is a domain entity, Binding Deltas carry `base_sha`/`result_sha` and verification references, Main owns Policy Reports and authorization, and Tower receives opaque references and digests. The runtime projection already includes `VERIFYING`, `DELIVERY_READY`, `WAITING_MERGE`, `MERGED`, and `COMPLETE`; delivery permits commit, push, PR, merge authorization, merge, and post-merge verification, while merge requires exact authorization and revalidation.

The existing `installable-v1-autonomous-v2-split` change has its own implementation history and an apply frontier (the supplied native status is 3/10 tasks complete, 7 pending, next recommendation `apply`). It is explicitly out of scope here. S2.3 Main authority/store primitives are already merged and documented. Future Plan 3/4/5/7 changes are intentionally not assigned additional Sesión IDs because their one-PR boundaries are not yet demonstrated.

Git authority is constrained: this worktree is clean at local `master` `c38ff71`, which is six commits behind the locally available `origin/master` `67c21b9`. No fetch was performed. The remote-tracking ref is therefore the exact local Git truth inspected, not proof of the live remote. Local plan files also lag that ref; conclusions below rely on the checked-in artifacts plus the supplied current status and explicitly call out this limitation.

## Existing coverage and semantic gaps

| Approved baseline semantic | Existing authority | Assessment | Exact gap to close |
|---|---|---|---|
| One planning Sesión is one independently reviewable PR | Canonical plan convention and existing plan strategy | Covered as planning policy | Make the boundary an explicit V2 input to assignment/candidate identity; do not introduce a new planning level. |
| A fresh executor implements that Sesión’s Módulos/Tareas locally | Assignment/session identity, fresh attempts, reconciliation, workspace isolation | Partial | State that executor work is local until the delivery gate and bind the candidate to the exact Sesión/Módulos/Tareas refs. |
| Local commits are allowed; no remote mutation before `DELIVERY_READY` | Slice projection and delivery effects | Partial | Add a fail-closed precondition: push, PR create/update, and other remote mutations are denied before the frozen candidate reaches `DELIVERY_READY`. |
| Main freezes a candidate bound to base/head/result, verification, assignment/Jornada, and Policy evidence | Binding Delta, authorization envelope, ArtifactRefs, Policy Report digests | Partial | Add one immutable candidate revision/evidence envelope; the current fields are distributed across artifacts and are not one frozen identity. |
| One idempotent push and one PR open/update per candidate revision | Canonical idempotency key and exactly one expected open PR | Partial | Make the candidate revision the idempotency scope and explicitly forbid a second push or PR effect after an acknowledged/unknown result. |
| Checks/review run per frozen candidate revision | Current checks, head-SHA and Policy revalidation; SHA drift invalidation | Partial | Version check/review evidence by candidate revision; “once” means once per frozen candidate, never once for the lifetime of a branch or PR. |
| Merge requires exact human authorization | Telegram authorization, nonce consumption, no free-text approval, match-head protection | Covered | Preserve the existing exact authorization contract; only bind it to the candidate revision. |
| A dependent Sesión starts only from the integrated base; planning may run ahead | Binding Delta publication from an integrated base and planning horizon | Partial | Add an explicit scheduler rule: planning may be prepared ahead, but implementation/delivery of a dependent Sesión requires the predecessor’s integrated base and a new reconciliation. |
| Tower is plan-agnostic; Main/Policy interprets the plan | CT-V1-26 and Main/Policy proposal boundaries | Covered | Preserve opaque Policy/plan refs and keep plan parsing outside Tower. |

## Layer ownership

| Layer | Owns | Must not own |
|---|---|---|
| **Global delivery policy** | Versioned shared defaults and non-overridable safety floors: local-first effect ordering, candidate evidence shape, remote-mutation gate, idempotency scope, exact human merge requirement, check/review binding, stale-candidate invalidation, retention/telemetry vocabulary, and allowed exception classes | Project paths, plan meaning, active runtime state, host leases, or a remote command channel |
| **Per-project Policy/Jornada configuration** | Project identity and remote/branch, policy revision, enabled effect set, default preset, duration/horizon/apply/attempt/concurrency budgets, host/fallback, required checks/review providers, exception approvals, and the frozen snapshot used by a candidate | Global safety floors, Tower locks/CAS, direct Git hosting effects, or interpretation inside the Tower core |
| **Control Tower V2 enforcement** | Assignment/workspace/host identity, lifecycle gates, candidate freeze, CAS/idempotency, local-versus-remote effect ordering, one push/PR boundary, evidence persistence, dependent-base fencing, recovery, audit, and opaque ref/digest checks | OpenSpec parsing, Policy classification, plan decomposition, choosing product scope, or replacing exact human authorization |

Global policy values should be versioned and inherited by projects. A project may tighten them; it may relax a value only through an explicit, human-authorized exception that is itself part of the candidate evidence. Safety invariants such as “no remote mutation before `DELIVERY_READY`” and “no automatic merge” are not relaxable by ordinary project configuration.

## Future placement (without inventing Sesión IDs)

The new related change should own the cross-plan semantic map. Future implementation proposals should absorb the resulting requirements as follows:

| Future area | Requirements to absorb | Existing boundary |
|---|---|---|
| **Plan 3 — Change C: Workspace Manager** | Fresh executor workspaces, local-only mutation boundary, exact Sesión/Módulo/Tarea input refs, base SHA capture, preservation of dirty/unknown state | Existing `inspect`/`create`/`retire` proposal; no new Sesión ID until a one-PR boundary is proven |
| **Plan 3 — Change D: Main/Policy/Jornada** | Global-policy inheritance, project policy revision, Jornada defaults/budgets, exception authorization, planning-ahead versus integrated-base eligibility, candidate policy evidence | Existing bounded Jornada, Policy Report, Support, and assignment proposal |
| **Plan 4 — Change E: Host Launcher** | Fresh executor launch, single active host line, local evidence collection, host epoch and recovery fencing before delivery | Existing exclusive-host/failover proposal; remote delivery remains outside E |
| **Plan 5 — Change F: Telegram/Delivery** | Candidate freeze, remote-mutation gate, one idempotent push and PR operation, per-candidate checks/review evidence, exact human merge authorization and invalidation | Existing delivery proposal; extend its target from a mutable branch/PR view to an immutable candidate revision |
| **Plan 5 — Change G: Continuous Loop** | Fresh dependent Sesión from integrated base, planning horizon, reconciliation, Binding Delta progression, continuation only after integrated predecessor | Existing continuous-loop proposal; `slice_id` remains the product field, never a planning level |
| **Plan 7 — Conformance** | End-to-end proof of candidate freeze, no early remote effects, retry/unknown-effect recovery, stale invalidation, base gating, exact authorization, and telemetry thresholds | Existing Gates A–G and six pilots; assign no new Sesión IDs until boundaries are demonstrated |

Completed Plan 2/Main store work should be consumed through ArtifactRefs rather than reopened. If proposal/spec later proves a new persisted field is unavoidable, it must be an explicit compatibility-preserving contract delta, not an amendment hidden in implementation.

## Approaches

1. **New related change with revisioned semantic map (recommended)** — Create only this exploration now; later proposal/spec work defines the candidate envelope and explicit deltas, then places implementation under the existing future Plans/Changes.
   - Pros: preserves the completed split and S2.3 history, keeps ownership legible, supports staged validation, and avoids assigning unproven Sesión IDs.
   - Cons: requires cross-change traceability and a later compatibility decision for the candidate envelope.
   - Effort: Medium

2. **Amend `installable-v1-autonomous-v2-split`** — Add the local-first V2 semantics to its existing proposal/design/tasks/apply history.
   - Pros: one visible change folder.
   - Cons: mixes a completed/installable release lane with a new V2 runtime contract, risks reopening implementation status, and obscures provenance. Rejected by the current scope boundary.
   - Effort: High and unsafe

3. **Revise umbrella PRD/RFC/REQUIREMENTS first** — Rewrite the broad product documents before creating a related change.
   - Pros: a single normative location for product semantics.
   - Cons: approved bytes and acceptance history are authoritative inputs; a direct rewrite would break ArtifactRef traceability and cannot establish implementation ownership by itself. Rejected as the first owner; use a later explicit revision/delta only where proposal proves it necessary.
   - Effort: High

## Minimal viable scope and explicit deferrals

### Minimal viable scope for the next SDD cycle

- Define one immutable `candidate_revision` envelope containing project/plan/`slice_id`, Sesión and artifact refs, base SHA, result/head SHA, verification digest, Policy Report/Jornada/assignment revisions, required check/review digest, and lifecycle state.
- Define the fail-closed state machine from local implementation through `VERIFYING` → `DELIVERY_READY` → one idempotent remote push/PR operation → exact human merge authorization.
- Define invalidation and recovery for base/head/check/review/Policy/Jornada drift, timeout, unknown external result, and dependent-base changes.
- Define a single-host, single-project pilot with one dependent follow-up Sesión, while allowing planning artifacts to be prepared ahead of integration.
- Keep the Tower API plan-agnostic: Main/Policy supplies opaque refs and classifications; Tower enforces mechanics and evidence.

### Explicitly deferred until telemetry proves value

- Adaptive or automatically tuned budgets, global policy optimization, and “smart” retry heuristics.
- Multi-host concurrent writers, concurrent candidate revisions for one project, and multi-host recovery beyond the existing exclusive fallback contract.
- Remote-only checks/review providers as a required path; the first pilot should prove local/reproducible evidence and define remote providers as explicit adapters.
- Automatic candidate supersession, speculative delivery, branch-wide review reuse, and automatic reopening after invalidation.
- Multi-repository campaigns, deploy/traffic effects, automatic merge, and dashboard-driven policy decisions.
- High-volume telemetry aggregation and SLO claims before baseline measurements exist.

## Product questions for proposal

- What are the default global effect settings: commit only, commit plus push, or commit plus push plus PR? Is the default deliberately conservative for new projects?
- Which global rules are absolute, and which may a project tighten or relax through an exception? Who can authorize an exception, for how long, and with what audit evidence?
- Does every candidate revision require a fresh check/review run, or may a provider reuse evidence when the candidate digest is unchanged? What is the expiry window?
- Are remote-only checks/review providers allowed to produce `DELIVERY_READY` when the local host cannot reproduce them? What evidence and outage behavior apply?
- Which changes invalidate a frozen candidate: base SHA, result/head SHA, PR target, checks, review digest, Policy Report, Jornada revision, assignment revision, registry revision, or global-policy revision?
- After an unknown push/PR result, which read-only reconciliation proves whether the effect happened, and when does the system block rather than retry?
- Does recovery preserve the same candidate revision or create a successor revision after a new local verification? How is the predecessor linked?
- May planning for dependent Sesiones run indefinitely ahead, or is there a planning-horizon/retention ceiling? What exactly is the “integrated base” authority when merge and post-merge checks disagree?
- Is the first supported runtime single-host only, and must a host change always increment `host_epoch` even when no writer was observed?
- Are global defaults shared across repositories by file, installed runtime, or policy service, and what is the migration behavior when a policy revision changes during an active Jornada?

## Risks

- A distributed candidate identity can permit stale or duplicate remote effects unless freeze, invalidation, and idempotency are one contract.
- “One push/PR” is unsafe without a read-only unknown-effect reconciliation path; network timeouts are not proof of absence.
- Allowing project exceptions to global safety floors can silently recreate remote-first behavior or delegated merge authority.
- Planning ahead can create stale artifacts and misleading progress unless dependent implementation is fenced to the integrated base.
- Remote-only checks can make `DELIVERY_READY` non-reproducible and create false confidence during provider outages.
- Multi-host execution can duplicate writers unless host epoch, stop proof, and worktree ownership remain exclusive.
- The local checkout is behind `origin/master`, so path/status conclusions may miss the latest merged documentation; no live-remote claim can be made without fetching.

## Non-goals

- No runtime implementation, database mutation, delivery operation, PR, merge, or review-lifecycle invocation in this exploration.
- No rewrite or continuation of `installable-v1-autonomous-v2-split`.
- No new Plan, Sesión, Módulo, or Tarea IDs; future IDs belong to the owning Plan after a one-PR boundary is demonstrated.
- No renaming of the `slice_id` product/domain field.
- No plan parsing or Policy interpretation inside Control Tower.

## Success metrics

The first pilot should establish measurable baselines and target:

- 0 remote mutations observed before `DELIVERY_READY`.
- 0 duplicate push/PR effects per frozen candidate revision, including retries after unknown results.
- 100% of delivered candidates with complete base/result/verification/assignment/Jornada/Policy/check evidence.
- 100% of stale candidate mutations rejected after each tested invalidation input.
- 0 dependent implementation attempts based on a non-integrated predecessor base.
- 0 duplicate writers during recovery or host transition.
- Recovery and candidate reconciliation latency measured before any optimization or budget tuning is enabled.

## Recommendation

Proceed with `autonomous-v2-checkpointed-delivery` as a new related change. The proposal phase should define the candidate revision/evidence contract and a minimal single-project, single-host pilot, then emit explicit deltas for Changes C/D/E/F/G and Plan 7 conformance. Keep global defaults and safety floors separate from per-project Jornada snapshots, and keep all mechanical enforcement in Tower. Do not assign future Sesión IDs or alter the existing split until the product questions above are answered.

## Ready for Proposal

**No, pending product decisions.** The exploration is sufficient to start `sdd-propose` after the interactive round resolves defaults, exception authority, remote-only checks, invalidation, unknown-effect recovery, planning-ahead limits, and multi-host policy. The next proposal must remain planning-only and must not resume the existing V2 apply frontier.

## Decision resolution and current authority — 2026-07-30

The product questions above were resolved after this historical investigation. Proposal, spec, design, and tasks now exist; seven positional IDs (`S3.1`, `S3.2`, `S5.1`, `S4.1`, `S5.2`, `S5.3`, `S7.1`) were approved with `stacked-to-main` delivery. Current local Git authority is `HEAD=master=origin/master@f110874c1a4181da4efe4b59a5f604c797357896`; S2.4 verification merged in PR #88 and its closure in PR #90, satisfying the approved Project Registry gate for S3.1. Earlier statements that the change was not ready, had no approved IDs, or observed older Git authority describe the exploration-time state and remain preserved as history.
