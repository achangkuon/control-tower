# Apply Progress: S2.4 — Registry Storage and XDG Path Resolution

## Status

Strict TDD implementation complete. PR1 planning (#82, `2903445c201ef2eb83faff147dfd1ed7b5ef50b7`) and PR2 implementation/tests (#84, `6d08df069274a2ee9ba29ef624aa93010b998381`) are merged; all 14 S2.4 tasks are checked in `tasks.md`. PR3 contains only this apply-progress evidence, while PR4 verify-report remains excluded.

## Completed Tasks

- [x] T2.4.1.1–T2.4.1.4 — behavior-first isolated storage tests
- [x] T2.4.2.1–T2.4.2.3 — XDG/HOME path resolver
- [x] T2.4.3.1–T2.4.3.4 — secure atomic registry store and revision fencing
- [x] T2.4.4.1–T2.4.4.3 — narrow exports and final evidence

## TDD Cycle Evidence

| Task group | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T2.4.1.1–T2.4.1.4 | `test/registry/storage.test.mjs` | Integration | N/A (new files) | Import failed: `Cannot find module '../../registry/index.mjs'`; 0 pass, 1 fail, 1 error | 13 pass, 0 fail, 44 assertions | 13 cases cover path/default/error, absence/round-trip/unsafe, CAS/race/busy, injected failures/rollback/runtime isolation | Focused tests remained green after extraction of storage helpers |
| T2.4.2.1–T2.4.2.3 | `test/registry/storage.test.mjs` | Unit | N/A (new file) | Covered by missing-module RED before resolver existed | 2 path tests pass | Override, default, missing, empty, and relative roots | Narrow deterministic ESM function; no ambient cwd access |
| T2.4.3.1–T2.4.3.4 | `test/registry/storage.test.mjs` | Integration | N/A (new file) | Covered by missing-module RED before store existed | Storage suite: 13 pass, 0 fail | Valid/invalid, unchanged/changed/new revisions, stale candidates, contention, three pre-rename failures, rollback and durability-unknown | Shared safety, temp, lock, revision, and rollback helpers; tests green |
| T2.4.4.1–T2.4.4.3 | `test/registry/storage.test.mjs` | Integration | Existing contract/Main-store tests included in final command | Import surface unavailable in RED | Focused final command: 56 pass, 0 fail, 163 assertions | Narrow export set and runtime DB stat identity asserted | No further source mutation after final focused test |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Corrective rerun: `bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs` → exit 0; 56 pass, 0 fail, 163 `expect()` calls, 3 files, 444ms |
| Runtime harness command/scenario and exact result | `bun test test/registry/storage.test.mjs` → exit 0; 13 pass, 0 fail, 44 `expect()` calls, 1 file, 250ms. Uses temporary roots, real filesystem operations, injected fs failures, and verifies `.git/control-tower/tower.db` size/mtime identity. No daemon or DB runtime boundary exists. |
| Rollback boundary | PR3 rollback reverts or removes only this `apply-progress.md` evidence file. Operational rollback of the merged implementation/tests is a separate normal revert of PR2 commit `6d08df069274a2ee9ba29ef624aa93010b998381`; PR1 planning remains merged. |

## Broader Test Evidence

`bun test` completed with 383 pass and 2 fail across 20 files (2421 assertions, 50.73s). No other full-suite failures remain.

### Full-suite failure causality

The two exact failures were:

1. `P0 frozen snapshot restore > restores f583df7 into an isolated root with exact tracked bytes`
2. `P0 frozen snapshot restore > restores 71ab571 into an isolated root with exact tracked bytes`

Both tests expect `snapshotRuntimeBoundary(packageRoot)` to return
`[{ path: relative(packageRoot, actualRuntimeRoot), exists: false }]` and then
expect `existsSync(actualActivePath)` to be `false`. Actual execution stops before
those assertions at `test/migration.test.mjs:2250`: `snapshotRuntimeBoundary`
calls `assertRuntimeInactive`, whose existing-marker branch throws exactly
`Control Tower must be OFF: .git/control-tower/ACTIVE is present` from
`test/helpers/restore-fixture.mjs:90`.

A controlled read-only rerun used:

`bun test test/migration.test.mjs -t "P0 frozen snapshot restore"`

It produced 10 pass, 48 filtered out, and only the same 2 failures. Both stacks
terminate at `assertRuntimeInactive` → `snapshotRuntimeBoundary` →
`test/migration.test.mjs:2250`, before either snapshot restoration begins. The
resolved Git-common-directory marker was statted before and after without
mutation and remained identical: inode `2741`, size `0`, mode `664`, mtime
`1785414945`, ctime `1785414945`. This ties both failures exclusively to the
already-existing `ACTIVE` marker while proving the rerun did not modify it.

## Changed Paths and Line Counts

| Path | Action | Lines | Mode/behavior |
|---|---|---:|---|
| `registry/path.mjs` | Created | 14 | Source file; resolves only absolute XDG/HOME roots |
| `registry/store.mjs` | Created | 187 | Source file; persisted directories/files enforce exact `0700`/`0600`, including restrictive umasks |
| `registry/index.mjs` | Created | 2 | Narrow ESM exports |
| `test/registry/storage.test.mjs` | Created | 184 | Temp-root integration tests, child-process umask regression, and Git-common-directory DB identity proof |

Merged PR2 authored implementation and test content: 387 lines, below the 800-line hard stop. The initial verified candidate was 328 lines; this bounded remediation added only directly necessary source and regression coverage. SDD evidence/task artifacts are additional review metadata.

## Verification Remediation Batch

Independent `sdd-verify` evidence revision `sha256:5b5d53a1f921838a93090be5aa233ccb24dc34ac4ca04b46e132dc4efd9dfb6e` reported two CRITICAL findings. This batch changed only `registry/store.mjs` and `test/registry/storage.test.mjs` plus this evidence artifact.

### Remediation TDD Cycle Evidence

| Finding | RED | GREEN | REFACTOR |
|---|---|---|---|
| Exact modes under restrictive umask | Added maintained child-process test with `umask(0277)` covering recursively created destination parent, temp, lock, installed target, and immediate reload. `bun test test/registry/storage.test.mjs` → 13 pass, 1 fail; child exited 1 with `CT_REGISTRY_WRITE_FAILED`, caused by `EACCES` while recursively creating `nested/config/control-tower` under umask-filtered `0500` intermediates. | Segment-wise missing-directory creation now chmods and fully rechecks each new directory as owner-owned, non-symlink directory `0700`; new temp/lock descriptors are fchmodded and rechecked as owner-owned regular files `0600`. Storage suite → 14 pass, 0 fail, 47 assertions. Restrictive filter → 1 pass, 13 filtered, 0 fail, 2 assertions. | No optional refactor. Shared normalization and full safety predicates are the minimum needed for exact-mode enforcement. |
| Runtime DB assertion used linked-worktree `.git` file | Replaced the false worktree-relative absence check with a maintained assertion that resolves `git rev-parse --path-format=absolute --git-common-dir`, requires the actual `control-tower/tower.db` to exist, and compares inode/size/mtime/ctime before and after registry operations. This would fail the prior nonexistent-path proof and any observed DB mutation. | Storage suite passes with the actual Git-common-directory DB identity unchanged: 14 pass, 0 fail. The test remains read-only and does not inspect or mutate `ACTIVE`. | None; test correction only. |

### Remediation Commands

- `bun test test/registry/storage.test.mjs` → exit 0; 14 pass, 0 fail, 47 `expect()` calls, 476ms.
- `bun test test/registry/storage.test.mjs -t "restrictive umask"` → exit 0; 1 pass, 13 filtered out, 0 fail, 2 `expect()` calls, 526ms.
- `bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs` → exit 0; 57 pass, 0 fail, 166 `expect()` calls, 3 files, 766ms.

### Remediation Rollback Boundary

The historical remediation boundary covered only its hunks in `registry/store.mjs` and `test/registry/storage.test.mjs`. Those hunks are now merged in PR2, so operational rollback requires a separate normal revert of PR2 commit `6d08df069274a2ee9ba29ef624aa93010b998381`; PR3 rollback removes only this evidence file. No enrollment, import, resolution, Main, P8, runtime DB, or `ACTIVE` bytes changed.

## Deviations and Blockers

- Design deviations: none.
- Remaining implementation blockers: none.
- Verification note: the repository-wide suite cannot be fully green while the external Tower runtime marker `.git/control-tower/ACTIVE` exists; no runtime state was changed by this apply.
