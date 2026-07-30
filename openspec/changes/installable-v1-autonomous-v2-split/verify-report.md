```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:649fee43ab53889f9729c4bf1fed23ddea3e3d67e5d20a8733908fbf72cfc05b
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 4/13
scenarios: 6/25
test_command: bun test test/install && bun test test/provenance
test_exit_code: 0
test_output_hash: sha256:0fc7936a4b65bd8a986d24bd0cafbd45249be65dd54860511de5b284ec71d10e
build_command: bash -n install.sh bin/torre && node --check install/version-store.mjs && node --check install/active-pointer.mjs && node --check install/lifecycle.mjs && node --check scripts/publish-runtime.mjs
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: `installable-v1-autonomous-v2-split` — P8/S8.2  
**Version**: N/A  
**Mode**: Strict TDD (Bun)  
**Accepted base**: `e4d8ad63437e5c57dbf37edf86aadcc9c9fdab1d`  
**Authorization**: final independently authorized SDD verification after the last bounded correction  
**Replaced report SHA-256**: `487bf3d366fe1b934893497299669699af0f5a920af5f1472c55e03a59b726aa`  
**Verdict**: **PASS WITH WARNINGS**

The final unknown-path correction resolves the prior blocker. Runtime evidence now proves fail-closed behavior for nonexistent, relative, incomplete, symlink-escaping, malformed, invalid-JSON, and changed-after-backup legacy states before version storage or activation. No candidate-introduced full-suite failure remains.

### Verification Scope and Spec Inventory

The three retrieved specifications contain the authoritative **13 requirements / 25 scenarios**. Those are the strict-envelope totals. The P8/S8.2 completion subset is annotation only: **4 requirements / 6 scenarios**, all compliant.

| Spec | Requirements | Scenarios | P8/S8.2 coverage |
|---|---:|---:|---|
| `installable-control-tower-v1` | 5 | 10 | automation denial; failed upgrade/rollback; uninstall preservation |
| `autonomous-control-tower-v2` | 4 | 7 | negative V1-no-autonomy proof |
| `control-tower-product-provenance` | 4 | 8 | reversible checkout migration and unknown-state denial |
| **Total corpus** | **13** | **25** | **4 requirements / 6 scenarios** |

### Completeness

| Metric | Value |
|---|---:|
| Native task rows | 7 |
| Native rows checked | 7 |
| S8.2 tasks checked | 6/6 |
| S8.2 tasks semantically complete | 6/6 |
| Incomplete S8.2 acceptance areas | 0 |

All implementation tasks are checked, so full verification was permitted.

### S8.2 Requirement and Scenario Compliance

| Requirement | Scenario | Runtime covering evidence | Result |
|---|---|---|---|
| V1 sole Main/manual worker boundary | V1 receives an automation request | Focused suite plus fresh command harness: four exact `CT_V2_ONLY` denials before repository discovery; HEAD/status and Tower files unchanged | ✅ COMPLIANT |
| V1 versioned lifecycle | Failed upgrade rolls back | Focused suite and fresh lifecycle harness: failed 1.2.0 retained, 1.1.0 remains active, rollback restores 1.0.0 | ✅ COMPLIANT |
| V1 versioned lifecycle | Uninstall preserves history | Focused suite and harness preserve configuration, backup/journal, audit, three immutable versions, and `.git/control-tower/history` | ✅ COMPLIANT |
| V2 bounded autonomous orchestration | V1 path cannot trigger autonomy | `launch-worker`, `create-worker`, `create-session`, and `create-worktree` deny exactly; no Git, Tower, worker, or repository mutation | ✅ COMPLIANT |
| Provenance checkout migration/state preservation | Legacy installation upgrades safely | Absolute existing no-symlink `mcp.mjs`, expected checkout-root markers, exact configuration backup, migration journal, active pointer, history, versions, and audit verified | ✅ COMPLIANT |
| Provenance checkout migration/state preservation | Migration encounters unknown state | Seven fresh negative cases fail with `CT_LEGACY_STATE_UNKNOWN` before storage/activation while preserving active/config/history/versions/audit | ✅ COMPLIANT |

**Scoped compliance**: **6/6 scenarios; 4/4 requirements**.  
**Strict corpus routing**: **6/25 scenarios; 4/13 requirements** because the remaining corpus belongs to other planned Sesiones or previously completed S8.1 provenance work.

### Full 25-Scenario Disposition Matrix

| # | Spec scenario | Disposition |
|---:|---|---|
| 1 | V1 — Two projects remain isolated | Deferred outside S8.2; no enrollment implementation claimed |
| 2 | V1 — Unsafe existing layout fails closed | Deferred outside S8.2; no layout implementation claimed |
| 3 | V1 — Support cannot gain authority | Deferred outside S8.2; no Support implementation claimed |
| 4 | V1 — V1 receives an automation request | ✅ COMPLIANT in S8.2 |
| 5 | V1 — Partial host matrix succeeds | Deferred outside S8.2 |
| 6 | V1 — Host configuration is unsafe | Deferred outside S8.2 |
| 7 | V1 — Failed upgrade rolls back | ✅ COMPLIANT in S8.2 |
| 8 | V1 — Uninstall preserves history | ✅ COMPLIANT in S8.2 |
| 9 | V1 — Local fallback works | Deferred outside S8.2 |
| 10 | V1 — Remote authority is rejected | Deferred outside S8.2 |
| 11 | V2 — V2 consumes a stable V1 contract | Deferred to V2 |
| 12 | V2 — Missing/changed dependency blocks autonomy | Deferred to V2 |
| 13 | V2 — Authorized jornada runs | Deferred to V2 |
| 14 | V2 — V1 path cannot trigger autonomy | ✅ COMPLIANT negative proof in S8.2 |
| 15 | V2 — Hermes presents two projects safely | Deferred; no Hermes implementation |
| 16 | V2 — Local Support replaces remote presentation | Deferred; no Support/Hermes implementation |
| 17 | V2 — Historical reference is unchanged | S8.1 provenance regression passes; not counted as S8.2 completion |
| 18 | Provenance — Narrowed contract creates a revision | S8.1 regression passes; outside S8.2 completion count |
| 19 | Provenance — Digest mismatch is rejected | S8.1 regression passes; outside S8.2 completion count |
| 20 | Provenance — Publication is consistent | S8.1 regression passes; outside S8.2 completion count |
| 21 | Provenance — Canonical rollback preserves history | S8.1 regression passes; outside S8.2 completion count |
| 22 | Provenance — Independent lanes proceed safely | S8.1 regression passes; outside S8.2 completion count |
| 23 | Provenance — Shared-file conflict is detected | S8.1 regression passes; outside S8.2 completion count |
| 24 | Provenance — Legacy installation upgrades safely | ✅ COMPLIANT in S8.2 |
| 25 | Provenance — Migration encounters unknown state | ✅ COMPLIANT in S8.2 |

### Build and Test Evidence

| Check | Exact command | Exit | Counts/result | SHA-256 of exact output |
|---|---|---:|---|---|
| Focused strict command | `bun test test/install && bun test test/provenance` | 0 | install 16 pass/73 assertions; provenance 17 pass/42 assertions | `0fc7936a4b65bd8a986d24bd0cafbd45249be65dd54860511de5b284ec71d10e` |
| Focused install, independent run | `bun test test/install` | 0 | 16 pass, 0 fail, 73 assertions, 2 files | `5c92983e2f2a2be61ca83c58f4b9fe41d77a3bd2bda611391920dcdffa4733b2` |
| Provenance regression, independent run | `bun test test/provenance` | 0 | 17 pass, 0 fail, 42 assertions, 1 file | `97a521cf1c95f50acaa27ed5891b071745f8683d1d4b29a882373fd954db875b` |
| Shell/ESM syntax | declared build command | 0 | empty output | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Diff whitespace | `git diff --check` | 0 | empty output | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Focused coverage | `bun test test/install --coverage` | 0 | 16 pass/73 assertions; aggregate 92.68% lines | `0cb49461fcf37299cda270c4dd6c18ba525f686ffd3addfa07f3cf8a62d173bc` |
| Fresh Tower-OFF harness | `bun /tmp/opencode/s8-2-final-harness.mjs "$PWD"` | 0 | lifecycle + authority + 7 unknown-state cases; `HARNESS_OK` | `b756383be74f11fd608e597d92bcad2c38f73e666c782168db95fb70565b29fa` |
| Candidate full suite | `bun test` in fresh non-worktree candidate snapshot | 1 | 255 pass, 2 fail, 2 errors, 1884 assertions, 257 tests/15 files | `414e51d2fbeafd2bd2ff50819b75eee01d7fb941c06ae35109628c2f1114cf49` |
| Accepted-base full suite | `bun test` in separate `git archive` snapshot | 1 | 239 pass, 2 fail, 2 errors, 1811 assertions, 241 tests/13 files | `e713b19f71e8f3d7cd80f0f982133a01c309c61afed9b51758ad05a877d2924f` |

Harness source SHA-256: `e2f569c9acab7eb9000a4eb48729ec60cad055e125cea3165655a8d4c43adfb5`.

#### Fresh lifecycle, authority, and unknown-state evidence

```text
authority commands=4 exact=true git-unchanged=true tower-off=true
lifecycle valid-backup=true journal=true failed-retained=true rollback=true uninstall-preserved=true
nonexistent exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
relative exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
incomplete exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
outside-symlink exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
malformed-command exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
invalid-json exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
changed-after-backup exit=1 code=CT_LEGACY_STATE_UNKNOWN preserved=true
HARNESS_OK cases=7 active-config-history-versions-audit-preserved=true
```

The valid case proves an absolute existing path, `realpath` equality/no symlink, the expected `mcp.mjs`, `core.mjs`, `install.sh`, and `bin/torre` checkout markers, exact backup bytes, journal creation, and unchanged user configuration/history. Every negative case fails before storing the attempted version; active pointer, legacy configuration, history, immutable versions, audit, backup, and journal remain byte-identical to the pre-attempt snapshot.

#### Exact command boundary

For each of `launch-worker`, `create-worker`, `create-session`, and `create-worktree`, the harness asserts:

```text
exit=1
stdout=""
stderr="CT_V2_ONLY: <command>\n"
```

Repository `HEAD` and `git status --porcelain=v1` are unchanged, while `.git/control-tower/ACTIVE` and `.git/control-tower/tower.db` remain absent.

#### Full-suite candidate causality

Both non-worktree snapshots reproduce the same two boundaries:

1. `test/migration.test.mjs` cannot execute `git rev-parse --git-common-dir` without `.git` metadata and also emits two `fatal: Needed a single revision` messages.
2. `test/contracts/schema.test.mjs` cannot resolve package `yaml` from `contracts/validate.mjs` in the isolated snapshot.

Exact before/after: accepted base **239 pass / 2 fail / 2 errors / 1811 assertions / 241 tests / 13 files**; candidate **255 pass / 2 fail / 2 errors / 1884 assertions / 257 tests / 15 files**. The candidate adds exactly **16 passes, 73 assertions, 16 tests, and 2 test files**, with no added failure or error. The full-suite non-zero exit is therefore an accepted-base/environment boundary and a WARNING, not a candidate blocker.

### Strict TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ✅ | Six original rows, three remediation rows, and final correction evidence are present in `apply-progress.md` |
| Test files exist | ✅ | Both authorized install test files were read in full |
| GREEN confirmed now | ✅ | 16/16 install tests pass with 73 assertions |
| RED chronology reconstructable | ⚠️ | Counts and frozen before/after hashes exist, but raw intermediate RED bytes/transcripts were not retained |
| Safety net | ⚠️ | Final correction records 15 pass/58 assertions before test edit; the initial existing-shell baseline remains unavailable |
| Triangulation against contract | ✅ | Valid, nonexistent, relative, incomplete, actual symlink escape, malformed command, invalid JSON, and changed backup all executed |
| Refactor rerun | ✅ | Focused suites, coverage, syntax, diff, harness, and isolated full-suite comparison reran |

**TDD compliance**: 5 fully confirmed checks and 2 evidence-history warnings. No current behavioral failure remains.

### Test Layer Distribution

| Layer | Tests/cases | Files | Tools |
|---|---:|---:|---|
| Unit/integration mixed | 5 | 1 | Bun + real temporary filesystem |
| Command/filesystem integration | 11 | 1 | Bun + subprocesses + temporary XDG/repositories |
| Independent system harness | authority + lifecycle + 7 negative cases | external verifier | Bun + Git + fresh XDG/repositories |
| Provenance regression | 17 | 1 | Bun |

### Changed File Coverage

| File | Function % | Line % | Uncovered lines | Rating |
|---|---:|---:|---|---|
| `install/active-pointer.mjs` | 100.00% | 100.00% | — | ✅ Excellent |
| `install/lifecycle.mjs` | 71.43% | 83.91% | 80, 84–87, 90–96, 101–102 | ⚠️ Acceptable |
| `install/version-store.mjs` | 100.00% | 94.12% | 29–30 | ⚠️ Acceptable |
| Shell entry points and publisher | N/A | N/A | subprocess coverage not instrumented | Exercised by integration/harness paths |

**Aggregate instrumented line coverage**: **92.68%**. No instrumented changed file is below the 80% warning threshold.

### Assertion Quality

**Assertion quality**: ✅ No tautology, orphan empty assertion, type-only assertion, ghost loop, smoke-only check, internal CSS/state coupling, or mock-heavy test was found.

One durable regression-quality limitation remains: the focused test's supposed symlink fixture uses `linked-mcp.mjs`, so it is rejected by the `/mcp.mjs` command-shape guard before reaching the `realpath` branch. The independent final harness uses an actual symlinked directory ending in `/mcp.mjs` and proves the production branch, but that exact branch is not durably represented in the committed focused test.

### Quality Metrics

**Shell/ESM syntax**: ✅ Passed  
**Linter**: ➖ No project linter configured  
**Type checker**: ➖ Not configured/applicable to these `.mjs`/shell paths  
**Diff whitespace**: ✅ Passed  
**Executable modes**: ✅ `bin/torre` and `install.sh` are `0775`

### Correctness (Static + Runtime Evidence)

| Contract | Status | Evidence |
|---|---|---|
| Immutable version directories | ✅ | changed bytes/traversal rejected; old and failed versions retained |
| Atomic active pointer | ✅ | temp/fsync/rename failures preserve prior pointer |
| Failed upgrade → rollback → uninstall | ✅ | fresh CLI lifecycle flow passes and preserves required state |
| Exact command-level `CT_V2_ONLY` | ✅ | four command variants exact; no Git/Tower/repository mutation |
| Valid legacy migration backup/journal | ✅ | exact config bytes, journal, marker-complete root, and history verified |
| Absolute/existing/realpath/no-symlink path | ✅ | valid case succeeds; relative, nonexistent, and actual symlink escape deny |
| Malformed/incomplete/changed/unknown state | ✅ | seven negative cases deny before store/activation and preserve all snapshots |
| Full-suite candidate causality | ✅ | candidate adds only 16 passes/73 assertions; failure/error counts unchanged |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Additive ESM; unchanged `core.mjs`/`mcp.mjs` | ✅ | Exact eight implementation/test paths only |
| Immutable versions and atomic `active.json` | ✅ | Focused and harness evidence |
| Validate before pointer advance; retain failed revision | ✅ | Validation failure retains 1.2.0 while 1.1.0 remains active |
| Every recognized V1 automation request returns `CT_V2_ONLY` | ✅ | Four variants deny before Git/Tower resolution |
| Checkout import only through verified backup journal | ✅ | Existing absolute no-symlink marker-complete checkout verified first |
| Unknown legacy paths fail closed before storage | ✅ | All independently requested unknown states pass |
| No accidental S8.3/V2/Hermes/Telegram/services work | ✅ | Scope/path/source audit found none |

### Exact Candidate Scope and Budgets

The pre-verification candidate contains exactly eight implementation/test paths and five previously approved planning/evidence paths. This report is the only verifier-authored repository mutation.

```text
bin/torre
install.sh
install/active-pointer.mjs
install/lifecycle.mjs
install/version-store.mjs
scripts/publish-runtime.mjs
test/install/lifecycle.test.mjs
test/install/version-store.test.mjs
openspec/changes/installable-v1-autonomous-v2-split/apply-progress.md
openspec/changes/installable-v1-autonomous-v2-split/session-handoff.md
openspec/changes/installable-v1-autonomous-v2-split/tasks.md
openspec/plans/master-index.md
openspec/plans/plan-8/STATUS.md
```

| Accounting boundary | Additions | Deletions | Total | Limit/result |
|---|---:|---:|---:|---|
| Final correction versus frozen pre-correction files | 61 | 8 | 69 | ✅ ≤94 |
| Approved cumulative authored accounting | — | — | 775 | ✅ ≤800 |
| Direct accepted-base diff after cancellations | 609 | 142 | 751 | ✅ ≤800 |
| Direct implementation/test subset | 427 | 1 | 428 | Exact eight paths |
| Direct planning/evidence subset | 182 | 141 | 323 | Exact five paths |

The final correction is independently reconstructed as:

```text
14 additions + 2 deletions  install/lifecycle.mjs
30 additions + 4 deletions  test/install/lifecycle.test.mjs
17 additions + 2 deletions  apply-progress.md
total: 69
```

Frozen pre-correction hashes match the prior report: lifecycle `c1be15b7...`, lifecycle test `73ed9bd3...`, and apply-progress `11d8b0eb...`. Correction numstat evidence SHA-256 is `248c774f562aaaa15ec60740b3c45a1ada3d1d2298279c94529967c5c760e9ea`. The previous approved cumulative value was 706; adding the independently measured 69 yields 775.

No changed implementation path exists in `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, `contracts/**`, registry/layout/hosts, Support, Hermes, Telegram, services, DB, or Tower runtime state.

### Prior Finding Reassessment

| Prior finding | Current disposition |
|---|---|
| Nonexistent legacy `mcp.mjs` accepted | **Resolved**: exit 1, no version storage/activation, all state preserved |
| Suffix-only checkout trust | **Resolved**: absolute path, existence, realpath equality, no symlink, and root markers enforced |
| Full suite non-zero | **WARNING**: exact failure/error counts and signatures reproduce on accepted base; candidate adds no failure/error |
| Reviewer load | **WARNING**: 775 cumulative/751 direct remain under 800 but above the default 400-line budget |
| RED chronology and initial shell safety net | **WARNING**: outcomes/hashes exist, raw intermediate bytes and initial baseline do not |
| Lifecycle coverage below 80% | **Resolved**: 83.91%; aggregate 92.68% |
| Planning/status drift and plan-level “Work Unit Evidence” | **WARNING**: still present; verification was forbidden from editing planning/apply-progress |

### Issues Found

**CRITICAL**: None.

**WARNING**

1. Full `bun test` exits 1 in both fresh non-worktree snapshots because Git metadata and installed `yaml` resolution are absent. Candidate and base reproduce identical 2-fail/2-error causality; this is not candidate-introduced.
2. Review load is 775 cumulative/751 direct, below the authorized 800 cap but above the default 400-line review budget.
3. Strict TDD chronology is not fully replayable because raw intermediate RED bytes/transcripts and the original existing-shell baseline were not retained.
4. Durable focused regression coverage does not truly exercise the realpath/symlink branch: its symlink fixture fails the filename-shape guard first. The fresh independent harness covers the actual branch and passes.
5. `master-index.md`, P8 `STATUS.md`, and `session-handoff.md` remain stale, and `apply-progress.md` retains plan-level “Work Unit Evidence” vocabulary drift.

**SUGGESTION**: None. Verification did not remediate.

### Residual Risks

- Clean-machine Linux/WSL systemd, macOS launchd, host adapters, services, enrollment/layout, Support, Hermes, Telegram, and release-matrix evidence remain future work outside S8.2.
- The isolated full-suite snapshots intentionally have no `.git` and no installed dependency tree; those environmental boundaries remain outside this candidate.
- Storage API immutability cannot prevent external owner-level filesystem edits.
- The actual symlink-escape branch is proved only by the independent verification harness, not by the durable focused test fixture.

### Canonical Verification Evidence Preimage

The following UTF-8 JSON object, including its terminating newline, is the exact preimage hashed as `evidence_revision`:

```json
{
  "accepted_base": "e4d8ad63437e5c57dbf37edf86aadcc9c9fdab1d",
  "candidate": {
    "files": {
      "bin/torre": "bdb4f7880fbad5dec8ad7766f085bc5db28fd99234be69637777b3ade7121a4c",
      "install.sh": "402cecf1a50b0bed219199f715a9bfbcbb514e892338469b649453bf74227968",
      "install/active-pointer.mjs": "07ee567ecb07f5946be0c1a2fdc19dfacba1482e34dd386b5fad09fd18571dd8",
      "install/lifecycle.mjs": "4c8392df62de697b71f19f7b7d040e991a4b31f1f28cb80662711d812be67654",
      "install/version-store.mjs": "c615d3724675ab5de2cfe3f74e6d31fc87b0b37ba8eb0dfc7711717c45e9d951",
      "openspec/changes/installable-v1-autonomous-v2-split/apply-progress.md": "78c6af6a80a30706aaa68bcac0caabdca51f6b5ceca6b3f7dd5ee8abb5c2369f",
      "openspec/changes/installable-v1-autonomous-v2-split/session-handoff.md": "3d682b89b68b6f81f11605e9cae824dae48e9a8b5a347ae4a5645f3d538d7c0d",
      "openspec/changes/installable-v1-autonomous-v2-split/tasks.md": "e0897b0f2ae163970943c98f9bf3b99327cfe72e65fdbd502f6421b4e86e6424",
      "openspec/plans/master-index.md": "7d76161d3bbddfec91b65ef5c162951738f7bcbf1edf0982ae207ace62c1e475",
      "openspec/plans/plan-8/STATUS.md": "9b47ed1f21e1527e7559c0c8c0e1b3c256fb56c8c04b1ccdbb7e9d8318da52cf",
      "scripts/publish-runtime.mjs": "8c058cea7bfb688e6f2ea7d89832537e42213e472b163b99dcd49eb1040d16fa",
      "test/install/lifecycle.test.mjs": "4a1c38f1b70b6782955621e6be6c53e19807949fb389a69b19b59556d0f2b982",
      "test/install/version-store.test.mjs": "9328dbe5dc4e143ea61428c3a96c8918882e8591a27de9f412ad8eb51e56ca2a"
    },
    "implementation_test_paths": 8,
    "line_budget": {
      "approved_cumulative": 775,
      "direct_additions": 609,
      "direct_deletions": 142,
      "direct_total": 751,
      "final_correction_additions": 61,
      "final_correction_deletions": 8,
      "final_correction_limit": 94,
      "final_correction_total": 69,
      "implementation_test_total": 428,
      "planning_evidence_total": 323
    },
    "planning_evidence_paths": 5
  },
  "checks": {
    "accepted_full": {
      "assertions": 1811,
      "command": "bun test",
      "cwd": "/tmp/opencode/s8-2-final-full.n9Ang2/accepted",
      "environment": "git archive accepted base; fresh HOME/XDG/TMPDIR; CONTROL_TOWER_CORE=accepted/core.mjs; no .git",
      "errors": 2,
      "exit": 1,
      "fail": 2,
      "output_sha256": "e713b19f71e8f3d7cd80f0f982133a01c309c61afed9b51758ad05a877d2924f",
      "pass": 239,
      "test_files": 13,
      "tests": 241
    },
    "build": {
      "command": "bash -n install.sh bin/torre && node --check install/version-store.mjs && node --check install/active-pointer.mjs && node --check install/lifecycle.mjs && node --check scripts/publish-runtime.mjs",
      "exit": 0,
      "output_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    "candidate_full": {
      "assertions": 1884,
      "command": "bun test",
      "cwd": "/tmp/opencode/s8-2-final-full.n9Ang2/candidate",
      "environment": "fresh candidate non-worktree snapshot; fresh HOME/XDG/TMPDIR; CONTROL_TOWER_CORE=candidate/core.mjs; no .git",
      "errors": 2,
      "exit": 1,
      "fail": 2,
      "output_sha256": "414e51d2fbeafd2bd2ff50819b75eee01d7fb941c06ae35109628c2f1114cf49",
      "pass": 255,
      "test_files": 15,
      "tests": 257
    },
    "coverage": {
      "active_pointer_lines": 100.0,
      "aggregate_lines": 92.68,
      "command": "bun test test/install --coverage",
      "exit": 0,
      "lifecycle_lines": 83.91,
      "output_sha256": "0cb49461fcf37299cda270c4dd6c18ba525f686ffd3addfa07f3cf8a62d173bc",
      "version_store_lines": 94.12
    },
    "diff_check": {
      "command": "git diff --check",
      "exit": 0,
      "output_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    "final_correction": {
      "numstat_sha256": "248c774f562aaaa15ec60740b3c45a1ada3d1d2298279c94529967c5c760e9ea",
      "pre_correction_apply_progress_sha256": "11d8b0eb24631c171aa168053dcb96e8b714ae9ff03e075d92ce0e2fe04f7354",
      "pre_correction_lifecycle_sha256": "c1be15b7fde564819a1c433527b2c7438bb0d88e20813ea42a90f2fe9e107841",
      "pre_correction_test_sha256": "73ed9bd3c5edf6f41b337c9d22d947da19f0d7e818bb0091cf7a0608d5e31dbe"
    },
    "focused": {
      "assertions": 115,
      "command": "bun test test/install && bun test test/provenance",
      "exit": 0,
      "install_output_sha256": "5c92983e2f2a2be61ca83c58f4b9fe41d77a3bd2bda611391920dcdffa4733b2",
      "install_pass": 16,
      "output_sha256": "0fc7936a4b65bd8a986d24bd0cafbd45249be65dd54860511de5b284ec71d10e",
      "provenance_output_sha256": "97a521cf1c95f50acaa27ed5891b071745f8683d1d4b29a882373fd954db875b",
      "provenance_pass": 17
    },
    "harness": {
      "cases": [
        "nonexistent",
        "relative",
        "incomplete",
        "outside-symlink",
        "malformed-command",
        "invalid-json",
        "changed-after-backup"
      ],
      "command": "bun /tmp/opencode/s8-2-final-harness.mjs $PWD",
      "exit": 0,
      "output_sha256": "b756383be74f11fd608e597d92bcad2c38f73e666c782168db95fb70565b29fa",
      "script_sha256": "e2f569c9acab7eb9000a4eb48729ec60cad055e125cea3165655a8d4c43adfb5"
    }
  },
  "corpus": {
    "requirements": 13,
    "s8_2_compliant_requirements": 4,
    "s8_2_compliant_scenarios": 6,
    "s8_2_requirements": 4,
    "s8_2_scenarios": 6,
    "scenarios": 25
  },
  "pre_replacement_report_sha256": "487bf3d366fe1b934893497299669699af0f5a920af5f1472c55e03a59b726aa",
  "scope": {
    "implementation_test_paths": [
      "bin/torre",
      "install.sh",
      "install/active-pointer.mjs",
      "install/lifecycle.mjs",
      "install/version-store.mjs",
      "scripts/publish-runtime.mjs",
      "test/install/lifecycle.test.mjs",
      "test/install/version-store.test.mjs"
    ],
    "scope_creep": false,
    "telegram_or_s8_3": false
  },
  "verdict": "pass_with_warnings"
}
```

The preimage SHA-256 is `649fee43ab53889f9729c4bf1fed23ddea3e3d67e5d20a8733908fbf72cfc05b`.

### Final Verdict

**PASS WITH WARNINGS** — all 4/4 S8.2 requirements and 6/6 S8.2 scenarios pass current runtime verification. There are no candidate-introduced blockers or CRITICAL findings. The remaining warnings are environmental, review-load, evidence-history, durable regression-quality, and stale-planning concerns; none contradicts the implemented S8.2 contract.
