# Apply Progress: P7-P8 Integrated Reconciliation

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `stacked-to-main`
- Current autonomous work unit: Work Unit 3 — independent P7 reconciliation record preparation
- Completed tasks: `1.1`, `1.2`, `1.3`, `2.1`, `2.2`, `2.3`, `3.1` (7/14)
- Work Unit 2 base: canonical R1 merge commit `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` on branch `docs/p7-p8-reconciliation-wu2`
- Work Unit 3 base: canonical integrated R2 merge commit `a1c75b39d6d285f9f9be8f074df718d85504a177` on branch `docs/p7-reconciliation-record`
- Runtime apply state: P7 readiness architecture/version/fixture blockers are resolved, but the record remains `BLOCKED` and `P7_APPLY` remains `CLOSED` pending apply-time identity/worktree/base/branch allocation followed by exact maintainer approval of that bound record. P8 remains blocked until P7 is approved/integrated and its own independent record is approved.
- Corrective rerun: Work Unit 1 phase-contract validation corrected `host_epoch` ownership language and the roadmap DAG rendering without changing task completion state or scope.

## Completed tasks

- [x] 1.1 Captured preservation hashes and synchronized the roadmap with merged P6 provenance, both DAG paths, no A→P7/P8 edge, and fail-closed P7/P8 gates.
- [x] 1.2 Published Plan Manifest revision 2 and rebound the roadmap ArtifactRef to canonical R1 commit `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` with its exact raw-bytes digest.
- [x] 1.3 Expanded all acceptance references into complete validated ArtifactRefs, added C→D, and removed P9 from the P10/P11 prerequisite closures.
- [x] 2.1 Applied bounded P7 amendments to proposal, design, tasks, and session handoff without changing the normative P7 specification.
- [x] 2.2 Created the independent P7 reconciliation record with P6 evidence, manifest refs, DAG assertions, role/identity boundaries, validation results, and explicit blocked approval state.
- [x] 2.3 Proved the binary fail-closed path: the prepared but unapproved record leaves P7 `BLOCKED` and its apply gate `CLOSED`.
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
| 2.2/2.3 preparation | `reconciliation.md` structural gate checker | Structural | `bun test` → 282 pass, 0 fail, 2094 assertions across 11 files | Exit 1: record absent, therefore P7 integration gate closed | Prepared record validates schema, refs, digests, DAG, roles, epochs, base evidence, and explicit blockers while gate remains closed | Missing approval and runtime allocation take the blocked path; allocated manifest IDs and unallocated runtime IDs remain distinct | Consolidated audit evidence into one independent record; no runtime/source/test or manifest edit |

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

### Work Unit 3 Preparation Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | RED: `bun -e` absent-record gate check → exit 1, `R3 RED: reconciliation record absent; P7 integration gate closed`. GREEN: focused Bun record/ArtifactRef/digest/DAG/role/epoch/base checker → exit 0, `R3 PREPARATION GREEN: PASS`; approval check intentionally reports `gate=CLOSED`, `record_state=BLOCKED`, and `maintainer approval pending`. `git diff --check` → exit 0 with no output. |
| Runtime harness command/scenario and exact result | N/A — Work Unit 3 preparation is evidence/documentation only; no runtime boundary, assignment, jornada, session, worktree/base/branch, host/plugin/root identity, or `binding_epoch` is allocated. `host_epoch` remains unallocated because Main issues/fences it when applicable and Change E enforces it downstream; controller `generation` remains unallocated because it is process-local and cannot exist before controller execution. Full `bun test` → exit 0, 282 pass, 0 fail, 2094 assertions across 11 files. |
| Rollback boundary | Remove `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` and revert only this Work Unit 3 preparation section/status in `openspec/changes/p7-p8-integrated-reconciliation/apply-progress.md`. Preserve R1/R2, manifests, P7/P8 planning, task checkboxes, runtime/source/tests, and all prior cumulative evidence. |

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

Work Unit 3 preserved the same seven hashes and all runtime/source/test bytes. It prepared the independent P7 record against canonical integrated R2 without claiming approval. Tasks `2.2` and `2.3` are complete because record creation and the binary fail-closed check are complete. Task `2.4` remains pending for apply-time allocation and binding, exact approval, approval publication, and gate transition before the first RED.

## Remaining work

- [ ] 2.4 With evidence/readiness decisions complete, allocate the exact assignment/jornada/session/worktree/base/branch, host/plugin/root identities, and `binding_epoch`; then request exact maintainer approval, publish approval evidence/open the gate, and only afterward begin the first RED without rewriting preparation history. The prepared record remains `BLOCKED` and the gate remains `CLOSED`.
- [ ] Create and approve the independent P8 record after integrated P7 in Work Unit 4.

## Work Unit 3 readiness integration overlay

This overlay merges the maintainer-approved readiness bundle and verified isolated
OpenCode `1.18.7` fixture evidence into existing R3 preparation. It does not
complete task `2.4`, allocate execution identities, open the gate, implement
runtime behavior, or modify the revision-2 roadmap counter. The canonical P7 task
count is 30; roadmap counter correction is a later publication follow-up because
the current roadmap bytes are bound by its revision-2 ArtifactRef.

### Resolved blockers

- Exact `opencode-ai`, plugin, and SDK `1.18.7` pins/integrities plus installed
  binary SHA-256.
- Trusted host root binding verified through non-consuming `session.get`;
  parentless listing alone is insufficient.
- Private injected host-composition peek port over capability-gated MCP `receive`;
  P7 owns port/conformance, Change E owns production broker/process wiring.
- Exact descriptor-free prompt call with directory query, `throwOnError`, separate
  HTTP `204`, SDK data `{}`, and lifecycle completion/failure.
- Consuming legacy automatic queue wake excluded; manual APIs preserved.
- Transient polling accepted with a harmless late generic wake across rollback;
  authority still requires receive→claim→ack.
- Four serial `stacked-to-main` units A1→A2→B→C, one active at a time.

### Remaining blockers

- Assignment/jornada/session/worktree/base/branch and host/plugin/root identities
  plus `binding_epoch` must be allocated and bound first.
- Exact maintainer approval of that bound record must then be requested and its
  real approver, timestamp, and approval ArtifactRef published to open the gate.
- `host_epoch` and controller generation remain unallocated but are not readiness
  blockers.

### Runtime fixture evidence boundary

Runtime-proven: exact package/plugin/SDK and binary identity; parentless root plus
explicit child relationship; missing/object metadata acceptance; non-object
metadata HTTP 400/no create; child-first deletion with callback-time GET 404 and
no idle requirement; overlapping/out-of-order hook completion; exact
`promptAsync` HTTP 204/data `{}` followed by controlled invalid-model busy/error/
status-idle/deprecated idle; isolated cleanup. No retry was observed and retry is
source-only/unproven. A successful provider turn was unexercised because no
credentials or provider traffic were used.

### Readiness integration TDD cycle

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU3 readiness bundle integration | Inline Bun structural readiness and ArtifactRef checkers | Structural + verified external runtime fixture evidence | Pre-edit `bun test` → 282 pass, 0 fail, 2094 assertions across 11 files | Exit 1 identified 13 then-open readiness/evidence gaps: pin, hash, status, `throwOnError`, directory, trusted root, peek, legacy boundary, polling, chain, fixtures, source-only retry, and unexercised success | Exit 0: `R3 READINESS GREEN: PASS (exact pin/envelope/root/peek/legacy/polling/chain/fixtures; blockers resolved; gate=CLOSED; state=BLOCKED; P7_tasks=30; 2.4=pending)`; ArtifactRef checker also passed 8 refs/digests and R1/R2-child/P6 ancestry | Distinguished runtime-proven failure lifecycle and cleanup from source-only/unproven retry and unexercised successful provider turn; checked resolved and remaining blocker paths separately | Replaced then-open seam/topology/blocker wording while preserving exact approval and apply-time allocation gates; no runtime/spec/manifest/roadmap edit |

### Readiness integration work-unit evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | Inline Bun structural RED → exit 1 with 13 named readiness/evidence gaps. Focused readiness GREEN → exit 0 with exact pin/envelope/root/peek/legacy/polling/chain/fixture assertions, `gate=CLOSED`, `state=BLOCKED`, 30 P7 tasks, and task `2.4` pending. ArtifactRef/digest/ancestry GREEN → exit 0: `R3 ARTIFACT GREEN: PASS (8 ArtifactRefs/digests; R1/R2-child/P6 ancestry)`. `git diff --check` → exit 0 with no output. |
| Runtime harness command/scenario and exact result | Previously executed isolated OpenCode `1.18.7` fixture: exact call returned HTTP 204/data `{}` then controlled invalid-model busy/error/status-idle/deprecated idle; root/child, metadata, recursive deletion, overlapping hooks, and cleanup passed. No retry observed (`source-only/unproven`); successful provider turn unexercised due no credentials/provider traffic. Current full `bun test` → exit 0: 282 pass, 0 fail, 2094 assertions across 11 files; two existing fixture stderr lines read `fatal: Needed a single revision`. |
| Preservation and scope | All seven preserved hashes matched: P6 progress `114fb7…e8f6c`, P7 spec `58703a…09b2`, P8 proposal `b5c7c7…710b`, P8 spec `474890…7b39`, PRD `bd8d63…02b5`, RFC `a62728…cce`, REQUIREMENTS `277129…e5a0`. Diff guard outside the six allowed paths → exit 0 with no output. No Change E, P8, Change A, runtime, source, test, manifest, master-index, or roadmap bytes changed. |
| Rollback boundary | Revert only the readiness integration edits in P7 `reconciliation.md`, `design.md`, `tasks.md`, and `session-handoff.md`, plus this integrated change's `tasks.md` and `apply-progress.md`. Preserve all prior R1/R2/R3 preparation, normative specs, manifests, roadmap, runtime/source/tests, and Engram decision/fixture observations. |

## Deviations and issues

None. Work Units 1 and 2 stayed within their assigned boundaries and left P7/P8 runtime apply blocked.

## Corrective rerun note

The single allowed corrective retry changed only Work Unit 1 documentation paths. Main is now explicitly the `host_epoch` issuance/fencing authority. Change E/Host Launcher enforces `host_epoch` and owns launch/inspect/stop/health, heartbeat, stop proof, session naming, and exclusive failover. The roadmap renders A branching independently to B and C, both converging on D before one Change E node; the independent P6→P7→P8→Change E path remains intact. That rerun left `1.2` pending; Work Unit 2 has now completed `1.2` and `1.3` without changing the corrected boundaries.

## Work Unit 2 corrective evidence overlay

Commit `1073115607c268655c452c738791b74518ba4727` is intentionally retained locally and remotely. This corrective retry does not rewrite Git history or claim that the whole candidate is uncommitted; only this evidence overlay is uncommitted.

### Dependency decisions and scope

- **B→C retained:** Change C's proposal requires both `sdd-tower-contract-schemas` (A) and `sdd-tower-project-registry` (B). The Plan Manifest at canonical R1 commit `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` and current revision 2 both encode A+B. No stronger canonical authority removes B.
- **C→D retained:** revision 2 includes `product-c-workspace-manager` in Change D's dependencies.
- **P9 is not a P10/P11 gate:** P10 depends on P8; P11 depends on P10. Neither prerequisite closure includes optional P9.
- `master-index.md` still contains stale detailed Change D wording that lists A, B, and P6 but omits C. This is a roadmap follow-up, not authority to weaken the revision-2 DAG. The file remains untouched so the manifest continues to bind the exact `b96e4d9` roadmap bytes and digest `sha256:197bf3f6e168398ce225baffdc6caac41bc8c9fa5feded2185c0c72c3b0a4fd5`.
- No P7 or P8 `reconciliation.md` is claimed, and no P7/P8 implementation has begun. Tasks after `3.1` remain gated and incomplete.

### Current-byte validation

| Evidence | Exact result |
|---|---|
| Focused Bun inline YAML/ArtifactRef/hash/identity/DAG validator | Exit 0: `WU2 STRUCTURAL PASS: revision=2; slices=15; unique_slices=15; refs=20; digests=20; identity=unique; dag=acyclic; B->C=R1+R2; C->D=retained; P9_gate=absent; roadmap_digest=sha256:197bf3f6e168398ce225baffdc6caac41bc8c9fa5feded2185c0c72c3b0a4fd5; requirements_digest=sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0` |
| `bun test` | Exit 0: 282 pass, 0 fail, 2094 assertions across 11 files. Two test-fixture stderr lines read `fatal: Needed a single revision`; the suite still completed successfully. |
| `git diff --check` | Exit 0 with no output. |
| Change A protection guard: `git diff --name-only b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0..HEAD -- 'openspec/changes/sdd-tower-contract-schemas/**'` | Exit 0 with no output; Change A is untouched. |
| Runtime harness | N/A — this corrective retry records documentation evidence only and has no runtime boundary. |
| Rollback boundary | Remove only this `Work Unit 2 corrective evidence overlay` section from `openspec/changes/p7-p8-integrated-reconciliation/apply-progress.md`; commit `1073115`, the manifest, tasks, roadmap, and all unrelated work remain intact. |

### Corrective TDD evidence

| Task | Layer | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| WU2 evidence remediation | Structural documentation | Preserved the existing WU2 structural RED evidence; no production-code cycle was invented for this documentation-only retry. | Revalidated current bytes with the focused validator and full Bun suite; both exited 0. | Added only the missing decision, follow-up, scope, and current-byte evidence; no production or manifest refactor was performed. |

## Work Unit 3 phase-contract corrective evidence

This targeted corrective rerun changed only the four phase-contract defects in
the prepared P7 record and cumulative task/progress ledgers. It did not resolve
any maintainer decision, allocate apply-time identities, open the P7 gate,
implement runtime behavior, or rewrite prior R1/R2/R3 evidence.

### Corrective TDD cycle

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU3 phase-contract correction | Inline Bun structural contract checker | Structural | Prior R3 preparation evidence and 282-test baseline retained | Exit 1: `R3 CORRECTION RED: abbreviated P6 OID; incorrect schema manifest accessor; apply-time identity taxonomy conflates host_epoch/generation; task completion state inaccurate` | Exit 0: `R3 CORRECTION GREEN: PASS (4 phase-contract defects corrected; 8 ArtifactRefs resolved; gate=CLOSED; record_state=BLOCKED; tasks=7/14; 2.4=pending)` | Checked both old-defect absence and exact new values: full P6 OID, Map accessor, separate allocation ownership, literal task states, blocked record, and closed gate | Limited wording and ledger edits to the three allowed documentation files; prior evidence remains cumulative |

### Corrective work-unit evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | Inline `bun -e` structural RED → exit 1 with all four old defects named. After correction, the focused ArtifactRef/digest/R2 ancestry/phase-contract checker → exit 0, `R3 CORRECTION GREEN: PASS (4 phase-contract defects corrected; 8 ArtifactRefs resolved; gate=CLOSED; record_state=BLOCKED; tasks=7/14; 2.4=pending)`. All eight ArtifactRefs resolved from exact 40-character commits and their raw-byte SHA-256 digests matched; R1, R2 child, and full P6 OID were verified as ancestors of integrated R2. |
| Runtime harness command/scenario and exact result | N/A — this correction changes evidence documentation only and intentionally does not allocate or execute a runtime boundary. Full `bun test` → exit 0: 282 pass, 0 fail, 2094 assertions across 11 files; two existing fixture stderr lines read `fatal: Needed a single revision`. |
| Preservation and scope | Canonical/runtime hashes remain those recorded above. `git status --short` lists only the three allowed paths; branch `docs/p7-reconciliation-record` remains at `a1c75b39d6d285f9f9be8f074df718d85504a177`. `git diff --check` → exit 0 with no output. |
| Rollback boundary | Revert only this correction's wording/state changes in `reconciliation.md`, `tasks.md`, and this appended corrective evidence/status in `apply-progress.md`. Preserve all prior R1/R2/R3 preparation history and evidence. |

### Corrected pending boundary

- [ ] 2.4 remains pending. The readiness architecture/version/fixture decisions
  are resolved. Allocate and bind assignment/jornada/session/worktree/base/branch
  plus apply-host identities first; then preserve final exact record approval,
  approval publication/gate opening, and only afterward the first RED.
- `host_epoch` remains `not allocated`, but is not a readiness blocker: Main
  issues/fences it when applicable and Change E enforces it downstream.
- Controller `generation` remains `not allocated`, but is not a readiness
  blocker: it is process-local and cannot exist before controller execution.

## Work Unit 3 coherence correction evidence

This targeted R3 correction removes only deterministic record/design/task/handoff
coherence defects. It does not change completed task state, allocate identities or
a worktree, request or publish approval, open the gate, implement runtime behavior,
or alter the retry/successful-provider evidence boundary. The record remains
`BLOCKED`, `P7_APPLY` remains `CLOSED`, and task `2.4` remains pending.

### Coherence correction TDD cycle

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU3 deterministic coherence correction | Inline Python/Bun structural, ArtifactRef, JCS, ancestry, preservation, and scope checkers | Structural | Prior cumulative R1/R2/R3 evidence retained; preserved hashes rechecked | Exit 1 identified wrong Plan ref, stale base, unresolved shape/prompt/P7-C wording, and wrong ordering | Exit 0: `R3 COHERENCE GREEN: PASS (exact YAML JCS ref; final design/tasks/handoff; allocation-before-approval ordering; BLOCKED/CLOSED; 2.4 pending)` | Independently recomputed the Plan Manifest JCS digest, resolved all eight refs, checked seven Markdown raw-byte digests, verified ancestry/no self-reference, and checked final ordering across record/tasks/handoff | Replaced stale wording with one approved A1→A2→B→C contract and one fail-closed allocation→approval→gate→RED sequence |

### Coherence correction work-unit evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | Structural RED exited 1 with all six named defects. Structural GREEN exited 0 with exact YAML JCS ref, final design/tasks/handoff, allocation-before-approval ordering, `BLOCKED`/`CLOSED`, and task `2.4` pending. Independent Bun JCS check exited 0: `R3 JCS GREEN: PASS (sha256:3ea199760048e61b42b0924eaa1bdbd2e6efa8c67d4bd6a27fec268c23e3b435; no self-reference)`. Artifact checker exited 0: `R3 ARTIFACT GREEN: PASS (8 refs/digests; YAML JCS + 7 Markdown raw-bytes; R1/R2-child/P6 ancestry)`. Preservation/scope checker exited 0: `R3 PRESERVATION GREEN: PASS (7 hashes; six-path scope only)`. `git diff --check` exited 0 with no output. |
| Runtime harness command/scenario and exact result | N/A — this correction changes documentation evidence only and deliberately allocates no runtime identity, worktree, or execution boundary. Full `bun test` exited 0: 282 pass, 0 fail, 2094 assertions across 11 files; the two existing fixture stderr lines were `fatal: Needed a single revision`. Retry remains source-only/unproven, and a successful provider turn remains unexercised. |
| Rollback boundary | Revert only this coherence correction in P7 `reconciliation.md`, `design.md`, `tasks.md`, and `session-handoff.md`, plus integrated reconciliation `tasks.md` and this appended evidence section. Preserve all earlier cumulative R1/R2/R3 evidence, specs, manifests, master index, runtime/source/tests, and P8 files. |

### Exact remaining blockers and order

1. Allocate and bind the exact assignment, jornada, session, worktree,
   authorized base, branch, host/plugin/root identities, and `binding_epoch`.
2. Request exact maintainer approval of that bound record and publish the real
   approver, timestamp, and approval ArtifactRef to open `P7_APPLY`.

Only after both blockers clear may P7-A1 begin its first strict-TDD RED.

## Work Unit 3 final readiness documentation correction

This bounded correction addresses only the latest fresh-validator findings. It
does not allocate identities or a worktree, approve or open the gate, implement
runtime behavior, or change task `2.4`. The record remains `BLOCKED` and
`P7_APPLY` remains `CLOSED`.

### Checklist disposition

| Checklist group | Disposition | Evidence boundary |
|---|---|---|
| M0 refs, DAGs, identities, P6 merge/schema/seams/conflicts | Complete | Approved decisions, integrated source analysis, record refs/digests/ancestry, and distinct missing-value rejection |
| OpenCode identity, root proof, prompt, metadata/deletion/hooks/cleanup | Complete | Isolated OpenCode `1.18.7` fixtures plus approved trusted-binding contract |
| Legacy behavior | Complete | Consuming legacy automatic wake is excluded; manual APIs remain; future automatic compatibility is a separate non-consuming, non-lossy unit |
| Retry | Non-blocking, source-only/unproven | No retry observed; deterministic behavior belongs to P7-A2 strict-TDD RED tests |
| Successful provider turn | Non-blocking, unexercised | No credentials or provider network traffic; apply-time adapter verification owns this proof |
| Baseline and work-unit forecast | Complete | Bun `1.3.14` zero-failure baseline and four serial ≤400-line work units with rollback boundaries |
| Apply-time assignment/worktree/base/branch and host/plugin/root binding | Pending blocker | Intentionally not allocated in this correction |
| Exact bound-record maintainer approval and gate publication | Pending blocker | Must occur after allocation; no approver/timestamp/ArtifactRef fabricated |

Canonical count and order are **30 P7 tasks** and serial
`P7-A1 → P7-A2 → P7-B → P7-C`, one active unit at a time. The roadmap's `0/28`
counter remains a later revision follow-up because current bytes are
ArtifactRef-bound.

### Final correction TDD cycle

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU3 final readiness documentation correction | Inline structural/checklist, ArtifactRef/JCS/ancestry/hash/scope checkers | Structural | Prior cumulative R1/R2/R3 evidence retained; `bun test` → 282 pass, 0 fail, 2094 assertions | Exit 1: `R3 FINAL RED` exposed stale unresolved-legacy and P7-C wording plus 11 unchecked evidence items already supported by captured evidence | Exit 0: `R3 FINAL GREEN: PASS (no stale unresolved legacy or P7-C wording; evidence-backed checklist; retry/success explicitly non-blocking; 30 tasks; serial A1->A2->B->C; 0/28 follow-up; BLOCKED/CLOSED; 2.4 pending)` | Separate source-only retry and unexercised successful-provider paths from runtime-proven fixture evidence; retain only allocation and exact approval as blockers | Replaced stale wording and reconciled checklist state without changing runtime, approval, allocation, or prior task completion |

### Final correction work-unit evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | RED structural checker exited 1 and named both stale phrases plus 11 checklist mismatches. GREEN structural checker exited 0 with no stale wording, evidence-backed/non-blocking dispositions, 30 tasks, serial A1→A2→B→C, `0/28` follow-up, `BLOCKED`/`CLOSED`, and `2.4` pending. Artifact validation passed 8 refs: seven raw-byte digests plus Plan Manifest JCS `sha256:3ea199760048e61b42b0924eaa1bdbd2e6efa8c67d4bd6a27fec268c23e3b435`; R1/R2-child/P6 ancestry passed. Seven preservation hashes passed. Exact six-path scope and `git diff --check` passed. |
| Runtime harness command/scenario and exact result | N/A for this correction — documentation-only with no allocated runtime boundary. Existing isolated OpenCode `1.18.7` fixture evidence remains scoped exactly as recorded: retry source-only/unproven and successful provider turn unexercised. |
| Rollback boundary | Revert only this final correction across the four P7 documentation files and the integrated `tasks.md`/`apply-progress.md`. Preserve prior cumulative R1/R2/R3 evidence, specs, manifests, roadmap bytes, runtime/source/tests, and task `2.4`. |

## Work Unit 3 pre-allocation evidence-binding correction

This cumulative correction binds the committed reproducible fixture evidence and
removes only stale checklist language. It allocates no identity or worktree,
requests no approval, opens no gate, and implements no runtime behavior. Task
`2.4` remains pending; the record remains `BLOCKED` and `P7_APPLY` remains
`CLOSED`.

### Evidence-binding TDD cycle

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU3 evidence binding and latest wording correction | Inline Python/Bun structural, ArtifactRef, JCS, ancestry, blob, preservation, and scope checkers | Structural | Prior cumulative evidence retained; committed evidence blobs and working-tree bytes captured before edit | Exit 1: `R3 EVIDENCE-BINDING RED` named missing committed fixture refs, three stale clauses, and the false future clean-adapter proof disposition | Ten refs resolve with declared modes; JSON JCS and README raw-byte digests match; state/checklist/blockers are exact | Independently checked source commit/tree ancestry, both fixture blob IDs, working-tree equality, no self-reference, and implementation-time A/B/C import acceptance | Limited edits to the six authorized documentation paths and clarified one allocation→approval→publication sequence |

### Evidence-binding work-unit evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | RED structural checker exited 1: `R3 EVIDENCE-BINDING RED` with five named defect classes. GREEN structural checker exited 0: `R3 EVIDENCE-BINDING GREEN: PASS`. Artifact checker exited 0: `R3 ARTIFACT GREEN: PASS (10 ArtifactRefs; JSON/YAML JCS + 8 Markdown raw-bytes; all paths/digests; no self-reference)`. Fixture checker independently returned JSON JCS `sha256:bb74a1aef0a6340eaeb19b7fcda86c6c3b611eb95c20c673f7e88bb5ccdad5ff` and README raw `sha256:90e7b419b0c7f058ba2c600b68b648b4da8712151b6367635ccf264cd3ff7180`; precursor ancestry, blob/working-tree equality, and no self-reference passed. Exact six-document scope, preserved P6/P7/P8 hashes, and `git diff --check` passed. |
| Runtime harness command/scenario and exact result | N/A — documentation-only correction with no allocated runtime boundary. The committed fixture evidence is reproducible from its README; no fixture rerun or runtime mutation occurred in this unit. Full `bun test` exited 0: 282 pass, 0 fail, 2094 assertions across 11 files; two existing fixture stderr lines read `fatal: Needed a single revision`. |
| Rollback boundary | Revert only this correction in P7 `reconciliation.md`, `design.md`, `tasks.md`, and `session-handoff.md`, plus integrated `tasks.md` and this appended progress section. Preserve committed evidence precursor `44becc1153b24273796c1d6823f481179358757b` and all runtime/source/test bytes. |

### Exact checklist disposition and blockers

- Evidence/readiness decisions are recorded, including reproducible JSON/README
  bindings. Legacy automatic wake is excluded; manual APIs remain.
- Future clean-adapter import conformance is implementation-time P7-B/P7-C
  acceptance, preserved in their explicit RED tasks; P7-A1/P7-A2 claim no adapter
  coverage. It is not readiness proof or an allocation blocker.
- Remaining blocker 1: allocate and bind exact apply identities, worktree, base,
  branch, and `binding_epoch`.
- Remaining blocker 2: approve that exact bound record and publish approval
  evidence to open the gate.

## Work Unit 3 clean-adapter RED-ownership correction

This final surgical correction aligns the future clean-adapter import-boundary
claim with the P7 tasks that actually own adapter and composition work. It adds
no runtime implementation, changes no task checkbox, and leaves task `2.4`
pending, the record `BLOCKED`, and `P7_APPLY` `CLOSED`.

### Import-boundary correction TDD cycle

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU3 clean-adapter RED ownership | Inline Python structural checker | Structural documentation | Prior cumulative R1/R2/R3 evidence retained; committed fixture blob identities captured | Exit 1: `R3 IMPORT-BOUNDARY RED` named missing P7-B core/MCP/SQLite/database checks, missing P7-C second-public-API check, and missing exact record task IDs | Exit 0: `R3 IMPORT-BOUNDARY GREEN: PASS (P7-B RED adapter scan; P7-C RED composition/public-surface checks; A1/A2 excluded; no task state changed)` | Checked static, dynamic, and `require` import forms; exact forbidden match reporting; adapter and approved-seam scope; and an existing-public-surface snapshot that rejects a second continuation API | Assigned adapter import proof to P7-B RED and composition/import plus public-surface proof to P7-C RED; retained REFACTOR/TRIANGULATE regression checks |

### Import-boundary correction work-unit evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | Pre-edit inline Python structural checker exited 1 with `B_RED_core`, `B_RED_mcp`, `B_RED_sqlite_db`, `C_RED_second_api`, and `record_exact_ids`. Post-edit checker exited 0 with the exact GREEN result above. All P7 implementation bullets remain unchecked; the eight checked items are reconciliation evidence tasks only. |
| Artifact and immutable-evidence verification | All 10 reconciliation ArtifactRefs resolve: eight raw-byte digests passed and both RFC8785-JCS digests passed (Plan Manifest `sha256:3ea199760048e61b42b0924eaa1bdbd2e6efa8c67d4bd6a27fec268c23e3b435`; runtime fixture `sha256:bb74a1aef0a6340eaeb19b7fcda86c6c3b611eb95c20c673f7e88bb5ccdad5ff`). Committed/working fixture blobs remain JSON `18f7d028c97dcafc7defcb82cfc306016848b1b3` and README `cc8ef244e09e2c0a2ad1fe55b8df5f8fa293147e`. |
| Focused/full regression | `git diff --check` exited 0 with no output. `bun test` exited 0 on Bun `1.3.14`: 282 pass, 0 fail, 2094 assertions across 11 files; two existing fixture stderr lines read `fatal: Needed a single revision`. |
| Runtime harness command/scenario and exact result | N/A — documentation-only task-plan correction with no allocated runtime boundary. No fixture rerun, runtime mutation, implementation, allocation, approval, or gate action occurred. |
| Scope and rollback boundary | This correction edited only P7 `tasks.md`, P7 `reconciliation.md`, and this cumulative `apply-progress.md`. Revert only the new RED clauses, exact-task claim wording, and this appended evidence section; preserve all prior cumulative evidence, task states, committed evidence blobs, and unrelated pre-existing working-tree changes. |

### Remaining blockers and required order

1. Allocate and bind the exact apply identities, worktree, authorized base,
   branch, and `binding_epoch`.
2. Only then obtain exact maintainer approval of the bound record and publish its
   approver, timestamp, and approval ArtifactRef to open `P7_APPLY`.

No later action was performed in this correction.
