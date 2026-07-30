# Apply Progress: Installable V1 release

## Result Metadata

- status: success
- executive_summary: `S8.1` remains historically complete; `S8.2` foundation and final bounded unknown-path correction are implemented under Strict TDD and await final independent verification.
- artifacts: eight authorized implementation/test paths plus previously approved planning evidence and this merged `apply-progress.md`
- next_recommended: final independent verification
- skill_resolution: paths-injected — `sdd-apply`, Strict TDD, `work-unit-commits`, and canonical plan-naming instructions loaded from the maintainer-specified paths

## Active Frontier

- Plan: P8 `Installable V1 release`
- `S8.1`: ✅ COMPLETO; provenance tasks 1.1–1.3 shipped by PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382`.
- `S8.2`: implementation plus authorized bounded remediation complete; six tasks remain checked, independent replacement verification pending.
- Base: clean `master@e4d8ad63437e5c57dbf37edf86aadcc9c9fdab1d`.

## Historical Evidence

> Historical record retains the legacy label “WU1 provenance tasks 1.1–1.3” solely to preserve the PR #65 audit trail.

- Candidate `35d10b844dffc2bc0f16a2b03e11a4a58c553daa` shipped through PR #65 and merge `b1269a2d2f4b791c6f9e2e29650660160e99f382`; issue #64 is closed.
- Historical authored diff was 465 additions plus deletions within the prior 1,000-line cap; the recorded delivery strategy was `stacked-to-main` with no approval gate for that already-authorized delivery.
- Strict TDD evidence: `bun test test/provenance` RED exited 1 (0 pass, 17 fail); GREEN and REFACTOR exited 0 (17 pass, 42 assertions).
- The completed test set contains 17 integration tests, 4 approval tests, and 3 pure harness functions; all 17 pass after refactor.
- RED covered executable documentation-like paths, unsafe Git selectors, digest mismatch, canonical consistency/rollback, and ownership conflict; rows marked N/A were omitted.
- Runtime harness was N/A because the completed changes were planning/provenance surfaces; no runtime, DB, or Tower state was mutated.
- Rollback boundary: revert the six provenance paths from the prior record, restore task checkboxes, and remove only this progress artifact.

## Ownership and Next Gate

- Installable V1 owns S8.2 lifecycle paths and tests; Autonomous V2 owns its separate contract work.
- The prior ownership checkpoint was `v1-provenance-published`; V2 publication remains dependency-blocked until the exact V1 release reference is verified.
- Historical inputs remain byte-for-byte unchanged; pointer handling remains validate → temp file → fsync → rename, with failed revisions retained.
- `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, DB, runtime state, and Tower processes are excluded.
- Telegram remains the first dependency-safe future priority, without shell, worker, Git, merge, delivery, or implicit project-selection authority; no ID is assigned before a one-PR boundary is proven.

## S8.2 TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T8.2.1.1 | `version-store.test.mjs` | Unit/integration | focused path absent | exit 1: 0 pass, missing module | exit 0: 5 pass, 14 assertions | immutable mismatch, traversal, rollback, 3 failure points, denial | 5 pass, 16 assertions |
| T8.2.1.2 | `version-store.test.mjs` | Unit/integration | same RED | production added after RED | exit 0: 5 pass | two versions and distinct failure paths | focused test green |
| T8.2.1.3 | `version-store.test.mjs` | Integration | 5 pass | temp-write case added before support | exit 0: 5 pass | temp/fsync/rename preserve pointer | `bun test test/install`: 11 pass |
| T8.2.2.1 | `lifecycle.test.mjs` | Integration | M8.2.1: 5 pass | exit 1: 0 pass, missing module | exit 0: 4 pass, 16 assertions | failed/successful upgrades, idempotent uninstall | 6 pass, 22 assertions |
| T8.2.2.2 | `lifecycle.test.mjs` | Integration | same RED | wiring assertions written first | exit 0: 5 pass, 19 assertions | `torre`, installer, publisher paths | focused test green |
| T8.2.2.3 | both install tests | Integration | 10 pass | pointer audit case written before catch/audit | exit 0: 6 pass | deterministic harness + retained failed version | 11 pass, 38 assertions |

## S8.2 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `bun test test/install` → exit 0; 11 pass, 0 fail, 38 assertions across 2 files. |
| Regression test | `bun test test/provenance` → exit 0; 17 pass, 0 fail, 42 assertions. |
| Runtime harness | Temporary XDG homes + temporary Git repository, Tower OFF: install 1.0.0 → upgrade 1.1.0 → failed upgrade 1.2.0 → rollback → uninstall; exit 0 with `HARNESS_OK active=removed config=preserved history=preserved failed-version=retained tower=OFF`. |
| Rollback evidence | Failed validation retained `versions/1.2.0`, left 1.1.0 active, rollback restored 1.0.0, and uninstall removed only `active.json`; config, audit, immutable versions, and `.git/control-tower/history` remained. |
| Rollback boundary | Revert exactly the eight S8.2 implementation/test paths and restore these six checkboxes/evidence; S8.1 and existing planning candidate remain independent. |

## S8.2 Scope Notes

- No design deviations. `core.mjs`, `mcp.mjs`, package/lock files, DB state, Tower state, integrations, services, registry, host, Support, Hermes, and Telegram were untouched.
- Delivery boundary remains one autonomous `S8.2` PR targeting `master`; no commit or delivery operation was performed by apply.

## Bounded Remediation Evidence

- Authority: maintainer-authorized NON-NATIVE correction of the three CRITICAL findings in corrected verify report SHA-256 `9905124fe2d01be061e316dbeadc453be7260112b260b3a413b1da8351162413` / Engram #6852 revision 2. The authoritative corpus remains 13 requirements / 25 scenarios; focused coverage is annotation only.
- Pre-remediation candidate: 573 changed lines under approved accounting (436 additions, 137 deletions), accepted base `e4d8ad63437e5c57dbf37edf86aadcc9c9fdab1d`.
- Remediation delta: 133 additions + deletions against the frozen pre-remediation snapshot, below the 227-line maximum. Approved cumulative accounting is 706/800; direct accepted-base diff accounting is 696 changed lines when cancellations are netted.
- Remediation changed paths: `bin/torre`, `install/lifecycle.mjs`, `test/install/lifecycle.test.mjs`, and this apply-progress evidence only. The other five authorized implementation/test paths are byte-identical to the pre-remediation snapshot.

### Remediation TDD Cycle Evidence

| Critical | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Command authority | `test/install/lifecycle.test.mjs` | Command integration | 11 pass, 38 assertions | `bun test test/install/lifecycle.test.mjs` → exit 1; suite 6 pass/3 fail, command returned non-`CT_V2_ONLY` | exit 0; 9 pass, 38 assertions | launch-worker, create-session, create-worktree all denied before repo discovery; no `ACTIVE`/DB | final focused suite 15 pass, 58 assertions |
| Checkout migration / unknown state | `test/install/lifecycle.test.mjs` | Filesystem integration | 11 pass, 38 assertions | same RED → missing backup/journal and unsafe state advanced to 1.1.0 | exit 0; verified bytes backed up, journaled, active pointer protected | valid backup, malformed command, invalid JSON, and changed-after-backup paths; final 10 pass, 42 assertions | migration remains a narrow pre-store gate; final focused suite green |
| Full-suite causality | full `bun test` snapshots | Regression | accepted-base snapshot | candidate and accepted base both reproduce the same non-candidate failures | no S8.2 regression corrected because none was found | candidate adds exactly 15 passing install tests and no additional failure/error | classified only; unrelated code/tests untouched |

### Remediation Verification

| Evidence | Exact result |
|---|---|
| Focused install | `bun test test/install` → exit 0; 15 pass, 0 fail, 58 assertions, 2 files; output SHA-256 `533700e1f5edb36c612e0215aae01a41a11af544111d7f631657b09acd10e899`. |
| Provenance regression | `bun test test/provenance` → exit 0; 17 pass, 0 fail, 42 assertions; output SHA-256 `e4651142149e2b4d01994b4e4a77a30bcdf91c7c35b92a68ee547e0fd6582159`. |
| Runtime harness | Fresh temp XDG + temp repo, Tower OFF: install 1.0.0 → upgrade 1.1.0 with verified legacy backup → failed 1.2.0 → command denial → unknown-state denial → rollback → uninstall. Exit 0; `HARNESS_OK`; output SHA-256 `ddf24635a040a183f2fe1bc7df52b022c0a1ee848676a18ff42c0c67c61bd7f2`. Config, history, immutable versions, audit, and migration journal preserved; no `ACTIVE` or `tower.db`. |
| Candidate full suite | Fresh isolated snapshot with temp HOME/XDG and snapshot-local `CONTROL_TOWER_CORE`: `bun test` → exit 1; 314 pass, 1 fail, 1 error, 2194 assertions, 315 tests/15 files; SHA-256 `81d73ab6ca44c257444a4d6d7e55dd9f1010b34399f6b51df963d416a77ab4f7`. |
| Accepted-base full suite | Separate temp clone populated from `git archive e4d8ad63437e5c57dbf37edf86aadcc9c9fdab1d`, same isolation: `bun test` → exit 1; 299 pass, 1 fail, 1 error, 2136 assertions, 300 tests/13 files; SHA-256 `529541951f4303f62ba3919374320126dbff2715f6cc4909ec86f8242848b279`. |
| Differential classification | Both snapshots emit two `fatal: Needed a single revision` messages and the same missing `yaml` package error. Candidate has +15 pass/+58 assertions and no extra failure/error: no S8.2-introduced full-suite regression. These are accepted-base/environmental failures and were not changed. |
| Syntax/whitespace | `bash -n install.sh bin/torre && node --check` for all four ESM paths, then `git diff --check` → exit 0, empty output. |
| Rollback boundary | Revert only remediation changes in `bin/torre`, `install/lifecycle.mjs`, `test/install/lifecycle.test.mjs`, and this appended/updated evidence. Prior S8.1/S8.2 implementation and evidence remain independent. |

### Exact Critical Outcomes

1. `bin/torre` now fails closed with `CT_V2_ONLY` for worker/session/worktree creation or launch requests before Git/Tower resolution and without mutation.
2. Upgrade now verifies checkout-installer state before storing a revision, preserves exact OpenCode config bytes in a recoverable migration journal, and deterministically rejects invalid, malformed, or changed legacy state without advancing the active pointer.
3. Full-suite candidate/base comparison proves zero S8.2-introduced failures; only the reproducible accepted-base/environmental failures remain.

### Non-blocking Follow-up

The native dispatcher conflates failed-verify blockers with archive readiness and cannot represent this maintainer-authorized correction while the review lifecycle is suspended. This bounded unit intentionally does not change dispatcher semantics.

## Final Unknown-Path Correction

- Authority: verify-report SHA-256 `487bf3d366fe1b934893497299669699af0f5a920af5f1472c55e03a59b726aa`, Engram #6852 revision 3; one remaining CRITICAL only.
- Final correction delta: 69 additions + deletions versus the current-candidate snapshot (≤94); approved cumulative accounting 775/800; direct accepted-base diff 751 after cancellations.
- Safety net: `bun test test/install` before test edit → exit 0, 15 pass, 58 assertions.
- RED: `bun test test/install/lifecycle.test.mjs` → exit 1, 10 pass/1 fail, 43 assertions; nonexistent checkout path stored and activated 1.1.0.
- GREEN: same command → exit 0, 11 pass, 52 assertions after existence, realpath, absolute-path, expected-root marker, and unchanged-config checks were added before storage.
- TRIANGULATE/REFACTOR: nonexistent path, outside-root symlink, incomplete checkout state, valid checkout, malformed config, and changed-after-backup paths → exit 0, 11 pass, 57 assertions.
- Focused: `bun test test/install` → exit 0, 16 pass, 73 assertions; SHA-256 `5c92983e2f2a2be61ca83c58f4b9fe41d77a3bd2bda611391920dcdffa4733b2`.
- Provenance: `bun test test/provenance` → exit 0, 17 pass, 42 assertions; SHA-256 `61f35f2f2196120980b14bf4e943980b2712b08dc1501743270bddb3c6981893`.
- Tower-OFF temp-XDG/repo harness: valid migration → failed upgrade → nonexistent/changed/malformed denial → rollback → uninstall + `CT_V2_ONLY`; exit 0, `HARNESS_OK`, SHA-256 `6f7039a5f2642e8c8cdafcb5bdbee70881fda482ab78b5509018d6a779049d77`. Active/config/history/versions/audit remained safe.
- Shell/ESM syntax plus `git diff --check` → exit 0, empty SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Rollback boundary: revert only this correction in `install/lifecycle.mjs`, `test/install/lifecycle.test.mjs`, and this evidence section; all prior S8.1/S8.2 evidence remains intact.
- Dispatcher defect remains the existing non-blocking follow-up; no dispatcher semantics changed.
