# Apply Progress: P7-P8 Integrated Reconciliation

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `stacked-to-main`
- Current autonomous work unit: Work Unit 2 — revision-2 Plan Manifest and validated ArtifactRefs
- Completed tasks: `1.1`, `1.2`, `1.3`, `2.1`, `3.1`
- Work Unit 2 base: canonical R1 merge commit `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` on branch `docs/p7-p8-reconciliation-wu2`
- Runtime apply state: P7 remains blocked until its independent reconciliation record is approved. P8 remains blocked until P7 is reconciled/integrated and its own independent record is approved.
- Corrective rerun: Work Unit 1 phase-contract validation corrected `host_epoch` ownership language and the roadmap DAG rendering without changing task completion state or scope.

## Completed tasks

- [x] 1.1 Captured preservation hashes and synchronized the roadmap with merged P6 provenance, both DAG paths, no A→P7/P8 edge, and fail-closed P7/P8 gates.
- [x] 1.2 Published Plan Manifest revision 2 and rebound the roadmap ArtifactRef to canonical R1 commit `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` with its exact raw-bytes digest.
- [x] 1.3 Expanded all acceptance references into complete validated ArtifactRefs, added C→D, and removed P9 from the P10/P11 prerequisite closures.
- [x] 2.1 Applied bounded P7 amendments to proposal, design, tasks, and session handoff without changing the normative P7 specification.
- [x] 3.1 Applied bounded P8 amendments to design, tasks, and status without changing the P8 proposal or normative specification.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | Preservation hashes + binary document checker | Structural | `bun test` → 282 pass, 0 fail, 2094 assertions | Pre-edit roadmap lacked merged P6/current gate statements; corrective RED then failed because the product branch was ambiguous, had a dangling connector, and rendered Change E twice | YAML parsed; corrective invariant checker passed 12 assertions; preservation hashes unchanged | Checked independent A→B and A→C branches converging at D, Change E exactly once, the independent P6→P7→P8 path, no-A edge, P7/P8 gates, and unchanged Plan Manifest | Replaced the ambiguous branch drawing with one explicit convergence and removed the duplicate Change E node |
| 1.2 catalog portion | YAML parse + exact catalog values | Structural | Existing Plan Manifest parsed and remained byte-identical to `HEAD` | Catalog revision/anchor were `1` / `sdd-tower-implementation-v1` | Catalog parses as revision `2` with anchor `sdd-tower-implementation` | Triangulation skipped: two exact scalar outputs with no branch or runtime logic | No further refactor needed |
| 1.2 manifest publication | Bun YAML/hash invariant checker | Structural | `bun test` before edit → 282 pass, 0 fail, 2094 assertions across 11 files | Pre-edit structural check exited 1 and reported `artifact_revision=1; roadmap artifact_revision=1` | Focused checker exited 0 with `R2 GREEN: PASS (211 assertions, 20 ArtifactRefs resolved)`; roadmap bytes at `b96e4d9` hash to `sha256:197bf3f6e168398ce225baffdc6caac41bc8c9fa5feded2185c0c72c3b0a4fd5` | Triangulation skipped: publication fields have one canonical commit/digest/revision tuple and no branching behavior | Explicit fields retained for auditability; no further refactor needed |
| 1.3 | Bun YAML/ArtifactRef/DAG invariant checker | Structural | Same 282-test safety net; immutable-document hashes captured | Pre-edit structural check exited 1 and reported scalar refs, missing C→D, and P9 gating P10 | Focused checker exited 0 with 211 assertions: both YAML files parsed, 20 refs resolved and hashed, DAG constraints passed | Validated every ref and dependency plus acyclicity, both A→B/C→D→E paths, P6→P7→P8→E, no A→P7/P8, P10→P8, and P11→P10 without P9 | Kept complete ArtifactRefs inline rather than introducing YAML aliases, preserving explicit reviewable bindings |
| 2.1 | Preservation hashes + P7 binary document checker | Structural | P7 normative spec SHA-256 captured before edits | P7 planning lacked the complete M0 DAG, identity/epoch, worktree, and Change E boundaries; corrective RED then failed because the proposal assigned `host_epoch` boundaries jointly instead of naming Main authority | Required P7 gate/boundary statements are present; Main owns issuance/fencing, Change E owns enforcement and host lifecycle; normative spec hash unchanged | Checked blocked-native-ready behavior, no Change A dependency, distinct epochs, worktree pinning, and ownership | Consolidated amendment language around one independent record and explicit authority/mechanism ownership |
| 3.1 | Preservation hashes + P8 binary document checker | Structural | P8 proposal/spec SHA-256 captured before edits | P8 planning lacked the complete independent-gate, no-A, identity/epoch, worktree, and Change E boundaries; corrective RED then failed because STATUS assigned `host_epoch` ownership to Change E | Required P8 gate/boundary statements are present; Main retains issuance/fencing while Change E enforces the mechanism and owns host lifecycle; proposal/spec hashes unchanged | Checked P8 waits for integrated P7 plus its own record and rejects boundary drift | Kept changes bounded to design/tasks/status and made authority ownership explicit |

## Test Summary

- Tests written: 0 persistent test files — documentation-only work units use executed structural RED/GREEN invariant checks.
- Existing tests passing: 282, with 0 failures and 2094 assertions across 11 files.
- Layers used: Structural document/YAML/ArtifactRef/hash/DAG checks; existing Bun unit/integration regression suite.
- Approval tests: preservation hashes for immutable documents and 98 tracked paths outside allowed edit roots.
- Pure functions created: 0.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Corrective RED invariant command (`python3` assertions) → exit 1, `AssertionError`. Corrective GREEN invariant command → exit 0, `corrective invariants: PASS (12 assertions)`. Bun native YAML parse command → exit 0; both manifests reported `parsed`. Preservation hashes matched all seven recorded values; runtime/source/test diff guard → exit 0 with no output. `git diff --check` → exit 0 with no output. |
| Runtime harness command/scenario and exact result | N/A — this work unit changes documentation/catalog metadata only and has no runtime boundary. `bun test` regression → exit 0; 282 pass, 0 fail, 2094 assertions. |
| Rollback boundary | Revert `openspec/plans/master-index.md`, `openspec/plans/manifest.yaml`, the four bounded P7 documents, the three bounded P8 documents, and this change's task/progress files. Do not revert preserved specs, P6 history, canonical contracts, Plan Manifest, runtime/source/test files, or unrelated work. |

### Work Unit 2 Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | RED: Bun structural invariant command → exit 1, `R2 RED: artifact_revision=1; roadmap artifact_revision=1; scalar acceptance_refs present; missing C->D; P9 gates P10`. GREEN: Bun YAML/ArtifactRef/hash/DAG invariant command → exit 0, `R2 GREEN: PASS (211 assertions, 20 ArtifactRefs resolved)`. `git diff --check` → exit 0 with no output. |
| Runtime harness command/scenario and exact result | N/A — Work Unit 2 changes only a documentation Plan Manifest and its evidence bindings; no executable runtime boundary exists. Full regression `bun test` → exit 0, 282 pass, 0 fail, 2094 assertions across 11 files. |
| Rollback boundary | Revert `openspec/plans/sdd-tower-implementation/manifest.yaml` and the Work Unit 2 updates in this change's `tasks.md` and `apply-progress.md`. Leave R1's merged roadmap/catalog/P7/P8 amendments and `openspec/plans/manifest.yaml` unchanged. |

## Preservation evidence

| Artifact | SHA-256 before and after |
|---|---|
| P6 `apply-progress.md` | `114fb7490fd5790f21f1c19b77390bfc2f476cc82bdc8b107ee5bcfbeb6e8f6c` |
| P7 normative spec | `58703aa49c9c9ca01888ed7bcc313356ea1e3bff31ee588015db757d7aed09b2` |
| P8 proposal | `b5c7c7061548743e5f3398f34530a2203814640b76078c228926bd468726710b` |
| P8 normative spec | `474890dec7d4b7f4f5abcca9445dc7abd0ef3bd05fcf34551f0739b9bc417b39` |
| Canonical PRD | `bd8d630d9c1a80b566921980dd67b7e0c421cf7ba08528958ffad1431ec802b5` |
| Canonical RFC | `a6272899bf76c141850ea1c38444d303b7dfcc84e1f7351c95bffb8557c82cce` |
| Canonical REQUIREMENTS | `277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0` |

Work Unit 2 preserved all seven hashes above. The revision-2 Plan Manifest binds canonical R1 roadmap bytes rather than working-tree bytes. `openspec/plans/manifest.yaml` remains unchanged from R1. No P7/P8 reconciliation record was created. No runtime/source/test path changed.

## Remaining work

- [ ] Create and approve the independent P7 record in Work Unit 3.
- [ ] Create and approve the independent P8 record after integrated P7 in Work Unit 4.

## Deviations and issues

None. Work Units 1 and 2 stayed within their assigned boundaries and left P7/P8 runtime apply blocked.

## Corrective rerun note

The single allowed corrective retry changed only Work Unit 1 documentation paths. Main is now explicitly the `host_epoch` issuance/fencing authority. Change E/Host Launcher enforces `host_epoch` and owns launch/inspect/stop/health, heartbeat, stop proof, session naming, and exclusive failover. The roadmap renders A branching independently to B and C, both converging on D before one Change E node; the independent P6→P7→P8→Change E path remains intact. That rerun left `1.2` pending; Work Unit 2 has now completed `1.2` and `1.3` without changing the corrected boundaries.
