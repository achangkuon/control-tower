# Autonomous V2 Checkpointed Delivery Specification

## Purpose

Define plan-agnostic, local-first checkpointed delivery for a single-project, single-host pilot. Main/Policy owns meaning; Tower enforces safety, evidence, idempotency, and recovery.

## ADDED Requirements

### Requirement: Policy ownership

System MUST apply global floors, project Policy/Jornada snapshots, and bounded user-authorized exceptions. Tower MUST consume opaque refs. Exceptions MUST NOT relax no-early-mutation or no-automatic-merge floors.

#### Scenario: Policy exception
- GIVEN a Jornada's global policy revision
- WHEN Main records a bounded user-authorized exception
- THEN the candidate binds its revision/evidence without relaxing floors

### Requirement: Candidate identity

One Sesión MUST equal one reviewable PR; `slice_id` remains product identity. Immutable `candidate_revision` MUST freeze project/plan/Sesión/artifact identity, base/result/tree/commit/head/target, assignment, `host_epoch`, Policy/Jornada revisions, verification digest, and required check/review configuration.

#### Scenario: Freeze
- GIVEN the final local commit exists with exact commit/tree verified
- WHEN the candidate freezes
- THEN its commit/head and identity/configuration cannot be replaced

### Requirement: Candidate ledger

Post-publication effect, check, review, authorization, and merge outcomes MUST append to a candidate-scoped ledger. Outcomes for an unchanged candidate MUST NOT change identity or require a successor.

#### Scenario: Evidence advances
- GIVEN a published unchanged candidate
- WHEN an effect/check/review/authorization outcome arrives
- THEN its ledger appends the outcome under the same revision

### Requirement: Readiness gate

Effects MUST stay local until `DELIVERY_READY`; earlier remote mutations MUST be denied. Normal incomplete checks MUST be `checks_pending`; explicit quota/billing `quota_exhausted`; explicit outage/5xx or timeout after read-only probe `provider_unavailable`. Ambiguous results MUST become blocked `unknown`, fail closed, and never bypass.

#### Scenario: Early denial
- GIVEN a candidate before `DELIVERY_READY`
- WHEN remote mutation is requested
- THEN deny it without remote change

#### Scenario: Readiness
- GIVEN the final commit/tree is verified and its candidate frozen
- WHEN policy authorizes delivery
- THEN publication may proceed while remote checks remain pending

### Requirement: Delivery and merge

System MUST create the automatic final local commit, verify its exact commit/tree, then freeze the candidate with commit/head SHA. Only then MAY it push idempotently and open/update one PR. Unknown results MUST reconcile read-only before retry. Automatic merge is forbidden.

#### Scenario: Unknown result
- GIVEN an unknown push/PR result
- WHEN delivery retries
- THEN reconcile first and never duplicate the effect

#### Scenario: Merge authorization
- GIVEN an immutable candidate and complete current prerequisite ledger
- WHEN exact authorization bound to both is absent
- THEN deny merge; appended exact authorization permits only its candidate/head

### Requirement: Successor reconciliation

Changed base, code/result/tree/commit/head, target, assignment, `host_epoch`, Policy/Jornada revision, verification digest, or required check/review configuration MUST invalidate the candidate. Main MUST reconcile, re-verify, and freeze a successor; appended outcomes alone MUST NOT.

#### Scenario: Stale rejection
- GIVEN a changed integrated base
- WHEN the stale candidate executes or delivers
- THEN reject it until a verified successor exists

### Requirement: Planning horizon

Planning MAY prepare at most two Sesiones ahead. The system MUST reject work beyond that ceiling. Dependent execution/delivery MUST require its predecessor's integrated base and fresh reconciliation.

#### Scenario: Horizon ceiling
- GIVEN two future Sesiones are planned
- WHEN another is proposed
- THEN reject it beyond the ceiling

#### Scenario: Dependent fence
- GIVEN a planned dependent Sesión without integrated predecessor
- WHEN execution is requested
- THEN deny it until integration and reconciliation

### Requirement: Pilot recovery

The pilot MUST allow one project and active host. Recovery/host changes MUST fence writers and fail closed on uncertain ownership, stop proof, or evidence.

#### Scenario: Recovery fence
- GIVEN unproven host ownership or prior effect
- WHEN recovery starts
- THEN block mutation until ownership and candidate reconcile

### Requirement: Conformance

Audit MUST prove zero early/duplicate effects, complete candidate-ledger evidence, stale rejection, and zero dependent execution from non-integrated bases.

#### Scenario: Conformance
- GIVEN readiness, retry, invalidation, and dependency paths
- WHEN evaluated
- THEN outcomes map to candidate revision/ledger and satisfy safety
