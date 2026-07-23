# Apply Progress: Autonomous Continuation — Control Tower

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `feature-branch-chain`
- Current autonomous work unit: P2 complete; P3 is the next boundary
- Branch: `feat/control-tower/autonomous-continuation`
- Completed: 14/50 tasks (`0.1`, `0.2`, `1.1`, `1.2`, `1.3`, `1.4`, `1F.1`, `1F.2`, `1F.3`, `1F.4`, `2.1`, `2.2`, `2.3`, `2.4`)
- P2 is complete; every P3+ task remains unchecked.

## Completed tasks

- [x] 0.1 Frozen exact baseline and Plan A repository snapshots in
  `evidence/p0-baseline-freeze.md` using commit/tree IDs and deterministic archive
  byte counts/SHA-256 digests.
- [x] 0.2 Added isolated restore proofs for both snapshots without production or
  actual Tower runtime mutation.
- [x] 1.1 Added genuine RED coverage for the exact Slice 1 contract.
- [x] 1.2 Implemented canonical Main anchor provisioning and exact additive Migration 001.
- [x] 1.3 Triangulated unsafe entries, drift, rollback, busy handling, and concurrent bootstrap.
- [x] 1.4 Completed blind dual Judgment Day, one authorized severe correction, scoped dual re-judgment, and independent final verification.

## Files

| File | Action | Purpose |
|---|---|---|
| `evidence/p0-baseline-freeze.md` | Added | Immutable baseline/version/repository evidence |
| `core.mjs` | Updated | Canonical Main authority anchor, exact Migration 001, serialized idempotency/CAS |
| `bin/torre` | Updated | Explicit CLI-only provision/bootstrap commands |
| `install.sh` | Updated | Optional explicit administration delegation |
| `test/migration.test.mjs` | Added, corrected | P0 restore plus Slice 1 anchor/migration/concurrency contract |
| `test/helpers/restore-fixture.mjs` | Added, corrected | Test-only isolated archive restoration, all-entry verification, and read-only runtime snapshots |
| `exploration.md` | Corrected | Assign CT-R5 polling to `test/polling.test.mjs` and CT-R8/P0 restore to migration tests |
| `evidence/judgment-day-slice-1-round-1.md` | Added | Frozen dual-review ledger, correction, re-judgment, and terminal verdict |
| `tasks.md` | Updated | Mark P0 and Slice 1 tasks complete; preserve P2+ unchecked |
| `apply-progress.md` | Added | Cumulative apply, TDD, Judgment Day, and verification evidence |

Production changes are limited to Slice 1 administration and remain OFF by default.

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

---

## P1 Slice 1 continuation reconciliation

This section cumulatively merges the interrupted P1 writer with all P0 history above.
The pre-existing P1 checkmarks were treated as untrusted until source, focused tests,
rollback behavior, and OFF boundaries were re-established. Scope remained Unit 1 only;
parent-owned `1.4` and P2+ were not started.

### Structured status consumed

- Change: `autonomous-continuation-control-tower`
- Authoritative apply state: `ready`; artifact store: `both`
- Action context: `repo-local`, workspace and allowed edit root both
  `/home/emili/projects/control-tower`; warnings: none
- Delivery: `auto-chain`, `feature-branch-chain`, Unit 1 only
- Strict TDD: active; Bun `1.3.14` (`d1632b29`)

### P1 completed tasks and persisted checkboxes

- [x] 1.1 Reconciled CT-R8-S1/S3/S4 RED coverage for canonical Main derivation,
  exact anchor and Migration 001 bytes/checksum/manifest, CLI-only administration,
  replay/CAS/errors, inert named paths, and relative/Main/linked-worktree equivalence.
- [x] 1.2 Reconciled GREEN implementation in `core.mjs`, `bin/torre`, and
  `install.sh`: exact owner-only anchor, OFF-only additive bootstrap, idempotency,
  legacy continuity, and no MCP exposure.
- [x] 1.3 Completed genuine triangulation/refactor for restrictive-umask modes,
  unsafe entry predicates, canonical anchor validation, legacy and OFF-state drift,
  DDL rollback, and bounded SQLite busy behavior.
- [ ] 1.4 remains parent-owned and deferred byte-for-byte. No review actor or receipt
  was created.

### P1 files

| File | Action | Purpose |
|---|---|---|
| `core.mjs` | Modified | Canonical Main context, safe anchor IO, exact Migration 001, schema/state validation, replay/CAS/error handling |
| `bin/torre` | Modified | Explicit CLI-only `main-config`, `provision-main`, and `bootstrap-admin` entry points |
| `install.sh` | Modified | Explicit administration delegation without ordinary-install provisioning |
| `test/migration.test.mjs` | Modified | P1 RED/GREEN/triangulation plus preserved P0 restore proofs |
| `openspec/changes/autonomous-continuation-control-tower/tasks.md` | Updated | Retained `[x]` for proven `1.1`/`1.2` and marked proven `1.3` `[x]` |
| `openspec/changes/autonomous-continuation-control-tower/apply-progress.md` | Merged | Preserved P0 history and added this P1 evidence |

### P1 TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `test/migration.test.mjs` | Integration | Continuation baseline: 18/18 migration and 8/8 fail-closed | Interrupted RED tests were inspected rather than trusted; new legacy-schema and OFF-state drift assertions both failed against the partial implementation | Focused drift rerun: 2 pass, 0 fail, 12 assertions | Canonical Main, linked worktree, inert named files, missing/mismatched anchor, replay, and conflict paths all execute production code | Shared canonical JSON/test fixture logic retained; final focused suite green |
| 1.2 | `test/migration.test.mjs` | Integration | Same 26-test safety net | Restrictive umask returned `CT_ANCHOR_MISMATCH`; padded anchor and OFF-state replay drift were accepted before fixes | Exact `0700`/`0600`, canonical no-padding/RFC3339, legacy SQL, and continuation-state checks pass | Happy path plus unsafe/malformed/drift paths prove nontrivial distinct outcomes | Extracted schema normalization, 32-byte base64url, and continuation-state validation helpers; tests remained green |
| 1.3 | `test/migration.test.mjs` | Integration | 18 migration + 8 fail-closed passed before continuation edits | First RED: migration 18 pass/2 fail/86 assertions; later drift RED 0 pass/2 fail/10 assertions; canonical RED 0 pass/1 fail/1 assertion | Restrictive mode 2 pass/0 fail/16 assertions; drift 2 pass/0 fail/12 assertions; canonical 1 pass/0 fail/2 assertions | Added unsafe runtime type/symlink/mode, real read-only DDL failure rollback, and busy lower/upper bound with successful retry | Final migration 23/23 and fail-closed 8/8; schema/state predicates centralized |

### P1 Test Summary

- P1 integration tests present: 11; continuation tests added: 5.
- Final focused passing total: 31 tests, 0 failures, 174 assertions.
- Layers: Integration only; E2E unavailable by project configuration.
- Approval safety: existing migration and fail-closed suites passed before modifying the
  interrupted partial state.
- Pure helpers added/refined during continuation: 3 (`isBase64url32`,
  `normalizeSchemaSql`, `validateContinuationState`).

### P1 exact command evidence

1. Safety net before continuation edits:
   - `bun test test/migration.test.mjs` → exit 0; 18 pass, 0 fail,
     84 `expect()` calls.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail,
     70 `expect()` calls.
2. RED and correction gates:
   - `bun test test/migration.test.mjs` → exit 1; 18 pass, 2 fail,
     86 `expect()` calls. Restrictive umask exposed unsafe persisted modes; the first
     attempted page-limit DDL fixture was also rejected as non-probative and replaced.
   - Drift-focused rerun → exit 1; 0 pass, 2 fail, 10 `expect()` calls: OFF-state
     replay and altered legacy SQL were accepted.
   - Canonical-anchor rerun → exit 1; 0 pass, 1 fail, 1 `expect()` call: padded
     base64url was accepted.
3. GREEN/refactor gates:
   - Restrictive-umask focus → exit 0; 2 pass, 0 fail, 16 assertions.
   - Drift focus → exit 0; 2 pass, 0 fail, 12 assertions.
   - Canonical-anchor focus → exit 0; 1 pass, 0 fail, 2 assertions.
4. Final ordered focused verification:
   - `bun test test/migration.test.mjs` → exit 0; 23 pass, 0 fail,
     104 `expect()` calls.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail,
     70 `expect()` calls.
   - `git diff --check` → exit 0; no output.

### P1 Work Unit Evidence

| Evidence | Result |
|---|---|
| PR/work-unit boundary | Feature-branch chain Unit 1 only: anchor + Migration 001; no commit or PR created |
| Authored implementation/test changed lines | 538 (`534` additions + `4` deletions) across `core.mjs`, `bin/torre`, `install.sh`, `test/migration.test.mjs`; below the configured 800-line review ceiling |
| Runtime harness | N/A — Slice 1 has no live host/runtime boundary; all mutating anchor/SQLite scenarios use isolated temporary Git roots |
| Rollback proof | Read-only DB DDL failure returns `CT_SCHEMA_INVALID`, leaves zero `ct_*` objects, and preserves the exact legacy row; busy timeout returns `CT_BUSY`, then the same request succeeds after lock release |
| Rollback boundary | Revert only P1 hunks in `core.mjs`, `bin/torre`, `install.sh`, and the P1 describe block/imports in `test/migration.test.mjs`; revert task/progress P1 evidence. Preserve all P0 history and do not down-migrate any real DB |

### P1 OFF and preservation evidence

- Actual canonical `ACTIVE`: absent.
- Legacy `/home/emili/.config/opencode/control-tower/ACTIVE`: absent.
- Actual canonical `.git/control-tower/tower.db`: absent.
- `NEXT-SESSION-off-enforcement.md` preserved with SHA-256
  `73bbb0e58573eef187dbf22b026cb1594df614e7749c516908bdadc9b553f7e0`.
- No CLI command targeted the actual or legacy Tower runtime; no activation, commit,
  push, PR, review/Judgment Day, release, or legacy-path edit was performed.

### P1 deviations and risks

- Node/Bun lacks a no-replace `renameat2` binding; anchor publication uses atomic
  same-directory hard-link creation followed by temporary unlink, producing the
  required no-replace collision behavior and final `nlink=1` before directory fsync.
- The Unit 1 implementation/test diff is 538 authored changed lines: above the
  forecast's 400-line target but below the maintainer-selected 800-line ceiling.
- Parent lifecycle must handle deferred `1.4`; sdd-apply did not start review work.

### P1 remaining exact task lines

- [ ] 1.4 Freeze Slice 1 target and run explicit two-judge Judgment Day; persist verdict. Correct only mutually confirmed severe IDs after required maintainer authorization. <!-- sdd-owner: parent -->
- Every P2+ line remains unchecked in `tasks.md` and outside this work unit.

## P1 next boundary

Return to the parent lifecycle for deferred task `1.4`. Do not run P2 apply from this
work unit.

---

## Judgment Day Slice 1 correction — CT-JD-S1-001

Bounded correction scope: only the confirmed severe concurrency finding
`CT-JD-S1-001`. The frozen ledger and all task checkboxes remain unchanged.

### Correction behavior

- Two identical bootstrap processes are deterministically gated after entering
  `bootstrapAdmin` but before `BEGIN IMMEDIATE`; they then produce exactly one commit
  and one replay.
- A changed tuple reaches the same writer boundary concurrently, runs second, returns
  `CT_IDEMPOTENCY_CONFLICT`, and leaves exactly one migration, idempotency tuple, and
  OFF continuation-state row while preserving the legacy row.
- `bootstrapAdmin` now performs schema manifest/version, idempotency/replay, and CAS
  decisions inside its existing immediate writer transaction. The 250 ms busy timeout,
  `CT_BUSY` mapping, and exact Migration 001 bytes/checksum are unchanged.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| CT-JD-S1-001 | `test/migration.test.mjs` | Integration | migration 23/23, 104 assertions; fail-closed 8/8, 70 assertions | Identical concurrent test: 0 pass, 1 fail, 5 assertions; received `CT_SCHEMA_INVALID` instead of two successful results | Identical focus: 1 pass, 0 fail, 8 assertions | Changed concurrent tuple: combined focus 2 pass, 0 fail, 17 assertions; conflict and no partial state proven | Minimal transaction-boundary move only; final focused suites remain green |

### Correction command evidence

1. Safety net before correction edits:
   - `bun test test/migration.test.mjs` → exit 0; 23 pass, 0 fail, 104 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
2. RED before production changes:
   - `bun test test/migration.test.mjs -t "simultaneous identical bootstraps commit once and replay once"`
   - Exit 1; 0 pass, 1 fail, 5 assertions. Results contained one
     `CT_SCHEMA_INVALID` and one successful commit.
3. GREEN:
   - The same focused command → exit 0; 1 pass, 0 fail, 8 assertions.
4. TRIANGULATE:
   - `bun test test/migration.test.mjs -t "(simultaneous identical|changed concurrent)"`
   - Exit 0; 2 pass, 0 fail, 17 assertions.
5. Final focused verification:
   - `bun test test/migration.test.mjs` → exit 0; 25 pass, 0 fail, 121 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
   - `bash -n bin/torre install.sh` → exit 0; no output.
   - `git diff --check` → exit 0; no output.

### Correction work-unit evidence

| Evidence | Result |
|---|---|
| Correction changed lines | 119 implementation/test (`110` additions + `9` deletions): `core.mjs` 9/9, `test/migration.test.mjs` 101/0; plus 53 evidence lines, for 172 total (`163` additions + `9` deletions) |
| Runtime | N/A — all mutating anchor/SQLite concurrency uses isolated temporary Git roots; actual canonical runtime and legacy ACTIVE remained absent |
| Rollback boundary | Revert only the CT-JD-S1-001 transaction-boundary hunk in `core.mjs`, the two concurrency tests/helper in `test/migration.test.mjs`, and this appended correction section; preserve all P0/P1 history, frozen Judgment Day ledger, task checkboxes, exact Migration 001, and real databases |
| Skill resolution | `paths-injected` — `/home/emili/.agents/skills/judgment-day/SKILL.md` |

## Slice 1 Judgment Day terminal evidence

- Frozen original target: `635180992cfabfaa842926546afb88cd5ed291481532c5d66a99744080328b77`.
- Both blind judges confirmed only `CT-JD-S1-001` as severe.
- The maintainer authorized correction of that ID only; suspect and informational rows were not fixed.
- Scoped re-judgment target: `23e5888b77deb4dd9f507deb42122d906f3720bb25c643c10a9641f9fd5114e9`.
- Judge A: clean (`findings: []`). Judge B: clean (`findings: []`).
- Independent final verification: migration 25/25 with 121 assertions; fail-closed 8/8 with 70 assertions; shell syntax, whitespace, and runtime guards passed.
- Ledger: `evidence/judgment-day-slice-1-round-1.md`.

**JUDGMENT: APPROVED ✅**

---

## P2 Slice 2 apply attempt — blocked before RED

### Structured status consumed

- Change: `autonomous-continuation-control-tower`
- Authoritative apply state: `ready`; completed baseline: 6/46; blockers: none
- Artifact store: OpenSpec + Engram; this actor has no memory tools, so only this
  cumulative OpenSpec artifact was updated and the parent must mirror Engram
- Action context: `repo-local`; workspace and sole allowed edit root are
  `/home/emili/projects/control-tower`; warnings: none
- Delivery: `auto-chain`, `feature-branch-chain`, Unit 2 only, 800-line ceiling
- Strict TDD: active with `bun test`

### Result

Status: `blocked`. No RED test or production edit was made because the approved
spec/design does not define an exact implementable Slice 2 ingress and migration
contract, and the apply instruction explicitly forbids inventing one.

Exact contract gaps:

1. `Ctx` is declared ingress-created/server-derived, but no MCP transport,
   environment, process, or adapter mapping defines how `host_process_instance`,
   `plugin_instance`, `root_session_id`, `mcp_process_instance`,
   `pid_start_marker`, and `binding_epoch` are obtained or authenticated.
   Existing `mcp.mjs` has only process cwd plus tool arguments. Accepting these
   as request fields would violate the caller-claims prohibition.
2. Migration 001 is byte-exact and its version-1 manifest permits exactly three
   `ct_*` tables. Slice 2 requires durable claimant bindings, immutable
   MULTIPLEXED conflict history, `rollback_epoch`, and lease foundation, but no
   Migration 002 DDL/checksum/version/CAS/bootstrap transition is specified.
   Creating these lazily in `register` would also violate OFF non-mutation.
3. The preserved legacy API already uses `register(handle, role)` and consuming
   `receive(handle)`, while continuation requires `register(request)` and
   argument-free non-consuming `receive()`. No exact core/MCP namespace or
   dispatch contract distinguishes the two without changing the legacy API.

Required decision before retry: amend the design/spec with (a) the trusted Ctx
construction boundary and exact MCP ingress mapping, (b) exact additive schema
migration/bootstrap rules for Slice 2, and (c) the legacy/continuation API
namespace or dispatch contract. Then rerun P2 from RED.

### Safety-net and verification evidence

- `bun test test/migration.test.mjs && bun test test/fail-closed.test.mjs` → exit
  0; migration 25 pass, 0 fail, 121 assertions; fail-closed 8 pass, 0 fail,
  70 assertions.
- `git diff --check && bun --check core.mjs && bun --check mcp.mjs && bash -n
  bin/torre install.sh` → exit 0; no output.
- Actual canonical `ACTIVE`: absent; actual canonical `tower.db`: absent; legacy
  `ACTIVE`: absent.
- Runtime harness: N/A — blocked before implementation; no runtime command,
  Tower call, activation, SQLite mutation, review, delivery, or publication ran.

### Persisted task state and boundary

- Tasks `2.1`, `2.2`, and `2.3` remain unchecked because no executable RED/GREEN/
  triangulation evidence exists.
- Parent-owned `2.4` is deferred unchanged. P3+ remains untouched.
- Files changed by this blocked attempt: this appended `apply-progress.md`
  section only.
- Rollback boundary: remove only this `P2 Slice 2 apply attempt` section; preserve
  all P0/P1/Judgment Day evidence and every task checkbox.
- Skill resolution: `fallback-path` — parent-injected project/user skill paths
  were absent; loaded `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.

---

## P2 bounded design correction — no apply work

The blocked P2 attempt above remains the historical apply result. A design-only correction now resolves its three ambiguity classes and identifies one mandatory prerequisite:

- Trusted `Ctx` enters through a constructor-time host-adapter capability closed over by an internal continuation dispatcher; all repository/process fields are server-derived or observed, and no continuation MCP route is advertised before P7–P9 supplies that capability.
- Legacy `register(handle, role)` and consuming `receive(handle)` remain separate from internal `continuationRegister` and argument-free non-consuming `continuationReceive`; no arity/type overload is allowed.
- There is no additive in-place upgrade from the approved old Migration 001 constraints. New tasks `1F.1..1F.4` correct fresh-install Migration 001, reject the superseded checksum without table replacement, rerun Slice 1, and re-judge before exact additive Migration 002 may begin.
- Migration 002 tables, constraints, indexes, immutable conflict triggers, lease seed, digests, transaction order, errors, test ownership, workload, and rollback are now specified in `design.md`.

No RED, code, test, runtime, Tower, review, delivery, or cutover action was performed by this correction. The next apply boundary is P1-FC, not P2. The parent must mirror this design correction to Engram because memory tools are unavailable here.

---

## P1-FC fresh-install forward-compatibility correction

This section preserves the prior blocked P2 attempt and every P0/P1/Judgment Day
entry above. Only implementation-owned tasks `1F.1`–`1F.3` were executed;
parent-owned `1F.4` and P2+ were not started.

### Structured status produced and consumed

```yaml
schemaName: spec-driven
changeName: autonomous-continuation-control-tower
artifactStore: openspec
planningHome: /home/emili/projects/control-tower/openspec
changeRoot: openspec/changes/autonomous-continuation-control-tower
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
  applyProgress: done
  verifyReport: missing
  syncReport: missing
taskProgress:
  total: 35
  complete: 8
  remaining: 27
deferredParentActions:
  total: 15
  complete: 1
  remaining: 14
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: blocked
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: /home/emili/projects/control-tower
  allowedEditRoots:
    - /home/emili/projects/control-tower
  warnings: []
nextRecommended: parent-lifecycle
isNonAuthoritative: false
```

The native checkbox state remains `ready` because later implementation tasks exist,
but P2 is dependency-blocked until the parent completes `1F.4`. The resolved delivery
path was `auto-chain` / `feature-branch-chain`; this apply remained inside Unit 1-FC.

### Completed tasks and persisted checkboxes

- [x] 1F.1 Pinned the independently stated 854-byte corrected Migration 001 and
  `sha256:961501e0f605e0052afd8b9ad091112667fa1c1ee3496f0f4320f63541d6e8fc`,
  proved the exact v1 SQLite manifest, and identified the superseded dc31ef5
  checksum with internal reason `SUPERSEDED_MIGRATION_001` while preserving exact
  database bytes, root pages, schema rows, data rows, and runtime entry names.
- [x] 1F.2 Changed only the two Migration 001 predicates to `>= 1`, exported the
  superseded checksum, and selected exact object/checksum contracts through a
  version-keyed schema manifest. Slice 1 anchor, responses, CLI, idempotency,
  concurrency, busy, legacy, and OFF paths remain unchanged.
- [x] 1F.3 Triangulated a corrected-schema replay containing an unexpected
  `ct_unexpected` table; refusal was `CT_SCHEMA_INVALID` and byte-for-byte
  non-mutating. The original 25-test migration suite plus both P1-FC tests and
  fail-closed suite passed.
- [ ] 1F.4 remains parent-owned and unchanged; no review actor or receipt was created.

### Files and exact changed lines

| File | Additions | Deletions | Purpose |
|---|---:|---:|---|
| `core.mjs` | 21 | 6 | Two corrected predicates, superseded checksum detection, version-specific manifest selection |
| `test/migration.test.mjs` | 102 | 5 | Independent bytes/checksum/manifest RED, superseded refusal, unexpected-object triangulation |

Implementation/test authored total: **134 changed lines** (`123` additions + `11`
deletions), below the Unit 1-FC 400-line target. OpenSpec task/progress changes are
cumulative evidence, not implementation scope. No legacy source/config, `.pi`, MCP,
CLI, installer, plugin, adapter, runtime, or delivery file was edited by P1-FC.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1F.1 | `test/migration.test.mjs` | Integration | 25/25 migration, 121 assertions; 8/8 fail-closed, 70 assertions | 0 pass, 2 fail, 4 assertions: old bytes and missing superseded export | First execution exposed one test-side final-semicolon representation error (1 pass/1 fail, 12 assertions); corrected fixture then 2 pass/0 fail, 16 assertions | Exact corrected install and exact old-checksum fixture take distinct commit/refusal paths | Test expectation now matches SQLite's semicolon-free `sqlite_master.sql`; focused tests green |
| 1F.2 | `test/migration.test.mjs` | Integration | Same 33-test safety net | Covered by the two failing 1F.1 contracts before production edits | 2 pass, 0 fail, 16 assertions after the minimum production correction | Version-keyed manifest rejects any contract not registered for the observed latest migration version | Replaced the fixed three-object validator with one version-specific manifest registry; tests green |
| 1F.3 | `test/migration.test.mjs` | Integration | Focused GREEN 2/2, 16 assertions | P1-FC RED already proved old schema acceptance lacked required detection | 2/2 focused GREEN | Added unexpected v1 `ct_*` object: combined focus 3 pass/0 fail, 19 assertions; byte digest unchanged after refusal | Final migration 27/27 and fail-closed 8/8; no further production refactor needed |

### Test Summary

- Tests written: 2 new integration tests; 1 existing integration test strengthened.
- Final passing: 35 tests, 0 failures, 201 assertions across the required focused suites.
- Layers used: Integration (3 P1-FC behavior tests); Unit 0; E2E 0.
- Approval safety: all 25 existing migration tests and all 8 fail-closed tests passed
  before production changes.
- Pure functions created: 0; the schema registry is immutable module data.

### Exact command evidence

1. Safety net:
   - `bun test test/migration.test.mjs` → exit 0; 25 pass, 0 fail, 121 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
2. RED:
   - `bun test test/migration.test.mjs -t "(CT-R8-S1 migrates exact bytes|superseded Migration 001)"`
   - Exit 1; 0 pass, 2 fail, 4 assertions. Migration bytes still carried `= 1`;
     `SUPERSEDED_MIGRATION_001_CHECKSUM` was absent.
3. GREEN:
   - First focused execution: exit 1; 1 pass, 1 fail, 12 assertions because the
     independent expected manifest retained SQLite's stripped final semicolon.
   - Corrected fixture execution: exit 0; 2 pass, 0 fail, 16 assertions.
4. TRIANGULATE:
   - Combined corrected/old/unexpected-object focus → exit 0; 3 pass, 0 fail,
     19 assertions.
5. Final focused verification:
   - `bun test test/migration.test.mjs` → exit 0; 27 pass, 0 fail, 131 assertions.
   - `bun test test/fail-closed.test.mjs` → exit 0; 8 pass, 0 fail, 70 assertions.
   - `bash -n bin/torre install.sh && bun --check core.mjs` → exit 0; `syntax-ok`.
   - `git diff --check` → exit 0; no output.

### OFF/runtime and rollback evidence

- Guard command proved absent: actual `.git/control-tower/ACTIVE`, actual
  `.git/control-tower/tower.db`, legacy `~/.config/opencode/control-tower/ACTIVE`,
  and legacy `~/.config/opencode/control-tower/tower.db`.
- `NEXT-SESSION-off-enforcement.md` remained unchanged at SHA-256
  `73bbb0e58573eef187dbf22b026cb1594df614e7749c516908bdadc9b553f7e0`.
- Runtime harness: N/A — all mutating checks used isolated temporary Main/worktree
  fixtures. No Tower, activation, runtime, review, delivery, commit, push, PR,
  publication, or cutover action ran.
- Rollback reverts only the P1-FC hunks in `core.mjs` and
  `test/migration.test.mjs`, the three P1-FC task checkmarks, and this appended
  section. It performs no down-migration or old-database rebuild and leaves P2
  blocked. Existing fixture databases may be discarded; real databases are untouched.
- Deviations from design: none. A test-only expected-manifest semicolon was corrected
  during GREEN to match SQLite's documented stored SQL representation.

### Remaining exact unchecked task lines

- [ ] 1F.4 Freeze only the P1-FC target and run bounded two-judge re-judgment. Preserve the original Slice 1 ledger and authorization history. <!-- sdd-owner: parent -->
- [ ] 2.1 RED `test/migration.test.mjs` + `test/identity.test.mjs`: exact Migration 002 bytes/manifest/rollback and `CT-R4-S1..S6,CT-R8-S2,CT-R9-S1,CT-R11-S1`; use only isolated constructor-capability fixtures.
- [ ] 2.2 GREEN `core.mjs`, `mcp.mjs`: additive claimant/conflict/lease schema; `continuationRegister` and argument-free non-consuming `continuationReceive`; immutable server-created Ctx; continuation routing kept unadvertised without a host-adapter capability. Preserve legacy `register(handle, role)`, consuming `receive(handle)`, all eight tools, and legacy source behavior.
- [ ] 2.3 TRIANGULATE/REFACTOR: initial/same-root/multiplexed/stale identity, immutable conflict update/delete rejection, exact replay, OFF/ROLLING_BACK/lease gates, old-schema refusal, migration rollback/busy, and zero legacy-message consumption; rerun migration + identity + fail-closed; record evidence.
- [ ] 2.4 Run and persist Slice 2 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 3.1 RED `test/identity.test.mjs`: `CT-R3-S1..S5,CT-R8-S5,CT-R10-S1..S6,CT-R11-S3..S5`.
- [ ] 3.2 GREEN `core.mjs`, `mcp.mjs`: Main binding, bootstrapMain, activation, exact responses/idempotency/errors/rollback.
- [ ] 3.3 TRIANGULATE/REFACTOR: stale lease/epoch/config and activation-without-delivery; rerun identity + fail-closed; record evidence.
- [ ] 3.4 Run and persist Slice 3 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 4.1 RED `test/lifecycle.test.mjs`: `CT-R2-S1..S3,CT-R6-S1..S6`.
- [ ] 4.2 GREEN `core.mjs`, `mcp.mjs`: immutable payload, peek, atomic claim, budget, provenance, token races.
- [ ] 4.3 TRIANGULATE/REFACTOR: concurrent claims and exhausted budgets; rerun lifecycle + fail-closed; record evidence.
- [ ] 4.4 Run and persist Slice 4 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 5.1 RED `test/lifecycle.test.mjs`: `CT-R1-S1..S6,CT-R12-S1..S4`.
- [ ] 5.2 GREEN `core.mjs`, `mcp.mjs`: ack, evidence/effects, completion attestation, compensation, revision; no `start` API.
- [ ] 5.3 TRIANGULATE/REFACTOR: missing/consumed attestation and unprovable effects; rerun lifecycle + fail-closed; record evidence.
- [ ] 5.4 Run and persist Slice 5 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 6.1 RED `test/recovery.test.mjs`: `CT-R7-S1..S12,CT-R11-S2`.
- [ ] 6.2 GREEN `core.mjs`, `mcp.mjs`: proof-bound suspension/recovery, lease/rollback epoch, ON-only redelivery.
- [ ] 6.3 TRIANGULATE/REFACTOR: stale proof/epoch, forbidden dispositions, zero-live finish; rerun recovery + fail-closed; record evidence.
- [ ] 6.4 Run and persist Slice 6 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 7.1 RED `test/host-adapters.test.mjs` and `test/polling.test.mjs`: `CT-R5-S1..S5@OpenCode`, wake failure, throttling, dispose-before-peek/receive.
- [ ] 7.2 GREEN `host/loop.mjs` + `plugin/tower-spike.js`: injected ports, root-only controller, OpenCode lifecycle mapping; no SQLite logic in adapter.
- [ ] 7.3 TRIANGULATE/REFACTOR: child/root ordering and pending-delivery preservation; rerun adapter/polling/fail-closed; record evidence.
- [ ] 7.4 Run and persist Slice 7 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 8.1 RED `test/host-adapters.test.mjs`: `CT-R5-S1..S5@Pi`, `agent_settled`, `ctx.isIdle()`, `session_shutdown`, and follow-up wake semantics.
- [ ] 8.2 GREEN `adapters/pi/`: global Pi extension delegates only to `host/loop.mjs` and uses idle-safe message injection.
- [ ] 8.3 TRIANGULATE/REFACTOR: reload/resume/shutdown and child isolation; rerun Pi adapter + fail-closed; record evidence.
- [ ] 8.4 Run and persist Slice 8 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 9.1 RED `test/host-adapters.test.mjs`: `CT-R5-S1..S5@Claude`, `Stop`, `SessionEnd`, `stop_hook_active`, bounded `asyncRewake`, and subagent/teammate isolation.
- [ ] 9.2 GREEN `adapters/claude/`: plugin hooks/scripts delegate only to `host/loop.mjs`; wake only after non-consuming pending peek.
- [ ] 9.3 TRIANGULATE/REFACTOR: repeated Stop, hook timeout/failure, terminal cleanup; rerun Claude adapter + fail-closed; record evidence.
- [ ] 9.4 Run and persist Slice 9 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 10.1 RED `test/runtime-publish.test.mjs`: allowlisted manifest, immutable existing release, failed probe, atomic `current`, backup/restore, and legacy-path preservation.
- [ ] 10.2 GREEN `scripts/publish-runtime.mjs`, `install.sh`: stage/verify/fsync/rename `releases/<git-sha>`, then atomically switch `current`; host configs resolve only through `current`.
- [ ] 10.3 TRIANGULATE/REFACTOR: interrupted publication and one-host probe failure restore prior state; verify `~/.config/opencode/control-tower` untouched and Tower OFF.
- [ ] 10.4 Run and persist Slice 10 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->
- [ ] 11.1 Run `bun test`; audit all 64 stable CT IDs bidirectionally and the three-host CT-R5 conformance matrix. <!-- sdd-owner: parent -->
- [ ] 11.2 Verify Tower OFF, unchanged ACTIVE/DB/mtime, legacy continuity, host-neutral import boundaries, and no `start`, token, or anchor-secret exposure. <!-- sdd-owner: parent -->
- [ ] 11.3 Verify candidate release and rollback evidence; update host configs only after all probes pass; preserve legacy source until cutover is proven. <!-- sdd-owner: parent -->
- [ ] 11.4 Servi-Task-U gate: CT passes plus API/error/fence/evidence and OFF/quiescent/rollback evidence. <!-- sdd-owner: parent -->

### P1-FC next boundary

Return to parent lifecycle for bounded task `1F.4`. P2 remains blocked until that
re-judgment is complete. Skill resolution: `fallback-path` — no parent-injected
project/user skill paths were present; loaded
`/home/emili/.agents/skills/work-unit-commits/SKILL.md`.

## P1-FC Judgment Day terminal evidence

- Frozen target: `3208975f5eecb3bb3974e8ce78a31b448624f4591712193f9072943282341990`.
- Judge A: clean (`findings: []`). Judge B: clean (`findings: []`).
- Verification: migration 27/27 with 131 assertions; fail-closed 8/8 with 70 assertions; syntax, whitespace, and runtime guards passed.
- Ledger: `evidence/judgment-day-p1-forward-compatibility.md`.

**JUDGMENT: APPROVED ✅**

---

## P2 Slice 2 identity/mode implementation
- **Scope/status:** Tasks `2.1`–`2.3` completed under resumed Strict TDD; `2.4` completed by parent Judgment Day, P3+ remains out of scope, and all pre-P2 history above is preserved.
### TDD and implementation evidence
| Gate | Concise evidence |
|---|---|
| Inherited state | Existing migration/identity tests were already GREEN (30/0/150 and 7/0/53); historical RED from the interrupted process is unavailable and was **not claimed**. |
| Observed RED → GREEN | Unknown continuation route was rejected before DB access (RED 0/1/6: DB-open error; GREEN 1/0/7: unknown tool); receive now accepts only omitted/plain-empty-object payload (RED 0/1/2: array misclassified; GREEN 1/0/8: `CT_PAYLOAD_INVALID`). |
| Automatic gate | CT-R4-S2 stale generation (`binding_epoch`) now yields `CT_FENCE_MISMATCH` before other tuple classification (RED 0/1/3; GREEN 1/0/5); CT-R4-S4/S5/S6 triangulation stayed GREEN (1/0/9). |
| Migration/mode | Exact 3,627-byte Migration 002 (`sha256:22371db1fb23c72d4049b177080cd8e08eb0029e5ad7e20df709ebf6ec505b12`) adds the exact v2 manifest, OFF lease seed, replay/conflict, rollback/busy, and legacy-preservation contracts. |
| Identity/compatibility | Immutable server-created `Ctx`, fenced ACTIVE rebind/replay/MULTIPLEXED conflict history, and deferred read-only non-consuming receive are internal only; MCP still advertises exactly eight legacy tools and preserves legacy register/consuming-receive source behavior. |
### Verification, boundary, and terminal Judgment Day
| Evidence | Result |
|---|---|
| Final verification | `bun test test/migration.test.mjs test/identity.test.mjs test/fail-closed.test.mjs` → **45 pass, 0 fail, 288 assertions**; production/test syntax and whitespace passed. |
| Workload/guards | **730/800** implementation/test authored lines; actual and legacy `ACTIVE`/`tower.db` absent; note SHA-256 `73bbb0e58573eef187dbf22b026cb1594df614e7749c516908bdadc9b553f7e0` preserved. |
| Runtime/deviations/risks | N/A: no enabled adapter/public continuation route and only isolated fixtures mutated; inherited RED was not claimed, an invalid Bun test-module syntax command was replaced by parse-only `node --check`, pre-existing `.gitignore` was untouched, and JD suspects/warnings remain follow-ups. |
| Exact rollback boundary | Revert only P2 hunks in `core.mjs`, `mcp.mjs`, `test/migration.test.mjs`, `test/identity.test.mjs`, the receive-classification wording in `design.md`, the three P2 implementation checkmarks plus parent `2.4`, and this section/ledger; preserve all pre-P2 history, do not down-migrate real DBs, and leave schema-2 data inert/OFF. |
| JD identity/merge | Target `86d7988ce1d31f5996a19d75fbb30049de737d0eb47fbe8a1a4133b3083aff9f`, base `badaf71f7fd0e72a80510cdf0414d2e4d0896bc0`; confirmed severe **0**, suspect severe **2**, contradictions **0**, warnings **3**, corrections **0/2**. No severe finding was confirmed by both judges, so none was corrected; all five IDs remain in `evidence/judgment-day-slice-2-round-1.md` as follow-ups. |

**JUDGMENT: APPROVED ✅**
