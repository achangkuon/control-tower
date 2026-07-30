```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:b883b7e0d1c5d3a475ea79d9ddbcba14dda013251584a01128677d933cc10dc3
verdict: pass
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 7/7
test_command: bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs
test_exit_code: 0
test_output_hash: sha256:667669c6327acc745c23951a01a023ea2d1c04af21aa706873c18f0c2be206a2
build_command: bun build ./registry/index.mjs --target=bun --outfile=/tmp/opencode/sdd-tower-project-registry-rerun.bundle.mjs
build_exit_code: 0
build_output_hash: sha256:9e16a17b0c6ce90fb6cca27d6b37caabaccc90d5a013bcb64ca9f53f4a56228f
```

## Verification Report

**Change**: `sdd-tower-project-registry`<br>
**Sesión**: S2.4 — Registry Storage and XDG Path Resolution<br>
**Version**: `project-registry-v1` / schema version 1<br>
**Mode**: Strict TDD<br>
**Artifact store**: both<br>
**Verified HEAD**: `a574d45bd77c851265e7cd08fa1de91f457d9794`<br>
**Base**: `origin/master` at the same commit (`0/0` divergence)

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 14 |
| Tasks marked complete | 14 |
| Tasks independently satisfied | 14 |
| Tasks incomplete | 0 |
| Requirements satisfied | 4/4 |
| Scenarios compliant | 7/7 |

Both prior CRITICAL findings are closed:

1. Exact parent/temp/lock/target modes now survive restrictive umask, and the installed registry immediately reloads.
2. The maintained runtime-isolation test now resolves the actual Git common directory and proves the real database identity is unchanged.

### Delivered Chain, Candidate Boundary, and Modes

| PR | Merge identity | Exact boundary |
|---|---|---|
| PR1 `#82` | `2903445c201ef2eb83faff147dfd1ed7b5ef50b7` | Planning only: 5 paths, +313/-33 |
| PR2 `#84` | `6d08df069274a2ee9ba29ef624aa93010b998381` | Final code/test candidate: 4 created paths, 387 additions |
| PR3 `#86` | `a574d45bd77c851265e7cd08fa1de91f457d9794` | Apply evidence only: `apply-progress.md`, 98 additions |
| PR4 | Uncommitted evidence candidate | Only this 329-line `verify-report.md`; no implementation bytes |

Chain strategy: stacked to `master`; PR1–PR3 are independently merged and PR4 depends on their exact final base.
PR2 delivered `registry/path.mjs` (14), `registry/store.mjs` (187), `registry/index.mjs` (2), and `test/registry/storage.test.mjs` (184), exactly 387 lines. Verified under umask `0277`: recursive destination segments/final parent `0700`; temporary, lock, and installed registry `0600`.

### Build and Test Execution

#### Build

Exact command:

```text
bun build "./registry/index.mjs" --target=bun --outfile="/tmp/opencode/sdd-tower-project-registry-rerun.bundle.mjs"
```

Result: exit `0`; output hash `sha256:9e16a17b0c6ce90fb6cca27d6b37caabaccc90d5a013bcb64ca9f53f4a56228f`.

```text
Bundled 167 modules in 22ms

  sdd-tower-project-registry-rerun.bundle.mjs  0.49 MB  (entry point)
```

OpenSpec strict validation: `npx --yes @fission-ai/openspec@1.5.0 validate sdd-tower-project-registry --strict` → exit `0`; `Change 'sdd-tower-project-registry' is valid`; output hash `sha256:edd1ad174c93fe1a2987b89075e37a8d09ef559e77b56daf18d36e8e30ff337e`.
#### Required storage and focused tests

Storage command: `bun test test/registry/storage.test.mjs` → exit `0`; 14 pass, 0 fail, 47 assertions; output hash `sha256:8d57c9242f020d734180e718960ee107624f08cf72210499a2be9dbf140854f9`.
Focused exact command:

```text
bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs
```

Result: exit `0`; output hash `sha256:667669c6327acc745c23951a01a023ea2d1c04af21aa706873c18f0c2be206a2`.

```text
bun test v1.3.14 (d1632b29)

 57 pass
 0 fail
 166 expect() calls
Ran 57 tests across 3 files. [663.00ms]
```

The actual Git-common-directory runtime identities were unchanged around this command:

| Runtime path | Before and after identity |
|---|---|
| `.git/control-tower/ACTIVE` | inode 2741; size 0; mode 664; mtime 1785414945; ctime 1785414945; SHA-256 `e3b0c442…b855` |
| `.git/control-tower/tower.db` | inode 209367; size 151552; mode 644; mtime 1785441634; ctime 1785441634; SHA-256 `fe56f475…d349` |

#### Maintained restrictive-umask regression

Exact command:

```text
bun test test/registry/storage.test.mjs -t "restrictive umask"
```

Result: exit `0`; output hash `sha256:8acc48692c282cf5c19e491c6e6e11c0b5ddecf3bd0aacf4e4045a8ea11c6bad`.

```text
1 pass
13 filtered out
0 fail
2 expect() calls
Ran 1 test across 1 file. [457.00ms]
```

The child process set umask `0277`, created a nested destination tree, observed parent `0700`, temp/lock/target `0600`, and successfully loaded registry revision 1.

#### Independent remediation probe

An independent inline Bun probe verified all recursively created segments, exact modes, immediate load, and fail-closed full post-chmod parent revalidation.

Result: exit `0`; output hash `sha256:8396ca040110b6b1cfd264ae84242889b30f4fe04d91caeef0bcac30d495c41f`.

```json
{"recursiveModes":["700","700","700"],"tempMode":"600","lockMode":"600","fileMode":"600","loadedRevision":1,"postChmodRecheck":"CT_REGISTRY_UNSAFE","parentLstats":3}
```

#### Independent boundary probe

The probe changed cwd between resolutions and exercised malformed load, symlink parent, non-directory parent, non-file target, changed-entry revision rejection, same-directory temp/lock modes, temp-open failure cleanup, and byte preservation.

Result: exit `0`; output hash `sha256:8fa2d6dff373522f2fedf4683ca40395b54d8ea3419730d1ae31a29691669953`.

```json
{"cwdIndependent":true,"malformed":"CT_SCHEMA_INVALID","unsafeParentSymlink":"CT_REGISTRY_UNSAFE","unsafeParentType":"CT_REGISTRY_UNSAFE","unsafeTargetType":"CT_REGISTRY_UNSAFE","changedEntryWithoutIncrement":"CT_CAS_MISMATCH","tempMode":"600","lockMode":"600","tempOpenCleanup":true}
```

#### Independent two-process race probe

Two concurrent Bun children submitted different revision-2 candidates with the same expected revision. Exactly one committed; the other observed CAS mismatch; no residue remained.

Result: exit `0`; output hash `sha256:329177bcec95f5049ea7f45661017b0f328045611158cd8c23ed238286bdf953`.

```json
{"outcomes":["CT_CAS_MISMATCH","won"],"finalBranch":"release","residue":[]}
```

#### Coverage

Exact command:

```text
bun test --coverage test/registry/storage.test.mjs
```

Result: exit `0`; 14 pass, 0 fail, 47 assertions; output hash `sha256:bae711463a77f6ac654dd7ab6c57bdebdb2c579bcd71623f25a88268ee9334e9`.

| Changed file | Function coverage | Line coverage | Uncovered lines | Rating |
|---|---:|---:|---|---|
| `registry/index.mjs` | 100% | 100% | — | Excellent |
| `registry/path.mjs` | 100% | 100% | — | Excellent |
| `registry/store.mjs` | 94.74% | 94.84% | 45–46, 58–60, 82–83 | Acceptable |

Average changed implementation line coverage: **98.28%**. Bun did not emit branch coverage or instrument the test file itself.

#### Preserved repository-wide suite (not rerun)

Previously executed command:

```text
bun test
```

Preserved result: exit `1`; output hash `sha256:c4a8f43bfdd388505c13d3a5d7e0649b2bc3be53b04875cef2ee278803dfeb49`.

```text
384 pass
2 fail
2424 expect() calls
Ran 386 tests across 20 files. [58.59s]
```

The only failures were the two pre-existing `P0 frozen snapshot restore` cases. Both stopped in `assertRuntimeInactive` before restoration because the external Git-common-directory `ACTIVE` marker exists. This historical evidence remains valid, but the full suite was intentionally not rerun for PR4 because that external precondition is known. Current storage/focused reruns proved bounded marker and DB identity stability.

### Spec Compliance Matrix

| Requirement | Scenario | Runtime evidence | Result |
|---|---|---|---|
| Resolve isolated XDG path | Override/default independent of cwd | Authored path cases plus cwd-changing boundary probe | COMPLIANT |
| Resolve isolated XDG path | Invalid environment rejected | Maintained invalid-root cases | COMPLIANT |
| Enforce strict contract | Valid document round-trips | Maintained canonical round-trip/load case | COMPLIANT |
| Enforce strict contract | Invalid document not persisted | Unknown field, duplicate ID/alias cases plus malformed-load probe | COMPLIANT |
| Secure atomic persistence | Fresh revision commits atomically | Maintained restrictive-umask test plus independent mode/recheck probe | COMPLIANT |
| Secure atomic persistence | Stale or failed save preserves state | CAS, injected failures, rollback, cleanup, and boundary probes | COMPLIANT |
| Test-isolated/non-runtime | Isolated tests leave runtime untouched | Maintained actual Git-common-directory identity assertion and command-level stats | COMPLIANT |

**Compliance summary**: 7/7 scenarios compliant.

### Correctness (Static and Runtime Evidence)

| Requirement | Status | Notes |
|---|---|---|
| XDG path resolution and safe rejection | Implemented | Absolute override/default, stable invalid-root error, no cwd/repository dependency |
| Strict validation and invariants | Implemented | Existing validator preserves schema/manifest categories and global uniqueness rules |
| Secure atomic persistence and revision fencing | Implemented | Exact modes, safe rechecks, CAS/revisions, lock, same-dir temp, fsync, rename, rollback and cleanup all verified |
| Test isolation and non-runtime boundary | Implemented | Temporary roots and actual common-directory DB identity proof pass; no consumer/runtime imports |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | Yes | Original and bounded-remediation RED/GREEN evidence exists in `apply-progress.md` |
| All tasks have tests | Yes | 14/14 task claims map to maintained tests/baselines |
| RED confirmed | Yes | New test file and remediation RED evidence are present |
| GREEN confirmed | Yes | 14/14 storage cases and 57/57 focused cases pass |
| Triangulation adequate | Warning | Maintained CAS winner case is sequential; independent real two-process race passes |
| Safety net | Yes | Existing contract/Main-store baselines pass |
| Assertion quality | Yes | Actual Git-common-directory DB path and behavioral values are asserted |

**TDD compliance**: 6/7 checks fully satisfied; the remaining item is a non-blocking maintained-test improvement because independent runtime race evidence passed.

### Test Layer Distribution

| Layer | Tests | Files | Tool |
|---|---:|---:|---|
| Unit | 2 | 1 mixed file | Bun 1.3.14 |
| Integration | 12 | 1 mixed file | Bun 1.3.14 + real temporary filesystem/child process |
| E2E | 0 | 0 | Not applicable |
| **Total** | **14** | **1** | |

### Assertion Quality

**Assertion quality**: All maintained assertions now exercise production behavior and observable values. The prior linked-worktree false proof is removed. No tautologies, ghost loops, orphan type-only checks, smoke-only checks, or mock-heavy patterns were found.

### Quality Metrics

- **Build/bundle**: Passed.
- **Linter**: Not available.
- **Type checker**: Not available; the project is ESM JavaScript.
- **Coverage**: Acceptable; no changed implementation file is below 80%.

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| XDG path independent of cwd/Git/Hermes | Yes | Resolver imports only `node:path` |
| Reuse strict validator/canonicalizer | Yes | No parallel schema implementation |
| Lock and re-read CAS under lock | Yes | Independent two-process probe produced exactly one winner |
| Exact registry/entry revision transitions | Yes | Unchanged stays fixed, changed advances one, new starts at one |
| Same-directory temp, fsync, rename, directory durability | Yes | Source, maintained failures, and probes agree |
| Exact owner-only modes under restrictive umask | Yes | Recursive segments `0700`; temp/lock/target `0600`; immediate load passes |
| Full post-chmod safety recheck | Yes | Type, symlink, ownership, and exact mode predicate reruns; unsafe injected recheck fails closed |
| Missing file returns `null` without creation | Yes | Maintained test passed |
| Frozen narrow store and exports | Yes | Frozen store; exactly two module exports |

### Scope Exclusions and Worktree Assumptions

- No enrollment, bootstrap/import, alias resolution, Hermes/Support adapters, Main identity rederivation, SQLite/Supabase integration, P8 edit, or shared-plan edit exists in candidate implementation/tests.
- Registry implementation imports only Node primitives and existing contract validation/canonicalization.
- Current branch is `test/s2.4-registry-verification`; HEAD and `origin/master` are identical at `a574d45` (`0/0`).
- The 387-line final implementation/test candidate was already delivered by PR2; PR3 apply evidence is also merged. Neither is unstaged or unmerged.
- PR4 contains only this untracked verification report. Its rollback reverts/removes only `verify-report.md`; implementation rollback is a separate normal revert of PR2 merge `6d08df0`, never filesystem removal.
This reconciliation did not stage, commit, push, open a PR, edit shared/P8/Notion paths, or mutate `ACTIVE`/runtime DB state.

### Issues Found

#### CRITICAL

None.

#### WARNING

1. The maintained “exactly one winner” case remains sequential rather than the design's two-process race. Independent concurrent-process verification passed exactly one winner with no residue, so this does not block spec compliance.
2. The repository-wide suite remains unable to pass while the external `ACTIVE` marker exists. Both reproduced failures are precondition failures before snapshot restoration and are unrelated to S2.4.

#### SUGGESTION

1. Promote the independent two-process race probe into the maintained storage suite to align the test implementation exactly with the design strategy.

### Canonical Verification Evidence Preimage

The evidence revision hashes the exact UTF-8 bytes below, including the final LF and excluding the Markdown fences (1678 bytes):

```text
change=sdd-tower-project-registry
session=S2.4
head=a574d45bd77c851265e7cd08fa1de91f457d9794
base_ref=origin/master
base=a574d45bd77c851265e7cd08fa1de91f457d9794
artifact_mode=both
strict_tdd=true
tasks_verified=14/14
requirements=4/4
scenarios=7/7
focused_command=bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs
focused_exit=0
focused_output_sha256=667669c6327acc745c23951a01a023ea2d1c04af21aa706873c18f0c2be206a2
build_command=bun build ./registry/index.mjs --target=bun --outfile=/tmp/opencode/sdd-tower-project-registry-rerun.bundle.mjs
build_exit=0
build_output_sha256=9e16a17b0c6ce90fb6cca27d6b37caabaccc90d5a013bcb64ca9f53f4a56228f
storage_command=bun test test/registry/storage.test.mjs
storage_exit=0
storage_output_sha256=8d57c9242f020d734180e718960ee107624f08cf72210499a2be9dbf140854f9
openspec_command=npx --yes @fission-ai/openspec@1.5.0 validate sdd-tower-project-registry --strict
openspec_exit=0
openspec_output_sha256=edd1ad174c93fe1a2987b89075e37a8d09ef559e77b56daf18d36e8e30ff337e
maintained_umask_command=bun test test/registry/storage.test.mjs -t restrictive_umask
maintained_umask_exit=0
maintained_umask_output_sha256=8acc48692c282cf5c19e491c6e6e11c0b5ddecf3bd0aacf4e4045a8ea11c6bad
chain_pr1=82:2903445c201ef2eb83faff147dfd1ed7b5ef50b7
chain_pr2=84:6d08df069274a2ee9ba29ef624aa93010b998381
chain_pr3=86:a574d45bd77c851265e7cd08fa1de91f457d9794
pr4_scope=verify-report-only
active_marker_identity=inode:2741,size:0,mode:664,mtime:1785414945,ctime:1785414945
tower_db_identity=inode:209367,size:151552,mode:644,mtime:1785441634,ctime:1785441634
authored_lines=387
critical_findings=0
warnings=2
verdict=pass
```

### Verdict

**PASS**

All 14 tasks, four requirements, and seven scenarios are objectively satisfied. Both prior CRITICAL findings are remediated and independently proven; remaining warnings are non-blocking test-maintenance/environment conditions.
