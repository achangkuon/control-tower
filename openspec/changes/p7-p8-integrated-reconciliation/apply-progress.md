# Apply Progress: P7-P8 Integrated Reconciliation

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `stacked-to-main`
- Current autonomous work unit: Work Unit 1 — roadmap/catalog mechanics and bounded P7/P8 amendments
- Completed tasks: `1.1`, `2.1`, `3.1`
- Partial task: catalog-only portion of `1.2`; the Plan Manifest revision-2 ArtifactRef publication remains Work Unit 2, so `1.2` stays unchecked
- Runtime apply state: P7 remains blocked until its independent reconciliation record is approved. P8 remains blocked until P7 is reconciled/integrated and its own independent record is approved.
- Corrective rerun: Work Unit 1 phase-contract validation corrected `host_epoch` ownership language and the roadmap DAG rendering without changing task completion state or scope.

## Completed tasks

- [x] 1.1 Captured preservation hashes and synchronized the roadmap with merged P6 provenance, both DAG paths, no A→P7/P8 edge, and fail-closed P7/P8 gates.
- [x] 2.1 Applied bounded P7 amendments to proposal, design, tasks, and session handoff without changing the normative P7 specification.
- [x] 3.1 Applied bounded P8 amendments to design, tasks, and status without changing the P8 proposal or normative specification.

## Partial task

- [ ] 1.2 Updated only `openspec/plans/manifest.yaml` to `catalog_revision: 2` and roadmap anchor `sdd-tower-implementation`. Work Unit 2 still must publish/rebind the revision-2 Plan Manifest and roadmap ArtifactRef.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | Preservation hashes + binary document checker | Structural | `bun test` → 282 pass, 0 fail, 2094 assertions | Pre-edit roadmap lacked merged P6/current gate statements; corrective RED then failed because the product branch was ambiguous, had a dangling connector, and rendered Change E twice | YAML parsed; corrective invariant checker passed 12 assertions; preservation hashes unchanged | Checked independent A→B and A→C branches converging at D, Change E exactly once, the independent P6→P7→P8 path, no-A edge, P7/P8 gates, and unchanged Plan Manifest | Replaced the ambiguous branch drawing with one explicit convergence and removed the duplicate Change E node |
| 1.2 catalog portion | YAML parse + exact catalog values | Structural | Existing Plan Manifest parsed and remained byte-identical to `HEAD` | Catalog revision/anchor were `1` / `sdd-tower-implementation-v1` | Catalog parses as revision `2` with anchor `sdd-tower-implementation` | Triangulation skipped: two exact scalar outputs with no branch or runtime logic | No further refactor needed |
| 2.1 | Preservation hashes + P7 binary document checker | Structural | P7 normative spec SHA-256 captured before edits | P7 planning lacked the complete M0 DAG, identity/epoch, worktree, and Change E boundaries; corrective RED then failed because the proposal assigned `host_epoch` boundaries jointly instead of naming Main authority | Required P7 gate/boundary statements are present; Main owns issuance/fencing, Change E owns enforcement and host lifecycle; normative spec hash unchanged | Checked blocked-native-ready behavior, no Change A dependency, distinct epochs, worktree pinning, and ownership | Consolidated amendment language around one independent record and explicit authority/mechanism ownership |
| 3.1 | Preservation hashes + P8 binary document checker | Structural | P8 proposal/spec SHA-256 captured before edits | P8 planning lacked the complete independent-gate, no-A, identity/epoch, worktree, and Change E boundaries; corrective RED then failed because STATUS assigned `host_epoch` ownership to Change E | Required P8 gate/boundary statements are present; Main retains issuance/fencing while Change E enforces the mechanism and owns host lifecycle; proposal/spec hashes unchanged | Checked P8 waits for integrated P7 plus its own record and rejects boundary drift | Kept changes bounded to design/tasks/status and made authority ownership explicit |

## Test Summary

- Tests written: 0 — documentation-only work unit; runtime RED tests are N/A by design.
- Existing tests passing: 282, with 0 failures and 2094 assertions across 11 files.
- Layers used: Structural document/YAML/hash checks; existing Bun unit/integration regression suite.
- Approval tests: preservation hashes for immutable documents and 98 tracked paths outside allowed edit roots.
- Pure functions created: 0.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Corrective RED invariant command (`python3` assertions) → exit 1, `AssertionError`. Corrective GREEN invariant command → exit 0, `corrective invariants: PASS (12 assertions)`. Bun native YAML parse command → exit 0; both manifests reported `parsed`. Preservation hashes matched all seven recorded values; runtime/source/test diff guard → exit 0 with no output. `git diff --check` → exit 0 with no output. |
| Runtime harness command/scenario and exact result | N/A — this work unit changes documentation/catalog metadata only and has no runtime boundary. `bun test` regression → exit 0; 282 pass, 0 fail, 2094 assertions. |
| Rollback boundary | Revert `openspec/plans/master-index.md`, `openspec/plans/manifest.yaml`, the four bounded P7 documents, the three bounded P8 documents, and this change's task/progress files. Do not revert preserved specs, P6 history, canonical contracts, Plan Manifest, runtime/source/test files, or unrelated work. |

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

The existing revision-1 Plan Manifest remains byte-for-byte equal to `HEAD`. No P7/P8 reconciliation record was created. No runtime/source/test path changed.

## Remaining work

- [ ] Complete `1.2` by publishing/rebinding the revision-2 Plan Manifest and roadmap ArtifactRef in Work Unit 2.
- [ ] Complete `1.3` in Work Unit 2.
- [ ] Create and approve the independent P7 record in Work Unit 3.
- [ ] Create and approve the independent P8 record after integrated P7 in Work Unit 4.

## Deviations and issues

None. Work Unit 1 stayed within its assigned boundary and left P7/P8 runtime apply blocked.

## Corrective rerun note

The single allowed corrective retry changed only Work Unit 1 documentation paths. Main is now explicitly the `host_epoch` issuance/fencing authority. Change E/Host Launcher enforces `host_epoch` and owns launch/inspect/stop/health, heartbeat, stop proof, session naming, and exclusive failover. The roadmap renders A branching independently to B and C, both converging on D before one Change E node; the independent P6→P7→P8→Change E path remains intact. Task states remain `1.1`, `2.1`, and `3.1` complete, with `1.2` pending.
