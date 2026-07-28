# Tasks: P7-P8 Integrated Reconciliation (M0)

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

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Align roadmap/catalog and bounded P7/P8 amendments | PR 1 | `git diff --check` | N/A — documentation only | Revert `master-index.md` and P7/P8 amendment files |
| 2 | Publish revision-2 Plan Manifest and ArtifactRefs | PR 2 | YAML parse + `git diff --check` | N/A — no runtime state | Revert both `openspec/plans/*manifest.yaml` files |
| 3 | Prepare independent P7 reconciliation for exact approval | PR 3 | Record invariant checker | Isolated OpenCode 1.18.7 fixtures already captured; no apply runtime | Remove P7 `reconciliation.md` and gate amendments |
| 4 | Approve P8, validate preservation, persist hybrid artifacts | PR 4 | Full validation command + `bun test` | N/A — no executable behavior | Revert P8 record/status and persistence receipt |

## Phase 1: Mechanical Roadmap/Catalog/Manifest Alignment

- [x] 1.1 Snapshot preservation hashes; update `openspec/plans/master-index.md` for merged P6 provenance, both DAG paths, no A→P7/P8 edge, and evidence gates.
- [x] 1.2 Update `openspec/plans/manifest.yaml` to catalog revision 2 and the `sdd-tower-implementation` anchor; update plan manifest revision/roadmap ArtifactRef.
- [x] 1.3 Expand every `acceptance_refs` entry in `openspec/plans/sdd-tower-implementation/manifest.yaml` to validated ArtifactRefs, add C→D, and remove P9 from P10/P11 prerequisite closures.

## Phase 2: P7 Bounded Amendments and Reconciliation Record

- [x] 2.1 Amend P7 `proposal.md`, `design.md`, `tasks.md`, and `session-handoff.md` with integrated IDs/epochs, worktree/authority boundaries, and the M0 apply gate; do not edit its normative spec.
- [x] 2.2 Create `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` with P6 evidence, manifest refs, DAG assertions, role/identity matrix, validation results, and explicit approval/block state.
- [x] 2.3 Binary check: P7 stays blocked without its approved record; missing IDs, conflated epochs, unauthorized SHA, or out-of-container worktree are rejected.
- [ ] 2.4 Allocate and bind the exact assignment/jornada/session/worktree/base/branch, host/plugin/root identities, and `binding_epoch`; request exact maintainer approval of that bound record; publish approval evidence and open the gate; only then begin the first RED, without rewriting preparation history.

Readiness architecture/version/fixture decisions are resolved. Task `2.4` remains
pending because apply-time allocation and the subsequent exact approval of the
bound record have not occurred. `host_epoch` and controller `generation` remain non-blocking and
unallocated. P7 has 30 canonical tasks; the revision-2 roadmap `0/28` counter remains
unchanged because its exact bytes are ArtifactRef-bound. Correct that counter only
in a later publication unit that can issue a new roadmap revision and digest.
The approved delivery order is serial `P7-A1 → P7-A2 → P7-B → P7-C`, one active
unit at a time. Retry is source-only/unproven and successful-provider behavior is
unexercised without credentials/network; neither is a P7 readiness requirement.

The committed JSON fixture and README reproduction procedure at precursor
`44becc1153b24273796c1d6823f481179358757b` provide reproducible fixture
evidence. Future clean-adapter import conformance remains an implementation-time
A/B/C acceptance criterion, not a completed readiness item or allocation blocker.

## Phase 3: P8 Bounded Amendments and Reconciliation Record

- [x] 3.1 Amend P8 `design.md`, `tasks.md`, and `STATUS.md` to require integrated approved P7 evidence and its own gate; preserve P8 proposal/spec byte-for-byte.
- [ ] 3.2 Create `openspec/changes/p8-slice-planning/reconciliation.md` referencing—not absorbing—the integrated P7 record, with independent refs, boundaries, validation, and approval.
- [ ] 3.3 Binary check: P8 remains blocked without both approved records; invalid digest, identity, epoch, branch, or worktree evidence is non-approvable.

## Phase 4: Validation, Preservation, and Hybrid Persistence

- [ ] 4.1 Parse both manifests; resolve every ArtifactRef source path, recompute digests, verify revisions, unique slices, acyclicity, C→D, both DAGs, no A→P7/P8, and no P9→P10/P11 gate.
- [ ] 4.2 Prove unchanged hashes for P6 `apply-progress.md`, P7 spec, P8 proposal/spec, canonical PRD/RFC/REQUIREMENTS, and all runtime/source/test files; run `git diff --check` and `bun test`.
- [ ] 4.3 Persist the completed task/reconciliation artifacts to matching Engram `sdd/...` topics and verify filesystem/OpenSpec and Engram contents agree; leave Tower disarmed.
- [ ] 4.4 Confirm the design threat matrix remains N/A; no runtime RED tests are required for this documentation-only change.
