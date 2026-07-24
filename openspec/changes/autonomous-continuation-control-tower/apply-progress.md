# Apply Progress: Autonomous Continuation — Control Tower

## Cumulative status

- Mode: Strict TDD (`bun test`)
- Delivery strategy: `auto-chain`
- Chain strategy: `feature-branch-chain`
- Current autonomous work unit: P5 lifecycle/attestation is next; P4 is complete
- Branch: `feat/control-tower/autonomous-continuation`
- Completed: 22/50 tasks (`0.1`, `0.2`, `1.1`, `1.2`, `1.3`, `1.4`, `1F.1`, `1F.2`, `1F.3`, `1F.4`, `2.1`, `2.2`, `2.3`, `2.4`, `3.1`, `3.2`, `3.3`, `3.4`, `4.1`, `4.2`, `4.3`, `4.4`)
- P3 is complete at `f20d6a369b18b46890e8e98263dbf97d6973c427`; P4-A1a, P4-A1b, P4-A1c-R1, the final A1c P4-only gate, P4-A2, P4-A3, and P4-B are green.
- P4 is complete with Slice 4 Judgment Day approved. P5 lifecycle/attestation is the next boundary.

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
