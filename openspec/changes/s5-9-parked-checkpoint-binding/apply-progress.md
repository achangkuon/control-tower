# Apply Progress: S5.9 Parked Checkpoint Binding

## Status consumed

- Change: `s5-9-parked-checkpoint-binding`; store: `both`; apply state: `ready`.
- Action context: `implementation-worktree`; root `/home/emili/projects/control-tower/Worktrees/s5-9`; all edits remained inside the supplied allowed roots.
- Native SDD/review lifecycle was suspended and not invoked.
- Delivery: two sequential direct-push candidates, chain strategy N/A; no commit, push, staging, or PR.

## Completed tasks and persisted checkboxes

- [x] T5.9.1.1 — contract/schema RED.
- [x] T5.9.1.2 — contract/schema GREEN, triangulation, and refactor.
- [x] T5.9.1.3 — Main sealing/readback RED and GREEN.
- [x] T5.9.1.4 — replay, corruption, atomic-failure, and no-shadow-path triangulation.

All four matching implementation-owned rows are `[x]` in both the OpenSpec and Engram task artifacts. No parent-owned or unchecked implementation task remains.

## Sequential candidate boundaries

| Candidate | Exact paths | Authored additions + deletions | Focused result | Rollback boundary |
|---|---|---:|---|---|
| A | `schemas/parked-checkpoint-binding-v1.schema.json`; `contracts/parked-checkpoint-binding.mjs`; `contracts/schema-registry.mjs`; `contracts/validate.mjs`; `test/contracts/parked-checkpoint-binding.test.mjs`; `test/contracts/schema.test.mjs`; `test/fixtures/contracts/schema-cases-v1.json` | **146** (145 additions, 1 deletion; includes 124 lines in three new files) | 63 pass, 0 fail, 210 assertions | Revert only these seven files; Candidate A cannot persist a binding. |
| B | `main-store/store.mjs`; `test/main-store.test.mjs` | **36** (35 additions, 1 deletion) | 51 pass, 0 fail, 326 assertions | Revert these two files (and A if removing the feature); never delete or rewrite sealed records. |

Both candidates are independently below the 400-line hard limit. Candidate A was checkpointed GREEN and counted before Candidate B began.

## Files changed

Implementation files are exactly the nine paths listed above. Evidence files changed only under `openspec/changes/s5-9-parked-checkpoint-binding/`: `tasks.md` and this `apply-progress.md`. No forbidden producer, composition, continuation, core, MCP, delivery, or public-spec path changed.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T5.9.1.1 | `test/contracts/parked-checkpoint-binding.test.mjs`, `test/contracts/schema.test.mjs` | Contract | Baseline after dependency install: 109 pass, 0 fail, 501 assertions | `bun test test/contracts/parked-checkpoint-binding.test.mjs test/contracts/schema.test.mjs`: 58 pass, 2 fail, 1 module error, 184 assertions | Covered with T5.9.1.2 | Closed shape, deterministic digest, exact source fields, fixture/registry | Reused canonical registry/validation conventions |
| T5.9.1.2 | same | Contract | 109/109 baseline | Same RED | Same command: 63 pass, 0 fail, 210 assertions | Independently resealed source mismatch matrix, digest drift, unknown field, extensions-only substitute | Reused `validateCheckpointProvenancePair`; no duplicated provenance logic |
| T5.9.1.3 | `test/main-store.test.mjs` | Integration | Baseline: 51 pass, 0 fail, 310 assertions | Same command: 49 pass, 2 fail, 310 assertions | Same command: 51 pass, 0 fail, 324 assertions; final 326 after triangulation | Dedicated readback, missing identity, caller binding rejection | Reused the existing parking envelope, commit, lock, and atomic write |
| T5.9.1.4 | `test/main-store.test.mjs` | Integration | T5.9.1.3 GREEN | Added divergence/corruption assertions against GREEN implementation | Final same command: 51 pass, 0 fail, 326 assertions | Exact replay bytes/revision, changed parked decision, different live producer evidence, persisted digest corruption, pre-commit zero effect, no shadow directories | One readback validator and one existing writer boundary |

Initial baseline first failed for infrastructure (`yaml` package unavailable); `bun install --frozen-lockfile` installed locked dependencies without changing the lockfile, then the recorded 109-test safety net passed.

## Verification evidence

- `bun test test/contracts/parked-checkpoint-binding.test.mjs test/contracts/schema.test.mjs` — 63 pass, 0 fail, 210 assertions.
- `bun test test/main-store.test.mjs` — 51 pass, 0 fail, 326 assertions.
- `bun test test/contracts` — 97 pass, 0 fail, 479 assertions.
- `bun test` — 722 pass, 0 fail, 4,374 assertions (recorded 2026-08-15 on base `a4a39fa`; superseded below).
- `git diff --check` — pass.
- Scope/status check — only approved implementation paths plus this change's task/progress evidence changed; no forbidden path changed.

## Real runtime scenario

`test/main-store.test.mjs`, test **“runs the real producer-to-Main-to-parking path without caller provenance”**, creates a temporary Git repository and executes `captureCheckpoint → reconcileCheckpoint → createParkingComposition → Main parkDecision → readParkedCheckpointBinding`. It verifies unchanged producer artifacts and exact persisted binding readback. Adjacent parking tests prove atomic sealing, exact replay without byte/revision change, divergence rejection, pre-commit zero effect, corruption rejection, and absent shadow directories.

## Deviations and remaining work

- Deviation: candidate implementation counts (A 146, B 36) are below forecast because existing fixture builders, provenance validation, replay comparison, and atomic writer were reused; behavior and tests were not moved or omitted to reduce counts.
- No source-mutating formatter is configured; none was invented.
- Remaining implementation tasks: none.
- Deferred lifecycle action: parent-owned `sdd-verify` only.

## Targeted correction

- Fresh phase-contract gate finding: authoritative readback validated internal artifacts but not the persisted parking envelope's exact Main-owned closed shape; contract coverage also omitted an independently resealed non-`VALID` `reconciliation_state`.
- Safety net before correction: focused contracts **63 pass, 0 fail, 210 assertions**; focused Main store **51 pass, 0 fail, 326 assertions**.
- RED: `bun test test/main-store.test.mjs` — **51 pass, 1 fail, 327 assertions**; actor drift was accepted. The contract command remained GREEN at **63 pass, 0 fail, 211 assertions**, proving the existing canonical schema already rejected the newly explicit resealed non-`VALID` state and required no contract production change.
- GREEN / triangulation: `readParkedCheckpointBinding()` now requires the exact persisted envelope keys, `actor: "MAIN"`, the bound store project, initial immutable revision metadata, capture project equality, and requested identity equality. Tests triangulate actor drift, envelope project drift, and an unknown envelope field, each with typed `CT_PARKING_BINDING_INVALID` and byte-for-byte no mutation.
- Focused GREEN: `bun test test/contracts/parked-checkpoint-binding.test.mjs test/contracts/schema.test.mjs` — **63 pass, 0 fail, 211 assertions**. `bun test test/main-store.test.mjs` — **54 pass, 0 fail, 339 assertions**.
- Corrected candidate counts against HEAD, including untracked files: Candidate A **147** (146 additions, 1 deletion); Candidate B **103** (97 additions, 6 deletions). Both remain below 400.
- Correction files: `test/contracts/parked-checkpoint-binding.test.mjs`, `main-store/store.mjs`, and `test/main-store.test.mjs`, plus this evidence artifact. No producer, composition, writer, or other implementation path changed.
- `git diff --check` passed. Scope remained limited to the nine approved implementation paths plus separate proposal/spec/design/tasks/apply-progress artifacts; no staging, commit, push, or PR occurred.
- Rollback: revert the correction hunks in the three implementation/test files together; after any persisted binding exists, never delete, rewrite, backfill, migrate, or clean up its parking record.

## Rebase and delivery reconciliation (2026-08-18)

The candidate was rebased from base `a4a39fa` onto `master@a8d7dde` with zero
conflicts: the six intervening commits touch `hosts/**`, `install/**`,
`supervision/**` and `openspec/plans/**`, and share no path with this change's
`Área`.

Figures re-derived after the rebase, superseding the 2026-08-15 counts above:

| Measurement | 2026-08-15 | 2026-08-18 (authoritative) |
|---|---:|---:|
| Candidate A authored lines | 147 | 147 |
| Candidate B authored lines | 58 | 103 |
| `bun test` | 722 pass, 0 fail | 731 pass, 0 fail, 4,428 assertions |
| `bun test test/main-store.test.mjs` | 52 pass, 332 assertions | 54 pass, 339 assertions |

Independent baselines taken the same day: `master@a8d7dde` alone is 723 pass,
0 fail; Candidate A alone is 728 pass, 0 fail, confirming A is independently
verifiable and revertible before B exists. The `fatal: Needed a single revision`
stderr line is pre-existing on master and is not a failure.

Delivered as two sequential direct-push commits to `master`:
`3c3040d` (Candidate A) and `754c698` (Candidate B).
