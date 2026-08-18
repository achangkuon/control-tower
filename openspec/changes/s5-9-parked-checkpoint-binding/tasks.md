# Tasks: Authoritative Parked Checkpoint Binding

The reconciled design's **FALSIFIER: PASS** is accepted. These tasks preserve the existing Plan 5 hierarchy: `Plan 5 → Sesión 5.9 → Módulo 5.9.1 → Tarea 5.9.1.1` through `Tarea 5.9.1.4`. They do not modify producers or the existing parking composition.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–395 total: direct-push candidate A 210–245; candidate B 140–165 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Repository direct-push sequential candidates: A (contract/schema/registry/invariant/helper + focused contract tests/fixture) → B (Main-store sealing/readback/replay + focused Main-store tests) |
| Delivery strategy | Repository direct-push sequential publication candidates; publication remains deferred pending explicit authorization. |
| Chain strategy | N/A — direct-push sequential candidates |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A — direct-push sequential candidates
400-line budget risk: Medium

## Delivery Boundaries

Publication is not authorized by these tasks. When explicit authorization is later granted, publish the separate candidates as sequential direct commits/pushes to `master`.

| Candidate | Contents | Boundary |
|---|---|---|
| planning-A (existing) | `proposal.md` only | 78 authored lines; separate publication candidate. |
| planning-B (existing) | `specs/parked-checkpoint-binding/spec.md` only | 142 authored lines; separate publication candidate. |
| planning-C (existing) | `design.md` only | 314 authored lines; separate publication candidate. |
| planning-D (this task artifact) | `tasks.md` only | 81 authored lines; separate publication candidate. |
| A | Contract/schema behavior and its tests/fixture in T5.9.1.1–T5.9.1.2 | 210–245 authored additions + deletions; independently verifiable and reversible. |
| B | Main-store behavior and its tests in T5.9.1.3–T5.9.1.4 | 140–165 authored additions + deletions; independently verifiable and reversible after A. |
| Later evidence | `sdd/s5-9-parked-checkpoint-binding/apply-progress` and `sdd/s5-9-parked-checkpoint-binding/verify-report`, plus any materialized OpenSpec counterparts | Keep documentation/evidence in separate candidates; never append it to A or B. |

Apply MUST stop before editing a candidate if its scoped authored additions plus deletions cannot remain at or below 400. Do not reduce the count by moving behavior, tests, provenance, or persistence to a forbidden path.

## Módulo 5.9.1 — Evidencia canónica y persistencia bajo Main

### Candidate A — Contract, schema, registry, invariant, helper, and focused contract tests

**Start:** clean implementation area; no `parked-checkpoint-binding-v1` schema, helper, registry entry, invariant, or fixture exists.

**Files:** `schemas/parked-checkpoint-binding-v1.schema.json`, `contracts/parked-checkpoint-binding.mjs`, `contracts/schema-registry.mjs`, `contracts/validate.mjs`, `test/contracts/parked-checkpoint-binding.test.mjs`, `test/contracts/schema.test.mjs`, and `test/fixtures/contracts/schema-cases-v1.json` only.

**Runtime scenario expectation:** origin-neutral validation accepts a complete binding derived from the canonical parked-decision, checkpoint-capture, and reconciled-checkpoint fixtures; every independently re-sealed mismatch is rejected. This candidate deliberately opens no Main store and creates no persisted record.

**Focused command:** `bun test test/contracts/parked-checkpoint-binding.test.mjs test/contracts/schema.test.mjs`.

**Rollback boundary:** revert only the seven Candidate-A files. No binding can have been sealed by this candidate, so no data cleanup, migration, writer, or producer change is permitted.

**Authored-line stop point:** stop before the next Candidate-A edit if its cumulative additions plus deletions reach 400; retain the 210–245 estimate by reusing existing canonicalization and pair validation rather than duplicating them.

- [x] Tarea T5.9.1.1 — RED: add `test/contracts/parked-checkpoint-binding.test.mjs` cases that demonstrate the currently independent parked checkpoint, capture, and reconciliation artifacts have no binding contract; require a closed `parked-checkpoint-binding-v1` shape, a deterministic binding digest, exact source-derived fields, and `reconciliation_state: "VALID"`. Add failing registry/fixture expectations in `test/contracts/schema.test.mjs`; run the focused command and record the expected failure before production edits. <!-- sdd-owner: implementation -->
- [x] Tarea T5.9.1.2 — GREEN → TRIANGULATE → REFACTOR: add the closed schema and `parkedCheckpointBinding` registry entry; implement the domain-separated `parkedCheckpointBindingDigest`, source-derived constructor, and exact source-binding assertion in `contracts/parked-checkpoint-binding.mjs`; add the binding-digest invariant in `contracts/validate.mjs`; and add one valid binding fixture. Extend the mismatch matrix to independently re-seal and reject parked identity/digest/checkpoint, capture identity/digest, reconciliation identity/digest/state, repository, project, assignment, generation, base, result, binding digest, unknown field, and extension-only substitution. Refactor to reuse existing validation and `validateCheckpointProvenancePair`, then rerun the focused command expecting pass. <!-- sdd-owner: implementation -->

### Candidate B — Atomic Main-store sealing, dedicated readback, and replay

**Dependency:** Candidate A is complete and focused-GREEN/verified before Candidate B starts. Publication remains deferred until explicit authorization; Apply treats A and B as sequential implementation candidates and MUST NOT require or create a commit between them.

**Files:** `main-store/store.mjs` and `test/main-store.test.mjs` only. Candidate B consumes, but does not alter, Candidate-A contracts.

**Runtime scenario expectation:** the existing real temporary-Git producer → `createParkingComposition` → `parkDecision` route writes one `parked_checkpoint_binding` member into the existing `decision-parkings/<parked_decision_id>.json` envelope. Dedicated readback returns a deeply frozen persisted member; missing/substituted identities fail closed; exact replay preserves bytes/revision; divergent replay and pre-commit failure preserve existing bytes with no shadow directory.

**Focused command:** `bun test test/main-store.test.mjs`.

**Rollback boundary:** before sealing, revert only `main-store/store.mjs` and `test/main-store.test.mjs` together with Candidate A if the feature is removed. After sealing, revert behavior only; do not delete, rewrite, migrate, backfill, or clean up any persisted binding record.

**Authored-line stop point:** stop before the next Candidate-B edit if its cumulative additions plus deletions reach 400; retain the 140–165 estimate by co-locating the standalone binding in the existing atomic parking envelope and reusing `commit`, `atomicWrite`, and replay comparison.

- [x] Tarea T5.9.1.3 — RED → GREEN: first extend `test/main-store.test.mjs` with failing real producer-to-parking cases for sealing the derived standalone binding, rejecting caller-supplied binding/provenance substitutes, and returning dedicated readback by the exact parked-decision identity. Then update `main-store/store.mjs::parkDecision` to construct the binding only after Main authority, live producer-origin assertions, pair validation, and project equality; include it in the single canonical parking envelope; and add `readParkedCheckpointBinding(parkedDecisionId)` that validates persisted origin-neutral integrity and returns only a frozen persisted member. Run the focused command expecting pass. <!-- sdd-owner: implementation -->
- [x] Tarea T5.9.1.4 — TRIANGULATE → REFACTOR: extend `test/main-store.test.mjs` for byte-identical replay with no revision/write, every divergent parked/producer/binding value with `CT_PARKING_REPLAY_DIVERGENT` and unchanged bytes, missing or substituted readback identity, corrupted persisted envelope/binding rejection, pre-commit failure with no record, and absence of `checkpoint-captures` or `reconciled-checkpoints` shadow directories. Refactor the replay/readback paths to keep exactly one writer, lock, and atomic-write boundary; rerun the focused command, then `bun test test/contracts` and `bun test`, expecting no new failures. <!-- sdd-owner: implementation -->

## Apply Scope Guard

Only the following implementation paths may change: `main-store/store.mjs`, `contracts/**`, `schemas/**`, `test/main-store.test.mjs`, `test/contracts/**`, and `test/fixtures/contracts/schema-cases-v1.json`.

Do not change `workspace/checkpoint.mjs`, `workspace/reconciliation.mjs`, `escalation/parking-composition.mjs`, any other `escalation/**` path, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, or `openspec/specs/**`. A need to edit one of those paths is a stop condition, not a redesign opportunity.

## Completion Evidence

Candidate A proves the closed contract and exact cross-bindings. Candidate B proves the sole Main writer seals and reads that contract atomically without reconstructing, replacing, or splitting it. The combined result satisfies the S5.9 acceptance criteria while preserving producer-owned provenance and non-destructive rollback.
