# Apply Progress: Autonomous Continuation — Control Tower

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `feature-branch-chain`
- Current autonomous work unit: P0 only
- Branch: `feat/control-tower/autonomous-continuation`
- Completed: 2/26 tasks (`0.1`, `0.2`)
- Slice 1 and every later task remain out of scope and unchecked.

## Completed tasks

- [x] 0.1 Frozen exact baseline and Plan A repository snapshots in
  `evidence/p0-baseline-freeze.md` using commit/tree IDs and deterministic archive
  byte counts/SHA-256 digests.
- [x] 0.2 Added isolated restore proofs for both snapshots without production or
  actual Tower runtime mutation.

## Files

| File | Action | Purpose |
|---|---|---|
| `evidence/p0-baseline-freeze.md` | Added | Immutable baseline/version/repository evidence |
| `test/migration.test.mjs` | Added, corrected | P0 restore behavior for both frozen commits, complete tracked-entry semantics, and actual runtime-boundary immutability |
| `test/helpers/restore-fixture.mjs` | Added, corrected | Test-only isolated archive restoration, all-entry verification, and read-only runtime snapshots |
| `exploration.md` | Corrected | Assign CT-R5 polling to `test/polling.test.mjs` and CT-R8/P0 restore to migration tests |
| `tasks.md` | Updated | Mark only tasks 0.1 and 0.2 complete |
| `apply-progress.md` | Added | Cumulative apply and verification evidence |

No production behavior file changed.

## Strict TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 0.1 | N/A — evidence-only freeze | Structural | `git rev-parse`, tree/archive byte evidence captured | N/A — no executable behavior or production edit | Frozen commits, trees, archive bytes/hashes recorded | Skipped: immutable evidence has one output per Git object | Evidence reduced to reproducible commands and deterministic digests |
| 0.2 | `test/migration.test.mjs` | Integration | `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions | Missing `test/helpers/restore-fixture.mjs` → exit 1; 0 pass, 1 fail, 1 module error | `bun test test/migration.test.mjs` → exit 0; 2 pass, 0 fail, 10 assertions; fail-closed rerun → 8 pass, 0 fail | Two snapshots exercise distinct commit/tree/archive outputs: `f583df7` and `71ab571` | After path cleanup: migration 2 pass/0 fail/10 assertions, then fail-closed 8 pass/0 fail/70 assertions |
| 0.2 P0 review correction | `test/migration.test.mjs` | Integration | Before correction: migration exit 0, 2 pass/0 fail/10 assertions; fail-closed exit 0, 8 pass/0 fail/70 assertions | Added imports/assertions for complete tracked entries and the actual repository runtime boundary before helper support: exit 1; 0 pass, 1 fail, 1 module export error (`snapshotRuntimeBoundary` absent) | Minimum helper verification and runtime snapshot support: migration exit 0; 2 pass, 0 fail, 14 assertions | Both frozen commits verify the same explicit 12-path set while distinct object IDs/bytes are checked entry-by-entry; regular executable/non-executable and symlink semantics are handled from Git modes | Extracted the stable runtime entry-name set; ordered rerun: migration 2 pass/0 fail/14 assertions, fail-closed 8 pass/0 fail/70 assertions |
| 0.2 P0 full-4R mode correction | `test/migration.test.mjs` | Integration | Before correction: migration exit 0, 2 pass/0 fail/14 assertions; fail-closed exit 0, 8 pass/0 fail/70 assertions | Restrictive `umask(0077)` restore test against `71ab571`: exit 1; 2 pass, 1 fail, 15 assertions; expected `0644`, received `0600` | Exact post-extraction chmod plus exact regular-mode verification: migration exit 0; 3 pass, 0 fail, 26 assertions | Synthetic Git fixture proves `100644→0644`, `100755→0755`, and `120000` exact symlink target identity; explicit `0600` drift is rejected | Exported the focused verifier for direct drift proof and retained one mode map; final migration 5 pass/0 fail/32 assertions, fail-closed 8 pass/0 fail/70 assertions, `git diff --check` exit 0 |
| 0.2 final full-4R P0 correction | `test/migration.test.mjs` | Integration | Before correction: migration exit 0, 5 pass/0 fail/32 assertions; fail-closed exit 0, 8 pass/0 fail/70 assertions | Added required runtime path identity and special-bit drift tests first: exit 1; 3 pass, 3 fail, 21 assertions; missing `tower.db-journal`/`tower.log`, and `04644` was accepted | Runtime snapshot includes both omitted entries; regular verification compares complete file type plus `07777` permission semantics: migration exit 0; 6 pass, 0 fail, 38 assertions | Both `100644→04644` and `100755→04755` are created with system `chmod`, asserted present, and rejected; both frozen restores assert the seven-entry actual runtime boundary | No production refactor; final ordered verification recorded below |
| 0.2 comprehensive runtime-manifest correction | `test/migration.test.mjs` | Integration | Before correction: migration exit 0, 6 pass/0 fail/38 assertions; fail-closed exit 0, 8 pass/0 fail/70 assertions | Isolated unknown nested file with `04644` and ACTIVE-present fixtures against the fixed-name model: exit 1; 4 pass, 4 fail, 26 assertions; unknown tree omitted, ACTIVE accepted, and both actual restores still returned synthetic absent names | Recursive manifest records the root and every discovered entry with exact type, full type+`07777` mode, size, nanosecond mtime, regular SHA-256 or symlink target; ACTIVE fails closed: exit 0; 8 pass, 0 fail, 41 assertions | Distinct fixtures cover unknown nested discovery/special mode and ACTIVE precondition; both frozen restores invoke the same OFF assertion and complete before/after actual-tree comparison | Removed the fixed-name list and centralized exact entry-kind/recursive metadata capture; final ordered verification recorded below |
| 0.2 validated P0 correction | `test/migration.test.mjs` | Integration | Before correction: migration exit 0, 8 pass/0 fail/41 assertions; fail-closed exit 0, 8 pass/0 fail/70 assertions | Linked-worktree and deterministic descendant-disappearance tests first: exit 1; 8 pass, 2 fail, 42 assertions; linked worktree selected its `.git` file path and descendant ENOENT was misclassified as root absence | Runtime root now derives from normalized absolute `git rev-parse --git-common-dir` plus `control-tower`; only the initial root lstat can produce absent-root evidence, while later ENOENT throws unstable snapshot: exit 0; 10 pass, 0 fail, 44 assertions | Main repository and linked worktree select the same shared common-directory boundary; root absence and injected descendant disappearance exercise distinct outcomes | Kept recursive manifest and restore semantics unchanged; final migration/fail-closed/diff checks all pass |
| 0.2 final bounded stability correction | `test/migration.test.mjs` | Integration | Before correction: migration exit 0, 10 pass/0 fail/44 assertions; fail-closed exit 0, 8 pass/0 fail/70 assertions | Runtime-root addition injected after its first listing was silently omitted: exit 1; 10 pass, 1 fail, 49 assertions | Each directory compares sorted child names before and after traversal, then the helper reasserts `ACTIVE` absent before returning: exit 0; 11 pass, 0 fail, 49 assertions | A nested-directory addition exercises the same fail-closed contract below the root: final migration exit 0; 12 pass, 0 fail, 50 assertions | Kept descendant ENOENT and Git common-dir behavior intact; final migration/fail-closed/diff checks all pass |

## Exact command evidence

1. Safety net before test edits:
   - `bun test test/fail-closed.test.mjs`
   - Result: exit 0; 8 pass, 0 fail, 70 `expect()` calls, 1 file, 857 ms.
2. RED:
   - `bun test test/migration.test.mjs`
   - Result: exit 1; 0 pass, 1 fail, 1 error; missing
     `./helpers/restore-fixture.mjs`; 1 file, 23 ms.
3. GREEN:
   - `bun test test/migration.test.mjs`
   - Result: exit 0; 2 pass, 0 fail, 10 `expect()` calls, 1 file, 79 ms.
   - `bun test test/fail-closed.test.mjs`
   - Result: exit 0; 8 pass, 0 fail, 70 `expect()` calls, 1 file, 837 ms.
4. REFACTOR, ordered focused regression:
   - `bun test test/migration.test.mjs && bun test test/fail-closed.test.mjs`
   - Result: exit 0; migration 2 pass, 0 fail, 10 `expect()` calls, 67 ms;
      fail-closed 8 pass, 0 fail, 70 `expect()` calls, 925 ms.

## P0 review correction evidence

The correction addressed only the three concrete review findings and retained all
original P0 evidence above.

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 2 pass, 0 fail, 10
     `expect()` calls, 1 file, 109 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 999 ms.
2. Correction RED after adding the missing contract assertions but before helper support:
   - `bun test test/migration.test.mjs`
   - Result: exit 1; 0 pass, 1 fail, 1 module error; named export
     `snapshotRuntimeBoundary` absent; 1 file, 32 ms.
3. Correction GREEN:
   - `bun test test/migration.test.mjs`
   - Result: exit 0; 2 pass, 0 fail, 14 `expect()` calls, 1 file, 104 ms.
4. Correction REFACTOR and ordered regression:
   - `bun test test/migration.test.mjs && bun test test/fail-closed.test.mjs`
   - Result: exit 0; migration 2 pass, 0 fail, 14 `expect()` calls, 114 ms;
      fail-closed 8 pass, 0 fail, 70 `expect()` calls, 864 ms.

## Remaining P0 full-4R mode correction evidence

This correction preserves all earlier P0 history and changes only test/helper
restore semantics and cumulative evidence.

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 2 pass, 0 fail, 14
     `expect()` calls, 1 file, 123 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 917 ms.
2. RED under restrictive umask against the old extraction/predicate path:
   - `bun test test/migration.test.mjs`
   - Result: exit 1; 2 pass, 1 fail, 15 `expect()` calls; expected `0644`
     (`420`) and received `0600` (`384`), 1 file, 154 ms.
3. GREEN after minimum exact-mode restoration and verification:
   - `bun test test/migration.test.mjs`
   - Result: exit 0; 3 pass, 0 fail, 26 `expect()` calls, 1 file, 161 ms.
4. TRIANGULATE and REFACTOR:
   - Added an isolated synthetic Git repository containing `100644`, `100755`,
     and `120000`, plus direct rejection of post-restore `0600` drift.
   - `bun test test/migration.test.mjs` → exit 0; 5 pass, 0 fail, 32
     `expect()` calls, 1 file, 220 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 943 ms.
   - `git diff --check` → exit 0; no output.
5. Final required verification after evidence merge:
   - `bun test test/migration.test.mjs` → exit 0; 5 pass, 0 fail, 32
     `expect()` calls, 1 file, 255 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 1024 ms.
    - `git diff --check` → exit 0; no output.

## Final full-4R P0 correction evidence

This correction merges with every prior P0 cycle above and addresses only the
two remaining findings. It does not alter production behavior or later tasks.

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 5 pass, 0 fail, 32
     `expect()` calls, 1 file, 230 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 945 ms.
2. Genuine RED with both contracts expressed before helper changes:
   - `bun test test/migration.test.mjs`
   - Result: exit 1; 3 pass, 3 fail, 21 `expect()` calls, 1 file, 190 ms.
   - Both frozen restores omitted `.git/control-tower/tower.db-journal` and
     `.git/control-tower/tower.log`; the special-bit test showed Git `100644`
     incorrectly accepted filesystem `04644`.
3. GREEN and triangulation:
   - Added both runtime entries and compared exact regular-file type plus all
     `07777` permission bits. System `chmod` establishes and assertions confirm
     `04644` and `04755` before both are rejected by the verifier.
   - `bun test test/migration.test.mjs` → exit 0; 6 pass, 0 fail, 38
     `expect()` calls, 1 file, 263 ms.
4. Final required ordered verification after the cumulative evidence merge:
   - `bun test test/migration.test.mjs` → exit 0; 6 pass, 0 fail, 38
     `expect()` calls, 1 file, 254 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 902 ms.
   - `git diff --check` → exit 0; no output.

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `bun test test/migration.test.mjs` → exit 0; 12 pass, 0 fail, 50 assertions |
| Runtime harness command/scenario and exact result | Isolated fixture roots prove recursive manifests, linked-worktree Git common-dir selection, descendant ENOENT failure, and root/nested concurrent-addition failure. The actual repository assertion is explicitly only `[{path:".git/control-tower",exists:false}]`, with `ACTIVE` absent before and after each restore; it does not claim the actual runtime root existed or was traversed. Exit 0; no actual runtime path was created or mutated. |
| Rollback boundary | Remove `test/migration.test.mjs`, `test/helpers/restore-fixture.mjs`, `evidence/p0-baseline-freeze.md`, and `apply-progress.md`; revert only the two P0 task checkboxes. No production behavior or later slice is coupled to P0. |

## Actual Tower before/after

The focused test explicitly asserts before and after each restore that the actual
runtime snapshot equals exactly `[{ path: ".git/control-tower", exists: false }]`
and that `ACTIVE` is absent. This evidence compares only the absent runtime-root
entry; it does not claim the actual root existed or that an actual runtime tree
was traversed. Recursive completeness and concurrent stability are proven only
against isolated fixture roots. The Tower remained OFF and was never activated,
registered, opened, created, or mutated.

## Comprehensive P0 runtime-manifest correction evidence

This final correction merges every earlier P0 cycle and replaces the brittle
fixed-name runtime evidence without changing production or later tasks.

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 6 pass, 0 fail, 38
     `expect()` calls, 1 file, 293 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 919 ms.
2. Genuine RED before helper changes:
   - `bun test test/migration.test.mjs`
   - Result: exit 1; 4 pass, 4 fail, 26 `expect()` calls, 1 file, 191 ms.
   - The old model omitted an unknown nested `state.bin` carrying `04644`, did
     not reject an ACTIVE-present fixture, and returned six guessed absent names
     for each actual restore instead of the actual tree.
3. GREEN/REFACTOR and final required verification:
   - `bun test test/migration.test.mjs` → exit 0; 8 pass, 0 fail, 41
     `expect()` calls, 1 file, 264 ms.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70
     `expect()` calls, 1 file, 890 ms.
   - `git diff --check` → exit 0; no output.

## Restore identity guarantees after correction

- Both `f583df7` and `71ab571` must restore exactly the explicit 12 tracked paths;
  omission or an extra file fails.
- Every restored regular file or symlink is compared byte-for-byte with its Git
  blob. Git `100644`, `100755`, and `120000` map exactly to filesystem `0644`,
  filesystem `0755`, and a symlink with the exact target bytes respectively;
  wrong permission bits, wrong type, or mode drift fail. Complete regular-file
  type and `07777` permission semantics reject special-bit drift such as `04644`
  and `04755`. Neither frozen snapshot currently contains a symlink, so an
   isolated Git fixture proves that path.

## Review notes

- Refuted finding: `git ls-tree -rz` is correct; `-r` is recursive and `-z` is
  NUL-delimited. It remains unchanged, and the passing restore tests continue to
  prove recursive tracked entries.
- Validated fixes only: linked worktrees now resolve the shared Git common-dir
  runtime boundary, and descendant ENOENT after root existence fails closed as an
  unstable snapshot rather than being reported as absent root.

## Validated P0 correction command evidence

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 8 pass, 0 fail, 41 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
2. RED with both validated contracts expressed before helper changes:
   - `bun test test/migration.test.mjs` → exit 1; 8 pass, 2 fail, 42 assertions.
   - Linked worktree raised `ENOTDIR` from `<worktree>/.git/control-tower`; injected
     descendant disappearance returned a partial/absent-compatible snapshot.
3. GREEN/REFACTOR and final required verification:
   - `bun test test/migration.test.mjs` → exit 0; 10 pass, 0 fail, 44 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
    - `git diff --check` → exit 0; no output.

## Final bounded P0 stability correction evidence

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 10 pass, 0 fail, 44 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
2. RED with deterministic runtime-root addition after the first directory listing:
   - `bun test test/migration.test.mjs` → exit 1; 10 pass, 1 fail, 49 assertions.
   - The old traversal returned a partial manifest and silently omitted the new
     `concurrent-state` entry.
3. GREEN, triangulation, and final ordered verification:
   - Every directory compares sorted child-name lists before and after child
     traversal; any addition or removal throws `unstable Control Tower runtime snapshot`.
   - `ACTIVE` absence is reasserted after authoritative traversal and before return.
   - A second deterministic injection adds an entry under a nested directory.
   - `bun test test/migration.test.mjs` → exit 0; 12 pass, 0 fail, 50 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
   - `git diff --check` → exit 0; no output.

## Preservation and repository state

- Started on `master` at `71ab5714dc967942fb202576a75fa93b75f45c1b`.
- Safely created local tracker branch `feat/control-tower/autonomous-continuation`.
- Preserved untracked `.atl/`, `NEXT-SESSION-off-enforcement.md`, and `openspec/`.
- No commit, push, PR, remote configuration, Tower call, or runtime mutation.

## Deviations

None. P0 uses only tests, a test helper, and OpenSpec evidence as designed.

## Risks

- The whole OpenSpec change remains untracked from the original planning state;
  later delivery must deliberately include the intended planning/evidence files.
- P0 proves complete tracked path, byte/content identity, Git mode semantics, and
  actual runtime-boundary immutability. It does not authorize or implement Slice
  1 migration behavior.

## Next boundary

Stop after P0. The parent must run phase-contract validation before any Slice 1
authorization or implementation.
