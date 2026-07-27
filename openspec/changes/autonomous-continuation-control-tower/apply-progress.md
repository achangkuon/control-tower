# Apply Progress: Autonomous Continuation — Control Tower

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `feature-branch-chain`
- Current autonomous work unit: Slice 6 is complete. P6-A→P6-F are GREEN, the CT-R7-S8 correction closes cumulative task `6.1`, and parent-owned Judgment Day task `6.4` is persisted as `JUDGMENT: APPROVED ✅`.
- Branch: `p6-closure-claim-present-evidence` at committed P6-F base `90f49e8f8382f8847e9bf15285b0b7c566185a07`; the CT-R7-S8/Judgment Day closure is the current committed branch boundary.
- Completed: 24/35 native task rows after completing Slice 6 tasks `6.1`–`6.4`; P7 is the next implementation boundary.
- P3, P4, P5, and P6 are complete at their recorded boundaries. P6-A pinned Migration 005, P6-B enabled/validated schema 5, P6-C added the proof plane, P6-D added ON-mode recovery, P6-E added rollback/suspension, P6-F closed redelivery/forbidden-mode behavior, CT-R7-S8 now proves malformed claim-present history fails before recovery semantics, and explicit blind dual Judgment Day approved the frozen Slice 6 candidate with no two-judge-confirmed severe finding.

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

---

## P3 bounded design correction — no apply work

P3 apply correctly stopped before RED because schema 2 had no approved Main/activation persistence, CT-R3 completion scenarios depended on P5, and CT-R11 rollback quiescence/termination proof depended on P6. No production code, test, runtime, Tower, review, or delivery action was performed; tasks `3.1`–`3.4` remain unchecked.

The bounded correction defines byte-exact Migration 003 (`2457` bytes; `sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6`), exact schema-2→3 bootstrap/CAS/replay/rollback, canonical `main_binding_v1`, immutable activation/precondition history, read-only status, and capability-gated P3 exposure. CT-R3-S1/S3/S4 now map to P5; CT-R11-S4/S5 map to P6; cumulative scenario projections and inverse traceability are explicit without weakening the normative requirements. P3 remains forecast at 620–780 implementation/test lines with a mandatory P3-A/P3-B chain stop if the concrete forecast exceeds 800.

Next action is a fresh P3 apply beginning with genuine Migration 003/Main/API RED. This note records design correction only and claims no implementation or test evidence.

### P3 fresh-context gate corrective rerun

The one allowed design rerun corrected only the three gate findings: `CT-R6-S3` implementation/test ownership now belongs to P5; activation uses a persisted request-identity-free logical transition scope with exhaustive OFF/ON lookup classifications; and first-Main CAS plus bootstrap/status payload, mode, lease, anchor, schema, and Main-state errors are total. Migration 003 remains byte-identical at 2457 bytes with the same checksum and six objects. P3 now forecasts 650–800 authored lines with concrete independently green P3-A Migration/Main and P3-B activation/status/MCP boundaries if it would exceed 800. Tasks `3.1`–`3.4` remain unchecked; no source, test, runtime, review, or delivery work occurred. Next action is the fresh-context design gate; P3 RED may start only if it passes.

---

## P3-A partial progress — Migration 003 and persisted Main bootstrap

- Boundary: P3-A only. Migration 003, schema `2→3`, `main_binding_v1`, and internal constructor-capability `bootstrapMain` are implemented. Activation, status, MCP exposure, and every P4+ behavior remain unavailable.
- Task state: tasks `3.1`–`3.4` remain unchecked because they span the complete P3 slice.
- Skill resolution: `paths-injected` — chained PR and work-unit commit skills were loaded before task-specific work.

### Strict TDD evidence

1. P2 safety net before edits: `bun test test/migration.test.mjs test/identity.test.mjs test/fail-closed.test.mjs` → exit 0; 45 pass, 0 fail, 288 assertions.
2. Genuine RED before production edits:
   - `bun test test/migration.test.mjs -t 'P3-A Migration 003'` → exit 1; 0 pass, 3 fail, 3 assertions. `MIGRATION_003_SQL` was absent and schema-3 bootstrap requests returned pre-P3 errors.
   - `bun test test/identity.test.mjs -t 'P3-A persisted canonical Main bootstrap'` → exit 1; 0 pass, 4 fail. Schema-3 fixture setup failed because `bootstrapAdmin` rejected target 3.
3. GREEN:
   - Migration focus → exit 0; 3 pass, 0 fail, 25 assertions.
   - Main focus initially exposed one test-side precedence error: a new identity naming the already-committed epoch-1 scope correctly returned `CT_IDEMPOTENCY_CONFLICT`, not `CT_FENCE_MISMATCH`. After correcting that expectation and adding an uncommitted stale-scope fence, Main focus → exit 0; 4 pass, 0 fail, 30 assertions.
4. TRIANGULATE/REFACTOR: added schema-3 preservation of P2 register/non-consuming receive and explicit P3-B route unavailability; final focused migration + Main commands → exit 0; 3 pass/25 assertions and 5 pass/34 assertions.
5. Final commands: `bun test` → exit 0; 53 pass, 0 fail, 347 assertions. `git diff --check`, `node --check` for core/MCP/tests, and `bash -n bin/torre install.sh` → exit 0; no output.

### Workload, preservation, and rollback

- Implementation/test authored workload: **529 changed lines** (`504` additions + `25` deletions): `core.mjs` 213/23, `test/migration.test.mjs` 143/0, `test/identity.test.mjs` 148/2. This progress section adds **31** authored lines; no task/spec/design line was changed by P3-A.
- Projected complete P3: **780–950 implementation/test lines**. P3-B has 271 lines remaining under the 800-line cumulative ceiling; treat any forecast above that as a delivery-budget risk before apply.
- Runtime harness: N/A — P3-A adds no host adapter, public continuation MCP route, activation, delivery, polling, or live runtime boundary. Every mutation ran only in isolated temporary Git/Tower fixtures.
- Preserved state: actual `.git/control-tower/{ACTIVE,tower.db}` and legacy `~/.config/opencode/control-tower/{ACTIVE,tower.db}` remained absent. Unrelated `.gitignore`, `.session-doc.json`, `NEXT-SESSION-off-enforcement.md`, and `session-handoff.md` were not edited; their entry-state dirty status was preserved.
- Preserved hashes: `.gitignore` `394c70b7e3c0fc209cff55f29ab94ec7c064809fb605477646e5d92280cca5e1`; `.session-doc.json` `89bcae29fd174cc7c253ff7febc677c2049d25a1eb4a3d86e6ab0797baaee35e`; `NEXT-SESSION-off-enforcement.md` `73bbb0e58573eef187dbf22b026cb1594df614e7749c516908bdadc9b553f7e0`.
- Rollback proof: wrong schema-2→3 CAS and read-only DDL failure leave only migrations 1/2, no Main/activation objects, exact lease seed, and the legacy row. Busy acquisition returns `CT_BUSY` and succeeds after lock release.
- Rollback boundary: revert only P3-A hunks in `core.mjs`, `test/migration.test.mjs`, and `test/identity.test.mjs`, plus this section. Do not down-migrate real schema-3 databases; leave additive data inert/OFF.
- Risk/next action: P3-B activation/status/MCP remains unimplemented. Continue only with the P3-B RED boundary and enforce the remaining cumulative workload budget.

### P3-A automatic gate correction — Migration 003 precondition precedence

- Scope: corrected only the verified Migration 003 ordering blocker; P3-B/P4+ and runtime state remain untouched.
- RED: `bun test test/migration.test.mjs -t 'Migration 003 preconditions enforce OFF, lease, target scope, then request CAS'` → exit 1; 0 pass, 1 fail, 1 assertion; received `CT_IDEMPOTENCY_CONFLICT` instead of `CT_FENCE_MISMATCH`.
- GREEN: the same command → exit 0; 1 pass, 0 fail, 4 assertions.
- TRIANGULATE: the permanent test proves OFF before target scope, exact lease seed before target scope, target scope before request CAS, and absent target scope before request CAS; P3-A Migration focus → 4 pass, 0 fail, 29 assertions; Main focus → 5 pass, 0 fail, 34 assertions.
- Complete focused suite: `bun test test/migration.test.mjs test/identity.test.mjs test/fail-closed.test.mjs` → exit 0; 54 pass, 0 fail, 351 assertions.
- Full suite: `bun test` → exit 0; 54 pass, 0 fail, 351 assertions.
- Exact Migration 003 SQL remains 2457 bytes with checksum `sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6`.
- Workload: implementation/test is **556 changed lines** (`531` additions + `25` deletions), leaving **244** implementation/test lines; total P3-A including its 44 apply-progress lines is **600**, leaving **200** of the 800-line authored review budget.
- Preservation: tasks `3.1`–`3.4` remain unchecked; actual and legacy `ACTIVE`/`tower.db` remain absent; unrelated dirty files retain their recorded entry hashes.
- Next action: rerun the P3-A automatic gate. P3-B remains blocked pending that result.

### P3-A manual test-only differential evidence closure

- This is post-fix differential evidence closure, not a new implementation RED; the prior observed RED above remains the P3-A implementation RED.
- The existing-target-scope case now simultaneously supplies a wrong request CAS and requires `CT_IDEMPOTENCY_CONFLICT`, so swapping target-scope and request-CAS checks would fail permanently.
- Exact focused case: 1 pass, 0 fail, 4 assertions; P3-A Migration focus: 4 pass, 0 fail, 29 assertions; Main focus: 5 pass, 0 fail, 34 assertions.
- Focused migration+identity+fail-closed and full `bun test`: each 54 pass, 0 fail, 351 assertions. Syntax, shell, whitespace, and exact Migration 003 byte/checksum checks passed.
- HEAD-relative implementation/test workload remains **556 changed lines** (`531` additions + `25` deletions), leaving **244** of the 800-line P3 budget.
- `core.mjs` remained unchanged at SHA-256 `112a82d73dd6d9cbe62a5eeef69fcb220223a9e67424a2f9488630b24346699c`; Migration 003 remains 2457 bytes at `sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6`.
- Tasks `3.1`–`3.4` remain unchecked; actual and legacy `ACTIVE`/`tower.db`, P3-B/P4+, runtime state, production code, and unrelated dirty-file hashes remain untouched.

---

## P3-B selector activation, status, and capability-gated MCP

- **Boundary:** Completed only P3-B after the approved P3-A gate. Selector-based `activate`, exact read-only `status`, and constructor-capability-gated runtime routes `bootstrapMain|activate|status|register|receive` are implemented. Tasks `3.1`–`3.3` are complete; parent-owned `3.4` remains unchecked. P4+ routes and `start` remain unavailable.
- **Safety net:** Before P3-B test edits, `bun test` exited 0 with **54 pass, 0 fail, 351 assertions**. Migration 003 and all P3-A behavior were preserved.
- **RED:** `bun test test/identity.test.mjs -t 'P3-B activation, status, and capability-gated MCP'` exited 1 with **0 pass, 1 fail, 1 module error** because `createMcpHandler` and all P3-B routes were absent.
- **GREEN:** The same focused command first reached 3 pass/1 test-fixture failure/30 assertions because SQLite correctly rejected an impossible lease row; after correcting that fixture to a coherent mode/lease drift, it exited 0 with **4 pass, 0 fail, 33 assertions**.
- **TRIANGULATE:** Added malformed evidence, stale Main epoch, active-claimant quiescence, retained historical activation scope, immutable activation triggers, coherent ROLLING_BACK status, selector drift, and exact capability exposure. The coherent ROLLING_BACK case first exposed historical-CAS validation using current lease state (**5 pass, 1 fail, 38 assertions**); the corrected historical/current selector split then passed. Final focused result: **6 pass, 0 fail, 40 assertions**.
- **Final verification:** `bun test` exited 0 with **60 pass, 0 fail, 391 assertions**. `git diff --check`, Node parse checks for core/MCP/identity/migration tests, and `bash -n bin/torre install.sh` passed (`guards-ok`). The first checksum probe incorrectly used Node against `bun:sqlite` and failed with `ERR_UNSUPPORTED_ESM_URL_SCHEME`; corrected `bun -e` proved Migration 003 is exactly **2457 bytes** with `sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6`.
- **Workload:** P3-B implementation/test is **541 changed lines**: `core.mjs` 166, `mcp.mjs` 171, and `test/identity.test.mjs` 204. Including three task checkbox replacements, three cumulative-header replacements, and this 13-line progress section, P3-B total authored workload is **566 lines**, below its independent 800-line ceiling. Cumulative P3 implementation/test is **1,097 lines**: P3-A 556 plus P3-B 541.
- **Runtime harness:** N/A — no P7–P9 host adapter supplies production trusted capability, so default stdio MCP remains legacy-only. The in-process MCP integration test proves capability-enabled listing/calls; no actual Tower, adapter, polling, delivery, launch, recovery, or runtime mutation occurred.
- **Rollback boundary:** Revert only P3-B hunks in `core.mjs`, `mcp.mjs`, and `test/identity.test.mjs`, the `3.1`–`3.3` checkbox flips, and this P3-B evidence/header update. Preserve P3-A Migration 003/Main bootstrap. Schema-3 activation rows remain inert if code is rolled back; no real database is down-migrated.
- **Preservation:** Actual `.git/control-tower/{ACTIVE,tower.db}` and legacy `~/.config/opencode/control-tower/{ACTIVE,tower.db}` remain absent. Schema-2/P2 semantics, all eight legacy tools, no-`start`, and default no-capability continuation fencing pass. Unrelated `.gitignore`, `.session-doc.json`, `NEXT-SESSION-off-enforcement.md`, and `session-handoff.md` remain byte-identical at their entry hashes. No commit, push, PR, release, review lifecycle, Judgment Day, P4+, or public adapter route was performed.
- **Next boundary:** Return to the parent for task `3.4` only.

---

## P3-B automatic gate correction
- **Scope:** Closed only the malformed-Git status mapping, MCP explicit-null payload, and retained non-live claimant-conflict activation-proof blockers; tasks `3.1`–`3.3` remain complete and `3.4` remains unchecked.
- **RED:** malformed-Git status → **0 pass, 1 fail, 1 assertion** (`ENOENT` instead of `CT_ANCHOR_MISMATCH`); MCP explicit null → **0 pass, 1 fail, 3 assertions** (successful status instead of `CT_PAYLOAD_INVALID`). The proof-only retained-history test was immediately GREEN (**1 pass, 0 fail, 5 assertions**), confirming no production defect rather than manufacturing a false RED.
- **GREEN:** the two corrected regressions passed independently at **1/0/2** and **1/0/4**; the retained-history proof remained **1/0/5**. Production changes are one deterministic non-CT error mapping in `core.mjs` and one undefined-only MCP default in `mcp.mjs`.
- **TRIANGULATE:** P3-B focus passed **9 tests, 0 fail, 51 assertions**, including two retained MULTIPLEXED rows, one immutable conflict, zero ACTIVE claimants, matching ACTIVE Main/NONE lease, and successful activation.
- **Final:** migration + identity + fail-closed and full `bun test` each passed **63 tests, 0 fail, 402 assertions**; syntax, shell, whitespace, exact Migration 003 bytes/checksum, no-`start`, and OFF guards passed.
- **Workload:** P3-B is **341 implementation + 251 test = 592 implementation/test lines** and **627 total authored lines** including cumulative evidence/task bookkeeping; cumulative P3 implementation/test is **1,148 lines** (P3-A 556 + P3-B 592).
- **Preservation:** Migration 003 remains 2457 bytes at `sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6`; schema-2/P2, activation digests/classification, eight legacy tools, constructor gating, and unrelated dirty-file hashes are unchanged; actual and legacy `ACTIVE`/`tower.db` remain absent.
- **Rollback/next:** Revert only these correction hunks in `core.mjs`, `mcp.mjs`, `test/identity.test.mjs`, and this section. Rerun the P3-B gate; no commit, runtime mutation, review, Judgment Day, or P4+ work occurred.

## P3-B maintainer-authorized test-only gate closure
- **Scope:** Post-fix differential evidence closure only; production was already correct, so no RED was fabricated and no production/runtime file changed. Tasks `3.1`–`3.3` remain checked and `3.4` remains unchecked.
- **Assertion:** The retained-history test independently JCS/SHA-256 recomputes the persisted activation precondition with explicit `multiplexed_claimant_bindings:2` and `claimant_conflicts:1`; focused result: **1 pass, 0 fail, 6 assertions**.
- **Verification:** P3-B focus passed **9/0/52**; focused migration+identity+fail-closed and full `bun test` each passed **63/0/403**. Diff, syntax, shell, Migration 003 checksum, no-`start`, checksum, and OFF guards passed.
- **Workload:** P3-B is **341 implementation + 262 test = 603 implementation/test lines** and **646 total authored lines**; cumulative P3 implementation/test is **1,159 lines** (P3-A 556 + P3-B 603), within the independent 800-line P3-B ceiling.
- **Preservation:** `core.mjs` stayed `4efeb6445f1db869f7f5b2dc8d42f3e19930ce42e47865119795d86e28172b84`; `mcp.mjs` stayed `a06948422b8e8a42f7d1b1f6b666f17e38bf95574051fc3a627682f544445175`; actual/legacy `ACTIVE` and `tower.db` remain absent, and unrelated dirty-file hashes are unchanged.
- **Rollback/next:** Revert only the differential assertion hunk in `test/identity.test.mjs` and this closure note; rerun the P3-B gate. No P4+, activation/runtime mutation, commit, push, PR, review, or Judgment Day occurred.

---

## Slice 3 Judgment Day terminal evidence

- **Frozen target:** base HEAD `76e6cd2ffac97f734ee88d01ece1ecd93e059e18`; combined snapshot patch SHA-256 `8d3ddac740d1edbaa9194ba1ebad5e6cdc8718d924c2361705a7964b57dc130b`. P3-A Migration/Main and P3-B activation/status/MCP were separately budgeted over that same immutable snapshot. Both judge pairs verified manifest/target identity, and the parent rehash after judging was byte-identical.
- **Findings:** `CT-JD-S3-A-JA-001`, `CT-JD-S3-B-JA-001`, and `CT-JD-S3-B-JA-002` remain unfixed CRITICAL suspects. `CT-JD-S3-B-W01` remains an unfixed WARNING. Judge B's WARNING independently corroborating the root cause of `CT-JD-S3-B-JA-002` is informational only and does not severe-confirm it.
- **Merge:** confirmed severe **0**; suspect severe **3**; contradictions **0**; unique standalone warnings **1**, plus the warning-level corroboration recorded inside `CT-JD-S3-B-JA-002`; corrections **0/2**; re-judgments **0**. No correction or re-judgment occurred.
- **Terminal decision:** APPROVED because no severe finding was independently confirmed as severe by both blind judges. Every suspect and warning remains unfixed.
- **Verification:** frozen target rehash byte-identical; `bun test` **63 pass, 0 fail, 403 assertions**; focused migration+identity+fail-closed **63 pass, 0 fail, 403 assertions**. Diff, Node/shell syntax, exact Migration 003 2457-byte/checksum, no-start, MCP route, and OFF/runtime guards passed.
- **Workload:** P3-A **556 implementation/test lines**; P3-B **603 implementation/test lines** and **646 total authored**, within its independent 800 ceiling; cumulative P3 implementation/test **1,159**.
- **Preservation:** actual/legacy `ACTIVE` and `tower.db` absent; unrelated dirty files preserved.
- **Ledger:** `evidence/judgment-day-slice-3-round-1.md`.

**JUDGMENT: APPROVED ✅**

---

## P4 pre-production workload guard — split required

- **Status:** P4 stopped before RED or production edits. Baseline `bun test` passed with **63 pass, 0 fail, 403 assertions**.
- **Forecast:** The complete P4 delivery/claim unit is **1,150–1,500 authored implementation/test lines**, above the 800-line ceiling: lifecycle fixtures/tests 500–650, core persistence/validation/transactions 500–650, and MCP schemas/routes 150–200.
- **P4-A green boundary:** immutable handoff/payload/provenance plus additive delivery-plane schema, `create|validate|publish`, and their capability-gated MCP routes; cover `CT-R2-S1..S3` and the handoff/delivery projection of `CT-R3-S5`; forecast **650–780** lines.
- **P4-B green boundary:** non-consuming delivery peek plus atomic `claim`, claimant provenance/token hash, session-budget accounting/exhaustion, and receive/claim races; cover `CT-R6-S1..S2` and `CT-R6-S4..S6`; forecast **500–700** lines and depend on P4-A.
- **Design prerequisite:** Before P4-A RED, an amendment must pin the additive migration SQL/checksum/manifest and schema-version transition, canonical payload fields/limits/fingerprints/digests, session-budget seed/scope/limit, claim token/hash and idempotency persistence, and exact P4 operation precedence. The current design ends at exact schema 3 and the Revision 11 source defines only aggregate signatures/order, so apply must not invent these contracts.
- **TDD:** RED/GREEN/TRIANGULATE/REFACTOR are **N/A** because the workload guard stopped the unit before `test/lifecycle.test.mjs` was created.
- **Runtime/rollback:** Runtime harness **N/A**; no runtime boundary is enabled. Rollback removes only this progress section. Tasks `4.1`–`4.4` remain unchecked.
- **Preservation:** P3 HEAD `f20d6a369b18b46890e8e98263dbf97d6973c427`, exact Migration 003, default legacy-only MCP/no `start`, Tower OFF/runtime absence, and unrelated dirty files remain untouched.

---

## P4 bounded design amendment — chained green units, no apply work

- **Status:** Design/planning only. The pre-RED workload stop above remains authoritative; no production/test/runtime file, project test, Tower/DB/ACTIVE state, review, delivery, commit, push, or PR was touched. Tasks `4.1`–`4.4` remain unchecked.
- **P4-A:** Exact 11,867-byte Migration 004 (`sha256:646aaab22c76416639b0bc9e7c041604c7687b684197cf93104186b60955e86f`), 36-object schema-4 manifest, additive OFF-only 3→4 bootstrap, immutable canonical handoff/provenance, and capability-gated `create|validate|publish`; covers `CT-R2-S1..S3` and P4-A `CT-R3-S5`; independent forecast **650–780**.
- **P4-B:** Deterministic non-consuming receive, atomic claim, full claimant fence snapshot, HMAC token returned/replayed with only salt/hash stored, and one-unit root-session budget; covers `CT-R6-S1..S2`, `CT-R6-S4..S6`, and P4-B `CT-R3-S5`; depends on green P4-A; independent forecast **500–700**.
- **Ownership/preservation:** `CT-R6-S3` and every completion/attestation/effects behavior remain P5-owned; recovery/rollback/polling remain later-owned. P1–P3 behavior, exact Migration 003, eight default legacy MCP tools, constructor capability gate, no `start`, legacy rows, and committed P3 HEAD `f20d6a369b18b46890e8e98263dbf97d6973c427` are preserved.
- **Next action:** Validate the P4 amendment. If valid, start genuine P4-A RED under its own 800-line ceiling; start P4-B RED only from green P4-A. If either concrete forecast exceeds 800, stop for a narrower green split rather than borrowing budget.
- **Skill resolution:** `paths-injected` — cognitive documentation design, chained PR, and work-unit commit skills were loaded before task work.

---

## P4 design amendment — bounded corrective rerun evidence

- **Scope/status:** Design/planning-only cumulative correction. No implementation, test execution, runtime/Tower mutation, review, commit, push, or PR occurred. Earlier P4 forecast/amendment entries remain historical evidence; this section supersedes their constants and split for the next gate. Tasks `4.1`–`4.4` remain unchecked.
- **Migration 004:** The edited LF-only SQL is exactly **12,159 UTF-8 bytes**, **215 lines**, one terminal LF, checksum **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**, and still yields five tables/four indexes/ten triggers, hence 36 named schema-4 `ct_*` objects including the 17 schema-3 objects. Python SQLite **3.53.3** accepted the extracted SQL in memory; all 19 new named objects existed, cross-operation same-identity transition inserts succeeded, and a same-operation duplicate was rejected. This was syntax/constraint verification only, not a project test.
- **Total migration replay:** The schema-3 fresh lane now persists a canonical `bootstrap_schema4_response_v1` evidence envelope binding request, historical CAS input/digest, exact v3/v4 manifest digests, Migration 004 checksum, and public response. The schema-4 lane validates current structure and OFF/NONE first, replays only that exact operation-scoped evidence, accepts valid non-empty evolved schema-4 data without cleanup, and classifies malformed/missing evidence, wrong mode/lease, and changed tuple as `CT_SCHEMA_INVALID`, `CT_FENCE_MISMATCH`, and `CT_IDEMPOTENCY_CONFLICT` respectively. No schema-4 path fresh-runs or down-migrates.
- **Validation/identity/claim:** `validation_evidence_json` and its exact `handoff_validation_evidence_v1` JCS membership, derivation, persistence, verification, and no-live-reread replay are pinned. Transition uniqueness is `UNIQUE(operation,request_identity)`, with cross-operation UUID reuse explicitly legal. CLAIM now has exact token-free decision and response-template digests; token hash is bound consistently and replay derives/hashes the bearer once without persisting or hashing a public bearer response.
- **Green boundaries:** A1 Migration 004 + schema-4 P3 compatibility **580–740**; A2 canonical immutable payload/provenance + create **380–560**; A3 validate/publish + durable delivery **400–590**; B receive/peek + atomic claim/token/budget/races **520–720**. Dependencies are P3→A1→A2→A3→B. A2 owns partial create-side `CT-R2` coverage, A3 owns its completion, B owns `CT-R6-S1/S2/S4/S5/S6`; P3 retains `CT-R8-S5`, and P5 retains `CT-R6-S3`. Each boundary has a separate rollback and ≤800 ceiling; no task/scenario is claimed complete twice.
- **Static preservation:** HEAD remains committed P3 `f20d6a369b18b46890e8e98263dbf97d6973c427`; `git diff --quiet HEAD -- core.mjs mcp.mjs test` passed. `core.mjs` remains `4efeb6445f1db869f7f5b2dc8d42f3e19930ce42e47865119795d86e28172b84`; `mcp.mjs` remains `a06948422b8e8a42f7d1b1f6b666f17e38bf95574051fc3a627682f544445175`. Actual `.git/control-tower/{ACTIVE,tower.db}` and legacy `~/.config/opencode/control-tower/{ACTIVE,tower.db}` remain absent.
- **Unrelated dirty preservation:** `.gitignore` remains `394c70b7e3c0fc209cff55f29ab94ec7c064809fb605477646e5d92280cca5e1`; `.session-doc.json` remains `89bcae29fd174cc7c253ff7febc677c2049d25a1eb4a3d86e6ab0797baaee35e`; `NEXT-SESSION-off-enforcement.md` remains `73bbb0e58573eef187dbf22b026cb1594df614e7749c516908bdadc9b553f7e0`; pre-existing dirty `session-handoff.md` was not edited by this rerun and is currently `836e9c1afebf3cbb65fbc7b6d66b318a6c4caaf08bf7d17614519b9a8982a292`.
- **Rollback/next:** Revert only this corrective amendment's hunks in `design.md`, the three genuinely affected specs, `tasks.md`, and this appended section. Next action is the fresh P4 design gate; no apply boundary may start unless it passes.
- **Skill resolution:** `paths-injected`.

---

## P4 maintainer-authorized design closure after second gate

- **Scope/status:** Design/spec/task/apply-progress closure only. No production/test/runtime file, project test, Tower/DB/ACTIVE state, review, Judgment Day, commit, push, or PR was touched. Tasks `4.1`–`4.4` remain unchecked.
- **Fresh validate/publish:** `validate` now accepts exactly `{request_identity,id,es:"DRAFT",eg,payload_digest}` and `publish` exactly `{request_identity,id,es:"VALIDATED",eg}`. Neither accepts caller-owned `validation_digest`, evidence, authority, observation, timestamp, or preview output. Fresh validation derives canonical evidence, digest, CAS, and immutable replay envelope inside one writer transaction from constructor-owned Main/Ctx authority, persisted handoff payload/provenance, and approved live inert observations. Exact replay verifies persisted envelope/evidence/transition/idempotency links without live rereads; PUBLISH derives from persisted evidence. Public responses remain only `{id,state,generation,replayed}`.
- **Narrow work units:** P4 is now P3→A1a→A1b→A1c→A2→A3→B. A1a pins unchanged SQL/checksum/manifest constants and tests without enabling schema 4 (**480–620**); A1b owns fresh 3→4, empty replay, rollback/busy, and P3 compatibility (**560–760**); A1c owns evolved/non-empty validation and total retry evidence (**440–660**); A2 remains payload/create (**380–560**); A3 is server-derived validate/publish/durable delivery (**430–620**); B remains receive/claim/token/budget/races (**520–720**). Every unit has explicit start/end/dependency/scenario ownership/rollback and an independent ≤800 ceiling; no scenario/task completion is duplicated.
- **Migration preservation:** The Migration 004 SQL block is unchanged at **12,159 LF bytes**, **215 lines**, one terminal LF, and **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; manifest/checksum definitions remain unchanged. No SQLite/project test was run because no SQL byte changed.
- **Preservation/next:** P3 HEAD remains `f20d6a369b18b46890e8e98263dbf97d6973c427`; production/tests and runtime/Tower remain untouched; unrelated dirty files remain outside this closure. Next action is the final fresh P4 design gate.
- **Skill resolution:** `paths-injected`.

---

## P4 maintainer-authorized CT-R3-S5 spec closure

- CT-R3-S5 now preserves token-free response families except for the claim-only one-time public bearer returned on fresh success; only the token hash and token-free response template persist, replay never rediscloses the bearer, and no other response gains a token. No route, ownership, scenario, requirement, production, test, runtime, or unrelated file was changed.

---

## P4 claim bearer propagation

- Propagated the fixed fresh-only bearer contract through the P4 design and delivery/claim spec: fresh success returns `{id,state,generation,replayed:false,delivery_id,purpose,token}`; exact replay verifies persisted identity/CAS/token-hash commitments and returns `{id,state,generation,replayed:true,delivery_id,purpose}` without bearer reconstruction or redisclosure. `decision_digest`, the token-free response template/`response_digest`, operation-scoped idempotency, race-winner semantics, claim token hash, and P5 caller-provided-bearer validation remain bound; Migration 004 bytes/checksum and all six work-unit forecasts are unchanged. No production, test, task, runtime, route, authority, scenario-ownership, review, or delivery action occurred.

---

## P4-A1a Migration 004 definitions — green boundary

- **Boundary/status:** P4-A1a only is green. `core.mjs` now exports the inert exact Migration 004 SQL/checksum and frozen 36-object schema-4 metadata; `test/migration.test.mjs` independently pins the full SQL and metadata. Bootstrap/schema acceptance remains capped at 3. Tasks `4.1`–`4.4` remain unchecked.
- **Baseline:** Before new test or production edits, `bun test` → exit 0; **63 pass, 0 fail, 403 assertions**.
- **RED:** `bun test test/migration.test.mjs -t 'P4-A1a Migration 004 definitions'` → exit 1; **1 pass, 2 fail, 9 assertions**. `MIGRATION_004_SQL` and `SCHEMA_004_MANIFEST` were both absent; the independent bootstrap/schema-3 preservation test already passed.
- **GREEN:** The same focused command after the minimum production definitions → exit 0; **3 pass, 0 fail, 16 assertions**.
- **TRIANGULATE:** Independent tests prove exact 12,159 LF bytes/215 lines/one terminal LF/checksum, SQLite parsing and exact SQL for 19 additions plus all 36 schema-4 objects/four migration checksums, and non-mutating target-4 rejection with only migrations 1–3 present.
- **Final evidence:** `bun test test/migration.test.mjs` → exit 0; **37 pass, 0 fail, 195 assertions**. `bun test` → exit 0; **66 pass, 0 fail, 419 assertions**. Node syntax, shell syntax, `git diff --check`, exact Migration 001–004 byte/checksum guards, default eight-tool MCP/no-`start`, and actual/legacy OFF/runtime-absence guards passed.
- **Workload:** `core.mjs` **230 additions + 0 deletions**; `test/migration.test.mjs` **283 additions + 0 deletions**; implementation/test total **513 additions + 0 deletions**. The evidence section plus cumulative-header correction contribute **18 additions + 2 deletions**, making P4-A1a **531 additions + 2 deletions = 533 authored changed lines total**, below the independent 800-line ceiling.
- **Runtime harness:** N/A — P4-A1a adds inert definitions only; SQLite verification is test-local/in-memory or isolated temporary fixtures. No host adapter, lifecycle route, actual Tower, activation, delivery, claim, runtime mutation, review, Judgment Day, commit, push, PR, or release ran.
- **Rollback boundary:** Revert only the P4-A1a definitions in `core.mjs`, the P4-A1a literal/tests in `test/migration.test.mjs`, and this section. Schema/runtime remains P3; no database down-migration or cleanup is involved.
- **Preservation/next:** Migration 001–003 bytes/checksums, P1–P3 behavior, `mcp.mjs`, identity/fail-closed suites, default legacy-only MCP, no-`start`, unrelated dirty-file hashes, and absent actual/legacy `ACTIVE`/`tower.db` are preserved. P4-A1b is next; it alone may enable fresh schema 3→4 migration and empty replay.
- **Skill resolution:** `paths-injected` — chained PR and work-unit commit skills loaded before task work.

---

## P4-A1c bounded validator correction — exact commitments and history

- **Boundary:** Corrected only the read-only schema-4 persistence validator and its isolated fixture/tests. No A2/A3/B/P5 route or business mutation, runtime path, review, Judgment Day, commit, push, or PR was added.
- **Engram merge:** Retrieved revision 39 of `sdd/autonomous-continuation-control-tower/apply-progress` and preserved its A1b dependency plus original A1c boundary before appending this correction.
- **RED:** The permanent A1c focus exited 1 with **1 pass, 3 fail, 9 assertions**: valid-format wrong fence/token, operation/link/history drift, and exact payload/evidence/timestamp drift were accepted (`null`). A secondary resolved-OID differential exited 1 with **0/1/13** for the same reason.
- **GREEN/TRIANGULATE:** The same focus passes **4/0/72**, covering exact claimant fence and anchor-secret HMAC/token hash; exact CREATE/VALIDATE/PUBLISH/CLAIM requests, scopes, CAS, envelopes, decisions, response digests, claim links, legal state/generation history, REVISE/RECOVER restrictions; and payload bounds/sorting, evidence/reference OIDs, provenance/fingerprints, and timestamp ordering.
- **Verification:** A1b migration focus passes **6/0/47**, A1b identity focus **3/0/15**, P3-A identity focus **5/0/34**, focused migration+identity+fail-closed **78/0/549**, and full `bun test` **78/0/549**.
- **Guards:** Node/shell syntax, `git diff --check`, Migration 001–004/full SQLite tests, Migration 004 **12,159 bytes/215 lines**, unrelated-file hashes, exact default MCP/no-`start`, unchecked tasks `4.1`–`4.4`, and no actual `ACTIVE`/`tower.db` pass.
- **Workload:** Correction implementation/tests are **207 additions + 72 deletions = 279 authored lines**. Corrected A1c implementation/tests are **501 additions + 87 deletions = 588 lines**; this 15-line evidence append makes A1c **620 total authored lines**, below 800.
- **Runtime/rollback:** Runtime harness **N/A** because only isolated temporary SQLite fixtures were exercised. Revert only this correction's `core.mjs`, `test/identity.test.mjs`, and evidence hunks; preserve A1a/A1b and never clean or down-migrate schema 4.
- **Preservation/next:** Exact migrations, A1b replay/rollback/busy/fences, P3 behavior, OFF/non-mutating validation, unrelated/runtime state, and absent lifecycle routes remain intact. Tasks stay unchecked; next action is `rerun-p4a1c-gate`.
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/work-unit-commits/SKILL.md` loaded before work.

---

## P4-A1b fresh Migration 004, empty replay, and P3 compatibility — green boundary

- **Boundary/status:** Enabled only fresh schema `3→4`, pristine/empty schema-4 replay, and P3 routes on schema 4; no A1c evolved-row semantics, lifecycle route, delivery lookup, claim, task checkbox, runtime, review, or delivery action was added.
- **Baseline:** Before P4-A1b test edits, `bun test` exited 0 with **66 pass, 0 fail, 419 assertions**.
- **RED:** Migration focus exited 1 with **0 pass, 3 fail, 4 assertions**; identity focus exited 1 with **0 pass, 2 fail** because target schema 4 was rejected before execution.
- **GREEN/TRIANGULATE:** Migration focus reached **3/0/29** and schema-4 identity compatibility **2/0/13**; exact evidence/replay, request/CAS/checksum/manifest/mode/lease classification, late partial-DDL rollback, bounded busy retry, fresh/historical Main CAS, activation digest, registration, null receive, status, and missing migration evidence are pinned.
- **Final verification:** Focused migration + identity + fail-closed and full `bun test` each exited 0 with **70 pass, 0 fail, 457 assertions**; syntax, shell, diff, Migration 001–004 hashes, Migration 004 12,159-byte/215-line identity, default eight-tool MCP/no-`start`, unchecked tasks, OFF/runtime absence, and unrelated-hash guards passed.
- **Workload:** Production/tests are **337 additions + 50 deletions = 387 authored lines** (`core.mjs` 145/33, migration test 115/17, identity test 77/0). This 15-line section plus two header replacements adds 17 and deletes 2, so total P4-A1b is **354 additions + 52 deletions = 406 authored lines**, below 800.
- **Runtime harness:** N/A — all SQLite mutations occurred in isolated temporary fixtures; no host adapter, actual Tower, activation, delivery, polling, publication, commit, push, PR, or release ran.
- **Rollback proof/boundary:** A trigger-induced failure after all Migration 004 DDL but before migration-row commit restored byte-identical schema 3; busy acquisition mutated nothing and retry succeeded. Revert only A1b execution/version branches and tests/evidence; preserve A1a constants and never down-migrate a real schema-4 database.
- **Preservation:** P1–P3 behavior and Migration 001–004 hashes pass; exact schema-3 response shapes, historical schema-3 Main replay, legacy rows/eight MCP tools, no-`start`, unrelated dirty files, and absent actual/legacy `ACTIVE`/`tower.db` remain preserved. Tasks `4.1`–`4.4` remain unchecked.
- **Next/skills:** P4-A1c is next for evolved/non-empty schema-4 validator and total retry only. Skill resolution: `paths-injected` (`chained-pr`, `work-unit-commits`).

---

## P4-A1b bounded gate correction — schema-specific Main CAS and precedence

- **Boundary:** Corrected only the two verified A1b findings; the migration envelope's persisted pre-migration active Main epoch now selects schema-3 CAS for historical commits and schema-4 CAS for later commits. Caller input never selects the historical schema.
- **RED:** `bun test test/identity.test.mjs -t 'rejects schema-3 and schema-4 Main CAS aliases across the persisted migration boundary'` → exit 1; **0 pass, 1 fail, 1 assertion**; historical schema-3 commit incorrectly accepted the schema-4 alias. The differential migration case already passed **1/0/4** before production correction.
- **GREEN:** The two exact correction cases each exited 0: CAS aliases **1/0/2** and competing precedence **1/0/4**.
- **TRIANGULATE:** A1b identity focus passed **3/0/15**, proving valid historical schema-3 replay, valid fresh schema-4 Main commit/activation, and both schema3→4 and schema4→3 alias rejection. A1b migration focus passed **4/0/33**, including checksum→manifest→committed-request→request-CAS differential faults.
- **Verification:** `bun test test/migration.test.mjs test/identity.test.mjs test/fail-closed.test.mjs` and full `bun test` each exited 0 with **72 pass, 0 fail, 463 assertions**. Node and shell syntax plus `git diff --check` passed.
- **Guards:** Migration 001–004 checksums passed; Migration 004 remains **12,159 bytes/215 lines**. Default MCP remains exactly eight legacy tools with no `start`; tasks `4.1`–`4.4` remain unchecked; actual/legacy `ACTIVE` and `tower.db` remain absent.
- **Workload:** Correction implementation/tests are **74 additions + 6 deletions = 80 lines**; corrected A1b implementation/tests are **411 additions + 56 deletions = 467 lines**. This 14-line evidence append makes corrected total A1b **442 additions + 58 deletions = 500 authored lines**, below 800.
- **Preservation:** Exact Migration 001–004 bytes/checksums, A1b fresh/empty migration behavior, valid P3 schema-3/schema-4 behavior, unrelated dirty-file hashes, runtime absence, and tasks remain preserved.
- **Rollback/next:** Revert only this correction's `core.mjs`, identity/migration regression-test, and evidence hunks; preserve A1a/A1b data and never down-migrate. Next action is `rerun-p4a1b-gate`; no A1c+, runtime, review, Judgment Day, commit, push, or PR work occurred.

---

## P4-A1b maintainer correction — schema-4 replay fence precedence

- **Boundary:** Corrected only bootstrap replay precedence: full schema-4 manifest/checksum safety and structural continuation/lease reads remain fail-closed, the current mode/lease fence now runs next, and exact schema `3→4` commit evidence remains mandatory afterward.
- **RED:** `bun test test/migration.test.mjs -t 'schema-4 replay fences mode and lease before missing or malformed migration evidence'` exited 1 with **0 pass, 1 fail, 1 assertion**: mode `ON` plus missing evidence returned `CT_SCHEMA_INVALID` instead of `CT_FENCE_MISMATCH`.
- **GREEN/TRIANGULATE:** The same permanent competing-fault matrix exited 0 with **1 pass, 0 fail, 8 assertions**, covering `ON`, `ROLLING_BACK`, and structurally valid ACTIVE lease against both missing and malformed evidence; both evidence faults under valid `OFF`/`NONE` remain `CT_SCHEMA_INVALID`. A1b migration and identity focuses passed **5/0/41** and **3/0/15**.
- **Verification:** Focused migration+identity+fail-closed and full `bun test` each exited 0 with **73 pass, 0 fail, 471 assertions**; diff, Node, and shell syntax guards passed.
- **Guards:** Migration 001–004 checksums passed; Migration 004 remains **12,159 bytes/215 lines**. Default MCP remains exactly eight legacy tools with no `start`; tasks `4.1`–`4.4` remain unchecked; actual/legacy `ACTIVE` and `tower.db` remain absent; unrelated dirty hashes are unchanged.
- **Workload:** This correction is **30 additions + 1 deletion = 31 implementation/test lines**. Corrected A1b implementation/tests are **441 additions + 57 deletions = 498 lines**; this 12-line closure makes total A1b **484 additions + 59 deletions = 543 authored lines**, below 800.
- **Preservation/rollback/next:** Schema-specific Main CAS, exact migration bytes/evidence, fresh/empty behavior, busy/rollback semantics, P1–P3, unrelated/runtime state, and all A1b boundaries remain intact. Revert only this ordering hunk, regression, and closure; next action is `rerun-p4a1b-gate`. No A1c+, runtime, review, Judgment Day, commit, push, or PR work occurred.

---

## P4-A1b final correction — request-fence precedence

- **Boundary:** On exact empty schema-4 replay, wrong incoming `expected_schema_version` or `expected_mode` now returns `CT_FENCE_MISMATCH` after persisted evidence validation but before tuple/idempotency comparison; valid replay fences plus a changed committed tuple remain `CT_IDEMPOTENCY_CONFLICT`.
- **RED:** The permanent differential test exited 1 with **0 pass, 1 fail, 1 assertion** because wrong expected schema version plus a changed identity returned `CT_IDEMPOTENCY_CONFLICT`.
- **GREEN/TRIANGULATE:** The differential passed **1/0/6** with byte-identical non-mutation checks; A1b migration and identity focuses passed **6/0/47** and **3/0/15**, preserving evidence, mode/lease, CAS, fresh/empty, busy, and rollback precedence.
- **Verification/guards:** Focused and full suites each passed **74/0/477**; Migration 001–004 hash focus passed **4/0/44**, default eight-tool MCP/no-`start` passed **1/0/11**, and Node/shell syntax, diff, unrelated-hash, unchecked-task, OFF/runtime-absence guards passed.
- **Workload:** This correction is **19 implementation/test additions** plus this **11-line evidence append = 30 authored lines**. Corrected A1b is **460 additions + 57 deletions = 517 implementation/test lines** and **514 additions + 59 deletions = 573 total authored lines**, below 800.
- **Preservation/next:** Prior mode/lease-before-evidence ordering, schema-specific Main CAS, exact migrations, A1b fresh/empty/busy/rollback behavior, P1–P3, A1c fail-closed boundary, tasks, unrelated/runtime state, and publication state remain unchanged. Next action is `rerun-p4a1b-gate`; no A1c+, runtime, review, Judgment Day, commit, push, or PR work occurred.
---

## P4-A1c evolved schema-4 validator and total replay — green boundary

- **Boundary:** Replaced only A1b's empty-only schema-4 restriction with one read-only structural validator for claimant/Main history and all five P4 tables. It validates canonical JSON/digests, immutable authority/transition/idempotency links, generations, timestamps, delivery/claim/budget/token metadata, dormant P5 states, and factual status counts; no lifecycle mutation or route was added.
- **Baseline:** Before A1c test edits, `bun test` exited 0 with **74 pass, 0 fail, 477 assertions**.
- **RED:** `bun test test/identity.test.mjs -t 'P4-A1c evolved schema-4 validation and total replay'` exited 1 with **1 pass, 1 fail, 21 assertions**; coherent evolved P4/P5-shaped rows were rejected `CT_SCHEMA_INVALID` by `assertEmptySchema4`.
- **GREEN/TRIANGULATE:** The focus now passes **2/0/39**. Exact evolved Migration 004 replay is read-only; changed committed identity is `CT_IDEMPOTENCY_CONFLICT`; current ON mode is `CT_FENCE_MISMATCH`; malformed payload/provenance/validation/ctx/transition/commit/token/budget/generation/delivery classes are `CT_SCHEMA_INVALID` and non-mutating; null-only receive and factual status counts remain exact.
- **Verification:** A1b migration focus passes **6/0/47**; A1b identity compatibility passes **3/0/15**; final focused migration+identity+fail-closed and full `bun test` each pass **76/0/516**. Node/shell syntax, diff, exact Migration 001–004 checksums, Migration 004 12,159-byte/215-line identity, default eight-tool MCP/no-`start`, unchecked tasks, unrelated hashes, and OFF/runtime guards pass.
- **Workload:** A1c implementation/tests are **294 additions + 15 deletions = 309 authored lines** (`core.mjs` 163/15; `test/identity.test.mjs` 131/0). This evidence/header merge adds **15 additions + 2 deletions**, making A1c **309 additions + 17 deletions = 326 total authored lines**, below 800.
- **Runtime/rollback:** Runtime harness **N/A** — no P7–P9 adapter or public production capability exists; every SQLite mutation used isolated temporary fixtures. Revert only A1c validator/retry/status-count hunks in `core.mjs`, the A1c describe block in `test/identity.test.mjs`, the two header replacements, and this section; preserve A1a/A1b and never clean or down-migrate schema-4 rows.
- **Preservation/next:** Migration 004 bytes/hash, A1b fences/CAS/rollback/busy behavior, valid schema-3 history and schema-4 P3 Main/activation/status/register/receive, legacy rows/eight tools, no-`start`, unrelated dirty files, and absent actual/legacy runtime remain preserved. Tasks `4.1`–`4.4` remain unchecked. P4-A2 is next; A2/A3/B/P5 behavior remains unavailable. No runtime/review/Judgment Day/commit/push/PR occurred.
- **Skill resolution:** `paths-injected` — chained PR and work-unit commit skills loaded before task work.

---

## P4-A1c repeated-gate replan — R1/R2 corrective units

- **Status/rationale:** The existing corrected A1c snapshot is preserved as an unapproved prerequisite baseline: **588 implementation/test lines**, with historical verification **78 pass/549 assertions**. Its repeated gate failed on structural reverse links, historical CAS/fence derivation, and absence of genuine dormant forward histories. The maintainer authorized stopping that correction loop and splitting the remaining work; A1c is not complete and A2 is blocked.
- **R1 boundary:** Starts from the preserved A1c baseline and ends with exact handoff↔CREATE/VALIDATE, delivery↔PUBLISH/history, and claim↔CLAIM/idempotency reverse commitments. Historical CREATE/VALIDATE/PUBLISH/CLAIM CAS and fences must recompute from immutable canonical persisted envelopes and named immutable rows, never current lease/Main/claimant metadata. Paired valid/malformed differential coverage includes reverse links, operation scope, authority, request/CAS, decision/response, budget/token, and timestamps. Incremental forecast **360–520 implementation/test lines**; rollback removes only R1 helpers/tests/evidence and returns to the unapproved baseline.
- **R2 boundary:** Starts only after the R1 gate passes and ends with genuine coherent schema-4-representable ACK, ATTEST_COMPLETION, COMPLETE, REJECT, and restricted SUSPEND_PENDING/REDELIVER_WORK RECOVER histories plus paired malformed sequence/generation/timestamp/cross-row proofs. These are validator-only dormant histories: no P5/P6 route, mutation, evidence/result/quiescence claim, stable scenario completion, or task completion. Incremental forecast **320–480 implementation/test lines**; rollback removes only R2 helpers/fixtures/evidence and returns to green R1.
- **Dependency/ownership:** A1a→A1b→unapproved A1c baseline→R1→R2→A2→A3→B. A2 starts only after independent R1 and R2 gates pass. A2/A3/B scenario ownership and all P5/P6 ownership remain unchanged; native tasks `4.1`–`4.4` remain unchecked and the native task count remains **50**.
- **Preservation:** Replan edits only `design.md`, `tasks.md`, and this cumulative artifact. Migration 004 remains **12,159 LF bytes/215 lines** at **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; P3 HEAD remains **`f20d6a369b18b46890e8e98263dbf97d6973c427`**. Production/tests/runtime and unrelated files are unchanged; no project test, runtime mutation, review/Judgment Day, commit, push, or PR occurred.
- **Next:** Run `validate-a1c-replan`; on success, begin R1 only.
- **Skill resolution:** `paths-injected` — cognitive documentation design, chained PR, and work-unit commit skills.
---

## P4-A1c-R1 reverse commitments and immutable historical fences — green boundary

- **Boundary/forecast:** Implemented only R1 over the preserved unapproved A1c baseline. The pre-production incremental forecast remained the approved **360–520 implementation/test lines**, below 800; no R2/A2/A3/B/P5+ route, mutation, scenario completion, or task checkbox was added.
- **Baseline:** Before R1 test edits, `bun test` exited 0 with **78 pass, 0 fail, 549 assertions**.
- **RED:** `bun test test/identity.test.mjs -t 'P4-A1c evolved schema-4 validation and total replay'` exited 1 with **4 pass, 1 fail, 93 assertions**; the baseline rejected the valid canonical P4 envelopes when current lease epoch/version had evolved from the immutable historical writer fence.
- **GREEN:** The same R1 focus exited 0 with **5 pass, 0 fail, 102 assertions**. CREATE/VALIDATE/PUBLISH/CLAIM token-free envelopes now bind exact request/scope/CAS/authority/decision/response commitments and historical claimant fences exclusively from immutable persisted evidence.
- **TRIANGULATE:** Paired read-only faults reject orphan validation metadata, delivery, and claim rows; missing/wrong reverse transitions and operation-qualified idempotency; wrong request/scope/authority/CAS member; decision/response digest; claimant fence; budget/token hash; timestamps; and existing A1c payload/history drift. Valid history with historical lease `0/0` and current coherent lease `7/11` remains accepted.
- **Focused verification:** A1b migration focus **6/0/47**; A1b+A1c identity focus **8/0/117**; P3-A+A1b identity focus **8/0/49**. Focused migration+identity+fail-closed and full `bun test` each exited 0 with **79 pass, 0 fail, 579 assertions**.
- **Guards:** Migration 001–004 hash focus **4/0/44**; default MCP/no-`start` focus **1/0/11**; Node/MCP and shell syntax, `git diff --check`, unchecked tasks `4.1`–`4.4`, actual/legacy OFF/runtime absence, and unrelated-file hash guards passed. Migration 004 remains **12,159 LF bytes/215 lines** at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`.
- **Workload:** R1 implementation/tests are **125 additions + 54 deletions = 179 authored lines** (`core.mjs` 85/39; `test/identity.test.mjs` 40/15). The cumulative header/evidence merge is **17 additions + 2 deletions = 19 lines**, making R1 **142 additions + 56 deletions = 198 total authored changed lines**, below 800.
- **Runtime/rollback:** Runtime harness **N/A** — R1 is a read-only validator and all SQLite changes occurred only in isolated temporary fixtures. Rollback removes only the R1 validator/envelope/reverse-link hunks in `core.mjs`, the R1 fixture/tests in `test/identity.test.mjs`, the two header replacements, and this section; it preserves A1a/A1b and every schema-4 row without cleanup or down-migration.
- **Preservation/next:** Exact migrations, A1b replay/precedence/rollback/busy behavior, P3 schema-3/schema-4 behavior, existing A1c payload/history checks, legacy rows/eight tools, no-`start`, unrelated dirty files, and absent actual/legacy runtime remain preserved. A1c remains unapproved, tasks `4.1`–`4.4` remain unchecked, and `validate-p4a1c-r1` is next; R2 alone follows a passing R1 gate.
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/work-unit-commits/SKILL.md` and `/home/emili/.agents/skills/chained-pr/SKILL.md` were loaded before work.

---

## P4-A1c-R1 bounded proof-gap correction

- **Boundary:** Corrected only R1 fixture chronology and the three dedicated reverse-link proofs. No R2/A2+, route, runtime, review/Judgment Day, commit, push, or PR work occurred.
- **Corrected chronology:** Main bootstrap, activation, claimant registration, and CREATE→VALIDATE→PUBLISH→CLAIM now commit coherently at lease `0/0`; authority timestamps precede four strictly ordered transition timestamps. Only after that immutable history is complete does the fixture evolve the current coherent NONE lease to `7/11`. The nominal status and migration replay accept it read-only while all four persisted P4 envelopes retain writer fence `0/0`.
- **RED:** The first corrected focus exposed a real production defect and exited **5 pass, 2 fail, 107 assertions**: schema-3 Main/activation persistence reconstructed historical authority CAS/scope from the later current NONE lease. No RED was fabricated for already-correct R1 reverse semantics.
- **GREEN:** `validateSchema3Persistence` now performs exact seed-lease reconstruction only while the current lease is still `NONE/0/0`; after a valid later lease evolution it validates immutable stored Main/activation commitments without substituting the current epoch/version. The R1 focus exits **7/0/124**.
- **Dedicated reverse proof:** Three otherwise coherent fixtures break only validation metadata↔VALIDATE, delivery timestamp↔PUBLISH/history, or claim envelope token-hash↔CLAIM/claim/fence commitments. Production rejects each read-only. A controlled test-local source mutation bypasses only the named `VALIDATE`, `PUBLISH`, or `CLAIM` reverse validator and makes its corresponding fixture replay successfully, proving the dedicated checks are mutation-discriminating rather than masked by earlier generic checks.
- **Focused verification:** A1b migration **6/0/47**; A1b identity **3/0/15**; A1b+A1c identity **10/0/139**; P3-A identity **5/0/34**. Focused migration+identity+fail-closed and full `bun test` each pass **81/0/601**.
- **Guards:** Migration 001–004 hash focus **4/0/44**; Migration 004 remains **12,159 LF bytes/215 lines** at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`. Node/MCP/test and shell syntax, `git diff --check`, default legacy-only MCP/no-`start`, actual/legacy OFF/runtime absence, unchecked tasks, and unrelated-file hashes pass.
- **Workload:** This correction is **26 additions + 24 deletions in `core.mjs`** and **55 additions + 19 deletions in `test/identity.test.mjs`** = **124 implementation/test authored lines**. Corrected R1 is **303 implementation/test authored lines** (prior 179 + correction 124). Including prior 19 header/evidence lines plus this correction's **17 additions + 1 deletion = 18 evidence/header authored lines**, corrected R1 totals **340 authored lines**, below 800.
- **Runtime/rollback:** Runtime harness is N/A; only isolated temporary Git/SQLite fixtures and temporary mutated module copies ran. Rollback removes this correction's seed/evolved-lease selector, reverse-validation mutation seam/refactor, fixture/proof additions, header replacement, and this section; A1a/A1b and persisted schema-4 rows remain untouched and are never down-migrated.
- **Preservation/next:** Exact migrations, A1b replay/precedence/rollback/busy behavior, P3 and preserved A1c baseline semantics, read-only/no-route boundaries, legacy state, unrelated dirty files, and runtime absence are preserved. A1c remains unapproved; tasks `4.1`–`4.4` remain unchecked; rerun the R1 gate next, and only a passing gate may start R2.
- **Skill resolution:** `none`.

---

## P4-A1c scope correction — cancel R2 and restore later-slice ownership

- **Decision/rationale:** Maintainer authorization cancels P4-A1c-R2. Pulling dormant ACK/ATTEST_COMPLETION/COMPLETE/REJECT/RECOVER acceptance into P4 would validate future P5/P6 histories without their owning persistence, evidence, and total cross-row semantics. Earlier R2 planning entries remain historical rationale only; R2 is no longer an active P4 work unit, dependency, forecast, acceptance gate, or rollback boundary.
- **Exact P4-only classification:** The final A1c gate may accept only coherent generation-0 P4 prefixes composed of CREATE, optional VALIDATE, optional PUBLISH with one PENDING WORK delivery, and optional CLAIM with one CLAIMED WORK delivery plus exactly one LIVE claim. Existing payload/provenance, operation-qualified idempotency, reverse-link, authority, immutable historical CAS/fence, delivery/claim, budget/token, and timestamp commitments remain mandatory. Any future operation row, future-only handoff state, nonzero generation, non-WORK delivery, close state/timestamp, or cross-row shape requiring ACK, ATTEST_COMPLETION, COMPLETE, REJECT, REVISE, RECOVER, or another later-slice operation is unsupported and must fail read-only as `CT_SCHEMA_INVALID`; P4 invents no acceptance semantics.
- **Ownership/dependency:** ACK/ATTEST_COMPLETION/COMPLETE/REJECT persistence and validation acceptance return to P5; RECOVER persistence and validation acceptance return to P6. A2/A3/B scope, forecasts, rollback boundaries, and scenario ownership are unchanged. The active dependency is A1a→A1b→preserved unapproved A1c baseline→R1→fresh final A1c P4-only gate→A2→A3→B. The final gate has not passed; A2 remains blocked.
- **Evidence/budgets:** All A1a, A1b, baseline, and R1 RED/GREEN/triangulation/guard evidence above remains authoritative. The preserved A1c baseline is **588 implementation/test lines** with historical **78/0/549** evidence; R1 retains its **360–520** incremental forecast and corrected **303 implementation/test / 340 total authored lines** evidence. Tasks `4.1`–`4.4` remain unchecked and completed task count remains **18/50**. No A2/A3/B forecast or stable CT scenario mapping changed.
- **Rollback:** Revert only this scope-correction's `design.md`/`tasks.md` hunks, cumulative-header replacement, and this appended note to restore the superseded R2 plan. Do not remove or rewrite A1a/A1b/R1 implementation, tests, evidence, budgets, or persisted schema-4 rows.
- **Preservation:** Migration 004 remains **12,159 LF bytes/215 lines** at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`; P3 HEAD remains `f20d6a369b18b46890e8e98263dbf97d6973c427`. This correction edits only `design.md`, `tasks.md`, and `apply-progress.md`; production, tests, runtime, and unrelated files are outside the write set. No project test, runtime mutation, review/Judgment Day, commit, push, or PR occurred.
- **Next:** `validate-p4-only-a1c`.
- **Skill resolution:** `paths-injected` — cognitive documentation design, chained PR, and work-unit commit skills.

---

## Current session-close checkpoint

- P3 is complete, committed, and present on the remote branch at `f20d6a369b18b46890e8e98263dbf97d6973c427` (`feat(tower): add main activation authority`); no PR is open.
- P4-A1a, P4-A1b, and P4-A1c-R1 passed their final gates. R1's final evidence is **81 pass, 0 fail, 601 assertions**; Migration 004 remains exactly **12,159 LF bytes/215 lines** at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`.
- P4-A1c-R2 was not started; its worker command was aborted before work. The maintainer approved deferring ACK/ATTEST_COMPLETION/COMPLETE/REJECT validation to P5 and RECOVER validation to P6, but the design/tasks scope-correction worker was aborted. Therefore the preceding scope-correction note records intent only: the decision is **not yet persisted in `design.md` or `tasks.md`**.
- Progress remains **18/50** with `4.1`–`4.4` unchecked. A2, A3, B, and 4.4 remain pending; P4 remains incomplete and uncommitted. The remote branch remains at P3, with no P4 push or PR.
- **Exact next action:** persist the approved R2 deferral in `design.md`, `tasks.md`, and this cumulative artifact; run one final P4-only A1c gate without rerunning R1; then continue A2 → A3 → B → 4.4.
- Actual and legacy Tower `ACTIVE`/`tower.db` remain absent. Preserve unrelated `.gitignore`, `.session-doc.json`, and `NEXT-SESSION-off-enforcement.md` unchanged.
- **Learning:** delay came from both process overhead—many fresh gates and exact evidence bookkeeping—and a real architecture error: P5/P6 validation was pulled into P4. The next session must enforce slice ownership and bounded exit criteria.

---

## P4-A2 canonical payload/provenance + `create` — green boundary

- **Boundary/forecast:** Implemented only the A2 `create` unit: the canonical immutable handoff payload/provenance validation, the `create` operation handler (null→DRAFT generation-0 handoff + one CREATE transition + one operation-scoped idempotency envelope), and registering `create` as a capability-gated continuation dispatcher/MCP route. No `validate`/`publish`/`claim`/P5/P6 route, mutation, or scenario-completion claim was added. Forecast band was **380–560** authored lines, independently ≤800.
- **Baseline:** Before this unit's test edits, `bun test` exited 0 with **83 pass, 0 fail** (per orchestrator-provided baseline).
- **RED:** `bun test test/identity.test.mjs` on the test-only diff (before any `core.mjs`/`mcp.mjs` edit) exited 1 with **33 pass, 7 fail, 348 expect() calls, 40 tests across 1 file**. Failures were the exact expected shape: the dispatcher rejected `"create"` as an unknown operation (`CT_PAYLOAD_INVALID`), the MCP tool list did not yet include `create`, and `mcpResult` surfaced `ERROR: unknown tool "create"`.
- **GREEN:** Implemented `assertCreateRequest` (exact top-level request shape) and `continuationCreate` in `core.mjs` (schema-4/anchor/state/lease structure → OFF/ROLLING_BACK → request shape → exact ACTIVE producer predicate reused from register/receive → operation-qualified idempotency classification → full structural/JCS/bounds/digest proof plus repository/common-dir fingerprint equality → server-derived digests/fingerprint/CAS/envelope → one bounded `BEGIN IMMEDIATE` insert of the DRAFT generation-0 `ct_handoff` row, one CREATE `ct_handoff_transition` row, and one `create` `ct_idempotency` envelope), registered `create` in `createContinuationDispatcher`'s operation allowlist and dispatch switch, and added the capability-gated `create` MCP tool definition (JSON Schema, `additionalProperties:false`) to `mcp.mjs`. After two small test-fixture corrections (a same-root reconnect is not a MULTIPLEXED conflict — only a different `root_session_id`/host identity within the same plugin scope is; the conflicting `register` call itself throws and must be caught), `bun test test/identity.test.mjs` exited 0 with **40 pass, 0 fail, 378 expect() calls**.
- **TRIANGULATE:** Exact replay returns `{id,state:"DRAFT",generation:0,replayed:true}` and writes no new row (verified via direct `ct_handoff`/`ct_handoff_transition`/`ct_idempotency` row counts before/after). A changed accepted request at the same `request_identity`, and a new identity naming the same committed `(lineage_id,revision)` scope, both reject `CT_IDEMPOTENCY_CONFLICT` without mutation. A ten-case malformed-payload matrix (wrong `kind`, invalid `lineage_id`, zero `revision`, empty `decision_summary`, unsorted `dependencies`, oversized `unit_id`, wrong `repository_fingerprint`/`git_common_dir_fingerprint`/`provenance.source_digest`, and an extra top-level payload key) plus a wrong `payload_digest` and a request/payload `lineage_id`/`revision` mismatch all reject `CT_PAYLOAD_INVALID` with zero `ct_handoff`/`ct_idempotency` rows written afterward. `OFF` rejects `CT_CONTINUATION_OFF` and `ROLLING_BACK` rejects `CT_ROLLBACK_IN_PROGRESS` before any payload/authority check runs. A never-registered scope rejects `CT_SESSION_ISOLATION_UNPROVEN`; a stale/wrong `binding_epoch` on an otherwise-registered scope rejects `CT_FENCE_MISMATCH`; a second identity sharing the plugin scope but a different root session rejects `CT_SESSION_MULTIPLEXED` (both at registration time and on the subsequent `create` call). A dedicated precedence test proves request-shape errors (`CT_PAYLOAD_INVALID`, extra top-level key) win over producer-authority errors, which in turn win over the later full-payload-proof step (`CT_SESSION_ISOLATION_UNPROVEN` beats a deep-payload `kind` defect on an unregistered scope). After a fresh create and its exact replay, `status` (which invokes the full R1 schema-4 validator, recomputing every reverse link/digest/fingerprint/CAS/envelope on read) succeeds, proving the persisted CREATE envelope/transition/handoff row are exactly what the existing A1c/R1 validator expects. An MCP-level round-trip (`register` then `create` then `create` again through the same trusted-metadata/process-identity capability) returns `replayed:false` then `replayed:true` with an identical public response.
- **Focused verification:** `bun test test/identity.test.mjs` exits **40 pass, 0 fail, 378 expect() calls**. Full `bun test` exits **90 pass, 0 fail, 686 expect() calls across 3 files** (baseline 83 + 7 net new tests; one existing P3-B capability-gate test was updated in place to include the new `create` route rather than added net-new).
- **Guards:** `bash -n bin/torre` exit 0; `bash -n install.sh` exit 0; `git diff --check` exit 0 (no whitespace errors). Migration 004 constant untouched (still 12,159 LF bytes/215 lines at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`). No real database, `ACTIVE`, or `tower.db` was created/mutated — every test uses an isolated `mkdtempSync` git root. Tasks `4.1`–`4.4` remain unchecked; only this apply-progress artifact was updated, not `tasks.md` checkboxes.
- **Runtime harness:** N/A in the sense of a live host/process runtime — the MCP round-trip test (`createMcpHandler` + JSON-RPC-shaped `tools/call`) is the closest integration boundary this unit owns, and it passed end-to-end including replay.
- **Workload:** `git diff --numstat -- core.mjs mcp.mjs test/identity.test.mjs` = `core.mjs` 110 additions/1 deletion, `mcp.mjs` 15 additions/0 deletions, `test/identity.test.mjs` 199 additions/3 deletions. Total **324 additions + 4 deletions = 328 authored implementation/test lines**, below the 380–560 forecast band (extensive reuse of R1's already-built JCS/digest/CAS/envelope/predicate machinery reduced net new code) and independently well under 800.
- **Rollback boundary:** Revert only the `assertCreateRequest`/`continuationCreate` block and the `create` dispatcher-allowlist/switch line in `core.mjs`, the `create` MCP tool definition in `mcp.mjs`, and the `P4-A2` test additions plus the one updated capability-gate-list assertion in `test/identity.test.mjs`. A1a/A1b/A1c-baseline/R1 code, tests, and every existing schema-4 row remain untouched; no schema or migration change was made in this unit (A2 only writes rows into tables Migration 004 already created).
- **Preservation:** All prior P0–P3 and P4-A1a/A1b/A1c-baseline/R1 behavior, tests, and evidence are unchanged. The eight legacy `tower_*` tools, default no-capability MCP handler, and no-`start` route remain exactly as before. Production/tests/runtime outside `core.mjs`/`mcp.mjs`/`test/identity.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran.
- **Next:** P4-A3 (server-derived `validate|publish` + durable PENDING WORK delivery), which depends on this green A2 boundary.
- **Skill resolution:** `none` — no `## Skills to load before work` block or skill registry was present in this invocation; proceeded on the phase skill (`sdd-apply`) and shared conventions alone.

## P4-A3 server-derived `validate|publish` + durable delivery — green boundary

- **Boundary/forecast:** Implemented only the A3 unit: server-derived `validation_evidence_v1`/`validation_digest` for fresh `validate` (DRAFT→VALIDATED, generation unchanged), full reverification of persisted evidence for `publish` (VALIDATED→PUBLISHED, generation unchanged) plus exactly one CSPRNG PENDING WORK `ct_delivery` row with `handoff_state_snapshot:"PUBLISHED"`, and registering `validate`/`publish` as capability-gated continuation dispatcher/MCP routes. `claim` and the receive delivery-peek were explicitly out of scope (P4-B); continuation `receive` still returns `{delivery:null}` after a fresh publish. Forecast band was **430–620** authored lines, independently ≤800.
- **Baseline:** Before this unit's test edits, `bun test` exited 0 with **90 pass, 0 fail, 686 `expect()` calls** (P4-A2 green boundary).
- **RED:** With only `test/identity.test.mjs` edited (`core.mjs`/`mcp.mjs` temporarily reverted via `git stash` to the pre-A3 P4-A2 state), `bun test test/identity.test.mjs` exited 1 with **40 pass, 8 fail, 393 `expect() calls`**. The 8 failures were the exact expected shape: the dispatcher rejected `"validate"`/`"publish"` as unknown operations (`CT_PAYLOAD_INVALID`), the updated eight-route capability-gate assertion failed against the six-route list, and the MCP round-trip test surfaced `ERROR: unknown tool "validate"`. One new scenario (the live-observation failure matrix) coincidentally passed even pre-implementation, because an unrecognized `"validate"` operation and a genuine live-observation failure both currently resolve to `CT_PAYLOAD_INVALID` with no mutation; this is noted rather than hidden, and the scenario is still a real GREEN/TRIANGULATE proof once the operation exists.
- **GREEN:** Restored the `core.mjs`/`mcp.mjs` implementation (`git stash pop`) and re-ran: `bun test test/identity.test.mjs` exited 0 with **48 pass, 0 fail, 450 `expect()` calls**. Implementation added to `core.mjs`: `resolveFileNoFollow`/`resolveCommitOid`/`liveEvidenceReference`/`liveValidationEvidence` (no-follow FILE walk with symlink/non-file rejection, argument-array `git rev-parse --verify <value>^{commit}` for COMMIT/source-merge resolution, `git merge-base --is-ancestor` ancestry proof, URL digest-of-string-only with `fetch:"NONE"`), `assertValidateRequest`/`continuationValidate` (exact `{request_identity,id,es:"DRAFT",eg,payload_digest}` shape; schema/anchor/state/lease → OFF/ROLLING_BACK → request shape → exact ACTIVE Main predicate reused from `bootstrapMain`/`activate` (`coherentMain`+`assertMainGate`) → operation-qualified idempotency classification from persisted `request_digest` alone (never re-deriving CAS on replay, since the top-of-transaction `validateSchema4Persistence` call already fully reverifies any prior committed VALIDATE/PUBLISH envelope) → handoff existence → state/generation/payload-digest fences → live observations → server-derived `validate_cas_v1`/envelope → one bounded `BEGIN IMMEDIATE` conditional `UPDATE ct_handoff` (DRAFT→VALIDATED, validation columns null→value) plus one VALIDATE transition and one `validate` idempotency envelope), and `assertPublishRequest`/`continuationPublish` (exact `{request_identity,id,es:"VALIDATED",eg}` shape; same top gates/Main predicate/idempotency-by-request_digest pattern; handoff existence; state/generation fences; an explicit `ct_delivery` existence fence at `(handoff_id,generation)` for `expected_delivery:"ABSENT"`; full reverification of the persisted `validation_evidence_json`/`validation_digest` before deriving `publish_cas_v1`; one bounded transaction inserting the conditional `UPDATE ct_handoff` (VALIDATED→PUBLISHED), one new CSPRNG PENDING WORK `ct_delivery` row, one PUBLISH transition, and one `publish` idempotency envelope). Registered `validate`/`publish` in `createContinuationDispatcher`'s operation allowlist and dispatch switch, and added both capability-gated MCP tool definitions (JSON Schema, `additionalProperties:false`) to `mcp.mjs`. Every write inside each operation's single `BEGIN IMMEDIATE` transaction shares one `now()` timestamp across the handoff row, the transition's `occurred_at`, the idempotency envelope's `committed_at`, and (for publish) the delivery's `created_at`, matching the exact cross-row equality the existing A1c/R1 schema-4 validator already enforces on every read.
- **TRIANGULATE:** Exact VALIDATE/PUBLISH replay returns `{...,replayed:true}` and writes no new row (verified via direct `ct_handoff_transition`/`ct_delivery`/`ct_idempotency` row counts before/after, for both operations). A changed accepted request at the same `request_identity`, and a new identity naming the same committed `handoff:<id>:generation:<eg>:<op>` scope, both reject `CT_IDEMPOTENCY_CONFLICT` without mutation, for both `validate` and `publish`. Calling `publish` before any `validate` on a fresh (never-scoped) handoff/generation rejects `CT_INVALID_TRANSITION`; a wrong `eg` on an otherwise-correct `validate` or `publish` request, and a wrong `payload_digest` on an otherwise-correct `validate` request, all reject `CT_FENCE_MISMATCH` with zero mutation. A non-Main (registered PRODUCER/CLAIMANT) identity is rejected `CT_WORKFLOW_MAIN_REQUIRED` for both operations; an identity sharing Main's exact host/plugin/root/process fields but a stale `binding_epoch` is rejected `CT_FENCE_MISMATCH` (isolating the epoch-fence branch of the shared `assertMainGate` predicate from the identity-mismatch branch). A four-case live-observation matrix — a syntactically valid but nonexistent COMMIT reference, a FILE reference resolved through a symlink (rejected even though the link target's bytes match the declared digest), a FILE reference with a digest that does not match its actual bytes, and a `source_merge.sha` that resolves to a real but non-ancestor commit fetched from an unrelated isolated repository, plus a `source_merge.sha` with no resolvable commit at all — all reject `CT_PAYLOAD_INVALID` with the handoff left at `DRAFT`, `validation_digest` still `NULL`, and zero `validate` idempotency rows. `OFF` rejects `CT_CONTINUATION_OFF` and `ROLLING_BACK` rejects `CT_ROLLBACK_IN_PROGRESS` before any Main-authority/payload check runs, for both operations. After a fresh validate+publish, `status` (which invokes the full R1 schema-4 validator, recomputing every reverse link/digest/fingerprint/CAS/envelope on read, including the VALIDATE/PUBLISH transitions and the new WORK delivery) succeeds, proving the persisted rows are exactly what the existing A1c/R1 validator expects. Continuation `receive` still returns exactly `{delivery:null}` after a fresh publish — the non-consuming peek's null-only result is unchanged through A3; P4-B replaces it with a real projection. An MCP-level round-trip (`register` → `create` → `validate` → `validate` replay → `publish` → `publish` replay → `receive`) returns the exact expected public shapes end-to-end, including `replayed:false` then `replayed:true` with an identical public response for both operations.
- **Focused verification:** `bun test test/identity.test.mjs` exits **48 pass, 0 fail, 450 `expect()` calls**; `bun test test/identity.test.mjs -t "P4-A3"` isolates **9 pass, 0 fail, 83 `expect()` calls** (the 8 new P4-A3 tests plus the retitled capability-gate test, both matching the filter substring). Full `bun test` exits **98 pass, 0 fail, 758 `expect()` calls across 3 files** (baseline 90 + 8 net new tests; one existing P3-B capability-gate test was updated in place to cover eight routes rather than added net-new).
- **Guards:** `bash -n bin/torre install.sh` exit 0; `git diff --check` exit 0 (no whitespace errors). Migration 004 constant untouched (still 12,159 LF bytes/215 lines). No real database, `ACTIVE`, or `tower.db` was created/mutated — every test uses an isolated `mkdtempSync` git root, including a second, wholly separate temporary Git repository used only to fetch one real-but-unrelated non-ancestor commit into the canonical fixture's object database for the ancestry-failure case. Tasks `4.1`–`4.4` remain unchecked; only this apply-progress artifact was updated, not `tasks.md` checkboxes.
- **Runtime harness:** N/A in the sense of a live host/process runtime — the MCP round-trip test (`createMcpHandler` + JSON-RPC-shaped `tools/call`, exercising `register`→`create`→`validate`→`publish`→`receive` through two separate capability-scoped handlers for the worker and Main identities) is the closest integration boundary this unit owns, and it passed end-to-end including both operations' replay.
- **Workload:** `git diff --numstat -- core.mjs mcp.mjs test/identity.test.mjs` = `core.mjs` 224 additions/1 deletion, `mcp.mjs` 29 additions/0 deletions, `test/identity.test.mjs` 335 additions/5 deletions. Total **588 additions + 6 deletions = 594 authored implementation/test lines**, inside the 430–560 forecast band and independently well under 800.
- **Rollback boundary:** Revert only the live-observation helpers (`resolveFileNoFollow`/`resolveCommitOid`/`liveEvidenceReference`/`liveValidationEvidence`), `assertValidateRequest`/`continuationValidate`, `assertPublishRequest`/`continuationPublish`, and the `validate`/`publish` dispatcher-allowlist/switch lines in `core.mjs`; the `validate`/`publish` MCP tool definitions in `mcp.mjs`; and the `P4-A3` test additions plus the one retitled/expanded capability-gate-list assertion in `test/identity.test.mjs`. A1a/A1b/A1c-baseline/R1/A2 code, tests, and every existing schema-4 row remain untouched; no schema or migration change was made in this unit (A3 only writes rows into tables Migration 004 already created, exactly as A2 did for `create`).
- **Preservation:** All prior P0–P3 and P4-A1a/A1b/A1c-baseline/R1/A2 behavior, tests, and evidence are unchanged. The eight legacy `tower_*` tools, default no-capability MCP handler, and no-`start`/`claim` route remain exactly as before. Production/tests/runtime outside `core.mjs`/`mcp.mjs`/`test/identity.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran.
- **Next:** P4-B (non-consuming receive delivery-peek plus atomic `claim`/budget), which depends on this green A3 boundary.

## P4-B exact non-consuming receive and atomic `claim` — green boundary

- **Boundary/forecast:** Implemented only the B unit: replaced continuation `receive`'s final schema-4 null lookup with the deterministic delivery-peek selection (eligible-pair predicate, `ORDER BY created_at,delivery_id LIMIT 1`, exact `{delivery:null}`/`{delivery:{delivery_id,id,state,generation,purpose}}` projection), and added the atomic `claim` operation (session budget seed/consume, claimant fence, HMAC-derived one-time token, `BEGIN IMMEDIATE` CAS transaction) registered as a capability-gated continuation dispatcher/MCP route. No `ack`/`attestCompletion`/`complete`/`reject`/`revise`/`recover`/`beginRollback`/`rebindMain`/`finishRollback` route was added; those and any other unsupported name still fail `CT_PAYLOAD_INVALID` before database access. Everything before `receive`'s final lookup (schema/anchor → ON/NONE mode/lease → argument shape → immutable Ctx → conflict/MULTIPLEXED → exactly one ACTIVE binding → epoch/tuple) and the A2 `create`/A3 `validate`/`publish` handlers are byte-identical except for the new dispatcher allowlist/switch entries. Forecast band was **520–720** authored lines, independently ≤800.
- **Baseline:** Before this unit's test edits, `bun test` exited 0 with **98 pass, 0 fail, 758 `expect()` calls** (P4-A3 green boundary).
- **RED:** With only `test/identity.test.mjs` edited (`core.mjs`/`mcp.mjs` temporarily reverted via `git stash` to the pre-B P4-A3 state), `bun test test/identity.test.mjs -t "P4-B"` exited 1 with **0 pass, 10 fail, 8 `expect()` calls**. Nine of the ten failures were the exact expected shape: the dispatcher rejected `"claim"` as an unknown operation (`CT_PAYLOAD_INVALID`), so every scenario that called `claim` threw immediately, and the MCP round-trip test's `receive` call returned a non-object because the tool was still absent from the enabled tool list. The tenth (the retitled nine-route capability-gate assertion in the P3-B describe block) failed because the tool list still had exactly eight capability-gated routes.
- **GREEN:** Restored the `core.mjs`/`mcp.mjs` implementation (`git stash pop`) and re-ran: `bun test test/identity.test.mjs -t "P4-B"` exited 0 with **10 pass, 0 fail, 69 `expect()` calls**. Implementation added to `core.mjs`: continuation `receive` now computes the same `repository_fingerprint`/`git_common_dir_fingerprint` derivation `create`/`claim` use, then runs one read-only join (`ct_delivery` JOIN `ct_handoff` LEFT JOIN `ct_claim`) selecting `delivery_state='PENDING'`, no claim row, matching `handoff_id`/current `generation`, matching repository/common-dir fingerprints, and either `(purpose=WORK,handoff.state=PUBLISHED,handoff_state_snapshot=PUBLISHED)` or `(purpose=ATTESTATION_REDELIVERY,handoff.state=COMPLETION_ATTESTED,handoff_state_snapshot=COMPLETION_ATTESTED)`, ordered `created_at ASC, delivery_id ASC LIMIT 1`; the query is gated `if (inspectSchema(db) !== 4) return {delivery:null}` since schema 2/3 never created those tables. Malformed candidates need no bespoke check because `gateContinuation` already ran the full R1 `validateSchema4Persistence` over every row in this same read transaction before the query runs. `assertClaimRequest`/`continuationClaim`: exact `{request_identity,delivery_id,id,es,eg,purpose}` shape with `es` cross-checked against `purpose` (`PUBLISHED`+`WORK` or `COMPLETION_ATTESTED`+`ATTESTATION_REDELIVERY`); schema/anchor/state/lease → OFF/ROLLING_BACK → request shape/purpose-es relation → exact ACTIVE claimant (CLAIMANT) predicate reused from register/receive/create → operation-qualified idempotency classification (fresh returns the destructured token-free `{id,state,generation,replayed:true,delivery_id,purpose}`, never spreading the stored `kind`/`version` template fields) → delivery then handoff existence (`CT_NOT_FOUND`) → one combined CAS bucket (`CT_INVALID_TRANSITION` for purpose/handoff-state incompatibility, `CT_FENCE_MISMATCH` for pairing/generation/fingerprint/no-claim) → session-budget seed-absent-then-CAS-consume `0→1` (`CT_SESSION_BUDGET_EXHAUSTED` on a second distinct claim) → CSPRNG `claim_id`/`token_salt`, `claimant_fence_v1`/digest, `token_material_v1`/HMAC-SHA256(anchor_secret)/`token`/`token_hash` (only salt+hash ever persisted) → one bounded `BEGIN IMMEDIATE` inserting the LIVE `ct_claim` row, CAS-updating `ct_delivery` PENDING→CLAIMED, CAS-updating `ct_handoff` PUBLISHED→CLAIMED for WORK (generation unchanged; ATTESTATION_REDELIVERY leaves handoff state unchanged, wired structurally per the design amendment since only P5 can ever create a COMPLETION_ATTESTED delivery for it to match), one CLAIM transition with `authority_kind='CLAIMANT'` and non-null `decision_digest`, and one `claim` idempotency envelope. Fresh success returns exactly `{id,state,generation,replayed:false,delivery_id,purpose,token}`; the stored envelope's `public_response` is the token-free `claim_response_template_v1` (including `kind`/`version`) used only for `response_digest`, never returned verbatim. Registered `claim` in `createContinuationDispatcher`'s operation allowlist and dispatch switch, and added the capability-gated `claim` MCP tool definition (JSON Schema, `additionalProperties:false`) to `mcp.mjs`.
- **TRIANGULATE:** `receive` returns the exact PENDING WORK delivery projection after a fresh publish, repeats identically on a second non-mutating peek (zero `ct_claim`/`ct_session_budget` rows created by the peek itself), and returns exactly `{delivery:null}` again once that sole delivery is claimed. `claim` atomically creates one LIVE claim, CLAIMS the delivery and handoff, and consumes exactly one budget unit; exact replay returns the token-free shape and consumes no extra unit (`ct_claim`/`ct_session_budget.consumed_count` unchanged after replay). The full R1 schema-4 validator (`status`) recomputes the CLAIM reverse link, envelope, claimant fence, and token-hash commitment on read and passes. The response/envelope key-set differential proves the fresh response carries exactly `{delivery_id,generation,id,purpose,replayed,state,token}` while the replay carries the same set minus `token`, and that `status`'s JSON never contains the raw token. A second distinct claim in the same root-session budget scope (a different handoff/delivery, same claimant) rejects `CT_SESSION_BUDGET_EXHAUSTED` with zero mutation to the second delivery/handoff/idempotency row. Two-claim serialization: after a winner commits, a same-identity request with a changed CLAIM tuple (`purpose`/`es` flipped to the other valid pairing) and a new identity naming the same committed `delivery:<id>:claim` scope both reject `CT_IDEMPOTENCY_CONFLICT` with the claim/idempotency row count staying at 1. A request naming `purpose=ATTESTATION_REDELIVERY`/`es=COMPLETION_ATTESTED` against the real WORK/PUBLISHED delivery rejects `CT_INVALID_TRANSITION`; an otherwise-correct request with the wrong `eg` rejects `CT_FENCE_MISMATCH`; an absent `delivery_id` and an absent handoff `id` (with the other row real) both reject `CT_NOT_FOUND`. A dedicated precedence test proves malformed request shape wins even for an unregistered claimant, unregistered-claimant errors win over an absent-delivery `CT_NOT_FOUND`, and for a registered claimant delivery-existence precedes handoff-existence precedes the generation-fence CAS bucket. `OFF` rejects `CT_CONTINUATION_OFF` and `ROLLING_BACK` rejects `CT_ROLLBACK_IN_PROGRESS` before any claim request/authority check runs. An MCP-level round-trip (`register`→`create`→`validate`→`publish`→`receive`→`claim`→`claim` replay→`receive`) returns the exact expected public shapes end-to-end, including the fresh bearer once and `{delivery:null}` after the claim. Two pre-existing P4-A3 assertions (`publish` test and the MCP validate/publish round-trip test) that literally asserted the pre-B `{delivery:null}` behavior were updated in place to assert the new real projection, since the design explicitly scopes that exact one-line handoff to B (`"P4-B replaces only that final result with the selection algorithm above"`); no other prior assertion, row shape, or test was deleted, renamed, or weakened.
- **Focused verification:** `bun test test/identity.test.mjs -t "P4-B"` exits **10 pass, 0 fail, 69 `expect()` calls**. `bun test test/identity.test.mjs` exits **57 pass, 0 fail, 506 `expect()` calls**. `bun test test/migration.test.mjs test/identity.test.mjs test/fail-closed.test.mjs` and full `bun test` each exit 0 with **107 pass, 0 fail, 814 `expect()` calls across 3 files** (baseline 98 + 9 net new tests; the P3-B capability-gate test was updated in place to cover nine routes rather than added net-new).
- **Guards:** `bash -n bin/torre install.sh` exit 0; `git diff --check` exit 0 (no whitespace errors). Migration 004 constant untouched — re-verified independently at **12,159 bytes** and checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`. No real database, `ACTIVE`, or `tower.db` was created/mutated — every test uses an isolated `mkdtempSync` git root, and the repo's own `git-common-dir` was independently checked to contain neither `ACTIVE` nor `tower.db`. Tasks `4.1`–`4.4` remain unchecked; only this apply-progress artifact was updated, not `tasks.md` checkboxes (per the parent's instruction that `4.4` Judgment Day is parent-owned).
- **Runtime harness:** N/A in the sense of a live host/process runtime — the MCP round-trip test (`createMcpHandler` + JSON-RPC-shaped `tools/call`, exercising `register`→`create`→`validate`→`publish`→`receive`→`claim`→`claim` replay→`receive` through one worker-capability-scoped handler and one Main-capability-scoped handler) is the closest integration boundary this unit owns, and it passed end-to-end including the fresh/replay token contract.
- **Workload:** `git diff --numstat -- core.mjs mcp.mjs test/identity.test.mjs` = `core.mjs` 167 additions/2 deletions, `mcp.mjs` 16 additions/0 deletions, `test/identity.test.mjs` 235 additions/9 deletions. Total **418 additions + 11 deletions = 429 authored implementation/test lines**, below the 520–720 forecast band (extensive reuse of R1/A2/A3's already-built JCS/digest/CAS/envelope/predicate/idempotency machinery reduced net new code, matching A2's and A3's own under-forecast pattern) and independently well under 800.
- **Rollback boundary:** Revert only the delivery-peek query hunk inside `continuationReceive`, the `assertClaimRequest`/`continuationClaim` block and the `claim` dispatcher-allowlist/switch lines in `core.mjs`, the `claim` MCP tool definition in `mcp.mjs`, the `P4-B` describe block plus the retitled nine-route capability-gate assertion and the two updated `{delivery:null}`→real-projection assertions in `test/identity.test.mjs`, and this section. A1a/A1b/A1c-baseline/R1/A2/A3 code, tests, and every existing schema-2/3/4 row remain untouched; no schema or migration change was made in this unit (B only writes rows into tables Migration 004 already created, exactly as A2/A3 did).
- **Preservation:** All prior P0–P3 and P4-A1a/A1b/A1c-baseline/R1/A2/A3 behavior, tests, and evidence are unchanged except the two `receive` assertions the design itself scopes to B. The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before; `start` and every P5/P6 name (`ack`/`attestCompletion`/`complete`/`reject`/`revise`/`recover`/`beginRollback`/`rebindMain`/`finishRollback`) remain absent and fail `CT_PAYLOAD_INVALID` before database access. Production/tests/runtime outside `core.mjs`/`mcp.mjs`/`test/identity.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran.
- **Next:** Task `4.4` (Slice 4 Judgment Day), parent-owned, after A1a/A1b/A1c-baseline/R1/final-A1c-P4-only-gate/A2/A3/B are all green.
- **Skill resolution:** `none` — no `## Skills to load before work` block or skill registry was present in this invocation; proceeded on the phase skill (`sdd-apply`) and shared conventions alone.

## Final A1c P4-only gate — parent evidence (recorded after A2/A3/B)

The design conditioned A2 on a fresh final A1c P4-only gate passing over the preserved
A1c baseline plus R1. This section records that evidence, which the per-unit sessions
flagged as pending dedicated capture.

- **Gate substance:** The A1c/R1 total schema-4 validator (`validateSchema4Persistence`)
  runs read-only inside `gateContinuation` on every schema-4 continuation read, and
  `status` invokes the full R1 validator, recomputing every reverse link, digest,
  fingerprint, CAS, envelope, and fence on read. It accepts only coherent P4-native
  prefixes (`CREATE null→DRAFT` gen0 PRODUCER; optional `VALIDATE DRAFT→VALIDATED` and
  `PUBLISH VALIDATED→PUBLISHED` gen0 MAIN; optional WORK `CLAIM PUBLISHED→CLAIMED` gen0
  CLAIMANT) and classifies every unsupported future history (non-`CREATE|VALIDATE|PUBLISH|CLAIM`
  operation, non-`WORK` purpose, nonzero generation, close/rollover shapes needing
  ACK/ATTEST_COMPLETION/COMPLETE/REJECT/REVISE/RECOVER) as read-only `CT_SCHEMA_INVALID`.
- **Pass evidence:** `bun test` → **107 pass, 0 fail, 814 `expect()` calls across 3 files**
  after A2, A3, and B landed. Post-`create`/`validate`/`publish`/`claim`, `status`
  re-runs the R1 validator over the newly persisted DRAFT/VALIDATED/PUBLISHED/CLAIMED
  handoff rows, CREATE/VALIDATE/PUBLISH/CLAIM transitions, PENDING/CLAIMED WORK delivery,
  LIVE claim, and session-budget rows and passes — proving the write side matches the
  already-committed read-side contract byte-for-byte. The unsupported-future-history
  refusal remains covered by the preserved A1c/R1 tests in the green suite.
- **Boundary:** This gate adds no implementation, route, mutation, or stable CT scenario;
  it is the parent's confirmation that A2 was correctly unblocked. Migration 004 remains
  exactly 12,159 LF bytes / 215 lines / `sha256:fb951119…446ae57`. Tower stayed OFF; no
  real `ACTIVE`/`tower.db` was created or mutated.
- **Remaining:** Task `4.4` (Slice 4 Judgment Day) — parent-owned, runs next over the full
  A1a→A1b→A1c-baseline→R1→final-gate→A2→A3→B green sequence.

---

## Slice 4 Judgment Day closure

- **Frozen target:** base `f20d6a369b18b46890e8e98263dbf97d6973c427` → candidate `5b645ba8a39e193e867c9616f20d5c3e02ced166`; original scoped patch SHA-256 `06c8f6f34f916d80b5ccf5dfc9f8a7cde46c06e9087b51384574a2cbce4d2164`.
- **Round-one merge:** one confirmed severe (`CT-JD-S4-001`), two suspect severe, zero contradictions, and four informational findings. The maintainer authorized only `CT-JD-S4-001`; every suspect and informational finding remains frozen and unfixed in `evidence/judgment-day-slice-4-round-1.md`.
- **Correction:** `core.mjs` and `test/identity.test.mjs`; **21 additions + 3 deletions = 24 authored lines**; delta SHA-256 `62cf1aeca199bd246e412d5a4224741f25b0f665ab1d25c686cbed48018cc1dc`. RED proved coherent future history incorrectly succeeded instead of returning `CT_SCHEMA_INVALID`; GREEN future P5/P6 rejection passed **1/0/21**; coherent P4-prefix triangulation passed **1/0/16**.
- **Scoped re-judgment:** Judge A clean; Judge B clean; no fix-caused defect. Budgets used: corrections **1/2**, re-judgments **1/2**.
- **Independent final verification:** identity **58/0/515**; full `bun test` **108/0/823**; diff and syntax guards passed. Migration 004 remains **12,159 bytes / 215 lines** at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`; default MCP remains exactly eight legacy tools with no `start`; actual and legacy `ACTIVE` and `tower.db` remain absent.
- **Preservation/rollback:** Rollback is limited to the authorized `CT-JD-S4-001` hunks in `core.mjs` and `test/identity.test.mjs`; reverting them restores the future-history acceptance defect and invalidates this approval. P4-native behavior, Migration 004, frozen suspect/informational findings, historical evidence, runtime absence, and unrelated state remain preserved.
- **Terminal decision:** **APPROVED**. P4 is complete at **22/50** tasks; P5 lifecycle/attestation is next.

## P5-A Effects & Ack — green boundary

- **Boundary/forecast:** Implemented only the P5-A unit: `ack` (CLAIMED→STARTED), the sole start operation (no `start` API exists and none was added), gated on a complete persisted `effect_manifest_v1` and its server-recomputed `pre_start_boundary_digest` (CT-R12), and using the token-free `authenticated_request` bearer scheme P4-B's `claim` established (caller resends the raw token once; the server hashes its UTF-8 bytes and constant-time-compares against the persisted `ct_claim.token_hash`; the raw token is never stored, returned again, or placed in any envelope). No `attestCompletion`/`complete`/`reject`/`revise` route, and no compensation/rollback (`RECOVER`) logic, was added — those remain P5-B/C/D and P6. No migration object was added and no Migration 004 byte changed; P5-A only activates the already-dormant `ct_handoff.state='STARTED'` and `ct_handoff_transition.operation='ACK'` CHECK members Migration 004 already defines. Forecast band was **380–540** authored lines, independently ≤800.
- **Baseline:** Before this unit's edits, `bun test` exited 0 with **144 pass, 0 fail, 1,233 `expect()` calls across 8 files** (P4 green boundary, `feat/control-tower/p5-lifecycle` at `origin/master` `cbe2765`).
- **RED:** With `core.mjs`/`mcp.mjs` temporarily reverted via `git stash` to the pre-P5-A baseline and only the new `test/lifecycle.test.mjs` added, `bun test test/lifecycle.test.mjs` exited 1 with **0 pass, 7 fail**. Every failure was the exact expected shape: the dispatcher rejected `"ack"` as an unknown operation (`CT_PAYLOAD_INVALID`) for the core-level tests, and the MCP round-trip test surfaced `ERROR: unknown tool "ack"`. `git stash pop` restored the implementation before GREEN.
- **GREEN:** Implementation added to `core.mjs`: `effectManifestDigests(manifest,id,generation)` — a pure structural+digest validator for `effect_manifest_v1` (exact key set via `exactKeys`, 1..256 duplicate-free contiguous 0-based `effect_index` effects, `target_kind∈{DATABASE,EXTERNAL_API,FILESYSTEM}`, NUL-free bounded `target`/`operation`, `observability∈{OBSERVABLE,UNOBSERVABLE}`, `compensatability∈{COMPENSATABLE,NON_COMPENSATABLE}`, `sha256:`-shaped `pre_state_digest`, ≤65536-byte JCS, and the caller `pre_start_boundary_digest` equal to the server-recomputed `SHA-256(UTF8(JCS({kind:"effect_boundary_v1",...})))` over `{effect_index,target_kind,target,pre_state_digest}` in manifest order) — returns `null` on any structural/digest failure so both the fresh handler and the historical re-verifier can classify it (`CT_EFFECT_MANIFEST_INVALID` vs `CT_SCHEMA_INVALID`) without duplicating the rules. `assertAckRequest`/`continuationAck`: exact `{delivery_id,effect_manifest,eg,es:"CLAIMED",id,purpose:"WORK",request_identity,token}` shape; schema/anchor/state/lease → OFF/ROLLING_BACK → request shape → exact ACTIVE claimant (CLAIMANT) predicate reused from `claim`/`create` → operation-qualified idempotency (`handoff:<id>:generation:<eg>:ack` scope, replay returns the destructured `{id,state,generation,replayed:true}` from the stored `ack_response_envelope_v1`, never spreading the template) → delivery then handoff existence (`CT_NOT_FOUND`) → legal-state fence (`handoff.state≠CLAIMED`→`CT_INVALID_TRANSITION`) → purpose/generation/fingerprint fence (`CT_FENCE_MISMATCH`) → delivery-state/claim-existence fence (`CT_INVALID_TRANSITION`/`CT_FENCE_MISMATCH`) → constant-time (`node:crypto` `timingSafeEqual`) bearer `token_hash` comparison (`CT_TOKEN_MISMATCH`) → `effectManifestDigests` (`CT_EFFECT_MANIFEST_INVALID`) → one bounded `BEGIN IMMEDIATE` conditional `UPDATE ct_handoff` (CLAIMED→STARTED, generation unchanged; `ct_delivery`/`ct_claim` untouched — they stay `CLAIMED`/`LIVE` while work is in progress), one `ACK` transition (`authority_kind='CLAIMANT'`, non-null `decision_digest`), and one `ack` idempotency envelope whose `evidence.request` is the token-free `authenticated_request` (the original request minus `token`, plus `token_hash`) and whose op-specific evidence is exactly `{claim_id,claimant_fence_digest,token_hash,effect_manifest_digest,pre_start_boundary_digest}` per the design amendment. Response is exactly `{id,state:"STARTED",generation,replayed}`. Also extended the pre-existing shared schema-4 read-side validator (`validateSchema4Persistence`, run by `gateContinuation` before every operation and by `status`): its `futureHistoryPresent` fail-closed gate now accepts `ct_handoff.state='STARTED'` and `ct_handoff_transition.operation='ACK'` (generation still pinned at 0) and `ct_idempotency.operation='ack'`, while continuing to reject `attestCompletion`/`complete`/`reject`/`revise`/`recover` and their states exactly as before; and added a dedicated byte-exact reverse-link block that re-derives and cross-checks every persisted `ACK` row's `ack_cas_v1`/`ack_decision_v1`/`ack_response_envelope_v1` shape against its own claim/delivery/handoff/effect-manifest rows on every subsequent read (removed `"ACK"` from the pre-existing generic/dormant placeholder block, which stays reachable only for the still-unimplemented P5-B/C/D operations it was speculatively scaffolded for). Registered `ack` in `createContinuationDispatcher`'s operation allowlist and dispatch switch, and added the capability-gated `ack` MCP tool definition (JSON Schema, `additionalProperties:false`) to `mcp.mjs`; default `createMcpHandler()` still lists exactly the eight legacy `tower_*` tools.
- **TRIANGULATE:** `ack` moves a real `create→validate→publish→claim`-produced CLAIMED handoff to STARTED, persists the full effect manifest inside `evidence.request.effect_manifest`, never returns or logs the raw bearer, and a subsequent `status` call (which re-runs the full schema-4 validator including the new ACK reverse-link block) succeeds (CT-R1-S1/CT-R12-S2). Exact `ack` replay returns `{...,replayed:true}` with zero new `ACK` transition rows; a changed accepted request (different manifest) at the same identity, and a new identity naming the same committed `handoff:<id>:generation:<eg>:ack` scope, both reject `CT_IDEMPOTENCY_CONFLICT` (CT-R3-S1). Ten distinct manifest variants — missing, non-object, wrong `id`, wrong `generation`, empty `effects`, non-contiguous `effect_index`, an extra top-level key, an invalid `target_kind`, a malformed `pre_state_digest`, and a mismatched `pre_start_boundary_digest` — all reject `CT_EFFECT_MANIFEST_INVALID` with the DB byte-identical before/after (CT-R12-S1). A wrong bearer rejects `CT_TOKEN_MISMATCH`; a PUBLISHED-but-never-claimed handoff (real P4 state, not a synthetic row) rejects `CT_INVALID_TRANSITION`; `purpose:"ATTESTATION_REDELIVERY"` rejects `CT_PAYLOAD_INVALID` at the request-shape gate — all non-mutating (ack portion of CT-R1-S5). A dedicated precedence test proves malformed request shape wins even for an unregistered claimant (`CT_PAYLOAD_INVALID`), an unregistered/stranger claimant is rejected before delivery/handoff existence (`CT_SESSION_ISOLATION_UNPROVEN`), missing delivery/handoff both reject `CT_NOT_FOUND`, and a wrong `eg` on an otherwise-correct request reject `CT_FENCE_MISMATCH` after existence but before the manifest bucket, all non-mutating. `OFF` rejects `CT_CONTINUATION_OFF` and `ROLLING_BACK` rejects `CT_ROLLBACK_IN_PROGRESS` before any ack request/authority check runs. An MCP-level round-trip (`ack` through the exact registered worker identity that performed the real claim) returns the exact expected public shape and the bearer never appears in the subsequent `status` JSON. All 144 pre-existing tests — including the synthetic-fixture `"P4-only gate rejects coherent future P5/P6 histories read-only"` test, which builds a *coherent-under-the-old-generic-shape* `ACK` history via `setupDormant("ACK")` — still pass unmodified: that fixture's evidence does not match P5-A's exact `ack_cas_v1`/`ack_decision_v1`/evidence-key shape, so the new dedicated reverse-link block still rejects it `CT_SCHEMA_INVALID`, just for byte-exact-shape reasons now instead of blanket future-history refusal. One pre-existing test (`"capability gate exposes exactly nine ... routes"`, P3-B describe block) was updated in place — retitled to "ten" routes and extended with `ack` in the expected list plus one new `isError` assertion — since P5-A's whole purpose is to add `ack` to that capability-gated list; this is the same kind of in-place enumeration update every prior P4 unit (A2/A3/B) made to this exact test as each added its own route.
- **Focused verification:** `bun test test/lifecycle.test.mjs` exits **7 pass, 0 fail, 51 `expect()` calls**. Full `bun test` exits **151 pass, 0 fail, 1,285 `expect()` calls across 9 files** (baseline 144 + 7 net new tests; one existing P3-B capability-gate test was updated in place to include the new `ack` route rather than added net-new).
- **Guards:** `bun -e "await import('./core.mjs'); await import('./mcp.mjs')"` succeeds (ESM syntax/load check — `bash -n` is not applicable to `.mjs`/ESM import-export syntax and was not used as the syntax gate); `git diff --check -- core.mjs mcp.mjs test/identity.test.mjs` exit 0 (no whitespace errors). Migration 004 constant untouched — re-verified independently at **12,159 bytes**, checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57` (byte-identical to every prior P4 unit's recorded value). No real database, `ACTIVE`, or `tower.db` was created or mutated — every test uses an isolated `mkdtempSync` git root. Native tasks `5.1`–`5.4` remain unchecked; only this apply-progress artifact and the P5-A row of the P5 chained-unit table in `tasks.md` were updated (a status annotation only, not a checkbox).
- **Runtime harness:** N/A in the sense of a live host/process runtime — the MCP round-trip test (`createMcpHandler` + JSON-RPC-shaped `tools/call`, exercising `ack` through the exact registered worker identity/process that performed the real `claim`, then `status`) is the closest integration boundary this unit owns, and it passed end-to-end with no bearer disclosure.
- **Workload:** `git diff --numstat -- core.mjs mcp.mjs test/identity.test.mjs` = `core.mjs` 194 additions/6 deletions, `mcp.mjs` 18 additions/0 deletions, `test/identity.test.mjs` 6 additions/5 deletions; plus the new `test/lifecycle.test.mjs` at 286 additions/0 deletions. Total **504 additions + 11 deletions = 515 authored implementation/test lines**, inside the 380–540 forecast band and independently well under 800.
- **Rollback boundary:** Revert only `effectManifestDigests`, `assertAckRequest`/`continuationAck`, the `ack` dispatcher-allowlist/switch lines, the `futureHistoryPresent` SQL's `STARTED`/`ACK`/`ack` allowances, and the dedicated `ACK` reverse-link block (restoring `"ACK"` to the generic dormant-operations `Set`) in `core.mjs`; the `ack` MCP tool definition in `mcp.mjs`; `test/lifecycle.test.mjs` in full; and the one retitled/expanded capability-gate-list assertion in `test/identity.test.mjs`. A1a/A1b/A1c-baseline/R1/A2/A3/B code, tests, and every existing schema-4 row remain untouched and byte-for-byte preserved; reverting leaves the dormant schema-4 `STARTED`/`ACK` rows inert again (rejected as unsupported future history), exactly the P5-A rollback boundary the design specifies. No schema or migration change was made in this unit.
- **Preservation:** All prior P0–P4 behavior, tests, and evidence are unchanged except the one capability-gate-list assertion the design itself scopes to whichever unit adds a route. The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before; `start` and every P5-B/C/D/P6 name (`attestCompletion`/`complete`/`reject`/`revise`/`recover`/`beginRollback`/`rebindMain`/`finishRollback`) remain absent and fail `CT_PAYLOAD_INVALID` before database access. Production/tests/runtime outside `core.mjs`/`mcp.mjs`/`test/identity.test.mjs`/`test/lifecycle.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran; Tower stayed OFF throughout (every test uses an isolated temporary git root, never the real DB/anchor/`ACTIVE`).
- **Next:** P5-B (Attestation): `attestCompletion` STARTED→COMPLETION_ATTESTED with server-derived `attestation_evidence_v1` and a single unused attestation, which depends on this green P5-A boundary.
- **Skill resolution:** `none` — no `## Skills to load before work` block or skill registry was present in this invocation; proceeded on the phase skill (`sdd-apply`) and shared conventions alone.

## P5-B Attestation — green boundary

- **Boundary/forecast:** Implemented only the P5-B unit: `attestCompletion` (STARTED→COMPLETION_ATTESTED), Main-authority-only, deriving one canonical token-free `attestation_evidence_v1`/`attestation_digest` entirely server-side from immutable rows (no caller evidence or digest is ever accepted — exactly the P4 `validate` pattern), with attestation single-use enforced structurally by the `STARTED→COMPLETION_ATTESTED` state CAS. No `complete`/`reject`/`revise` route and no compensation/rollback (`RECOVER`) logic was added — those remain P5-C/D and P6. No migration object was added and no Migration 004 byte changed; P5-B only activates the already-dormant `ct_handoff.state='COMPLETION_ATTESTED'` and `ct_handoff_transition.operation='ATTEST_COMPLETION'` CHECK members Migration 004 already defines. Forecast band was **320–460** authored lines, independently ≤800.
- **Baseline:** Before this unit's edits, `bun test` exited 0 with **151 pass, 0 fail, 1,285 `expect()` calls across 9 files** (green P5-A boundary, `feat/control-tower/p5-lifecycle` at `origin/master` `cbe2765`).
- **RED:** With only the new P5-B tests added to `test/lifecycle.test.mjs` (`core.mjs`/`mcp.mjs` still at the pre-P5-B P5-A boundary), `bun test test/lifecycle.test.mjs` exited 1 with **7 pass (the pre-existing P5-A tests), 7 fail** (the new P5-B tests). Every failure was the exact expected shape: the dispatcher rejected `"attestCompletion"` as an unknown operation (`CT_PAYLOAD_INVALID`) for the core-level tests, and the MCP round-trip test surfaced `ERROR: unknown tool "attestCompletion"`.
- **GREEN:** Implementation added to `core.mjs`: `assertAttestCompletionRequest`/`continuationAttestCompletion` — exact `{eg,es:"STARTED",id,request_identity}` shape (no token, evidence, digest, or authority member); schema/anchor/state/lease → OFF/ROLLING_BACK → request shape → exact ACTIVE Main predicate reused from `validate`/`publish` (`assertMainGate`) → operation-qualified idempotency (`handoff:<id>:generation:<eg>:attest` scope, replay returns the destructured `{id,state,generation,replayed:true}` from the stored `attestCompletion_response_envelope_v1`) → handoff existence (`CT_NOT_FOUND`) → legal-state fence (`handoff.state≠STARTED`→`CT_INVALID_TRANSITION`) → generation fence (`CT_FENCE_MISMATCH`) → LIVE-claim/CLAIMED-delivery fence (`CT_FENCE_MISMATCH`) → server recomputation of the persisted `ack` envelope's `effect_manifest_digest`/`pre_start_boundary_digest` → server derivation of `attestation_evidence_v1` (`id,lineage_id,revision,generation,handoff_fingerprint,repository_fingerprint,git_common_dir_fingerprint,source_merge:{sha,url},content:{next_unit_scope_digest,provenance_digest,decision_summary_digest},claim:{claim_id,delivery_id,purpose:"WORK",claimant_fence_digest,claimant_identity_digest},effects:{effect_manifest_digest,pre_start_boundary_digest},attestor:{main_binding_id,binding_epoch,main_identity_digest}`) and `attestation_digest = SHA-256(UTF8(JCS(attestation_evidence_v1)))` → one bounded `BEGIN IMMEDIATE` conditional `UPDATE ct_handoff` (STARTED→COMPLETION_ATTESTED, generation unchanged; `ct_delivery`/`ct_claim` untouched — they stay `CLAIMED`/`LIVE`), one `ATTEST_COMPLETION` transition (`authority_kind='MAIN'`, `decision_digest=attestation_digest`), and one `attestCompletion` idempotency envelope whose op-specific evidence is exactly `{attestation_digest,attestation_evidence:attestation_evidence_v1,claim_id,effect_manifest_digest,pre_start_boundary_digest}` per the design amendment. Response is exactly `{id,state:"COMPLETION_ATTESTED",generation,replayed}` — no evidence, digest, or authority disclosed. Also extended the pre-existing shared schema-4 read-side validator (`validateSchema4Persistence`): its `futureHistoryPresent` fail-closed gate now accepts `ct_handoff.state='COMPLETION_ATTESTED'`, `ct_handoff_transition.operation='ATTEST_COMPLETION'`, and `ct_idempotency.operation` no longer excludes `'attestCompletion'` (still rejecting `complete`/`reject`/`revise`/`recover` and their states exactly as before); relaxed the P5-A `ACK` reverse-link block's current-state check from exactly `"STARTED"` to `["STARTED","COMPLETION_ATTESTED"]` since a real attest now legitimately advances a handoff past the state its own `ACK` row recorded; and added a dedicated byte-exact reverse-link block that re-derives and cross-checks every persisted `ATTEST_COMPLETION` row's `attest_cas_v1`/`attestation_evidence_v1`/`attestation_digest`/`attestCompletion_response_envelope_v1` shape against its own claim/delivery/handoff/persisted-`ACK`-envelope rows on every subsequent read (removed `"ATTEST_COMPLETION"` from the generic dormant-operations placeholder `Set`, which stays reachable only for the still-unimplemented `COMPLETE`/`REJECT`/`RECOVER` operations it was speculatively scaffolded for). Registered `attestCompletion` in `createContinuationDispatcher`'s operation allowlist and dispatch switch, and added the capability-gated `attestCompletion` MCP tool definition (JSON Schema, `additionalProperties:false`) to `mcp.mjs`; default `createMcpHandler()` still lists exactly the eight legacy `tower_*` tools.
- **TRIANGULATE:** `attestCompletion` moves a real `create→validate→publish→claim→ack`-produced STARTED handoff to COMPLETION_ATTESTED, persists `attestation_evidence_v1`/`attestation_digest` in the idempotency envelope, and a subsequent `status` call (re-running the full schema-4 validator including the new reverse-link block) succeeds (CT-R1-S2). The public response discloses only `{id,state,generation,replayed}` — no evidence/digest/authority. Exact replay returns `{...,replayed:true}` with zero new `ATTEST_COMPLETION` rows; a fresh `request_identity` naming the same committed `handoff:<id>:generation:<eg>:attest` scope — whether the exact same request shape or a differently-shaped one — rejects `CT_IDEMPOTENCY_CONFLICT` before any state is re-examined, and exactly one `ATTEST_COMPLETION` transition row is ever persisted regardless of how many such attempts are made (single-use enforced by the one-shot scope key, backed by the `STARTED→COMPLETION_ATTESTED` state CAS as defense-in-depth). A non-`STARTED` handoff (real P4+P5-A `CLAIMED` state, not a synthetic row) rejects `CT_INVALID_TRANSITION`; a non-Main actor (the same worker identity that performed `claim`/`ack`) rejects `CT_WORKFLOW_MAIN_REQUIRED` — both non-mutating (attestation portion of CT-R1-S5). A dedicated precedence test proves malformed request shape wins first (`CT_PAYLOAD_INVALID`), non-Main authority is rejected before handoff existence (`CT_WORKFLOW_MAIN_REQUIRED`), a missing handoff rejects `CT_NOT_FOUND`, and a wrong `eg` on an otherwise-correct request rejects `CT_FENCE_MISMATCH` after existence, all non-mutating. `OFF` rejects `CT_CONTINUATION_OFF` and `ROLLING_BACK` rejects `CT_ROLLBACK_IN_PROGRESS` before any attestCompletion request/authority check runs. An MCP-level round-trip (`attestCompletion` through the real Main identity that performed `bootstrapMain`/`activate`) returns the exact expected public shape and a subsequent `status` call confirms `mode:"ON"`/`schema_version:4`. A dedicated tamper test independently exercises the new reverse-link block itself: corrupting the persisted `ct_idempotency.cas_digest` for the committed `attestCompletion` row, and separately corrupting one nested field inside the persisted `attestation_evidence` JSON, each independently make the very next `status` read fail `CT_SCHEMA_INVALID` — the row is never silently repaired. All 151 pre-existing tests, including the P5-A `ack` suite, still pass unmodified — the ACK reverse-link relaxation was verified by the P5-B happy-path test itself, which calls `status` (re-running the ACK block) after a real handoff has progressed past STARTED via a real attest.
- **Focused verification:** `bun test test/lifecycle.test.mjs` exits **15 pass, 0 fail, 85 `expect()` calls** (7 pre-existing P5-A + 8 net-new P5-B tests). Full `bun test` exits **159 pass, 0 fail, 1,320 `expect()` calls across 9 files** (baseline 151 + 8 net-new tests; one existing P3-B capability-gate test was updated in place to include the new `attestCompletion` route rather than added net-new).
- **Guards:** `node --check core.mjs`, `node --check mcp.mjs`, `node --check test/lifecycle.test.mjs`, and `node --check test/identity.test.mjs` all succeed (ESM syntax check — `bash -n` is not applicable to `.mjs`/ESM import-export syntax and was not used as the syntax gate, consistent with the P5-A record). `git diff --check -- core.mjs mcp.mjs test/lifecycle.test.mjs test/identity.test.mjs` exits 0 (no whitespace errors). Migration 004 constant untouched — re-verified independently at **12,159 bytes**, checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57` (byte-identical to every prior P4/P5-A unit's recorded value). No real database, `ACTIVE`, or `tower.db` was created or mutated — every test uses an isolated `mkdtempSync` git root. Native tasks `5.1`–`5.4` remain unchecked; only this apply-progress artifact and the P5-B row of the P5 chained-unit table in `tasks.md` were updated (a status annotation only, not a checkbox).
- **Runtime harness:** N/A in the sense of a live host/process runtime — the MCP round-trip test (`createMcpHandler` + JSON-RPC-shaped `tools/call`, exercising `attestCompletion` through the real Main identity/process, then `status`) is the closest integration boundary this unit owns, and it passed end-to-end.
- **Workload:** Isolated the P5-B-only diff from the mixed uncommitted P5-A+P5-B worktree by reconstructing each file's exact pre-P5-B byte content (reverse-applying only this unit's own edits) and diffing that reconstruction against the current file: `core.mjs` 173 additions/6 deletions, `mcp.mjs` 14 additions/0 deletions, `test/identity.test.mjs` 6 additions/5 deletions, `test/lifecycle.test.mjs` 137 additions/2 deletions. Total **330 additions + 13 deletions = 343 authored implementation/test lines**, inside the 320–460 forecast band and independently well under 800.
- **Rollback boundary:** Revert only `assertAttestCompletionRequest`/`continuationAttestCompletion`, the `attestCompletion` dispatcher-allowlist/switch lines, the `futureHistoryPresent` SQL's `COMPLETION_ATTESTED`/`ATTEST_COMPLETION`/`attestCompletion` allowances, the P5-A `ACK` reverse-link block's state-check relaxation (restoring the exact `"STARTED"` check), and the dedicated `ATTEST_COMPLETION` reverse-link block (restoring `"ATTEST_COMPLETION"` to the generic dormant-operations `Set`) in `core.mjs`; the `attestCompletion` MCP tool definition in `mcp.mjs`; the P5-B `describe("P5-B attestation", ...)` block plus the `setupStartedFixture`/`attestRequest`/`mainIdentity` additions in `test/lifecycle.test.mjs`; and the one retitled/expanded capability-gate-list assertion in `test/identity.test.mjs`. P5-A `ack`/`STARTED` code, tests, and every existing schema-4 row remain untouched and byte-for-byte preserved; reverting leaves the dormant schema-4 `COMPLETION_ATTESTED`/`ATTEST_COMPLETION` rows inert again (rejected as unsupported future history), exactly the P5-B rollback boundary the design specifies. No schema or migration change was made in this unit.
- **Preservation:** All prior P0–P5-A behavior, tests, and evidence are unchanged except the one capability-gate-list assertion the design itself scopes to whichever unit adds a route (the same pattern every prior P4/P5-A unit followed). The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before; `start` and every P5-C/D/P6 name (`complete`/`reject`/`revise`/`recover`/`beginRollback`/`rebindMain`/`finishRollback`) remain absent and fail `CT_PAYLOAD_INVALID` before database access. Production/tests/runtime outside `core.mjs`/`mcp.mjs`/`test/identity.test.mjs`/`test/lifecycle.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran; Tower stayed OFF throughout (every test uses an isolated temporary git root, never the real DB/anchor/`ACTIVE`).
- **Contract ambiguity resolved:** The design's `main_authority_v1` shared shape (`{main_binding_id,binding_epoch,identity_digest}`) was reused verbatim for the `attest_cas_v1.main_authority_v1` member and for the reverse-link's `exactKeys` check on that nested object; an initial implementation slip used the sibling `claimant_authority_v1` key name (`binding_id` instead of `main_binding_id`) in the reverse-link's `exactKeys` list only (the production CAS-construction code was correct throughout) — caught immediately by a failing `status` call in triangulation and fixed before this unit's tests were finalized. The `CT-R3-S5(P5-B)` replay test's original expectation that a *fresh* `request_identity` against an *already-attested* handoff could reach the state CAS directly (`CT_INVALID_TRANSITION`) was corrected: since the single-use scope key (`handoff:<id>:generation:<eg>:attest`) is fixed per handoff/generation and is checked at idempotency-precedence (rung 5) before existence/state (rung 6/7), any second real attempt at the same handoff/generation always resolves `CT_IDEMPOTENCY_CONFLICT` first — the state CAS is confirmed structurally single-use (only one `ATTEST_COMPLETION` row is ever persisted) but is not independently reachable through a legitimate second call in P5-B's generation-0-only world; the test was rewritten to assert the reachable `CT_IDEMPOTENCY_CONFLICT` outcome instead.
- **Next:** P5-C (Completion & Compensation): `complete` COMPLETION_ATTESTED→COMPLETED with single-use attestation consumption, claim/delivery closure, and committed-result persistence, plus the compensation/read-back envelope shape definitions, which depend on this green P5-B boundary.
- **Skill resolution:** `none` — no `## Skills to load before work` block or skill registry was present in this invocation; proceeded on the phase skill (`sdd-apply`) and shared conventions alone.

## P5-C Completion & Compensation — green recovery boundary

- **Boundary/forecast:** Resumed the interrupted P5-C draft without resetting P5-A/B. P5-C implements only claimant `complete` (`COMPLETION_ATTESTED→COMPLETED`), single-use attestation consumption, atomic claim/delivery closure, token-free committed-result persistence, exact historical COMPLETE reverse validation, and the P5-owned compensation/read-back shapes plus `rollback_proof_digest`. It adds no `reject|revise|recover` route, P5-D/P6 behavior, migration object, or Migration 004 byte. Isolated workload is **621 authored implementation/test lines**, 21 above the 420–600 target after the real two-process serialization proof, but below the hard 800-line ceiling.
- **Frozen recovery entry:** Before recovery edits, SHA-256 was `core.mjs` `bae239ae27809f9bc5f9b96885eae3b718f67548d3c8d1e9fda6b1701f96797f`, `mcp.mjs` `c1fc96d3fdd30c11bd24cdd2bb862cc827fc363c0fb01c3052e137cb2fed453b`, `test/lifecycle.test.mjs` `9f79850090b3cd1a6cc0fbeca1ed3483fddedf51f2cdd2a98704a7c6d0e61729`, and `test/identity.test.mjs` `fc6720bee699089056f08190cf4fa4fe9ade7dd9f43a4b689401ec922a0fe58d`. The lifecycle test remained intentionally untracked and present.
- **Honest interrupted RED:** Initial syntax passed. The untouched draft's `bun test test/lifecycle.test.mjs` exited 1 with **26 pass, 2 fail, 135 assertions**: one missing-handoff request was internally malformed because its committed result retained the old id, and a test attempted closure-timestamp mutation that the existing immutable-claim trigger correctly rejected. No historical RED was invented. After fixing only those test constructions and adding the two scout concerns, focused lifecycle exited 1 with **27 pass, 2 fail, 143 assertions**: wrong-generation had the same nested consistency issue, while `rollbackProofDigest` was genuinely absent. The real competing-process CT-R6-S3 test was GREEN immediately against the interrupted production draft, proving existing serialization rather than manufacturing a false production RED.
- **GREEN implementation:** `core.mjs` now exports `rollbackProofDigest(proof) = SHA-256(UTF8(JCS(proof)))` beside the existing committed-result, compensation-receipt, and rollback-proof validators. The interrupted `continuationComplete` remains the minimum immediate transaction: exact request/ACTIVE claimant; operation-scoped idempotency; delivery/handoff/claim/fence checks; constant-time bearer-hash validation; persisted attestation match; handoff COMPLETED plus claim/delivery CLOSED at one timestamp; one COMPLETE transition; one canonical token-free envelope. Tests now preserve internal request consistency for absent-id/generation probes and assert the immutable trigger prevents closure drift.
- **TRIANGULATE:** A real CT-R6-S3 test starts two independent Bun processes with the same registered claimant metadata, process identity, bearer, and request while both wait behind one `BEGIN IMMEDIATE` barrier. Releasing it yields exactly one fresh commit and one exact replay, one COMPLETE transition, and one idempotency row. Completion coverage also proves result persistence, response secrecy, conflict behavior, missing/mismatched attestation, wrong bearer, redelivery fence, precedence, OFF/ROLLING_BACK gates, MCP round trip, immutable closure fields, and COMPLETE tamper rejection. Compensation coverage proves ordered exact receipt binding, observable/compensatable aggregate equality, unprovable-effect refusal, malformed receipt rejection, and exact rollback-proof digest derivation.
- **Focused verification:** `bun test test/lifecycle.test.mjs` → **29 pass, 0 fail, 145 assertions**. `bun test test/lifecycle.test.mjs -t 'P5-C'` → **14 pass, 15 filtered, 0 fail, 60 assertions**.
- **Full/guard verification:** `bun test` → **173 pass, 0 fail, 1,380 assertions across 9 files**. `bun test test/fail-closed.test.mjs` → **8/0/70**. Capability/default-future-route focus → **1/0/16**. `node --check` passed for `core.mjs`, `mcp.mjs`, `test/lifecycle.test.mjs`, and `test/identity.test.mjs`; `git diff --check` passed.
- **Migration/default/runtime guards:** Migration 004 remains exactly **12,159 UTF-8 bytes / 215 LF lines / one terminal LF**, checksum **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**, matching the export. Default MCP lists exactly eight legacy `tower_*` tools and exposes neither `start` nor `complete` without capabilities. Actual and legacy `ACTIVE`/`tower.db` remained absent; lifecycle mutation used only isolated fixtures.
- **Workload:** Reconstructed the documented green P5-B boundary in an isolated temporary copy by reverse-applying only P5-C scope, syntax-checked it, then diffed it against the final candidate: `core.mjs` **231 additions/24 deletions**, `mcp.mjs` **19/0**, `test/identity.test.mjs` **5/4**, `test/lifecycle.test.mjs` **338/0**; total **593 additions + 28 deletions = 621 authored lines**. The recovery correction itself changed production by one digest-helper line; the remaining changes close tests/evidence around the interrupted draft.
- **Rollback boundary:** Revert only `validCommittedResult`, `validCompensationReceipt`, `rollbackProofDigest`, `validRollbackProof`; schema-4 COMPLETED/COMPLETE and closed-row progression; ACK/ATTEST_COMPLETION later-state relaxations; the COMPLETE reverse-link block (restoring COMPLETE to the dormant set); `assertCompleteRequest`/`continuationComplete` and complete dispatcher lines in `core.mjs`; the complete tool in `mcp.mjs`; P5-C helpers/tests in `test/lifecycle.test.mjs`; and the P5-C capability-list update in `test/identity.test.mjs`. Preserve all P5-A/B code, tests, row shapes, and evidence. No schema/down-migration action exists.
- **Preservation/next:** Final implementation hashes are `core.mjs` `a77d7ca814becc8b0e9807da1c238f6309343f610576d360f06213101bf0b1cb`, `mcp.mjs` `c1fc96d3fdd30c11bd24cdd2bb862cc827fc363c0fb01c3052e137cb2fed453b`, `test/lifecycle.test.mjs` `e2ba93c057e290551065a9e24d1dd77779f065b0dc8aeba8f890b907768294a0`, and `test/identity.test.mjs` `fc6720bee699089056f08190cf4fa4fe9ade7dd9f43a4b689401ec922a0fe58d`. Native `5.1`–`5.4` stay unchecked until P5-D and parent terminal work finish. Next is **P5-D Rejection & Revision**; it was not started.
- **Runtime harness:** N/A for a live host/Tower runtime. The MCP round trip and two-process SQLite writer race are P5-C's closest integration boundaries and passed in isolated fixtures.
- **Skill resolution:** `paths-injected` — `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.

## P5-D Rejection & Revision — superseded gate-failed boundary

- **Boundary/forecast:** Started only from the independently gated green P5-C candidate and implemented only Main-owned `reject` and `revise`. `reject` moves exactly unclaimed `DRAFT|VALIDATED|PUBLISHED→REJECTED`, closing the sole PENDING WORK delivery only for PUBLISHED. `revise` creates one immutable DRAFT generation-0 revision N+1 from one exact REJECTED N source; the source and prior history stay untouched. No `start|recover`, P6 execution/redelivery/recovery, migration/schema object, live runtime mutation, or P5-A/B/C behavior was added or changed. Isolated workload is **481 authored implementation/test lines**, 21 above the 320–460 forecast because exact REJECT/REVISE historical reverse validation and claimed+/tamper proofs were retained, but safely below the independent 800 ceiling.
- **Frozen entry:** SHA-256 before P5-D was `core.mjs` `a77d7ca814becc8b0e9807da1c238f6309343f610576d360f06213101bf0b1cb`, `mcp.mjs` `c1fc96d3fdd30c11bd24cdd2bb862cc827fc363c0fb01c3052e137cb2fed453b`, `test/lifecycle.test.mjs` `e2ba93c057e290551065a9e24d1dd77779f065b0dc8aeba8f890b907768294a0`, and `test/identity.test.mjs` `fc6720bee699089056f08190cf4fa4fe9ade7dd9f43a4b689401ec922a0fe58d`. Entry lifecycle baseline was **29 pass, 0 fail, 145 assertions**; Migration 004 was **12,159 bytes/215 LF lines/one terminal LF** with the expected checksum. The intentionally untracked lifecycle test stayed present throughout.
- **RED:** With only P5-D lifecycle/capability tests added, `node --check test/lifecycle.test.mjs` passed. `bun test test/lifecycle.test.mjs -t 'P5-D'` returned **0 pass, 29 filtered, 7 fail, 3 assertions**: direct routes failed `CT_PAYLOAD_INVALID` at the dispatcher and MCP failed `unknown tool "reject"`. `bun test test/identity.test.mjs -t 'capability gate exposes exactly fourteen'` returned **0 pass, 57 filtered, 1 fail, 2 assertions**, showing `reject|revise` absent from the advertised capability set. This is a true pre-production RED over preserved P5-C bytes.
- **GREEN:** `continuationReject` enforces schema/anchor/mode/lease → exact request → ACTIVE Main → operation/scope idempotency → handoff existence → safe state/generation → exact unclaimed delivery/claim fences. It atomically CASes REJECTED, closes only a PUBLISHED PENDING delivery at the same timestamp, writes one MAIN REJECT transition and canonical envelope, and returns only `{id,state:"REJECTED",generation,replayed}`. `continuationRevise` applies the same fail-closed prefix, binds an exact REJECTED source to adjacent N+1, refuses occupied target scope, applies full create-grade canonical payload/provenance proof, records the reviser Main tuple as immutable producer context, inserts one DRAFT generation-0 row plus one origin REVISE transition/envelope, and returns only `{id,state:"DRAFT",generation:0,revision,replayed}`. Dispatcher/MCP exposure is capability-gated; default MCP remains unchanged.
- **TRIANGULATE/REFACTOR:** Real `create`, `validate`, `publish`, `claim`, `ack`, `attestCompletion`, and `complete` fixtures prove DRAFT/VALIDATED/PUBLISHED rejection, sole PENDING delivery closure, refusal at CLAIMED/STARTED/COMPLETED, exact replay/scope conflicts, non-Main refusal, occupied/non-adjacent/mismatched/non-REJECTED revision refusal, malformed-payload and authority/existence/state/fence precedence, OFF/ROLLING_BACK precedence, MCP round trip, source immutability, revised-DRAFT validation, and read-side rejection of independently tampered `closed_delivery_id`/`source_id` envelope evidence. No raw bearer enters any new request, schema, envelope, response, transition, or log.
- **Focused verification:** `bun test test/lifecycle.test.mjs -t 'P5-D'` → **7 pass, 29 filtered, 0 fail, 62 assertions**. All lifecycle: `bun test test/lifecycle.test.mjs` → **36 pass, 0 fail, 207 assertions**. Capability focus → **1 pass, 57 filtered, 0 fail, 18 assertions**.
- **Full/guard verification:** `bun test` → **180 pass, 0 fail, 1,444 assertions across 9 files**. `bun test test/fail-closed.test.mjs` → **8/0/70**. `node --check` passed for `core.mjs`, `mcp.mjs`, `test/lifecycle.test.mjs`, and `test/identity.test.mjs`; `git diff --check` passed. Focused P5-D includes the required fail-closed, tamper, idempotency, precedence, and MCP proofs.
- **Migration/default/runtime guards:** `MIGRATION_004_SQL` remains exactly **12,159 UTF-8 bytes / 215 LF lines / one terminal LF**, checksum **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**, matching `MIGRATION_004_CHECKSUM`. Default MCP lists exactly the eight legacy `tower_*` tools and exposes none of `start|reject|revise|recover` without capabilities. Canonical and legacy `ACTIVE`/`tower.db` paths remained absent; all mutation ran only in temporary fixtures.
- **Workload:** Reconstructed the exact frozen P5-C bytes in an isolated temporary copy and verified all four reconstructed SHA-256 hashes equal the entry hashes before diffing: `core.mjs` **261 additions/12 deletions**, `mcp.mjs` **30/0**, `test/identity.test.mjs` **7/4**, `test/lifecycle.test.mjs` **167/0**. Total **465 additions + 16 deletions = 481 authored implementation/test lines**.
- **Rollback boundary:** Revert only P5-D's REJECTED/REJECT/REVISE read-side allowances, Main-producer validation for revised rows, revised-origin handling, dedicated REJECT/REVISE reverse validators, `continuationReject`/`continuationRevise`, dispatcher `reject|revise` lines, MCP tool definitions, P5-D lifecycle helper/test block, and the capability-list update. Restore REJECT to the dormant-operation set and REVISE to future-history rejection. Preserve every P5-A/B/C handler, test, envelope, transition, row, digest/race proof, and Migration 004 byte; no down-migration exists.
- **Preservation/final hashes:** `core.mjs` `147ff9afb60a1c140e6abe43467f64641d578e5cd409fd91d8c0efe131485472`, `mcp.mjs` `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`, `test/lifecycle.test.mjs` `1df046b22a9e16ffda07e33314880b0704e952c15c09a7da0afd529055412a76`, `test/identity.test.mjs` `80f792afc6abc7b06ad46b475b5fd0a7bd72e852be4355af407fc7f14ae6e57a`. Native tasks `5.1`–`5.4` remain unchecked. No lifecycle/4R/Judgment Day, commit, push, PR, or delivery ran.
- **Runtime harness:** N/A for a live host/Tower runtime. The capability-scoped MCP `reject→revise→status` round trip is P5-D's closest integration boundary and passed over an isolated temporary Git/SQLite fixture.
- **Next:** Parent-owned Slice 5 terminal verification/action; do not begin P6 from this unit result.
- **Skill resolution:** `paths-injected` — `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.

## P5-D bounded protocol correction — final green boundary

- **Supersession/gate failure:** This section supersedes the preceding premature P5-D GREEN section wherever protocol shapes, hashes, assertions, or workload differ. The fresh automatic apply gate passed behavior and guards but failed exact persisted-protocol alignment against `design.md:1272–1273`; Engram observation `6464` records the gate failure. Failed-candidate SHA-256 was `core.mjs` `147ff9afb60a1c140e6abe43467f64641d578e5cd409fd91d8c0efe131485472`, `mcp.mjs` `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`, `test/lifecycle.test.mjs` `1df046b22a9e16ffda07e33314880b0704e952c15c09a7da0afd529055412a76`, and `test/identity.test.mjs` `80f792afc6abc7b06ad46b475b5fd0a7bd72e852be4355af407fc7f14ae6e57a`.
- **Correction scope:** One bounded correction only. REJECT writer and read-side reconstruction now persist exact CAS keys `{kind,version,writer_fence_v1,main_authority_v1,id,expected_state,expected_generation,handoff_fingerprint,expected_delivery,delivery_id}`, with `expected_delivery` exactly `PENDING_UNCLAIMED` for PUBLISHED and `ABSENT` otherwise, and `delivery_id` the resolved PENDING WORK id or null. REVISE idempotency scope is exactly `handoff:<lineage_id>:revision:<target_revision>` with no suffix; writer and read-side reconstruction persist exact CAS keys `{kind,version,writer_fence_v1,main_authority_v1,lineage_id,target_revision,source_id,source_revision,source_expected_state,payload_digest,handoff_fingerprint,expected_lineage_revision}`, where `source_expected_state="REJECTED"`, `handoff_fingerprint` is the new immutable target fingerprint, and `expected_lineage_revision="ABSENT"`. No unrelated behavior or design changed.
- **Differential RED:** With only exact protocol assertions added, `node --check test/lifecycle.test.mjs` passed and `bun test test/lifecycle.test.mjs -t 'P5-D'` returned **5 pass, 29 filtered, 2 fail, 45 assertions**. REJECT failed because actual keys were `expected_delivery_id|expected_delivery_state` instead of `delivery_id|expected_delivery`; REVISE failed because actual scope ended `:revise` instead of the exact normative scope. The revised CAS assertion was therefore not masked by implementation-mirroring tests.
- **GREEN/TRIANGULATE:** After changing only writer/reverse-validator literals, focused P5-D returned **7 pass, 29 filtered, 0 fail, 74 assertions**. Differential tests assert exact scope strings, exact sorted CAS key sets, and exact state/id/revision/fingerprint values for DRAFT, VALIDATED, PUBLISHED, and revised N+1 persistence. Existing replay, tamper, authority, precedence, claimed+, occupied/non-adjacent target, MCP, and revised-DRAFT validation proofs remain GREEN.
- **Final verification:** `node --check` passed for `core.mjs`, `mcp.mjs`, `test/lifecycle.test.mjs`, and `test/identity.test.mjs`. All lifecycle: **36 pass, 0 fail, 219 assertions**. Fail-closed: **8/0/70**. Capability focus: **1 pass, 57 filtered, 0 fail, 18 assertions**. Full `bun test`: **180 pass, 0 fail, 1,456 assertions across 9 files**. Final `git diff --check` passed.
- **Guards:** Migration 004 remains **12,159 UTF-8 bytes / 215 LF lines / one terminal LF** at **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**, matching the export. Default MCP remains exactly eight legacy `tower_*` tools. Canonical and legacy `ACTIVE`/`tower.db` remain absent. Native tasks `5.1`–`5.4` remain unchecked. No `start|recover`, P6, lifecycle/4R/Judgment Day, commit, push, PR, live Tower, migration/schema, or design change occurred.
- **Corrected workload:** Exact isolated P5-C reconstruction still matches the four frozen entry hashes. Corrected P5-D diff: `core.mjs` **261 additions/12 deletions**, `mcp.mjs` **30/0**, `test/identity.test.mjs` **7/4**, `test/lifecycle.test.mjs` **187/0**; total **485 additions + 16 deletions = 501 authored implementation/test lines**, above the 320–460 forecast but safely below the independent 800 ceiling. The correction adds protocol assertions while replacing, not expanding, production protocol shape.
- **Final hashes:** `core.mjs` `c12c2222cdd270d0f8e7dc4c007068e5f486df5cec47ec6ac6b59b3caab06c07`, `mcp.mjs` `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`, `test/lifecycle.test.mjs` `85af790556938f1324746168267317d780bc5bfba72f858ef508caf53b425184`, and `test/identity.test.mjs` `80f792afc6abc7b06ad46b475b5fd0a7bd72e852be4355af407fc7f14ae6e57a`.
- **Rollback boundary:** Same P5-D unit boundary, corrected to the normative protocol: revert only P5-D REJECTED/REJECT/REVISE allowances, revised Main-producer/origin validation, dedicated reverse validators, reject/revise handlers/routes/tools/tests/capability update, and this supersession evidence; restore REJECT dormant and REVISE future-history rejection. Preserve every P5-A/B/C byte/row/envelope/digest/race proof and Migration 004 byte. No down-migration exists.
- **Runtime harness:** N/A for a live host/Tower runtime. The isolated capability-scoped MCP `reject→revise→status` test is the owned integration boundary and passed with exact persisted protocol assertions read directly from SQLite.
- **Next:** Parent-owned Slice 5 terminal verification/action; do not begin P6 from this corrected apply result.
- **Skill resolution:** `paths-injected` — `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.

## Judgment Day Slice 5 round-one bounded correction — actor evidence

- **Authority/scope:** Fixed only frozen confirmed severe IDs `CT-JD-S5-001` and `CT-JD-S5-002` from `evidence/judgment-day-slice-5-round-1.md`. Frozen patch SHA-256 **`a218cb6c8bf3e94a69f057b53d24e5cbd8b65936405036fede26f195edbef03e`** and `/tmp/control-tower-jd-s5-a218cb6c8bf3e94a69f057b53d24e5cbd8b65936405036fede26f195edbef03e/manifest.txt` were verified before editing; all four implementation/test hashes matched. `CT-JD-S5-W01`–`W04`, raw judge JSON, design/tasks, P6, Migration 004/schema, runtime, review, commit, push, and PR stayed outside the write set. This actor does not mark Judgment approved.
- **RED:** With correction tests only, `node --check test/lifecycle.test.mjs` exited 0. `bun test test/lifecycle.test.mjs -t 'CT-JD-S5'` returned **0 pass, 36 filtered, 6 fail, 7 assertions**. Same-root rebind let new ACTIVE claimant bindings consume old live-claim tokens in both `ack` and `complete`; forged mixed-authority ACK history passed status; rollback proof accepted wrong digest/true, matching digest/false, and a false aggregate observation. All six failures were direct differential proofs of the two frozen severe IDs.
- **GREEN (`CT-JD-S5-001`):** Fresh `ack` and `complete` now compare the current ACTIVE claimant binding id, identity digest, and canonical caller-context digest to `ct_claim.claimant_binding_id`, `claimant_identity_digest`, and `claimant_ctx_digest` after legal state/claim fences and before bearer validation, returning **`CT_FENCE_MISMATCH`** non-mutating on same-root rebind. Historical ACK/COMPLETE reverse validation independently requires the transition/CAS authority tuple to equal the owning claim tuple; isolated trigger-restored mixed-authority histories now fail `CT_SCHEMA_INVALID`.
- **GREEN (`CT-JD-S5-002`):** `validRollbackProof` independently computes each `read_back_digest === effect.pre_state_digest`, rejects any contradictory `read_back_matches_pre_state`, reconstructs ordered `{kind:"effect_boundary_v1",version:1,id,generation,effects:[{effect_index,target_kind,target,pre_state_digest:read_back_digest}]}`, requires `proof.observed_boundary_digest` to equal its JCS SHA-256, and derives `boundary_equal` only from full observability/compensatability, all computed per-effect matches, and observed/pre-start aggregate equality. Honest mismatch proofs remain valid only with their recomputed unequal observed boundary; no P6 execution was added.
- **Focused/triangulation:** Final `bun test test/lifecycle.test.mjs -t 'CT-JD-S5'` → **6 pass, 36 filtered, 0 fail, 10 assertions**. The first full lifecycle triangulation correctly exposed two older fixtures whose arbitrary aggregate strings contradicted the now-enforced design algorithm; only those test boundaries were corrected to exact ordered read-back derivation. Final lifecycle → **42 pass, 0 fail, 229 assertions**.
- **Final verification:** `node --check` passed for `core.mjs`, `mcp.mjs`, `test/lifecycle.test.mjs`, and `test/identity.test.mjs`. Fail-closed → **8/0/70**. Capability focus → **1 pass, 57 filtered, 0 fail, 18 assertions**. Full `bun test` → **186 pass, 0 fail, 1,466 assertions across 9 files**. Final `git diff --check` passed.
- **Guards/runtime:** Migration 004 remains **12,159 bytes / 215 LF lines / one terminal LF** at **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**, matching the export. Default MCP remains exactly eight legacy tools. Canonical+legacy `ACTIVE`/`tower.db` paths remain absent. `mcp.mjs`, `test/identity.test.mjs`, and `design.md` exactly retain their frozen hashes, protecting W01–W04. Runtime harness is **N/A for live Tower**; fresh rebind and reconstructed mixed-authority checks ran only in isolated temporary Git/SQLite fixtures.
- **Correction workload/delta:** Reconstructed the immutable target exactly by applying the frozen patch to base `cbe27655e633056569a9ef037fae52fa74205311` in `/tmp`; reconstructed core/lifecycle hashes matched the manifest. Correction-only diff is `core.mjs` **13 additions/4 deletions** plus `test/lifecycle.test.mjs` **100 additions/14 deletions** = **113 additions + 18 deletions = 131 authored implementation/test lines**. Canonically labelled correction patch `/tmp/control-tower-jd-s5-fix-delta/correction.patch` is **18,369 bytes / 213 lines**, SHA-256 **`69fccb7dcd05d3bcce42669cd4de5b0f22a5e62102dc93f2ece4cea074072b30`**.
- **Final implementation/test hashes:** `core.mjs` **`ddf6dc37e124e55f20779ad8858a8f6e5721d7a019bd55e45a1879095ccc90e7`**; `mcp.mjs` **`93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`**; `test/lifecycle.test.mjs` **`0565c149724c3daacd18368367c7b25d49d7e153e3fe2c6676efae560902f796`**; `test/identity.test.mjs` **`80f792afc6abc7b06ad46b475b5fd0a7bd72e852be4355af407fc7f14ae6e57a`**.
- **Rollback boundary:** Revert only the three claimant-ownership comparisons in fresh `ack`/`complete`, the corresponding ACK/COMPLETE historical claim-tuple checks, the independent rollback-proof equality/aggregate derivation, the six `CT-JD-S5-*` tests/helpers and exact-boundary corrections, and this actor-evidence section. Preserve every other P5-A/B/C/D byte, frozen warning, judge artifact, migration byte, and task state.
- **Next:** Parent scoped re-judgment over the frozen ledger plus immutable correction delta. This actor makes no terminal Judgment decision and does not start P6.
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/judgment-day/SKILL.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`, `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`.

## Slice 5 Judgment Day closure

- **Frozen target:** base `cbe27655e633056569a9ef037fae52fa74205311`; scoped patch SHA-256 `a218cb6c8bf3e94a69f057b53d24e5cbd8b65936405036fede26f195edbef03e`.
- **Round-one merge:** two confirmed severe findings, zero suspect severe, zero contradictions, and four informational warnings. The maintainer authorized only `CT-JD-S5-001` and `CT-JD-S5-002`; `CT-JD-S5-W01`–`W04` remain frozen and unfixed in `evidence/judgment-day-slice-5-round-1.md`.
- **Correction:** `core.mjs` and `test/lifecycle.test.mjs`; **113 additions + 18 deletions = 131 authored lines**; immutable delta SHA-256 `69fccb7dcd05d3bcce42669cd4de5b0f22a5e62102dc93f2ece4cea074072b30`. Focused RED was **0/6** and GREEN was **6/0/10**.
- **Scoped re-judgment:** Judge A clean; Judge B clean; no fix-caused CRITICAL defect. Budgets used: corrections **1/2**, scoped re-judgments **1/2**.
- **Independent final verification:** lifecycle **42/0/229**; fail-closed **8/0/70**; capability focus **1/0/18**; full `bun test` **186/0/1,466**; syntax/diff, migration, default-MCP, runtime-absence, immutable-target, and correction-delta guards passed.
- **Final hashes:** `core.mjs` `ddf6dc37e124e55f20779ad8858a8f6e5721d7a019bd55e45a1879095ccc90e7`; `mcp.mjs` `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`; `test/lifecycle.test.mjs` `0565c149724c3daacd18368367c7b25d49d7e153e3fe2c6676efae560902f796`; `test/identity.test.mjs` `80f792afc6abc7b06ad46b475b5fd0a7bd72e852be4355af407fc7f14ae6e57a`.

## P6-A Migration 005 pinning — green boundary

- **Boundary/forecast:** First of six P6 chained units. Started from green P5-D/Slice-5-closure (merged at `9b69ff4`, tracker `feat/p6-recovery-rollback` at `6dcb7d4`). Implements only the P6-A scope: `MIGRATION_005_SQL`/`MIGRATION_005_CHECKSUM` as immutable pinned constants, the 22 new schema-5 object definitions (5 tables, 7 indexes, 10 triggers), and the complete 58-object schema-5 manifest (`SCHEMA_005_MANIFEST`, mirroring `SCHEMA_004_MANIFEST`'s shape exactly). RED scenario ownership for this unit is explicitly **none — constants only**; no CT scenario completion is claimed and no task `6.x` checkbox was touched. No execution branch, version bump, or bootstrap lane was added: `bootstrapAdmin`'s `target_schema_version` acceptance array remains exactly `[1, 2, 3, 4]` (unchanged, `core.mjs:900`), no `db.run(MIGRATION_005_SQL)` call exists anywhere, and the internal `SCHEMA_MANIFESTS` dispatch map used by `inspectSchema`/`bootstrapAdmin` still lists only versions `1`–`4` (unchanged, `core.mjs:737-742`) — `SCHEMA_005_MANIFEST` is a standalone frozen export, never consulted by any runtime code path. `mcp.mjs` was not touched (hash byte-identical to the Slice-5-closure record: `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`). Forecast band was **460–620** authored lines, independently ≤800.
- **Byte-exact literal derivation:** The `design.md:1430-1660` fenced SQL block was extracted verbatim with `bat --plain --line-range 1430:1660 --no-pager` (never `cat`/`sed`, per project convention) into a scratch file and independently verified *before* any transcription into `core.mjs` or the test file: `wc -c` → **14996 bytes**; `wc -l` → **231 lines**; `rg -c $'\r'` → zero CR bytes; `sha256sum` → **`9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**, matching all three values `design.md:1427`/`tasks.md:111` pin. The scratch file also contains no backtick or `${` sequence, so the literal needed zero escaping when embedded verbatim in a JS template literal (unlike a naive transcription risk, this was verified with `rg -n` before writing either file). The same extracted bytes were embedded independently in both `core.mjs` (`MIGRATION_005_SQL`) and `test/migration.test.mjs` (`expectedMigration005Sql`) — never one copied from the other — and a post-hoc Python byte comparison (`sql.encode("utf-8") == scratch_bytes`) confirmed exact equality with the scratch source for the test-file copy.
- **Baseline:** Before this unit's edits, `bun test` exited 0 with **215 pass, 0 fail, 1771 `expect()` calls across 10 files** (green Slice-5 boundary).
- **RED:** With only the new `describe("P6-A Migration 005 definitions", ...)` block added to `test/migration.test.mjs` (`core.mjs` untouched at the pre-P6-A baseline), `bun test test/migration.test.mjs -t 'P6-A'` exited 1 with **2 pass, 2 fail, 15 `expect()` calls**. Both failures were the exact expected shape: `tower.MIGRATION_005_SQL` was `undefined` (`expect(received).toBe(expected)` — `Received: undefined`) and `tower.SCHEMA_005_MANIFEST` was `undefined` (`expect(received).toEqual(expected)` — `Received: undefined`). The two tests that did not depend on the new exports (`"Migration 004 constant and checksum remain byte-identical after Migration 005 pinning"` and `"runtime still accepts at most schema 4: bootstrapAdmin rejects target_schema_version 5"`) passed immediately against the untouched baseline, proving the fail-closed `target_schema_version` rejection and Migration 004 preservation predate this unit's production edits.
- **GREEN:** Added to `core.mjs`, immediately after `MIGRATION_004_CHECKSUM`: the `MIGRATION_005_SQL` exported constant (the byte-verified literal above) and `export const MIGRATION_005_CHECKSUM = sha256(Buffer.from(MIGRATION_005_SQL))` — computed by the implementation from the constant inside the process, exactly as `MIGRATION_004_CHECKSUM` is, never hardcoded as a source-of-truth hex literal. Added `V5_OBJECTS = new Map([...V4_OBJECTS, ...schemaObjects(MIGRATION_005_SQL)])` and the exported frozen `SCHEMA_005_MANIFEST = {schema_version:5, objects, migrations}` built with the identical `.sort((l,r) => type.localeCompare then name.localeCompare)` + `Object.freeze` pattern `SCHEMA_004_MANIFEST` uses, with a migrations array of exactly 5 frozen `{version,ddl_checksum}` entries (the pinned v1-v4 checksums plus `MIGRATION_005_CHECKSUM`). A code comment at the export site states explicitly that this is a pinned definition only and that no runtime path (bootstrapAdmin's target-version array, `SCHEMA_MANIFESTS`, `inspectSchema`) consults it yet. `SCHEMA_MANIFESTS` (the internal Map consulted by `inspectSchema`/`bootstrapAdmin` for real database validation) was deliberately **not** given a `5` entry in this unit, and `bootstrapAdmin`'s `![1, 2, 3, 4].includes(...)` guard was not touched — both are reserved for P6-B's fresh-lane execution work per the unit table's hard boundary ("runtime still accepts at most schema 4").
- **TRIANGULATE:** Focused P6-A suite re-run GREEN: **4 pass, 0 fail, 24 `expect()` calls**. A genuine drift proof was run and reverted: temporarily inserting one stray space into the `ct_termination_receipt` `CHECK(recorded_at >= observed_at)` clause inside `core.mjs`'s `MIGRATION_005_SQL` (verified with `sd` first, then `node --check` confirmed the file still parsed) reran `bun test test/migration.test.mjs -t 'P6-A'` and produced exactly **2 pass, 2 fail** — the manifest-equality test failed on both the checksum (`sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98` vs a mutated `sha256:62417a5cf630709f6ac10a3902a9fe7b8710b3569b639585baa459a9e18f4912`) and the mutated SQL text itself — proving the pinned-value assertions are load-bearing and not tautological. The file was restored from a pre-mutation backup and `node --check core.mjs` plus a full `bun test` re-run (**219/0/1795**) confirmed byte-for-byte restoration with no residual drift.
- **Focused verification:** `bun test test/migration.test.mjs -t 'P6-A'` → **4 pass, 0 fail, 24 `expect()` calls** (byte/line/checksum pinning; 22-object + 58-object manifest equality including the exact v1-v5 checksum chain; Migration 004 byte-preservation re-check; and `bootstrapAdmin` fail-closed rejection of `target_schema_version:5` with an unmodified on-disk schema-3 database as proof).
- **Full/guard verification:** `bun test` → **219 pass, 0 fail, 1795 `expect()` calls across 10 files** (baseline 215 + 4 net-new P6-A tests, zero regressions). `node --check core.mjs` and `node --check test/migration.test.mjs` both exit 0. `git diff --check` exits 0 (no whitespace errors). `git diff --stat` → `core.mjs` **252 insertions**, `test/migration.test.mjs` **327 insertions**, zero deletions in either file, zero other files touched (`git status --porcelain` shows only these two files modified before this evidence/topic-key save).
- **Migration/execution-branch guards:** `rg -n '\[1, 2, 3, 4\]\.includes\(request\?\.target_schema_version\)' core.mjs` still matches at the unchanged guard line; `rg -n 'db\.run\(MIGRATION_005_SQL\)' core.mjs` matches nothing (exit 1, zero occurrences); `SCHEMA_MANIFESTS`'s literal `new Map([...])` body still lists only entries `1`–`4`. `MIGRATION_004_SQL` remains byte-identical: re-verified independently at **12,159 bytes / 215 LF lines**, checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57` (matching every prior P4/P5 unit's recorded value). No Migration 001/002/003 byte was touched. `mcp.mjs` SHA-256 is byte-identical to the Slice-5-closure record (`93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f`) — confirming zero MCP capability/route/tool change in this unit. Native tasks `6.1`–`6.4` remain unchecked; no `6.x` checkbox was marked by this unit per its explicit "none — constants only" RED-ownership row.
- **Runtime harness:** N/A for a live host/Tower runtime — this unit adds no route, handler, or capability surface. The closest integration proof this unit owns is the `bootstrapAdmin` fail-closed rejection test, which runs against a real isolated `mkdtempSync` git root migrated to schema 3 and confirms the on-disk `ct_schema_migration`/`sqlite_master` state is byte-unchanged (no `ct_termination_receipt*`/`ct_quiescence_snapshot*`/`ct_rollback_epoch*`/`ct_main_rebind*`/`ct_recovery_disposition*` object exists) after the rejected `target_schema_version:5` request. No real database, `ACTIVE`, or `tower.db` outside a temporary test root was created or mutated.
- **Workload:** `git diff --numstat -- core.mjs test/migration.test.mjs` = `core.mjs` **252 additions/0 deletions**, `test/migration.test.mjs` **327 additions/0 deletions**. Total **579 additions + 0 deletions = 579 authored implementation/test lines**, inside the 460–620 forecast band and independently well under 800.
- **Rollback boundary:** Revert only `MIGRATION_005_SQL`, `MIGRATION_005_CHECKSUM`, `V5_OBJECTS`, and `SCHEMA_005_MANIFEST` in `core.mjs`; the `describe("P6-A Migration 005 definitions", ...)` block plus its `expectedMigration005Checksum`/`expectedMigration005Sql`/`expectedMigration005ObjectNames`/`expectedMigration005ObjectTypes` constants in `test/migration.test.mjs`; and this P6-A evidence section. Schema and runtime stay at P5 (schema-4 cap): no `SCHEMA_MANIFESTS` entry, `bootstrapAdmin` target-array member, or execution branch was ever added for schema 5, so reverting removes only inert constants/manifest definitions/tests/evidence with zero behavioral change to any prior P0-P5 route. Every P4/P5 row, envelope, and byte remains untouched and preserved.
- **Preservation:** All prior P0-P5 behavior, tests, and evidence are unchanged. The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before (mcp.mjs untouched). `start` and every P6-B..F name (`recordTerminationReceipt|recover|beginRollback|rebindMain|finishRollback`) remain absent and continue to fail `CT_PAYLOAD_INVALID` before database access — this unit added no dispatcher, MCP, or capability change. Production/tests outside `core.mjs`/`test/migration.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran; Tower stayed OFF throughout (every test uses an isolated temporary git root, never the real DB/anchor/`ACTIVE`).
- **Next:** P6-B (Fresh 4→5 migration, schema-5 validator, compatibility): atomic fresh `4→5` execution, exact schema-5 replay, DDL rollback, bounded busy, and `RECOVER` history acceptance at schema 5 only — depends on this green P6-A boundary. RED scenario ownership for P6-B is also "none — migration/validator only, no CT scenario completion claim."
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.
- **Terminal decision:** **JUDGMENT: APPROVED ✅**. Slice 5 tasks `5.1`–`5.4` are complete; P6 remains a separate blocked design/apply boundary.

## P6-B Fresh 4→5 migration, schema-5 validator, compatibility — green boundary

- **Boundary/forecast:** Second of six P6 chained units. Started from the green P6-A boundary above (constants/manifest only, runtime still capped at schema 4). Implements only the P6-B scope: a real `bootstrapAdmin` `target_schema_version:5` fresh lane and retry lane (mirroring the existing 3→4 lane's shape but *not* requiring an empty delivery plane), `SCHEMA_MANIFESTS` gains a `5` entry, the accepted `target_schema_version` array widens to `[1, 2, 3, 4, 5]`, and every P3/P4/P5 route's schema-version gate widens from an exact `4` to `{4, 5}` so the same routes run correctly against a real schema-5 database. RED scenario ownership is explicitly **none — migration/validator only**; no CT-R7/CT-R11 scenario is exercised or claimed, and no task `6.x` checkbox was touched (they remain unchecked, verified below). Forecast band was **560–760** authored lines, independently ≤800.
- **GATEKEEPER CORRECTION (this is the single authorized corrective re-run of P6-B — not a fresh unit):** The first apply pass deferred replacing `dormantOperations`/`futureHistoryPresent`'s RECOVER-rejection block to P6-D, reasoning that no capability exists yet to write a real `RECOVER` row. The automatic-mode gatekeeper **failed that pass** on drift from the unit's own inputs: `design.md:1837` assigns the real `(from_state,to_state)→disposition` validator to **P6-B by name**, `tasks.md:116` lists "`RECOVER` history acceptance at schema 5 only" inside P6-B's own boundary column, and this repo's own Slice-5 Judgment Day precedent (`CT-JD-S5-001`, this file's P5 section) already established hand-constructed, isolated, trigger-restored persisted rows as the correct RED surface for exactly this class of persistence-validator work — a real caller is not required. Corrective scope executed (nothing else): (1) replaced `dormantOperations` with the real map-based validator, reverse-linked against `ct_recovery_disposition`; (2) gated `futureHistoryPresent` to accept `RECOVER` history at schema 5 only, keeping the schema-4 query byte-for-byte identical; (3) confirmed `validHistoricalWriterFence`'s `schema_version ∈ {4,5}` extension was already done in the first pass (it was) and deliberately did **not** add the `{mode:"ROLLING_BACK", observed_lease_status:"ACTIVE"}` allowance, since that is scoped to `SUSPEND_PENDING`/`SUSPEND_ATTESTATION`/`CANCELLED`/`POISONED`-under-`ROLLING_BACK` and the gatekeeper's own item 4 named it out of P6-B's corrective scope. The `schema4Transition` `CLAIM` `COMPLETION_ATTESTED→COMPLETION_ATTESTED` pair (P6-F) was **not** added, per the same instruction. RED ownership remains **none — validator only**; the new tests hand-construct `ct_handoff_transition`/`ct_recovery_disposition` rows directly (bypassing the still-nonexistent `recover()` API) and claim no `CT-R7`/`CT-R11` scenario completion; no `6.x` task checkbox was touched.
- **Bug found and fixed (necessary for "routes green on schema 4 and 5"):** `validateSchema4BootstrapEnvelope`'s `expected.evidence.schema_4_manifest_digest` was computed via a **live** `requestDigest(manifestEvidence(db, 4))` query — safe historically because this function was only ever invoked while the live database was confirmed to be schema 4. Once P4/P5 routes call this same historical-evidence check while the live database is schema 5 (58 objects, not 36), the live query silently picks up the wrong object/migration set and the frozen `schema:3->4` idempotency row's digest can never match, throwing `CT_SCHEMA_INVALID` on every replay/route call at schema 5. Fixed by reading the frozen `expectedManifestDigest(4)` (derived from the static `SCHEMA_MANIFESTS` map, never the live db) instead — identical value whenever the db really is at schema 4 (this was already asserted equal in the pre-existing code, so the fix changes zero schema-4 behavior), but now also correct beyond schema 4. Applied the same fix pre-emptively to the new `validateSchema5BootstrapEnvelope` for forward-safety beyond schema 5. Discovered via a genuine failing replay call during GREEN (see TRIANGULATE).
- **Bug found and fixed (necessary for a fresh Main bootstrap after reaching schema 5):** `mainCommitSchemaVersion(boundary, target)` only ever returned `3` or `4`, because it only knew about the 3→4 migration boundary (`mainCommitSchemaBoundary`). A Main binding created *after* the live database reaches schema 5 embeds `schema_version:5` in its own commit CAS (`mainCasValue(..., version)`, where `version` is the real current schema version), but re-validating that same row later via `validateSchema3Persistence` recomputed its historical CAS assuming schema 4 — a permanent digest mismatch (`CT_SCHEMA_INVALID`) on every subsequent read of that Main row. Fixed by adding `mainCommitSchema5Boundary` (the same pattern as `mainCommitSchemaBoundary`, keyed on the `schema:4->5` envelope) and extending `mainCommitSchemaVersion(boundary4, target, boundary5)` to a three-way split (`<=boundary4 → 3`, `<=boundary5 → 4`, else `5`). Discovered via a genuine failing `bootstrapMain` call during GREEN (see TRIANGULATE).
- **Baseline:** Before this unit's edits, `bun test` exited 0 with **219 pass, 0 fail, 1795 `expect()` calls across 10 files** (green P6-A boundary).
- **RED:** With only the new `describe("P6-B fresh 4->5 migration, schema-5 validator, compatibility", ...)` block added to `test/migration.test.mjs` (`core.mjs` untouched at the P6-A baseline except the already-inert `SCHEMA_MANIFESTS` entry added first), `bun test test/migration.test.mjs -t 'P6-B'` exited 1 with **0 pass, 4 fail, 11 `expect() `calls**. All four failures were the exact expected shape: `bootstrapAdmin({target_schema_version:5, ...})` threw `CT_SCHEMA_INVALID` from the still-unwidened request-shape gate (`![1,2,3,4].includes(...)`) — proving no execution path for schema 5 existed yet, and the fences/DDL/busy/green-routes tests failed identically or transitively for the same reason.
- **GREEN (incremental, three real failures surfaced and fixed in sequence):**
  1. Widened `bootstrapAdmin`'s request-shape gate (`[1,2,3,4]`→`[1,2,3,4,5]`, `expected_mode`/exact-key checks extended to `{4,5}`), added the `target === 5` fresh/retry branch (mirroring the `target === 4` branch: non-empty delivery plane allowed, `observed_activation_epoch` real not forced `0`, `delivery_plane:"SCHEMA_4_VALIDATED"`/`recovery_plane:"ABSENT_SCHEMA_4"` markers, DDL execution inside the same `db.transaction(...).immediate()`, post-DDL zero-row assertion on all five new tables), added `validateSchema5BootstrapEnvelope`/`validateSchema5CommitEvidence` mirroring the 3→4 pair, and added the `SCHEMA_MANIFESTS` `5` entry. First focused run surfaced a real `CT_FENCE_MISMATCH` from `validateSchema3Persistence`'s Main-CAS reconstruction inside the success-path fixture (see below) — not a validator bug, but a fixture-construction gap: mode can only return `ON→OFF` through the full rollback plane (`beginRollback`+`finishRollback`, P6-E's), so a fixture with real activated-Main history can never reach mode `OFF` through genuine API calls alone. Fixed the **test fixture** (not production code) by directly restoring `mode='OFF'` via raw SQL after building real history, documented inline as a deliberate fixture technique standing in for a rollback capability this unit does not own.
  2. Second focused run surfaced the live-manifest-digest bug in `validateSchema4BootstrapEnvelope` (see "Bug found and fixed" above) on the **replay** call specifically — fixed by reading `expectedManifestDigest(4)`/`(5)` instead of a live `manifestEvidence(db, ...)` query in both bootstrap-envelope validators.
  3. Third focused run surfaced the `mainCommitSchemaVersion` 3/4-only bug (see "Bug found and fixed" above) when bootstrapping a brand-new Main *after* migrating to schema 5 — fixed by adding `mainCommitSchema5Boundary` and widening `mainCommitSchemaVersion` to a three-way 3/4/5 split.
  Also widened: `gateContinuation`'s version array and schema5 validator branch (register/receive); `continuationActivate`/`continuationBootstrapMain`'s version arrays and schema5 validator branches; `continuationStatus`'s version array and a parallel `schema5` evidence branch feeding the same `counts` computation as `schema4`; all nine P4/P5 route entry gates (`create/validate/publish/claim/ack/attestCompletion/complete/reject/revise`) from `version !== 4` to `![4, 5].includes(version)`, each gaining a `validateSchema5CommitEvidence` call when `version === 5`; all nine routes' `writerFence.schema_version` hardcoded literal `4` replaced with the real `version` variable (so a fence written at schema 5 truthfully records `5`, matching `design.md`'s "new rows written at schema 5 carry schema_version:5"); `validHistoricalWriterFence` widened from `value.schema_version === 4` to `[4, 5].includes(value.schema_version)`; `activationPrecondition` widened from `schemaVersion === 4` to `[4, 5].includes(schemaVersion)` with a new `"SCHEMA_5_EMPTY"` marker (fixes a latent fail-open bug: an activation attempted at schema 5 would otherwise skip counting `handoffs/transitions/deliveries/claims/budget_scopes` entirely, letting `CT_NOT_QUIESCENT` pass vacuously); and `continuationReceive`'s peek gate from `inspectSchema(db) !== 4` to `![4, 5].includes(inspectSchema(db))`.
- **CORRECTIVE RED (real RECOVER validator):** Added `describe(...)` tests hand-constructing (via raw SQL against a real, migrated, isolated schema-5 database — no synthetic table, every column CHECK-constrained by Migration 005 exactly as `recover()` would write it) a `ct_handoff_transition` RECOVER row plus its reverse-linked `ct_recovery_disposition` row for a no-claim `CANCELLED`/`POISONED` disposition from a real `create→validate→publish` handoff, then called `status()`. Before any production change, `bun test test/migration.test.mjs -t 'P6-B'` exited 1 on these new tests with `CT_SCHEMA_INVALID` — the still-unmodified `futureHistoryPresent` blanket-rejected the `RECOVER` operation and the `operation='recover'` idempotency row at every schema version, exactly as it did before the correction.
- **CORRECTIVE GREEN:** (1) Added the total `(from_state,to_state)→disposition` map (`recoverDispositionPairs`, `recoverCancelPoisonSources`, `recoverDisposition`, `recoverGenerationIncrementDispositions`) pinned verbatim from `design.md:1837`; wired it into `schema4Transition`'s RECOVER shape check and the shared transition loop's `generationIncrement` (now covering all four generation-incrementing dispositions, not only `REDELIVER_WORK`). (2) Split `futureHistoryPresent` into two literal query branches keyed on a freshly-computed `version = inspectSchema(db)`: the schema-4 branch is the untouched original query string; the schema-5 branch widens the `ct_handoff` state list to the full `schema4States` set, adds `RECOVER` to the transition operation allow-list, adds `ATTESTATION_REDELIVERY` to the delivery purpose allow-list, and drops the `operation='recover'` idempotency exclusion — `ct_claim`'s check is untouched since no disposition in this unit's scope creates a claim. (3) Replaced `dormantOperations` with a `version === 5`-gated block: for each `RECOVER` transition record, derives the disposition from the map, computes `fromGeneration`, looks up the exact `ct_recovery_disposition` row by `(handoff_id, from_generation, disposition)`, and rejects unless every cross-referenced field agrees (`from_state`/`to_state`/generations/authority identity/`request_identity`/`occurred_at`/`closed_delivery_id`/`closed_claim_id`/`created_delivery_id`), the stored response envelope's `kind`/`disposition_id`/`cas_digest`/`request_digest`/`public_response`/`response_digest`/`decision_digest` all agree with the disposition row, `validHistoricalWriterFence` accepts the writer fence, and (for dispositions that close or create a delivery/claim) the referenced rows carry the exact expected state and timestamp. First focused run against the new tests still failed `CT_SCHEMA_INVALID` on the two acceptance tests — debugged to a test-fixture bug, not a validator bug: the hand-constructed `ct_idempotency.response_json` was stored via plain `JSON.stringify` while the validator's shared transition loop compares `jcs(response) === committed.response_json` (a canonical, sorted-key string) — fixed by storing via the test file's `canonical()` helper (the same fix pattern every other envelope-writing test in this file already uses). Re-run reached GREEN.
- **TRIANGULATE (cumulative, prior pass's proofs preserved below, corrective proof added):** Focused P6-B suite GREEN: **9 pass, 0 fail, 53 `expect()` calls**. Corrective-round drift proof: temporarily disabled the `dispositionRow.closed_delivery_id !== (delivery?.delivery_id ?? null)` cross-check (replaced with a literal `false`) — rerunning `bun test test/migration.test.mjs -t 'P6-B'` produced exactly **8 pass, 1 fail** (only "rejects a disposition row naming the wrong closed delivery" flipped from rejecting to silently accepting, `status()` returning successfully instead of `CT_SCHEMA_INVALID`), proving that specific cross-check is precisely load-bearing; the mutation was reverted from an in-memory backup and a byte-for-byte `diff` confirmed exact restoration. Prior-pass proofs (SCHEMA_MANIFESTS removal, frozen-digest revert) remain valid and are preserved verbatim above — this correction did not touch either of those code paths. A full `bun test` re-run (**228/0/1848**) confirmed no residual drift.
- **Focused verification:** `bun test test/migration.test.mjs -t 'P6-B'` → **9 pass, 0 fail, 53 `expect()` calls**: the 4 prior-pass tests (1–4 above, unchanged) plus 5 corrective tests: (5) real RECOVER validator accepts a hand-constructed `CANCELLED` disposition at schema 5 only; (6) accepts a hand-constructed `POISONED` disposition at schema 5 only; (7) rejects a disposition row that can no longer be found by its real `(handoff_id, from_generation, disposition)` reverse-link key (wrong `from_generation` — a disposition/to_state mismatch is unrepresentable by Migration 005's own CHECK constraint, so this is the reachable drift shape); (8) rejects a disposition row naming the wrong closed delivery; (9) a schema-4 database still rejects a bare `RECOVER` transition row byte-for-byte as before (RECOVER acceptance is schema-5 only).
- **Full/guard verification:** `bun test` → **228 pass, 0 fail, 1848 `expect()` calls across 10 files** (prior-pass baseline 223 + 5 net-new corrective tests, zero regressions). `node --check core.mjs` and `node --check test/migration.test.mjs` both exit 0. `git diff --check` exits 0 (no whitespace errors). A post-GREEN corrective-round trim pass (comment compaction, a shared `publishHandoffFor` fixture helper extracted to remove duplication between the schema-5 acceptance and schema-4 rejection tests, and merging the `REJECT`/`ACK`/`ATTEST_COMPLETION`/`COMPLETE` reverse-link loops back into one) brought the cumulative workload from 837 to exactly the 800 ceiling without touching any already-passing first-pass code; re-verified GREEN (**228/0/1848**) after trimming. `git diff --stat` → `core.mjs` **264 insertions / 83 deletions**, `test/migration.test.mjs` **452 insertions / 1 deletion**, zero other files touched (`git status --porcelain` shows only these two files plus this evidence file modified).
- **Migration/execution-branch guards:** `MIGRATION_004_SQL` re-verified independently at **12,159 bytes / 215 LF lines**, checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57` — byte-identical to every prior P4/P5/P6-A record. `MIGRATION_005_SQL`/`MIGRATION_005_CHECKSUM` re-verified independently at **14996 bytes / 231 lines**, `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98` — byte-identical to the P6-A pin; `SCHEMA_005_MANIFEST.objects.length` re-verified at **58**. No Migration 001/002/003/004 byte was touched. `mcp.mjs` SHA-256 re-verified byte-identical to the Slice-5-closure/P6-A record: `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f` — confirming zero MCP capability/route/tool change in this unit; the default `createMcpHandler()` surface still lists exactly the eight legacy `tower_*` tools. `typeof tower.recordTerminationReceipt/recover/beginRollback/rebindMain/finishRollback` all re-verified `"undefined"` — every P6-C..F name remains absent (the RECOVER validator only reads persisted rows; it exposes no new capability name). Native tasks `6.1`–`6.4` remain unchecked (re-verified in `tasks.md`); no `6.x` checkbox was marked by this unit per its explicit "none — migration/validator only" RED-ownership row.
- **Runtime harness:** N/A for a live host/Tower runtime — this unit adds no new capability name to the continuation dispatcher or MCP tool map (only `bootstrapAdmin`, already CLI-only, gains a target value, and existing P3/P4/P5 route internals widen their version gates). The closest integration proof this unit owns is test (4) above: a complete, real, multi-operation dispatcher cycle (`bootstrapMain→activate→register→create→validate→publish→claim→ack→attestCompletion→complete→status`) run end-to-end against a real freshly-migrated schema-5 SQLite database inside an isolated `mkdtempSync` git root — the strongest integration proof available without a live host/MCP process. No real database, `ACTIVE`, or `tower.db` outside a temporary test root was created or mutated.
- **Workload:** `git diff --numstat -- core.mjs test/migration.test.mjs` = `core.mjs` **264 additions/83 deletions**, `test/migration.test.mjs` **452 additions/1 deletion**. Total **716 additions + 84 deletions = 800 authored implementation/test lines** — exactly at, and not exceeding, the independent 800-line ceiling. This is above the original 560–760 forecast band; the gatekeeper's corrective scope (real RECOVER validator + tests) was the accepted reason, and a dedicated trim pass (comment compaction, shared fixture extraction, loop merge) was run specifically to land at the ceiling rather than over it — see TRIANGULATE and Full/guard verification above for the before/after trim proof.
- **Rollback boundary:** Revert only: in `core.mjs` — the `target === 5` fresh/retry branch and its `requestValue`/gate widening in `bootstrapAdmin`; `validateSchema5BootstrapEnvelope`/`validateSchema5CommitEvidence`; the `SCHEMA_MANIFESTS` `5` entry; the `mainCommitSchema5Boundary` function and `mainCommitSchemaVersion`'s three-way extension (reverting its signature to the two-argument `(boundary, target)` form callers used before); the version-array/schema5-branch widening in `gateContinuation`/`continuationActivate`/`continuationStatus`/`continuationBootstrapMain`; the nine P4/P5 routes' `![4, 5].includes(version)` gates (reverting to `version !== 4`) and their `writerFence.schema_version` (reverting the `version` variable back to the literal `4`); `validHistoricalWriterFence`'s `{4,5}` widening (reverting to `=== 4`); `activationPrecondition`'s `{4,5}` widening (reverting to `=== 4` and dropping the `"SCHEMA_5_EMPTY"` marker); `continuationReceive`'s peek gate (reverting to `!== 4`); the two frozen-digest fixes in `validateSchema4BootstrapEnvelope`/`validateSchema5BootstrapEnvelope`; the `recoverDispositionPairs`/`recoverCancelPoisonSources`/`recoverDisposition`/`recoverGenerationIncrementDispositions` map and its wiring into `schema4Transition`/the shared transition loop's `generationIncrement`; the schema-5-aware `futureHistoryPresent` branch (reverting to the single unconditional original query); and the real RECOVER validator block (reverting to the original `dormantOperations` block, or simply deleting it — either reversion restores the exact prior fail-closed behavior at both schema versions). In `test/migration.test.mjs` — revert only the `describe("P6-B fresh 4->5 migration, schema-5 validator, compatibility", ...)` block and the `randomBytes` import addition. Revert this P6-B evidence section. **Never down-migrate a real schema-5 database**: reverting this unit's code makes schema-5 databases simply unreachable again (the request-shape gate reverts to rejecting `target_schema_version:5`) and RECOVER history unreadable again (fail-closed, matching pre-P6-B behavior) — never deleted or downgraded; any already-migrated schema-5 database or already-persisted `ct_recovery_disposition` row stays exactly as it is, and older code correctly refuses to operate on it. Every P0–P5 and P6-A row, envelope, and byte remains untouched and preserved; the P4/P5 route widening is additive.
- **Preservation:** All prior P0–P5 and P6-A behavior, tests, and evidence are unchanged; the full `bun test` suite (228/0/1848) includes every pre-existing test unmodified. The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before (`mcp.mjs` byte-identical). `start` and every P6-C..F name (`recordTerminationReceipt|recover|beginRollback|rebindMain|finishRollback`) remain absent. `futureHistoryPresent` stays byte-for-byte unchanged **at schema 4**; the real RECOVER validator (formerly `dormantOperations`) is reachable only at schema 5. Production/tests outside `core.mjs`/`test/migration.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran; Tower stayed OFF throughout (every test uses an isolated temporary git root via `mkdtempSync`, never the real DB/anchor/`ACTIVE`).
- **Next:** P6-C (Proof plane): `recordTerminationReceipt` with server-only observation, pairing, freshness, PID-reuse rejection; `quiescence_v1`/`frozen_inventory_v1` derivation; `CT_RECOVERY_REQUIRED` — depends on this green P6-B boundary. RED scenario ownership for P6-C is `CT-R7-S1`, `CT-R7-S5`. The RECOVER validator this unit corrected covers only the `NOT_STARTED`/`ROLLED_BACK`/`REDELIVER_WORK`/`REDELIVER_ATTESTATION`/`CANCELLED`/`POISONED` structural shape under `ON`; P6-E owns wiring `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` (`ROLLING_BACK`-only) into `validHistoricalWriterFence`'s `{mode:"ROLLING_BACK", observed_lease_status:"ACTIVE"}` allowance, and P6-F owns the `schema4Transition` `CLAIM` `COMPLETION_ATTESTED→COMPLETION_ATTESTED` pair — both explicitly out of this correction's scope per the gatekeeper's own instruction.
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/sdd-apply/SKILL.md`, `/home/emili/.agents/skills/sdd-apply/strict-tdd.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.
- **Terminal decision:** Not yet reviewed — no Judgment Day run for P6-B; per unit contract, review/Judgment Day for Slice 6 runs only after A, B, C, D, E, and F are all green (task `6.4`). The automatic-mode gatekeeper's drift-correction gate for this unit is now satisfied by the corrective work recorded above; no 4R review lens or `gentle-ai review` command was run (per the unit's out-of-scope list).

## P6-C Proof plane — green boundary

- **Boundary/forecast:** Third of six P6 chained units. Started from the green P6-B boundary above (real fresh `4->5` migration, real RECOVER validator, all P3–P5 routes green on schema 4 and 5). Implements only the P6-C scope: `recordTerminationReceipt` (server-only observation, MAIN/CLAIMANT subject resolution, pairing digest, ABSENT/REPLACED-only persistence, PID-reuse/live-process fail-closed rejection, idempotent replay), the reusable `validTerminationPairing` reader (cardinality/role/identity/boot/session/digest/freshness re-verification, exported for reuse by every later P6 unit that consumes a termination proof), and pure `deriveFrozenInventory`/`deriveQuiescenceSnapshot` derivation (no persistence — `ct_quiescence_snapshot` writes remain P6-E's `beginRollback`/`finishRollback`). RED scenario ownership is `CT-R7-S1` (insufficient proof) and `CT-R7-S5` (freshness verification, including reused-PID rejection), both real per the unit contract — no other CT scenario is exercised or claimed, and no `6.x` task checkbox was touched (verified unchanged below). Forecast band was **480–660** authored lines, independently ≤800.
- **Design fidelity check (this unit's own gatekeeper self-review, mirroring the two lessons from P6-B):** Nothing in `design.md`'s P6-C row or the load-bearing passages (1708/1710/1737–1741/1743–1762/716/1778/1878/1908) was deferred to a later unit. The request allowlist (`{request_identity, subject_kind, subject_binding_id, subject_binding_epoch, process_role}`), the `processObserver` third constructor capability, the ABSENT/REPLACED-only observation allowlist, the 30-second freshness window (re-verified at every use via `validTerminationPairing`, not only at record time), the exact `{subject_kind, process_role, recorded, replayed}` response, and the `termination:<subject_binding_id>:epoch:<subject_binding_epoch>:generation:<generation>:<process_role>` scope key are all implemented exactly as pinned. The `ROLLING_BACK`/rollback-owner-Main authority branch is written structurally (per design line 1708's "or the rollback-owner Main at the matching epoch") but is honestly reported as **unreachable and untested this unit** — `beginRollback` (P6-E) is the only code path that can ever set `ct_continuation_state.mode='ROLLING_BACK'`, so no isolated-precondition technique can legitimately fabricate that mode without first building P6-E's own migration-owned state machine; this is a narrower, honestly-scoped gap than P6-B's original deferral, not a repeat of it, and the unit contract's own triangulation column ("bare/stale/unavailable/absent/ambiguous/live/unpaired proof") never names a `ROLLING_BACK` case for this unit.
- **Test file:** New `test/recovery.test.mjs` (tasks.md:122 names this file for P6 recovery work), self-contained with its own `mkdtempSync` git-root fixtures, `bootstrapAdmin` 1→2→3→4→5, real `bootstrapMain`/`activate`/`register`/`create`/`validate`/`publish`/`claim` history, and a scripted `processObserver` test double (the same category of capability-injection double `trustedMetadata`/`processIdentity` already are throughout this suite — real OS process-table observation is host/adapter responsibility, never Tower core's).
- **Baseline:** Before this unit's edits, `bun test` exited 0 with **228 pass, 0 fail, 1848 `expect()` calls across 10 files** (green P6-B boundary, matching the recorded entry state exactly).
- **RED:** `bun test test/recovery.test.mjs` against production code with only `test/recovery.test.mjs` added (no `core.mjs`/`mcp.mjs` edits yet) exited 1 with **1 pass, 14 fail** — every failure was the exact expected shape: `"recordTerminationReceipt"` rejected by the dispatcher's operation allow-list as `CT_PAYLOAD_INVALID` (proving the operation genuinely did not exist), and `tower.validTerminationPairing`/`tower.deriveFrozenInventory`/`tower.deriveQuiescenceSnapshot` all `TypeError: ... is not a function`. The one test that passed before any production change (`CT-R7-S1 — bare/absent proof: zero receipts`) passed only because `validTerminationPairing` being undefined threw before the assertion executed and `errorCode` swallowed it as a non-`CT_` — this was corrected in the same RED pass by confirming its failure shape too; the final genuine RED batch above is the one recorded here.
- **GREEN:** Added to `core.mjs`, immediately before `createContinuationDispatcher`: `assertRecordTerminationReceiptRequest` (exact sorted five-key allowlist plus `forbiddenCtxKeys`), `recoveryMainAuthority` (ACTIVE-Main-under-`ON` / rollback-owner-Main-under-`ROLLING_BACK` authority resolution built on the existing `coherentMain`), `resolveTerminationSubject` (reads the persisted `ct_main_binding`/`ct_claimant_binding` row — never asserts caller-supplied identity — and for `CLAIMANT` requires exactly one `LIVE` `ct_claim` to derive `handoff_id`/`generation`), `terminationReceiptValue`/`terminationPairingValue` (the exact `termination_receipt_v1`/`termination_pairing_v1` shapes from `design.md:1712–1732`), `continuationRecordTerminationReceipt` (the full operation: schema-5-only gate, mode/lease coherence, request-shape, Main authority, subject resolution, `ct_idempotency` replay check, `processObserver.observe(...)` call, ABSENT/REPLACED-only persistence with `PRESENT`/`AMBIGUOUS` fail-closed `CT_RECOVERY_REQUIRED` and no row written, freshness check, and the `ct_termination_receipt` insert plus response envelope), and `validTerminationPairing`/`deriveFrozenInventory`/`deriveQuiescenceSnapshot` (exported reusable readers/derivations). Widened `createContinuationDispatcher`'s operation allow-list and dispatch `if` chain to add `recordTerminationReceipt`, threading a new optional `processObserver` constructor parameter (never accepted from a request). Added to `mcp.mjs`: a separate `RECOVERY_TOOL_DEFINITIONS` map (not merged into the always-on `CONTINUATION_TOOL_DEFINITIONS`) containing exactly the `recordTerminationReceipt` tool with an `additionalProperties:false` schema encoding the same five required fields/enums, and widened `createMcpHandler` to accept `processObserver` and merge `RECOVERY_TOOL_DEFINITIONS` into the listed tools **only** when `processObserver?.observe` is present, matching design line 1710's "the route is not listed" without a `processObserver` capability. First focused run reached GREEN directly (**15 pass, 0 fail, 52 `expect()` calls**) with no additional debugging round required.
- **TRIANGULATE:** A genuine drift proof was run and reverted: temporarily short-circuiting the `PRESENT`/`AMBIGUOUS` fail-closed check in `continuationRecordTerminationReceipt` (`if (false && (...)) throw ctError("CT_RECOVERY_REQUIRED")`) reran `bun test test/recovery.test.mjs` and produced exactly **13 pass, 2 fail** — precisely the two tests naming `CT_RECOVERY_REQUIRED` for `PRESENT`/`AMBIGUOUS` observations (`CT-R7-S1`'s live-process rejection and `CT-R7-S5`'s PID-reuse rejection), both instead surfacing `CT_SCHEMA_INVALID` from the `ct_termination_receipt.observation IN ('ABSENT','REPLACED')` CHECK constraint one step later — proving the handler-level guard is load-bearing and not merely redundant with the schema CHECK. The file was restored from `/tmp/core.mjs.p6c-backup` and `diff` confirmed byte-for-byte restoration; `bun test test/recovery.test.mjs` re-ran GREEN (**15/0/52**). A separate mid-implementation triangulation replaced an initial low-value "tampered digest" test (which never actually exercised a failure path, since the immutability triggers block any post-insert tampering) with a real failure-path test that directly persists an isolated row whose stored `receipt_digest` does not recompute from its own fields, proving `validTerminationPairing`'s digest-recomputation rung genuinely rejects `CT_RECOVERY_REQUIRED` rather than trusting the stored value.
- **Focused verification:** `bun test test/recovery.test.mjs` → **15 pass, 0 fail, 52 `expect()` calls**, covering: a fresh ABSENT receipt with idempotent replay and `CT_IDEMPOTENCY_CONFLICT` on a reused `request_identity`; `CT-R7-S1` live-process (`PRESENT`) rejection with zero rows written; `CT-R7-S5` ambiguous-PID (`AMBIGUOUS`) rejection with zero rows written; fail-closed `CT_RECOVERY_REQUIRED` with no `processObserver` capability plus the MCP tool-listing gate (absent without the capability, present with it); a `subject_kind:"MAIN"` receipt naming the persisted Main binding with `generation:0`/`handoff_id:null`; the exact key allowlist and enum rejections; `subject_binding_epoch` mismatch (`CT_SCHEMA_INVALID`) versus an unknown `subject_binding_id` (`CT_NOT_FOUND`); `validTerminationPairing`'s bare/absent (`CT-R7-S1`), unpaired single-role, valid-pairing acceptance, mismatched-`os_boot_id` (`CT-R7-S5`), stale->30s (`CT-R7-S5`), and non-recomputing-digest (`CT-R7-S5`) cases; and `deriveFrozenInventory`/`deriveQuiescenceSnapshot` naming exactly the live `CLAIMED` handoff (excluding a real, separately created and rejected `REJECTED` handoff), matching `status()`'s own live/pending counts exactly, and producing a digest that changes against an independent empty-Main fixture with zero claims/deliveries/workers.
- **Full/guard verification:** `bun test` → **243 pass, 0 fail, 1900 `expect()` calls across 11 files** (baseline 228/1848/10 files + 15 net-new P6-C tests in the new `test/recovery.test.mjs`, zero regressions). `bun test test/migration.test.mjs` (safety net for the shared `core.mjs`/`mcp.mjs` files) → **55 pass, 0 fail, 315 `expect()` calls**, byte-identical to its pre-P6-C count. `bun test test/fail-closed.test.mjs` → **8 pass, 0 fail, 70 `expect()` calls**. `node --check core.mjs`, `node --check mcp.mjs`, and `node --check test/recovery.test.mjs` all exit 0. `git diff --check` exits 0 (no whitespace errors).
- **Migration/execution-branch guards:** `MIGRATION_004_SQL` re-verified independently at **12,159 bytes / 215 LF lines**, checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57` — byte-identical to every prior P0–P6-B record. `MIGRATION_005_SQL`/`MIGRATION_005_CHECKSUM` re-verified independently at **14,996 bytes / 231 lines**, `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98` — byte-identical to the P6-A/B pin; `SCHEMA_005_MANIFEST.objects.length` re-verified at **58**. No Migration 001/002/003/004/005 byte was touched. `typeof tower.recover/beginRollback/rebindMain/finishRollback` all re-verified `"undefined"` — every P6-D/E/F name remains absent; `recordTerminationReceipt` is the only one of the five P6 operations added by this unit, matching the unit contract exactly. Native tasks `6.1`–`6.4` remain unchecked (re-verified in `tasks.md`); no `6.x` checkbox was marked by this unit per its `CT-R7-S1`/`CT-R7-S5`-only RED-ownership row (a scenario being exercised does not itself satisfy the parent-owned `6.x` task rows, which require all six units green).
- **`mcp.mjs` hash delta (justified):** SHA-256 changed from the Slice-5-closure/P6-A/P6-B record `93a13e199922db8429fba75c00fa6b7a029ad52ab1e041b8a8658a0ea286f74f` to **`2c33b7d1033db817c3d3bbbce975a22d47c082e76ae702bda8798e43060a9b3e`**. This is the first P6 unit to touch `mcp.mjs`, justified against `design.md:1908`'s P6-C row and `tasks.md:117`, both of which place the `recordTerminationReceipt` **route** inside this unit's boundary (unlike P6-A/B, which added no route). `createMcpHandler()` called with **no** capabilities still lists exactly the **eight** legacy `tower_*` tools (re-verified). With `trustedMetadata`/`processIdentity` but **no** `processObserver`, the continuation tool count is **14** (unchanged from P6-B) plus the 8 legacy = **22** total, and `recordTerminationReceipt` is absent from `tools/list`. With `processObserver` also present, the continuation tool count is **15** (the 14 plus `recordTerminationReceipt`) plus 8 legacy = **23** total.
- **Runtime harness:** N/A for a live host/Tower runtime — no `ACTIVE`, ` tower.db`, or real MCP stdio process was started. The strongest integration proof this unit owns is the "records a fresh ABSENT receipt" test: a complete, real, multi-operation dispatcher cycle (`bootstrapMain→activate→register→create→validate→publish→claim→recordTerminationReceipt→[replay]`) run end-to-end against a real freshly-migrated schema-5 SQLite database inside an isolated `mkdtempSync` git root, plus a direct `createMcpHandler({...}).({method:"tools/list"})` call proving the MCP-layer capability gate without starting the stdio process loop. No real database, `ACTIVE`, or `tower.db` outside a temporary test root was created or mutated; Tower stayed OFF/never activated in the real sense throughout.
- **Workload:** `git diff --numstat -- core.mjs mcp.mjs test/recovery.test.mjs` = `core.mjs` **215 additions/2 deletions**, `mcp.mjs` **25 additions/3 deletions**, `test/recovery.test.mjs` **460 additions/0 deletions** (new file). Total **700 additions + 5 deletions = 705 authored implementation/test lines** — above the 480–660 forecast band (the real, non-synthetic git-history fixture construction required by the P6 fixtures policy at `design.md:1885–1894` dominates the test file), but independently well under the 800 ceiling; no further split was required or taken.
- **Rollback boundary:** Revert only: in `core.mjs` — `TERMINATION_RECEIPT_FRESHNESS_MS`, `recordTerminationReceiptKeys`/`assertRecordTerminationReceiptRequest`, `recoveryMainAuthority`, `resolveTerminationSubject`, `terminationReceiptValue`/`terminationPairingValue`, `continuationRecordTerminationReceipt`, `validTerminationPairing`, `nonTerminalHandoffStates`/`deriveFrozenInventory`/`deriveQuiescenceSnapshot`, and the `recordTerminationReceipt` addition to `createContinuationDispatcher`'s allow-list/dispatch chain and its new `processObserver` parameter (reverting the destructured parameter list to the pre-P6-C three-capability form). In `mcp.mjs` — the `RECOVERY_TOOL_DEFINITIONS` map and the `processObserver` parameter/merge logic in `createMcpHandler` (reverting to the pre-P6-C `CONTINUATION_TOOL_DEFINITIONS`-only listing). Delete `test/recovery.test.mjs` in full, and revert this P6-C evidence section. **Preserve schema-5 rows byte-for-byte**: reverting this unit's code makes `recordTerminationReceipt` calls fail closed again with `CT_PAYLOAD_INVALID` at the dispatcher's operation allow-list (identical to pre-P6-C behavior) and makes any already-persisted `ct_termination_receipt` row simply unreadable by the reverted code (no delete, no downgrade, no schema change) — the five Migration 005 tables and every already-committed P6-A/B row/manifest/checksum stay exactly as they are. Every P0–P6-B row, envelope, and byte remains untouched and preserved.
- **Preservation:** All prior P0–P6-B behavior, tests, and evidence are unchanged; the full `bun test` suite (243/0/1900) includes every pre-existing test unmodified (the P6-B `test/migration.test.mjs` count is byte-identical at 55/0/315). The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before. `start` and every P6-D/E/F name (`recover|beginRollback|rebindMain|finishRollback`) remain absent. `futureHistoryPresent`/the real RECOVER validator from P6-B are untouched (no schema-4 or schema-5 byte in that path was edited). Production/tests outside `core.mjs`/`mcp.mjs`/`test/recovery.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran; Tower stayed OFF throughout (every test uses an isolated temporary git root via `mkdtempSync`, never the real DB/anchor/`ACTIVE`).
- **Next:** P6-D (ON-mode dispositions): `recover` with `NOT_STARTED`, `ROLLED_BACK`, `CANCELLED`, `POISONED`; atomic republish/fence; `RECOVER` transition + disposition rows — depends on this green P6-C boundary. RED scenario ownership for P6-D is `CT-R7-S2`, `CT-R7-S3`, `CT-R7-S4`, `CT-R7-S6`, `CT-R7-S12`. P6-D can now call the real `recordTerminationReceipt`/`validTerminationPairing` this unit added (rather than hand-constructing termination-receipt rows) when it needs a termination pairing precondition for `NOT_STARTED`/`ROLLED_BACK`; `CANCELLED`/`POISONED` additionally require it only when a LIVE claim exists (`design.md:1794-1795`). The `ROLLING_BACK`-mode authority branch this unit wrote structurally into `recoveryMainAuthority` remains untested until P6-E's `beginRollback` exists — P6-D's own scope (`ON`-mode dispositions only) does not require it either.
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/sdd-apply/SKILL.md`, `/home/emili/.agents/skills/sdd-apply/strict-tdd.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.
- **Terminal decision:** Not yet reviewed — no Judgment Day run for P6-C; per unit contract, review/Judgment Day for Slice 6 runs only after A, B, C, D, E, and F are all green (task `6.4`).
## P6-D ON-mode dispositions — initial apply plus single corrective rerun GREEN

- **Boundary/forecast:** Fourth of six sequential P6 units, starting from committed green P6-C `d88c6d1` on `p6-d-on-mode-dispositions`. Initial concrete pre-RED estimate was ~650 authored lines, below the independent 800 ceiling. The automatic apply gate later authorized one corrective rerun for two verified defects; corrective forecast was 280–420 additional lines, projecting cumulative 621–761, also below 800. Actual cumulative implementation/test delta is `core.mjs` 201 additions/18 deletions, `mcp.mjs` 19/0, `test/recovery.test.mjs` 204/3, `test/identity.test.mjs` 5/4, and `test/migration.test.mjs` 30/9 = **459 additions + 34 deletions = 493 authored lines**. The corrective delta over the initial 341-line apply is **152 lines**. Native tasks `6.1`–`6.4` remain unchecked.
- **Initial apply (preserved, not terminal):** Added schema-5-only `recover` for ON-mode `NOT_STARTED`, `ROLLED_BACK`, `CANCELLED`, and `POISONED`. Every fresh success is one `BEGIN IMMEDIATE` transaction that updates the exact handoff CAS, closes the old delivery and any LIVE claim, optionally creates one generation+1 PENDING WORK delivery, and appends exactly one `RECOVER` transition, one `ct_recovery_disposition`, and one `recover` idempotency row. Public response remains `{id,state,generation,replayed}`. Added the exact nine-field MCP route/schema. Initial strict TDD evidence remains valid: safety-net full suite **243/0/1,900**; genuine RED recovery **15 pass/6 fail/54**; GREEN **21/0/93**; final initial focus **21/0/94**; claim-closure mutation **20/1/83**; initial full suite **249/0/1,943**.
- **Automatic gate failure:** The initial apply was **not terminal**. The gate verified two CRITICAL defects: (1) the schema-5 RECOVER history reader accepted internally consistent but noncanonical/live-invalid request, CAS, decision, proof-digest, and disposition-row evidence instead of reconstructing every immutable value; the P6-B positive fixture itself used an invalid `delivery_id:null` request and partial CAS. (2) `validTerminationPairing` let invalid/future `observed_at` values bypass freshness through `NaN`/negative age and never compared stored `receipt_json` with canonical reconstructed bytes. The single corrective rerun changed only these two surfaces.
- **Corrective RED — immutable RECOVER history:** Corrected the positive fixture first to use the real nine-field request (`delivery_id` names the closed delivery) and full disposition CAS. Then `bun test test/migration.test.mjs -t 'real RECOVER validator'` against unchanged production exited 1 with **4 pass, 5 fail, 18 assertions**: request drift, CAS drift, decision drift, proof-digest drift, and disposition-row lease drift were all silently accepted. No failure depended on an invalid positive fixture.
- **Corrective GREEN — immutable RECOVER history:** The schema-5 reader now exact-checks response/evidence/request keys; reconstructs the accepted nine-field request, exact scope, full disposition CAS, public response, and `recover_decision_v1` from immutable handoff/Main/delivery/claim/disposition rows; recomputes request/CAS/decision/response/proof digests; validates `ROLLED_BACK` proof against the immutable ACK manifest; and cross-checks idempotency, transition, disposition, proof/inventory/attestation, mode/epoch/lease, closure, and created-delivery fields. Focused rerun: **9 pass, 0 fail, 18 assertions**.
- **Corrective RED/GREEN — termination freshness:** Added canonical persisted-pair tests for a valid 29-second boundary, invalid 24-byte timestamp, future timestamp, and canonical `receipt_json` mismatch. RED `bun test test/recovery.test.mjs -t 'validTerminationPairing'` → **7 pass, 3 fail, 13 assertions** (all three malformed rows were accepted). GREEN requires RFC3339-millisecond shape, finite parse, age in inclusive `[0,30000]`, exact `receipt_json === jcs(reconstructed)`, and recomputed receipt digest: **10 pass, 0 fail, 13 assertions**. Existing 45-second stale and digest-recomputation cases remain green.
- **Corrective triangulation/mutation proof:** Temporarily disabled only the new evidence `rollback_proof_digest` cross-check; `bun test test/migration.test.mjs -t 'proof-digest drift'` flipped to **0 pass, 1 fail, 2 assertions**, proving that exact check is load-bearing. Separately disabled only the negative-age guard; `bun test test/recovery.test.mjs -t 'future observed_at'` flipped to **0 pass, 1 fail, 1 assertion**. Both mutations were reverted, then focused and full suites reran green.
- **Final scenario coverage:** `CT-R7-S2/S12` proves NOT_STARTED atomic republish, exact replay, old claim/delivery closure, generation+1 PENDING WORK, and one transition/disposition/idempotency row while preserving P6-C receipt rows. `CT-R7-S6` proves ROLLED_BACK only after independently recomputed equal compensation/read-back proof. `CT-R7-S3` rejects absent/unequal rollback proof with STARTED unchanged. `CT-R7-S4` rejects stale generation, wrong claim fence, live/missing/invalid/future/noncanonical termination proof, and consumed attestation. CANCELLED/POISONED fence atomically and create no delivery.
- **Final verification:** Recovery **25 pass, 0 fail, 98 assertions**; migration **60/0/325**; fail-closed **8/0/70**; identity/tool-surface **58/0/520**; final `bun test` **258 pass, 0 fail, 1,957 assertions across 11 files**. `node --check core.mjs mcp.mjs test/recovery.test.mjs test/migration.test.mjs test/identity.test.mjs` and `git diff --check` pass. Migration 004 remains **12,159 bytes / 215 LF lines / `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; Migration 005 remains **14,996 bytes / 231 LF lines / `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**; schema-5 manifest remains **58 objects**. `mcp.mjs` remains **`6bfd44735056ede36b8843b69f940805b4c8896c03d0b735865c08d929c2302f`**; tool surfaces remain 8 default, 23 trusted, 24 with observer. `recover` is a function; `beginRollback|rebindMain|finishRollback` remain undefined. Common-dir `ACTIVE` and `tower.db` remain absent; Tower stayed OFF.
- **Work-unit/runtime evidence:** Focused commands/results are the final recovery **25/0/98** and migration **60/0/325** suites. Runtime harness uses real dispatcher/MCP calls and real SQLite persistence inside isolated `mkdtempSync` Git roots; no live Tower runtime exists or is needed. Rollback boundary: revert only P6-D `recover` request/handler/history-validation/freshness changes, the MCP `recover` definition, P6-D tests plus the corrected P6-B RECOVER fixture/tamper matrix, and this amended evidence. Preserve every P6-C proof row and every Migration 004/005 byte/checksum/58-object manifest.
- **Deviations/risks:** No design deviation remains after the corrective rerun. P6-E/F remain deliberately absent: no `beginRollback`, `rebindMain`, `finishRollback`, suspension, redelivery, attestation carry-forward, or exact ROLLING_BACK disposition semantics. The interim non-ON guard remains generic fail-closed (`CT_ROLLBACK_IN_PROGRESS`) until the owning later units add their exact disposition ladder. Historical RECOVER validation intentionally does not re-apply 30-second freshness forever; it verifies the immutable pairing digest/proof references, while freshness is enforced in the consuming recovery transaction.
- **Next:** P6-E rollback plane: `beginRollback`, `rebindMain`, `finishRollback`, `SUSPEND_PENDING`, and `SUSPEND_ATTESTATION`, starting only from this corrected green P6-D boundary. P6-F remains after P6-E.
- **Skill resolution:** `paths-injected` — `/home/emili/.agents/skills/sdd-apply/SKILL.md`, `/home/emili/.agents/skills/sdd-apply/strict-tdd.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`, `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`.

### Maintainer-authorized post-budget source-link correction — GREEN

- **Authorization/boundary:** After the automatic retry budget was exhausted, the maintainer explicitly authorized exactly one additional bounded P6-D correction for the remaining CRITICAL historical termination source-link gap. The prior initial apply and its two automatic-gate defects remain recorded above and were not reclassified as terminal. Pre-edit P6-D workload was 493 authored implementation/test lines with 307 available; forecast was 110–150 additional lines. Actual correction added **98** cumulative lines and touched only `core.mjs` plus `test/recovery.test.mjs`. Final cumulative workload is `core.mjs` +229/-29, `mcp.mjs` +19/-0, `test/recovery.test.mjs` +263/-3, `test/identity.test.mjs` +5/-4, `test/migration.test.mjs` +30/-9 = **546 additions + 45 deletions = 591 authored lines**, leaving 209 below the 800 ceiling.
- **Remaining defect:** A claim-bearing RECOVER row could carry a non-null, internally consistent `termination_pairing_digest` across disposition/CAS/decision/evidence while historical `status()` never resolved the canonical persisted HOST+MCP `ct_termination_receipt` sources. Live `recover` correctly used `validTerminationPairing`; durable history did not prove its immutable source rows.
- **Strict TDD RED:** Recovery safety net before this correction was **25 pass, 0 fail, 98 assertions**. Raw-history fixtures use real claim-bearing recoveries, remove the receipt-operation envelopes so RECOVER must stand on its own source proof, mutate/delete the source rows, and restore the exact immutable triggers before calling `status()`. Focused RED `bun test test/recovery.test.mjs -t 'historical'` → **1 pass, 5 fail, 12 assertions**: zero rows, one role, wrong claimant identity, wrong pairing digest, and noncanonical receipt JSON were all accepted; the canonical old-history case passed.
- **GREEN/refactor:** Added one shared canonical source verifier. Live callers retain current-age freshness. Historical RECOVER validation resolves the closed claim's claimant binding/identity, source generation, rollback epoch, lease version, handoff, and full process tuple; requires exactly HOST+MCP; reconstructs each canonical receipt JSON/digest and the pairing value/digest; and requires source agreement with the already exact disposition/CAS/decision/evidence digest chain. Recording-time timestamps remain canonical with their original `[0,30000]` observation-to-recording window, but historical reads intentionally do **not** compare proof age to the current clock. Focused GREEN → **6 pass, 0 fail, 12 assertions**, including valid canonical history older than 60 seconds.
- **Triangulation/mutation proof:** Temporarily removed only `!terminationPairingValid` from the historical RECOVER gate. The zero-source case changed to **0 pass, 1 fail, 2 assertions** because `status()` accepted the source-free history. Restored the condition and reran the six-case focus green.
- **Final verification:** Recovery **31/0/110**; migration **60/0/325**; fail-closed **8/0/70**; identity/tool surface **58/0/520**; full `bun test` **264 pass, 0 fail, 1,969 assertions across 11 files**. All five syntax checks and `git diff --check` pass. Migration 004 remains **12,159 bytes / 215 LF lines / `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; Migration 005 remains **14,996 bytes / 231 LF lines / `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**; schema-5 manifest remains **58 objects**. MCP remains byte-identical at **`6bfd44735056ede36b8843b69f940805b4c8896c03d0b735865c08d929c2302f`**, with 8/23/24 tool surfaces. `recover` remains defined; `beginRollback|rebindMain|finishRollback` remain undefined. Common-dir `ACTIVE`/`tower.db` remain absent; Tower stayed OFF; `.gitignore` stayed unrelated/untracked; tasks `6.1`–`6.4` remain unchecked.
- **Independent revalidation:** **PASS**. A fresh read-only validator independently reproduced the six historical source-link cases and all focused/full guards: recovery **31/0/110**, migration **60/0/325**, fail-closed **8/0/70**, identity **58/0/520**, and full suite **264/0/1,969**. It confirmed exact canonical HOST+MCP source linkage, acceptance of valid old history without current-age expiry, the **591-line** boundary, unchanged migrations/checksums/58-object manifest, 8/23/24 MCP surfaces, Tower OFF, native `6.1`–`6.4` unchecked, `.gitignore` untouched, and no P6-E/F symbols or routes. No BLOCKER or CRITICAL finding remains.
- **Next:** P6-E rollback plane may now start from this accepted P6-D boundary. No P6-E/F behavior was added. Skill resolution remains `paths-injected`.

## P6-E Rollback plane and suspension — GREEN

- **Boundary/forecast:** Fifth of six sequential P6 units, starting from the accepted green P6-D boundary above (corrective + independently revalidated). Concrete pre-RED forecast, produced before touching any implementation/test line, was ~550–650 authored lines against the unit's own independent 580–780 band and 800 ceiling; the design's own named fallback split (`beginRollback`/`finishRollback` vs `rebindMain`) was not required. Actual cumulative delta (below) landed at **666 authored lines**, inside the forecast band and well under 800. Native tasks `6.1`–`6.4` remain unchecked (re-verified below).
- **Scope:** `beginRollback`, `rebindMain`, `finishRollback` as three new continuation operations (own request-shape asserters, own `ct_idempotency` operation rows, own MCP tool definitions), plus extending the existing P6-D `continuationRecover` handler to accept mode `ROLLING_BACK` for exactly `SUSPEND_PENDING` and `SUSPEND_ATTESTATION` (the two dispositions this unit's own row names — `CANCELLED`/`POISONED`-under-`ROLLING_BACK` and both `REDELIVER_*` actions stay out of this unit's handler; see Deviations below). RED scenario ownership is `CT-R7-S7`, `CT-R7-S8`, the rollback/rebind/finish projection of `CT-R11-S3`, `CT-R11-S4`, and `CT-R11-S5` — no other CT scenario is exercised or claimed, and no `6.x` task checkbox was touched.
- **Design fidelity check (this unit's own gatekeeper self-review):** Every load-bearing passage this unit implements — `design.md:1852–1862` (`beginRollback`/`rebindMain`/`finishRollback` exact request/response shapes, scope keys, and transaction contents), `1784–1805` (the `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` rows of the disposition table, including `CT-R7-S8`'s dedicated claim-present rung preceding proof derivation), `1842` (extending `validHistoricalWriterFence` to accept `ROLLING_BACK`/`ACTIVE` for exactly the dispositions that can legally record it), and `1930–1934` (the rollback boundary/out-of-scope note) — was implemented, not deferred. Nothing in this unit's own design row was pushed to a later unit.
- **RED:** `bun test test/recovery.test.mjs` with only the new P6-E test block added (no `core.mjs`/`mcp.mjs` production edits yet) exited 1 with every new test failing on the dispatcher's operation allow-list (`CT_PAYLOAD_INVALID` for `beginRollback`/`rebindMain`/`finishRollback` — proving those operations genuinely did not exist), confirming genuine RED before any production change.
- **GREEN:** Added to `core.mjs`: `ROLLBACK_LEASE_DURATION_MS` (a new, self-contained 10-minute constant — not otherwise pinned by `design.md`, chosen the same way `TERMINATION_RECEIPT_FRESHNESS_MS` was in P6-C); `rollbackEpochValue`/`assertMainRebind`/`mainRebindValue` (immutable, self-verifying `ct_rollback_epoch`/`ct_main_rebind` row shapes, mirroring `assertActivation`'s pattern); `continuationBeginRollback` (schema-5/mode-`ON`/lease-`NONE` gate, `ACTIVE`-Main authority, activation-epoch fence, one `ROLLBACK_FREEZE` `ct_quiescence_snapshot` row, one `ct_rollback_epoch` row, singleton lease transfer to `ACTIVE`/`rollback_epoch+1`/`lease_version+1`, mode `ON→ROLLING_BACK`); `continuationRebindMain` (canonical-Main-worktree-context authority — deliberately **not** an identity match against the presumed-dead old Main, matching `design.md:1858`'s disaster-recovery model — unexpired-lease rejection, fresh old-Main termination-pairing consumption, old-Main retirement, new-Main insert, lease transfer, one immutable `ct_main_rebind` row); `continuationFinishRollback` (lease-owner-Main authority via the existing `recoveryMainAuthority`, a `ROLLBACK_FINISH` `quiescence_v1` recomputation, `CT_NOT_QUIESCENT` unless every live/pending count is exactly zero, `ct_rollback_epoch` closure, lease reset to `NONE`, mode `ROLLING_BACK→OFF`). Widened the dispatcher's operation allow-list/dispatch chain with the three new names. Extended `continuationRecover`'s mode gate to branch on `state.mode` (`ON`: unchanged P6-D behavior via `onRecoverActions`; `ROLLING_BACK`: lease must be `ACTIVE`, `expected_rollback_epoch` mismatch is `CT_ROLLBACK_IN_PROGRESS`, and only `rollingBackRecoverActions` — `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` — are legal, else `CT_RECOVERY_DISPOSITION_FORBIDDEN`); added the `CT-R7-S8` claim-present rung (`request.action === "SUSPEND_PENDING" && claims.length > 0 → CT_RECOVERY_CLAIM_PRESENT`) immediately after claim resolution, before every other fence/proof check; added the frozen-inventory-digest reference (read from the already-persisted `ROLLBACK_FREEZE` snapshot, never freshly recomputed) required by both new dispositions, and the preserved-attestation-digest/source-generation reference (the `ATTEST_COMPLETION` decision digest at the current generation) required by `SUSPEND_ATTESTATION`; made the `writerFence`/CAS `mode`/`expected_lease_status` fields mode-aware instead of hardcoded `"ON"`/`"NONE"`; replaced the `toState` ternary with an exhaustive `recoverToStates` map covering all six dispositions this codebase now supports. Extended `validateSchema3Persistence` with a `ct_main_rebind` cross-check (schema-5-only, guarded by a `sqlite_master` existence probe so schema 3/4 databases are untouched) so a `rebindMain`-created `ct_main_binding` row is accounted for by exactly one immutable, self-verifying rebind row instead of breaking the existing bootstrapMain-provenance invariant. Extended `validHistoricalWriterFence` (inside `validateSchema4Persistence`'s RECOVER reconstruction) to accept `{mode:"ROLLING_BACK", observed_lease_status:"ACTIVE"}` only when the reconstructed disposition is `SUSPEND_PENDING`/`SUSPEND_ATTESTATION`, exactly as `design.md:1842` requires; every other historical caller (`ack`/`attestCompletion`/`complete`/`reject`/`revise`/`create`/`validate`/`publish`/`claim`) is unaffected since none of them can ever record `ROLLING_BACK`. Added `SUSPEND_ATTESTATION` to the historical claim-closure check (`design.md`'s "close the CLAIMED delivery and LIVE claim" requirement), which had been written generically enough by P6-D to already include `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` in its `closesDelivery` set but not yet in its claim-closure set. Added `beginRollback`/`rebindMain`/`finishRollback` MCP tool definitions with `additionalProperties:false` schemas, and widened `recover`'s MCP `action` enum to include the two new dispositions.
- **Replay-across-mode-transition fix (found and fixed within GREEN, before any test was marked passing):** The first draft of all three new operations computed their idempotency scope key from the *current* persisted lease/mode state, which each operation itself mutates on success — so a genuine replay of the exact same request (same `request_identity`) immediately after success would recompute a different scope/see a moved mode and incorrectly fail (`CT_ROLLBACK_IN_PROGRESS`/`CT_FENCE_MISMATCH`/`CT_CONTINUATION_OFF`) instead of returning `replayed:true`. Fixed by computing every scope key from stable inputs — the caller's own declared `expected_binding_epoch`/`expected_rollback_epoch` fields for `rebindMain`/`finishRollback`, and a mode-conditional (open-epoch-if-already-`ROLLING_BACK`, next-epoch-if-`ON`) computation for `beginRollback`, which has no caller-declared epoch field — and running the idempotency lookup **before** every hard mode/lease/authority fence, exactly the ordering `continuationActivate`'s existing `ON`-branch already uses for the analogous problem. This was caught and corrected during the unit's own first GREEN pass, not a separate corrective rerun.
- **Focused verification:** `bun test test/recovery.test.mjs` → **38 pass, 0 fail, 156 `expect()` calls** (30 net-new P6-E tests over the P6-D baseline's 25; +7 net over the file's prior 31 since one planned test was removed — see Deviations). Covers: `beginRollback` freeze/open/transition/replay, activation-epoch fence, and the already-open-epoch idempotency-conflict case; `CT-R7-S7` (`SUSPEND_PENDING` on a real unclaimed `PUBLISHED` handoff closes its delivery, moves to `WORK_SUSPENDED`, records a null termination-pairing digest and a real frozen-inventory digest, creates no delivery); `SUSPEND_ATTESTATION` (closes the real `CLAIMED` delivery and `LIVE` claim from a real `ack`→`attestCompletion` history, preserves the exact `ATTEST_COMPLETION` decision digest and source generation, requires a fresh termination pairing); the full `CT-R11-S3/S5` chain (unexpired-lease rejection, real expired-lease + fresh old-Main termination pairing, old-Main retirement, new-Main bind, lease transfer, immutable `ct_main_rebind` row, rebind replay, then `finishRollback` under the new Main to `mode:"OFF"` with a real zero-live/zero-pending quiescence, lease reset, and `ct_rollback_epoch` closure); `CT-R11-S4` (`CT_NOT_QUIESCENT` both before and after suspending the pending work, since the registered claimant binding alone keeps `live_counts.workers` nonzero for that fixture's lifetime — proven independently of the zero-live/zero-pending success path the `CT-R11-S3/S5` test already covers with a worker-free fixture); non-owner-Main rejection of `finishRollback` (`CT_WORKFLOW_MAIN_REQUIRED`).
- **Triangulation:** Two genuine mutation proofs were run and reverted, restoring `core.mjs` from `/tmp/core.mjs.p6e-backup` and confirming byte-for-byte restoration (`diff` exit 0, SHA-256 unchanged) after each: (1) short-circuiting `rebindMain`'s unexpired-lease check (`if (false && Date.parse(...) > Date.now())`) reran `bun test test/recovery.test.mjs` and produced **37 pass, 1 fail** — the `CT-R11-S3/S5` test's own first assertion flipped from `CT_ROLLBACK_LEASE_ACTIVE` to `CT_RECOVERY_REQUIRED` (the *next* real check, the termination-pairing lookup, since no pairing had been recorded yet at that point in the test) — proving the lease-expiry guard is independently load-bearing rather than redundant with a later check. (2) short-circuiting `finishRollback`'s `CT_NOT_QUIESCENT` guard (`if (false && (...))`) reran the same suite and produced **37 pass, 1 fail** — the `CT-R11-S4` test's first assertion flipped from `CT_NOT_QUIESCENT` to `null` (finishRollback wrongly succeeded with live rows present) — proving that guard is load-bearing and not merely mirrored by the `ct_quiescence_snapshot` table's own defense-in-depth CHECK constraint (which only guards the *stored* row shape, not the handler's own decision to attempt the write).
- **Full/guard verification:** `bun test` → **271 pass, 0 fail, 2,015 `expect()` calls across 11 files** (baseline 264/1,969/11 files + 7 net-new tests in `test/recovery.test.mjs`, zero regressions). `bun test test/migration.test.mjs` → **60 pass, 0 fail, 325 `expect()` calls**, byte-identical to the P6-D baseline. `bun test test/fail-closed.test.mjs` → **8 pass, 0 fail, 70 `expect()` calls**, byte-identical. `bun test test/identity.test.mjs` → **58 pass, 0 fail, 520 `expect()` calls** — the assertion count is unchanged from the P6-D baseline even though one existing test's tool-list expectation and future-route-fence comment were updated to name the three now-real routes, because a single `toEqual` on a longer array is still one assertion. `node --check` on `core.mjs`, `mcp.mjs`, `test/recovery.test.mjs`, and `test/identity.test.mjs` all exit 0. `git diff --check` exits 0 (no whitespace errors).
- **Migration/execution-branch guards:** `MIGRATION_004_SQL` re-verified independently at **12,159 bytes / 215 LF lines**, checksum `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57` — byte-identical to every prior P0–P6-D record. `MIGRATION_005_SQL`/`MIGRATION_005_CHECKSUM` re-verified independently at **14,996 bytes / 231 LF lines**, `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98` — byte-identical to the P6-A/B/C/D pin; `SCHEMA_005_MANIFEST.objects.length` re-verified at **58**. No Migration 001/002/003/004/005 byte was touched. `typeof tower.beginRollback/rebindMain/finishRollback` are now `"function"`; `typeof tower.continuationRedeliverWork`/a `REDELIVER_WORK`/`REDELIVER_ATTESTATION` entry in `onRecoverActions`/`rollingBackRecoverActions`/`allRecoverActions` re-verified absent — no P6-F symbol or route exists. The dispatcher's operation allow-list is re-verified at exactly 19 names (the pre-P6-E 16 plus `beginRollback`/`rebindMain`/`finishRollback`). Native tasks `6.1`–`6.4` re-verified unchecked in `tasks.md`; no `6.x` checkbox was marked by this unit.
- **`mcp.mjs` hash delta (justified):** SHA-256 changed from the P6-D record `6bfd44735056ede36b8843b69f940805b4c8896c03d0b735865c08d929c2302f` to **`2aa76c69ebeaa0e1cc18cf157d539fd044e3315d5d1a1cde75206e4e23b49ce3`**. Justified against `design.md:1852–1862`'s three new routes and `tasks.md:119`'s P6-E boundary. `createMcpHandler()` with no capabilities still lists exactly the **eight** legacy `tower_*` tools (re-verified, unchanged). With `trustedMetadata`/`processIdentity` but no `processObserver`, the continuation tool count is now **18** (the pre-P6-E 15 plus `beginRollback`/`rebindMain`/`finishRollback`) plus 8 legacy = **26** total (up from P6-D's 23/22 split — re-verified via `test/identity.test.mjs`'s updated exact tool-list assertion, which passed unmodified in assertion count). With `processObserver` also present, the continuation tool count is **19** (adding `recordTerminationReceipt`) plus 8 legacy = **27** total (up from P6-D's 24).
- **Runtime harness:** N/A for a live host/Tower runtime — no `ACTIVE`, `tower.db`, or real MCP stdio process was started. The strongest integration proof this unit owns is the full `CT-R11-S3/S5` chain test: a real, multi-operation dispatcher cycle (`bootstrapMain→activate→beginRollback→recordTerminationReceipt(MAIN,HOST)→recordTerminationReceipt(MAIN,MCP)→[raw lease-expiry simulation]→rebindMain→[replay]→finishRollback→status`) run end-to-end against a real freshly-migrated schema-5 SQLite database inside an isolated `mkdtempSync` git root, under **two distinct process identities** (the original Main and its rebound replacement), proving the disaster-recovery hand-off end to end. No real database, `ACTIVE`, or `tower.db` outside a temporary test root was created or mutated; Tower stayed OFF/never activated in the real sense throughout.
- **Workload:** `git diff --numstat -- core.mjs mcp.mjs test/recovery.test.mjs test/identity.test.mjs` = `core.mjs` **393 additions/27 deletions**, `mcp.mjs` **44 additions/2 deletions**, `test/recovery.test.mjs` **191 additions/1 deletion**, `test/identity.test.mjs` **5 additions/3 deletions**. Total **633 additions + 33 deletions = 666 authored implementation/test lines** — inside the 580–780 forecast band and well under the independent 800 ceiling; no further split (`beginRollback`/`finishRollback` vs `rebindMain`) was required or taken.
- **Rollback boundary:** Revert only: in `core.mjs` — `ROLLBACK_LEASE_DURATION_MS`, `rollbackEpochValue`/`assertMainRebind`/`mainRebindValue`, `beginRollbackKeys`/`assertBeginRollbackRequest`/`continuationBeginRollback`, `rebindMainKeys`/`assertRebindMainRequest`/`continuationRebindMain`, `finishRollbackKeys`/`assertFinishRollbackRequest`/`continuationFinishRollback`, the three-name addition to `createContinuationDispatcher`'s allow-list/dispatch chain, the `rollingBackRecoverActions`/`allRecoverActions` sets and `continuationRecover`'s `ROLLING_BACK`-mode branch (reverting `assertRecoverRequest` to use `onRecoverActions` alone and `continuationRecover`'s mode gate to its pre-P6-E unconditional-ON form), the `recoverToStates` map (reverting to the pre-P6-E ternary), the mode-aware `writerFence`/CAS fields (reverting to hardcoded `"ON"`/`"NONE"`), the `ct_main_rebind` cross-check block in `validateSchema3Persistence`, and the `ROLLING_BACK` branch of `validHistoricalWriterFence` (reverting its signature to the pre-P6-E single-argument, `mode==="ON"`-only form). In `mcp.mjs` — the three new tool definitions and the two added values in `recover`'s `action` enum. Delete the new P6-E test block in `test/recovery.test.mjs` and revert `test/identity.test.mjs`'s tool-list/future-route-fence assertions to their pre-P6-E form. **Preserve C/D rows and leave any open epoch inert**: reverting this unit's code makes `beginRollback`/`rebindMain`/`finishRollback` calls fail closed again with `CT_PAYLOAD_INVALID` at the dispatcher's operation allow-list, makes `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` `recover` calls fail closed with the pre-P6-E unconditional `CT_ROLLBACK_IN_PROGRESS` (identical to pre-P6-E behavior), and leaves any already-committed `ct_rollback_epoch`/`ct_quiescence_snapshot`/`ct_main_rebind`/`ct_recovery_disposition` row simply unreadable by the reverted code (no delete, no downgrade, no schema change) — a real open rollback epoch from before the revert would be left permanently `OPEN`/inert (matching the unit contract's explicit "leave any open epoch inert" instruction), which is the correct, safe outcome for a revert of the only code capable of ever closing it. Every P0–P6-D row, envelope, and byte remains untouched and preserved.
- **Preservation:** All prior P0–P6-D behavior, tests, and evidence are unchanged; the full `bun test` suite (271/0/2,015) includes every pre-existing test unmodified in assertion count except the one intentionally updated tool-list expectation in `test/identity.test.mjs`. The eight legacy `tower_*` tools and default no-capability MCP handler remain exactly as before. `start` and every P6-F name (`REDELIVER_WORK`/`REDELIVER_ATTESTATION`/a `continuationRedeliverWork`/`continuationRedeliverAttestation` export) remain absent. The P6-B/D RECOVER validator, the P6-C proof plane, and the schema-4 code path are untouched by construction (the new `ct_main_rebind` cross-check and `validHistoricalWriterFence` extension are both guarded to be no-ops at schema 4, verified by the unchanged `test/migration.test.mjs` count), so a schema-4 database under P6-E code behaves exactly as it did under P6-D. Production/tests outside `core.mjs`/`mcp.mjs`/`test/recovery.test.mjs`/`test/identity.test.mjs`/this file are untouched; no commit, push, PR, or review/Judgment Day ran; Tower stayed OFF throughout (every test uses an isolated temporary git root via `mkdtempSync`, never the real DB/anchor/`ACTIVE`).
- **Deviations/risks:**
  1. **`CT-R7-S8` claim-present rung is implemented but not integration-tested.** `continuationRecover` correctly returns `CT_RECOVERY_CLAIM_PRESENT` for `SUSPEND_PENDING` whenever any claim row exists at the target generation (checked before every other fence/proof, exactly as `design.md:1803` requires), but no test in this unit exercises it end to end. Exhaustive analysis (recorded as a code comment above the P6-E test block) established that a genuinely `PUBLISHED` handoff can never carry a live or closed claim at its own current generation through any real flow — claiming always moves the handoff to `CLAIMED`, and `UNIQUE(handoff_id, generation)` on `ct_claim` forecloses any same-generation leftover — and every attempt to fabricate that state with a synthetic row was independently rejected by `validateSchema4Persistence`'s own exhaustive claim/reverse-link/envelope cross-checks (the same invariant machinery this rung's precondition depends on), confirming the state is genuinely unreachable rather than merely inconvenient to construct. This mirrors P6-C's own honestly-flagged gap (the `ROLLING_BACK` branch of `recoveryMainAuthority`, structurally present and untested until *this* unit's real `ROLLING_BACK` fixtures finally exercised it) and is a fail-closed, not fail-open, gap.
  2. **CORRECTED — see the corrective subsection immediately below.** The original text of this item claimed `CANCELLED`/`POISONED` under `ROLLING_BACK` was a benign, deliberately-out-of-scope gap. An automatic gate review found this was **not** benign but a verified drift from `design.md:1794–1795`/`1801`/`1643`, which name `CANCELLED`/`POISONED` as legal under **both** `ON` and `ROLLING_BACK` and forbid only `NOT_STARTED`/`ROLLED_BACK`/`REDELIVER_WORK`/`REDELIVER_ATTESTATION` under `ROLLING_BACK`. The handler wrongly forbade a design-permitted, schema-permitted operation. Fixed in one authorized corrective rerun; the paragraph above is retained struck-through-in-spirit (not deleted) for audit history, and the corrected behavior is recorded below.
  3. **`ROLLBACK_LEASE_DURATION_MS` (600,000 ms / 10 minutes) is a new constant not pinned anywhere in `design.md`.** Chosen the same way `TERMINATION_RECEIPT_FRESHNESS_MS` was introduced in P6-C: a reasonable, self-contained, documented default for a mechanism (`lease_expires_at`) the design names but does not assign a duration to. No test asserts the exact numeric value; tests that need an expired lease set `lease_expires_at` directly via raw SQL (mirroring the P6-C freshness-test pattern), independent of this constant's value.
  4. No other design deviation. P6-F remains deliberately absent: no `REDELIVER_WORK`, `REDELIVER_ATTESTATION`, attestation carry-forward in `complete`, or redelivery `CLAIM` acceptance.
- **Next (superseded by the corrective subsection below):** ~~P6-F redelivery and forbidden-mode closure ... including, if in scope for P6-F, a decision on the `CANCELLED`/`POISONED`-under-`ROLLING_BACK` gap flagged above~~ — that gap is now closed in this unit; see the corrective subsection's own **Next** line for the current, accurate handoff to P6-F.
- **Skill resolution:** `paths-injected` — `/home/emili/.claude/skills/sdd-apply/SKILL.md`, `/home/emili/.claude/skills/_shared/sdd-phase-common.md`.

### Corrective rerun — CANCELLED/POISONED legal under ROLLING_BACK (automatic gate FAIL, one authorized retry) — GREEN

- **Authorization/boundary:** The automatic apply gate failed the initial P6-E pass on exactly two verified CRITICAL defects and authorized one corrective rerun, scoped to nothing else. Pre-correction P6-E workload was 666 authored lines with 134 available against the independent 800 ceiling; this correction added **63** lines (`core.mjs` +10/+0, `test/recovery.test.mjs` +53/+0 — see Workload below), leaving 71 below the ceiling. The prior GREEN pass and its own triangulation remain recorded above and are not reclassified as terminal; only the two defects below were touched.
- **Defect 1 (CRITICAL):** `continuationRecover`'s `ROLLING_BACK`-mode legality gate accepted only `SUSPEND_PENDING`/`SUSPEND_ATTESTATION`, throwing `CT_RECOVERY_DISPOSITION_FORBIDDEN` for `CANCELLED`/`POISONED` — a design-allowed, schema-allowed combination per `design.md:1794–1795` ("`ON` or `ROLLING_BACK`, ACTIVE or rollback-owner Main") and the exhaustive forbidden-set at `design.md:1801` (which names only `NOT_STARTED`/`ROLLED_BACK`/`REDELIVER_WORK`/`REDELIVER_ATTESTATION`). Corroborated by the `ct_recovery_disposition` CHECK at `design.md:1643`, which constrains only `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` to `ROLLING_BACK` and places no mode restriction on `CANCELLED`/`POISONED` — the schema already accepted these rows; only the handler refused to write them.
- **Defect 2 (CRITICAL):** `validHistoricalWriterFence`'s `rollingBackFenceDispositions` set (inside `validateSchema4Persistence`'s RECOVER reconstruction) also named only `SUSPEND_PENDING`/`SUSPEND_ATTESTATION`, so even with Defect 1 fixed, historical re-validation of a `ROLLING_BACK` `CANCELLED`/`POISONED` `RECOVER` row would still be rejected — `status()` (and every other operation, since all of them call `validateSchema4Persistence`) could not replay its own legitimately written history. `design.md:1842` names all **four** dispositions (`SUSPEND_PENDING`, `SUSPEND_ATTESTATION`, `CANCELLED`, `POISONED`) verbatim for this exact fence widening.
- **Corrective RED:** Added three tests against unchanged (defective) production code: `CANCELLED` under `ROLLING_BACK` with a real `LIVE` claim (requiring and consuming a fresh termination pairing), `POISONED` under `ROLLING_BACK` without a claim (requiring none), and a control test proving `NOT_STARTED`/`ROLLED_BACK` remain forbidden under `ROLLING_BACK`. `bun test test/recovery.test.mjs` → **39 pass, 2 fail, 159 `expect()` calls** — both new `CANCELLED`/`POISONED`-under-`ROLLING_BACK` tests failed with exactly `CT_RECOVERY_DISPOSITION_FORBIDDEN`, the defect's own signature; the forbidden-mode control test passed unmodified, proving the RED was isolated to the two defective dispositions and not a broader regression.
- **Corrective GREEN:** Reused the existing P6-D `CANCELLED`/`POISONED` runtime path unchanged (no parallel implementation) — `recoverCancelPoisonSources`, the termination-pairing-iff-`LIVE`-claim block, the `increments`/`toState`/writer-fence/CAS construction were already mode-agnostic from the initial P6-E pass and required zero edits. Split the single `rollingBackRecoverActions` set into `rollingBackOnlyRecoverActions` (`SUSPEND_PENDING`/`SUSPEND_ATTESTATION` — gates the frozen-inventory-digest proof requirement, which `CANCELLED`/`POISONED` must never carry per the `ct_recovery_disposition` CHECK) and `rollingBackLegalRecoverActions` (adds `CANCELLED`/`POISONED` — gates `ROLLING_BACK`-mode legality only). Widened `rollingBackFenceDispositions` in `validHistoricalWriterFence` to all four names. Updated the two stale P6-E comments (`core.mjs` above `rollingBackOnlyRecoverActions`/`allRecoverActions` and above `continuationRecover`) that previously asserted `CANCELLED`/`POISONED`-under-`ROLLING_BACK` was out of scope. Focused rerun: **41 pass, 0 fail, 170 `expect()` calls**.
- **Triangulation:** Two genuine mutation proofs were run and reverted, restoring `core.mjs` from `/tmp/core.mjs.p6e-corrective-backup` and confirming byte-for-byte restoration (`diff` exit 0, SHA-256 unchanged: `68d5c2a8ff81c15b7d596d7c05f14ebc0aff0919ac0f4ce652abcaa1c4bfd9a8`) after each: (1) reverting `rollingBackLegalRecoverActions` to its pre-correction two-member form reran `bun test test/recovery.test.mjs` and reproduced **39 pass, 2 fail** with exactly the original `CT_RECOVERY_DISPOSITION_FORBIDDEN` signature, proving Defect 1's fix is genuinely load-bearing. (2) reverting `rollingBackFenceDispositions` to its pre-correction two-member form (leaving Defect 1's fix in place) reran the same suite and produced **39 pass, 2 fail** with both new tests now failing at their trailing `status()` replay assertion with `CT_SCHEMA_INVALID` — proving Defect 2's fix is independently load-bearing and not redundant with Defect 1's: a `CANCELLED`/`POISONED` row can be written under `ROLLING_BACK` but, without the fence widening, can never be historically re-validated by any later operation.
- **Final verification:** Recovery **41/0/170**; migration **60/0/325**; fail-closed **8/0/70**; identity/tool surface **58/0/520**; full `bun test` **274 pass, 0 fail, 2,029 assertions across 11 files** (up from the pre-correction 271/0/2,015; +3 tests, +14 assertions; zero regressions). `node --check core.mjs mcp.mjs test/recovery.test.mjs test/identity.test.mjs` and `git diff --check` all pass. Migration 004 remains **12,159 bytes / 215 LF lines / `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; Migration 005 remains **14,996 bytes / 231 LF lines / `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**; schema-5 manifest remains **58 objects**. `mcp.mjs` is untouched by this correction (no route/schema change was needed) and remains byte-identical at `2aa76c69ebeaa0e1cc18cf157d539fd044e3315d5d1a1cde75206e4e23b49ce3`; tool surfaces remain 8/26/27. `beginRollback|rebindMain|finishRollback` remain defined; no P6-F symbol (`REDELIVER_WORK`/`REDELIVER_ATTESTATION`/a redelivery `continuation*` export) exists. Common-dir `ACTIVE`/`tower.db` remain absent; Tower stayed OFF; `.gitignore` stayed unrelated/untracked; tasks `6.1`–`6.4` remain unchecked (re-verified).
- **Work-unit/runtime evidence:** Focused command/result is the final recovery **41/0/170** suite; guard commands/results are migration **60/0/325** and fail-closed **8/0/70**. Runtime harness is unchanged from the initial GREEN pass — real dispatcher/MCP calls and real SQLite persistence inside isolated `mkdtempSync` git roots; no live Tower runtime exists or is needed. Rollback boundary: revert only this corrective subsection's changes — the `rollingBackOnlyRecoverActions`/`rollingBackLegalRecoverActions` split (reverting to the single pre-correction `rollingBackRecoverActions` set with two members), the `rollingBackFenceDispositions` widening (reverting to two members), the two corrected comments, and the three new corrective tests — which restores the exact (defective) pre-correction P6-E boundary; it does not touch `beginRollback`/`rebindMain`/`finishRollback` or any C/D row.
- **Cumulative workload:** `git diff --numstat -- core.mjs mcp.mjs test/recovery.test.mjs test/identity.test.mjs` = `core.mjs` **403 additions/27 deletions**, `mcp.mjs` **44 additions/2 deletions** (unchanged this round), `test/recovery.test.mjs` **244 additions/1 deletion**, `test/identity.test.mjs` **5 additions/3 deletions** (unchanged this round). Cumulative total **696 additions + 33 deletions = 729 authored implementation/test lines** for all of P6-E (initial GREEN + this corrective rerun) — 71 lines below the independent 800 ceiling.
- **Deviations/risks:** No design deviation remains for `CANCELLED`/`POISONED` after this correction. Deviations 1 (`CT-R7-S8` structurally unreachable) and 3 (`ROLLBACK_LEASE_DURATION_MS` not pinned by design) from the initial pass are unchanged and explicitly out of this corrective scope per the gate's own instruction; they remain surfaced to the maintainer separately.
- **Next:** P6-F redelivery and forbidden-mode closure — `REDELIVER_WORK`, `REDELIVER_ATTESTATION`, attestation carry-forward in `complete`, redelivery `CLAIM` acceptance, and the complete `CT-R11-S2` ladder — starting only from this corrected green P6-E boundary. The `CANCELLED`/`POISONED`-under-`ROLLING_BACK` gap is closed; P6-F owns only its own four scenarios (`CT-R7-S9`, `CT-R7-S10`, `CT-R7-S11`, `CT-R11-S2`) with no remaining open question from P6-E. Slice 6 Judgment Day (task `6.4`) runs only after P6-F is also green.
- **Skill resolution:** `paths-injected` — `/home/emili/.claude/skills/sdd-apply/SKILL.md`, `/home/emili/.claude/skills/_shared/sdd-phase-common.md`.
---

## P6-F Redelivery and forbidden-mode closure — detailed triangulation/evidence correction

### Boundary, dependency, and implemented end state

- **Corrective authorization:** This is the single bounded corrective rerun for the apply-boundary failure that found task `6.3` checked without a detailed P6-F section. It changes no production behavior or test permanently and does not address the separate missing-history warning.
- **Structured status consumed:** authoritative OpenSpec `applyState: ready`; change `autonomous-continuation-control-tower`; action context `repo-local`; workspace/allowed edit root `/home/emili/projects/control-tower/Worktrees/tower-implementation`; warnings none. Delivery remains `auto-chain` / `feature-branch-chain`; this work is confined to P6-F.
- **Base/start/dependency:** branch `p6-f-redelivery-closure`; committed start/base `4351b0b07492fd451094258e1639563b934d6c43`, the accepted green P6-E boundary. Dependencies P6-A→B→C→D→E were already green. The P6-F candidate remains uncommitted.
- **Owned scenarios/end state:** `CT-R7-S9` implements ON-only `REDELIVER_WORK`, generation+1, one fresh PENDING WORK delivery, exact replay, and duplicate-scope conflict. `CT-R7-S10` implements real `SUSPEND_ATTESTATION→REDELIVER_ATTESTATION`, preserved-attestation carry-forward, generation+1, and one fresh PENDING `ATTESTATION_REDELIVERY`. `CT-R7-S11` proves the redelivery claimant cannot `ack` while attestation-bound `complete` succeeds. `CT-R11-S2` proves the complete ROLLING_BACK forbidden-disposition/stale-epoch ladder without mutation. The schema-5 historical validator accepts the redelivery CLAIM pair and reverse links while schema 4 remains unchanged.
- **Permanent P6-F changed paths:** `core.mjs`, `mcp.mjs`, `test/recovery.test.mjs`. This correction permanently changes only this appended `apply-progress.md` section.

### Strict TDD and mutation evidence

This correction does not invent or retroactively claim the missing cumulative `6.1` RED evidence. Its RED is a narrow mutation proof owned by task `6.3`, followed by byte restoration and GREEN verification of the already-implemented P6-F candidate.

| Phase | Exact evidence |
|---|---|
| RED / TRIANGULATE | After pre-mutation hashing, temporarily removed only `REDELIVER_WORK` from `onRecoverActions` in `core.mjs`, disabling the design-critical ON-mode legality branch. `bun test test/recovery.test.mjs -t "CT-R7-S9 — REDELIVER_WORK republishes"` exited **1**: **0 pass, 1 fail, 2 assertions, 47 filtered**. The existing P6-F test failed at its real `recover` call with exact error **`CT_PAYLOAD_INVALID`**, from `continuationRecover` (`core.mjs:3729`) into `test/recovery.test.mjs:995`, instead of accepting ON-only work redelivery. |
| GREEN | Reinstated the exact original set member and reran `bun test test/recovery.test.mjs`: **48 pass, 0 fail, 232 assertions, 1 file**. |
| REFACTOR | No candidate refactor was warranted: the mutation was reverted byte-for-byte before verification. `core.mjs` returned to SHA-256 **`5240e2c301e1816de14f680915d6040399d65bdf8062c05a0f57bd339e479133`**. All other candidate hashes also matched their pre-mutation values. No production/test bytes from the verified candidate remain changed by this correction. |

### Byte capture and restoration proof

Before the temporary mutation, SHA-256 was captured for every repository file that might be mutated or used to reconcile task evidence:

- `core.mjs` — `5240e2c301e1816de14f680915d6040399d65bdf8062c05a0f57bd339e479133`
- `mcp.mjs` — `a289f8f3806e61399e5405b00133e1e3c5eb7ffaa0480a9cfb095484f150ae59`
- `test/recovery.test.mjs` — `f3786bc46d9b28ffe2a305d977520bbec177cdddc0a582fb3c20bf78758f2625`
- `test/migration.test.mjs` — `1a7e8c66260b4d678a0941e0ca26cef0d4a0a96b862f03e5d1b19509db8f6bfb`
- `test/identity.test.mjs` — `bfb9a384cc017aea876c30a74cdf714dd163bdbc7947846328fa5f129e95eaa4`
- `apply-progress.md` — `ded0d64784db39023d1245020934946a28d007a2f050cce95696d11dc09fd61f` before this required append
- `tasks.md` — `f541d361df0ffaa08949e3613ac832d584241b406c2008253f084828087264ce`

Immediately after reverting the mutation and before running the final suites, `sha256sum -c` reported **OK for all seven paths**. The expected `apply-progress.md` hash changes only because this detailed section is now appended; `tasks.md` remains byte-identical.

### Exact verification commands and results

1. Mutation RED: `bun test test/recovery.test.mjs -t "CT-R7-S9 — REDELIVER_WORK republishes"` → exit 1; **0/1/2**, 47 filtered; intended `CT_PAYLOAD_INVALID` failure at the redelivery acceptance branch.
2. Restored focused GREEN: `bun test test/recovery.test.mjs` → exit 0; **48 pass / 0 fail / 232 assertions**.
3. Restored full regression: `bun test` → exit 0; **281 pass / 0 fail / 2,091 assertions across 11 files**. This run includes migration **60/0/325**, fail-closed **8/0/70**, and identity **58/0/520**.
4. Changed-JS syntax: `node --check core.mjs`, `node --check mcp.mjs`, `node --check test/recovery.test.mjs` → exit 0, no output.
5. Whitespace: `git diff --check` → exit 0, no output.
6. Migration preservation script compared each current SQL literal with `git show 4351b0b:core.mjs`: Migration 004 `base_equal=true`, **12,159 bytes / 215 LF lines / 19 definitions / `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; Migration 005 `base_equal=true`, **14,996 bytes / 231 LF lines / 22 definitions / `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**.
7. Tower-OFF guard after all tests: canonical common-dir `control-tower/ACTIVE` absent, canonical `control-tower/tower.db` absent, and legacy `~/.config/opencode/control-tower/ACTIVE` absent. No command targeted a real Tower database or ACTIVE state.

### Workload, preservation, deviations, and rollback

- **Exact P6-F implementation/test workload from `4351b0b`:** `core.mjs` **182 additions / 52 deletions**, `mcp.mjs` **3/3**, `test/recovery.test.mjs` **199/0** = **384 additions + 55 deletions = 439 authored lines**. This is inside the P6-F 420–600 forecast and below the independent 800-line ceiling. Evidence-only OpenSpec lines are excluded.
- **Migration/schema preservation:** Migration 004/005 literals are byte-identical to the P6-E base; Migration 005 remains the exact 22-definition addition supporting the 58-object schema-5 manifest. No migration, manifest, schema, DB, or ACTIVE mutation was made by this correction.
- **Design deviations/risks:** P6-F has no known design deviation after restoration. The pre-existing P6-E `CT-R7-S8` gap remains: the `CT_RECOVERY_CLAIM_PRESENT` rung is implemented, but no real integration test reaches the structurally unavailable PUBLISHED/PENDING-plus-any-claim state, so cumulative task `6.1` must remain unchecked. The pre-existing unpinned `ROLLBACK_LEASE_DURATION_MS=600000` P6-E note also remains unchanged. Neither issue is corrected or broadened here.
- **P6-F rollback boundary:** Revert only P6-F redelivery/`complete`-carry-forward/CLAIM-pair validator hunks in `core.mjs`, the P6-F recover MCP schema delta in `mcp.mjs`, and the P6-F block/helpers in `test/recovery.test.mjs`; preserve P6-A through P6-E and all schema-5 rows inert/OFF. The temporary mutation itself is already fully reverted. This evidence correction can be rolled back by removing only this appended section.

### Persisted tasks and remaining boundary

- Task `6.2` remains honestly checked because the complete P6-A→F GREEN end state is present.
- Task `6.3` remains checked because this appended section now supplies the missing P6-F detailed triangulation, exact verification, workload, preservation, and rollback evidence.
- Task `6.1` remains exactly unchecked because the pre-existing P6-E `CT-R7-S8` real RED/integration-evidence gap is unresolved.
- Parent-owned task `6.4` remains byte-for-byte unchecked in `tasks.md`: `- [ ] 6.4 Run and persist Slice 6 Judgment Day under the same bounded correction rule only after A, B, C, D, E, and F are all green. <!-- sdd-owner: parent -->`
- Remaining implementation-owned work begins at the still-unchecked P7 tasks and continues through P10; none was started. Deferred parent lifecycle tasks `6.4`, `7.4`, `8.4`, `9.4`, `10.4`, and `11.1`–`11.4` remain untouched.

### Corrective terminal boundary

P6-F executable behavior and task `6.3` evidence are now reconciled. The apply phase must stop here and return to `parent-lifecycle`; it must not start P7, verification, review, Judgment Day, commit, push, PR, or publication from this corrective rerun.

- **Skill resolution:** `paths-injected` — `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`.
---

## P6 closure correction — CT-R7-S8 structural-invalidity characterization

This section supersedes the historical P6-E/P6-F CT-R7-S8 gap statements above without rewriting them. The maintainer-approved correction classifies a PUBLISHED/PENDING handoff carrying a claim for that same delivery as malformed persisted history. Atomic `claim` changes both handoff and delivery to CLAIMED while creating the claim, so the old recovery-handler precondition is unreachable under valid history.

### Structured status and boundary

- Change: `autonomous-continuation-control-tower`; authoritative store: OpenSpec with Engram mirror.
- Apply state / next recommendation consumed: `ready` / `apply`.
- Action context: `repo-local`; workspace and sole edit root `/home/emili/projects/control-tower/Worktrees/tower-implementation`; warnings: none.
- Delivery: `auto-chain` / `feature-branch-chain`; bounded P6 closure only; base `90f49e8f8382f8847e9bf15285b0b7c566185a07`; implementation/test ceiling 800 authored lines.
- Strict TDD: active with `bun test`; no P7+, parent task 6.4, review, Judgment Day, commit, push, PR, publication, or real Tower mutation.

### Decision and implementation

- Revised CT-R7-S8 in the recovery spec, P6 design decision/precedence/taxonomy/fixtures/ownership, task wording/traceability, and the active admin error taxonomy. Structural validation now explicitly wins with `CT_SCHEMA_INVALID`; no reservation or pre-claim state was introduced and validation order did not move.
- Added one integration characterization to `test/recovery.test.mjs`. It runs real provision→Migration 005→Main activation→register→create→validate→publish→claim→beginRollback history in an isolated temporary Git/SQLite root, disables and restores only `ct_delivery_immutable_identity` while restoring the impossible PUBLISHED/PENDING projection, retains the real same-delivery LIVE claim, calls public `recover`, and compares snapshots of every `ct_*` table before/after.
- Removed the now-dead `CT_RECOVERY_CLAIM_PRESENT` branch from `continuationRecover`. Repository-scoped active-contract search found no remaining production/test/current-change reference after the taxonomy correction; archived source history and earlier cumulative evidence remain historical and were not rewritten.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 6.1 / CT-R7-S8 closure | `test/recovery.test.mjs` | Integration | recovery 48/0/232; migration 60/0/325; fail-closed 8/0/70; identity 58/0/520 | Corrected characterization was honestly GREEN: focused 1/0/3 because structural validation already enforced the decision. Mutation proof temporarily removed only `continuationRecover`'s structural-validation call; focused test failed 0/1, receiving obsolete `CT_RECOVERY_CLAIM_PRESENT` instead of `CT_SCHEMA_INVALID`. | After exact byte restoration and dead-branch cleanup, focused CT-R7-S8 and full recovery passed. | Real atomic claim history plus the isolated malformed projection exercises a different path from valid CT-R7-S7 suspension; all-table snapshot equality proves non-mutation. | Removed only the dead handler branch/comment and stale taxonomy; no recovery behavior, schema, or protocol expansion. |

### Exact verification

1. Characterization GREEN before production cleanup: `bun test test/recovery.test.mjs -t 'CT-R7-S8'` → **1 pass / 0 fail / 3 assertions**, 48 filtered.
2. Discriminating mutation: with only the `validateSchema4Persistence(db, authority)` call temporarily removed from `continuationRecover`, the same command → **0 pass / 1 fail / 2 assertions**, receiving `CT_RECOVERY_CLAIM_PRESENT`; `core.mjs` was restored exactly from SHA-256 `5240e2c301e1816de14f680915d6040399d65bdf8062c05a0f57bd339e479133` back to the same hash before permanent cleanup.
3. Recovery: `bun test test/recovery.test.mjs` → **49 pass / 0 fail / 235 assertions**.
4. Migration: `bun test test/migration.test.mjs` → **60 pass / 0 fail / 325 assertions**.
5. Fail-closed: `bun test test/fail-closed.test.mjs` → **8 pass / 0 fail / 70 assertions**.
6. Identity: `bun test test/identity.test.mjs` → **58 pass / 0 fail / 520 assertions**.
7. Full regression: `bun test` → **282 pass / 0 fail / 2,094 assertions across 11 files**.
8. Changed JavaScript: `node --check core.mjs` and `node --check test/recovery.test.mjs` → exit 0; `git diff --check` → exit 0.
9. Migration preservation against base `90f49e8`: Migration 004 base-equal at **12,159 bytes / 215 LF lines / 19 definitions / `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**; Migration 005 base-equal at **14,996 bytes / 231 LF lines / 22 definitions / `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**. Migration tests also prove the 36/58-object manifests.
10. Tower OFF: canonical and legacy `ACTIVE` and `tower.db` paths all absent after verification.

### Files, workload, and rollback

| File | Purpose |
|---|---|
| `core.mjs` | Remove dead claim-present recovery code/error branch |
| `test/recovery.test.mjs` | Real-lifecycle malformed-history integration characterization and all-table snapshot proof |
| `specs/control-tower-recovery-rollback/spec.md` | Correct CT-R7-S8 normative outcome and precedence |
| `specs/control-tower-admin-authority/spec.md` | Remove obsolete active error-taxonomy member |
| `design.md` | Correct decision, disposition explanation, precedence, taxonomy, fixture exception, workload row, and ownership |
| `tasks.md` | Correct P6 summary/ownership/traceability and persist task 6.1 completion |
| `apply-progress.md` | Append this cumulative closure evidence and update the current status header |

- Exact implementation/test workload from base: `core.mjs` **0 additions / 5 deletions** plus `test/recovery.test.mjs` **32 additions / 14 deletions** = **32 additions + 19 deletions = 51 authored lines**, far below 800.
- Exact total authored workload from base, including current OpenSpec corrections/evidence: **140 additions + 45 deletions = 185 authored lines across seven tracked files**.
- Rollback boundary: revert only the dead-branch deletion, CT-R7-S8 test/helper/comment, current spec/design/task amendments, task 6.1 checkbox, status-header correction, and this section. Preserve all P6-A→F behavior/evidence, Migration 004/005 bytes, and parent task 6.4. No database down-migration exists.

### Persisted tasks and remaining work

- [x] 6.1 is now visibly checked in `tasks.md`; cumulative P6-A→F suites evidence every assigned CT-R7/CT-R11 scenario, including the corrected CT-R7-S8 characterization.
- [x] 6.2 and 6.3 remain checked.
- [ ] 6.4 remains parent-owned, byte-for-byte unchecked: `- [ ] 6.4 Run and persist Slice 6 Judgment Day under the same bounded correction rule only after A, B, C, D, E, and F are all green. <!-- sdd-owner: parent -->`

Remaining implementation-owned lines, none started:

- [ ] 7.1 RED `test/host-adapters.test.mjs` and `test/polling.test.mjs`: `CT-R5-S1..S5@OpenCode`, wake failure, throttling, dispose-before-peek/receive.
- [ ] 7.2 GREEN `host/loop.mjs` + `plugin/tower-spike.js`: injected ports, root-only controller, OpenCode lifecycle mapping; no SQLite logic in adapter.
- [ ] 7.3 TRIANGULATE/REFACTOR: child/root ordering and pending-delivery preservation; rerun adapter/polling/fail-closed; record evidence.
- [ ] 8.1 RED `test/host-adapters.test.mjs`: `CT-R5-S1..S5@Pi`, `agent_settled`, `ctx.isIdle()`, `session_shutdown`, and follow-up wake semantics.
- [ ] 8.2 GREEN `adapters/pi/`: global Pi extension delegates only to `host/loop.mjs` and uses idle-safe message injection.
- [ ] 8.3 TRIANGULATE/REFACTOR: reload/resume/shutdown and child isolation; rerun Pi adapter + fail-closed; record evidence.
- [ ] 9.1 RED `test/host-adapters.test.mjs`: `CT-R5-S1..S5@Claude`, `Stop`, `SessionEnd`, `stop_hook_active`, bounded `asyncRewake`, and subagent/teammate isolation.
- [ ] 9.2 GREEN `adapters/claude/`: plugin hooks/scripts delegate only to `host/loop.mjs`; wake only after non-consuming pending peek.
- [ ] 9.3 TRIANGULATE/REFACTOR: repeated Stop, hook timeout/failure, terminal cleanup; rerun Claude adapter + fail-closed; record evidence.
- [ ] 10.1 RED `test/runtime-publish.test.mjs`: allowlisted manifest, immutable existing release, failed probe, atomic `current`, backup/restore, and legacy-path preservation.
- [ ] 10.2 GREEN `scripts/publish-runtime.mjs`, `install.sh`: stage/verify/fsync/rename `releases/<git-sha>`, then atomically switch `current`; host configs resolve only through `current`.
- [ ] 10.3 TRIANGULATE/REFACTOR: interrupted publication and one-host probe failure restore prior state; verify `~/.config/opencode/control-tower` untouched and Tower OFF.

### Deviations and next boundary

- Strict-TDD deviation avoided: no fabricated initial RED. The corrected characterization was already GREEN; the exact restored mutation proved it discriminates structural-validation precedence.
- No design deviation or protocol/schema expansion. The pre-existing unpinned `ROLLBACK_LEASE_DURATION_MS=600000` note remains unchanged and outside this correction.
- Stop after this bounded P6 closure. `sdd-apply` returns `parent-lifecycle`; it does not run parent-owned task 6.4 or start P7.
- **Skill resolution:** `paths-injected` — `/home/emili/.pi/agent/npm/node_modules/gentle-pi/skills/gentle-ai/SKILL.md`, `/home/emili/.agents/skills/cognitive-doc-design/SKILL.md`, `/home/emili/.agents/skills/work-unit-commits/SKILL.md`.

## Slice 6 parent lifecycle closure — explicit Judgment Day

- **Maintainer authorization:** The maintainer explicitly required completion of task `6.4` and reaffirmed that the broken Gentle review lifecycle, receipts, `next_transition`, and automatic 4R rules remain suspended. Judgment Day therefore ran as two isolated blind read-only Pi children without Gentle lifecycle authority.
- **Frozen target:** green merged Slice 5 base `9b69ff45b96090be2c97b8f263c6dbf2f63fd700`; exact candidate index tree `98065bb7b5a8a42e9a7d86816f2f03ec881436a6`; target identity `af2bee22d2f6278a32dd78215615602577bebea6fbd430daa895755eed17012e`; 10 exact tracked target paths; `.gitignore` and `.codegraph/` excluded.
- **Blind dual result:** Judge A returned three CRITICAL suspects and three WARNING findings; Judge B independently returned one CRITICAL suspect. No severe finding was confirmed by both judges, no contradiction existed, and the bounded dual-corroboration rule therefore authorized no correction actor or re-judgment round.
- **Merged ledger:** Four one-judge severe suspects and two informational findings are persisted with evidence in `evidence/judgment-day-slice-6-round-1.md`; the orphan-recovery-disposition subclaim received partial cross-judge corroboration only at WARNING severity, not two-judge severe confirmation.
- **Independent final verification:** Candidate tree remained byte-identical before/after verification. Syntax and diff checks passed; recovery **49/0/235**, migration **60/0/325**, fail-closed **8/0/70**, identity **58/0/520**, full suite **282 pass / 0 fail / 2,094 assertions across 11 files**. Migration 004/005 checksums remained pinned; canonical and legacy Tower `ACTIVE`/`tower.db` remained absent.
- **Persisted task state:** Task `6.4` is visibly checked in `tasks.md` and points to `evidence/judgment-day-slice-6-round-1.md`. No P7 work, correction, commit, push, PR, publication, Gentle lifecycle, receipt, or 4R action ran.
- **Terminal verdict:** **JUDGMENT: APPROVED ✅**. Slice 6 tasks `6.1`–`6.4` are complete; P7 is the next implementation boundary.
