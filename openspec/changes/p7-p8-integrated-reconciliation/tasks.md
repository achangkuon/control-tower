# Tasks: P7-P8 Integrated Reconciliation

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers; P7 means `p7-host-neutral-loop-opencode-adapter`. Neither value denotes positional Plan P6 or Plan P7.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 560–760 authored additions + deletions (800-line project budget) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 mechanics/amendments → PR 2 manifest → PR 3 P7 record → PR 4 P8 record/validation |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Sesiones

| Sesión | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| S1.9 | Align roadmap/catalog and bounded P7/P8 amendments | PR 1 | `git diff --check` | N/A — documentation only | Revert `master-index.md` and P7/P8 amendment files |
| S1.10 | Publish revision-2 Plan Manifest and ArtifactRefs | PR 2 | YAML parse + `git diff --check` | N/A — no runtime state | Revert both `openspec/plans/*manifest.yaml` files |
| S1.11 | Approve independent P7 reconciliation | PR 3 | Record invariant checker | N/A — evidence record only | Remove P7 `reconciliation.md` and gate amendments |
| S1.12 | Approve P8, validate preservation, persist hybrid artifacts | PR 4 | Full validation command + `bun test` | N/A — no executable behavior | Revert P8 record/status and persistence receipt |

## Sesión 1.9 — Mechanical Roadmap/Catalog Alignment

### Módulo 1.9.1 — Roadmap and catalog amendments

- [x] Tarea 1.9.1.1 Snapshot preservation hashes; update `openspec/plans/master-index.md` for merged P6 provenance, both DAG paths, no A→P7/P8 edge, and evidence gates.
- [x] Tarea 1.9.1.2 Amend P7 `proposal.md`, `design.md`, `tasks.md`, and `session-handoff.md` with integrated IDs/epochs, worktree/authority boundaries, and the reconciliation gate; do not edit its normative spec.
- [x] Tarea 1.9.1.3 Amend P8 `design.md`, `tasks.md`, and `STATUS.md` to require integrated approved P7 evidence and its own gate; preserve P8 proposal/spec byte-for-byte.

## Sesión 1.10 — Plan Manifest and ArtifactRefs

### Módulo 1.10.1 — Machine-readable plan artifacts

- [x] Tarea 1.10.1.1 Update `openspec/plans/manifest.yaml` to catalog revision 2 and the `sdd-tower-implementation` anchor; update plan manifest revision/roadmap ArtifactRef.
- [x] Tarea 1.10.1.2 Expand every `acceptance_refs` entry in `openspec/plans/sdd-tower-implementation/manifest.yaml` to validated ArtifactRefs, add C→D, and remove P9 from P10/P11 prerequisite closures.
- [x] Tarea 1.10.1.3 Verify the revision-2 manifest, its 15 unique slices, ArtifactRef hashes, DAG edges, rollback boundary, and documentation-only runtime result.

## Sesión 1.11 — P7 Reconciliation Record

### Módulo 1.11.1 — P7 evidence and gate

- [x] Tarea 1.11.1.1 Create `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` with P6 evidence, manifest refs, DAG assertions, role/identity matrix, validation results, and explicit approval/block state.
- [x] Tarea 1.11.1.2 Binary check: P7 stays blocked without its approved record; missing IDs, conflated epochs, unauthorized SHA, or out-of-container worktree are rejected.
- [x] Tarea 1.11.1.3 Approve the P7 gate only after the record and binary checks are complete.

## Sesión 1.12 — P8 Reconciliation and Preservation

### Módulo 1.12.1 — P8 evidence and final validation

- [x] Tarea 1.12.1.1 Create `openspec/changes/p8-slice-planning/reconciliation.md` referencing—not absorbing—the integrated P7 record, with independent refs, boundaries, validation, and approval.
- [x] Tarea 1.12.1.2 Binary check: P8 remains blocked without both approved records; invalid digest, identity, epoch, branch, or worktree evidence is non-approvable.
- [x] Tarea 1.12.1.3 Approve the P8 gate only after integrated P7 and the independent P8 record pass.

- [x] Tarea 1.12.1.4 Parse both manifests; resolve every ArtifactRef source path, recompute digests, verify revisions, unique slices, acyclicity, C→D, both DAGs, no A→P7/P8, and no P9→P10/P11 gate.
- [x] Tarea 1.12.1.5 Prove unchanged hashes for P6 `apply-progress.md`, P7 spec, P8 proposal/spec, canonical PRD/RFC/REQUIREMENTS, and all runtime/source/test files; run `git diff --check` and `bun test`.
- [x] Tarea 1.12.1.6 Persist the completed task/reconciliation artifacts to matching Engram `sdd/...` topics and verify filesystem/OpenSpec and Engram contents agree; leave Tower disarmed.
- [x] Tarea 1.12.1.7 Confirm the design threat matrix remains N/A; no runtime RED tests are required for this documentation-only change.
