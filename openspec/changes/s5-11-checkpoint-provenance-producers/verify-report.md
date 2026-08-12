# S5.11 Verification Report

## Status

**PASS_WITH_TYPED_VERIFICATION_UNAVAILABLE**

All twelve frozen S5.11 criteria pass against the exact source candidate. Full-suite certification remains explicitly **not PASS** because of the accepted typed condition `verification_unavailable: pre-existing clean-clone runtime prerequisite`. No S5.11 regression is evidenced, and no correction was performed.

## Authority and action context

- Change: `s5-11-checkpoint-provenance-producers`
- Session: `S5.11`
- Artifact store: `hybrid`
- Source workspace: `/home/emili/projects/control-tower/Worktrees/s5-11`
- Source base: `5892bd17491b21e86e1e82ab6cbaaf03637a790b`
- Integration base/tree: `428b3ed012c9217c72342041a28c5622d945fe1e` / `388b4ca8a6fd27ff7c4c81a706959b07764eb465`
- Authority: `openspec/plans/plan-5/STATUS.md:627-669` and decision 21 at `openspec/plans/decision-register.md:43`.
- Verification mode: fresh read-only evidence audit. Implementation, tests, planning artifacts, dependencies, build, runtime state, Git history, and native Gentle lifecycle/review lineage were not mutated or invoked.
- Allowed write was limited to this verify report and its Engram mirror.
- Workspace ownership is proven by `git rev-parse --show-toplevel` resolving to the stated source workspace and by the exact eleven-path product/test status set.
- Both backend copies of proposal, spec, corrected design, tasks, and apply-progress were read in full. OpenSpec and Engram agree on semantics, the eleven-path amendment, completed tasks, terminal evidence, typed unavailability, and frozen manifest.

## Candidate manifest recomputation

The verifier independently re-read all eleven files, recomputed SHA-256 from current bytes, canonical mode, source-base numstat, authored total, and the canonical manifest JSON. Result: **exact match; no candidate drift**.

| Path | Mode | Numstat +/− | SHA-256 |
| --- | --- | ---: | --- |
| `workspace/checkpoint.mjs` | `100644` | 55/14 | `1fe5a081881ec48f0b0f36626c43b5fa7c1f187fdba98b85976232c49bcf2763` |
| `workspace/reconciliation.mjs` | `100644` | 86/0 | `be75109f819bca619f189833dc0b8f721772c0e7cc75690330ad48b39de5d568` |
| `schemas/checkpoint-capture-v1.schema.json` | `100644` | 37/0 | `243028fce131e67705aeeff9b80028468e6569e986516609749bad1fd1debdd3` |
| `schemas/reconciled-checkpoint-v1.schema.json` | `100644` | 44/3 | `340dca47fddb51ba3e9ec6b586692bbe8343ba7208889c2569d7f5e5a988f790` |
| `contracts/schema-registry.mjs` | `100644` | 2/1 | `682f3adf2422ad0e80aa58d68d1032b2e74b0878d9bccd2ccfcc4b3b026767bc` |
| `contracts/validate.mjs` | `100644` | 53/0 | `9b030e17d4259da7b0b19402650aea18803cb9feee65d2bb927aa928baf20b92` |
| `test/workspace/checkpoint.test.mjs` | `100644` | 53/2 | `1af5fc8316e7157dbe6ae76bd0e592fca6a2bc8d6b99cbf196598185c2c9517d` |
| `test/workspace/reconciliation.test.mjs` | `100644` | 110/0 | `efed276bd645453793192bc637a216a1ceed571f4c92ab69d0b5742d749a1b65` |
| `test/contracts/schema.test.mjs` | `100644` | 84/0 | `be917b48ddb8d987545f9da6d827c428b394570aee5872e85113ead06ffa9d84` |
| `test/fixtures/contracts/schema-cases-v1.json` | `100644` | 38/0 | `d2fb3f95ce419f73cbe763bab681b139e96c547ba9d0be68dcfddfaeddc0f349` |
| `test/contracts/s3-2-schemas.test.mjs` | `100644` | 36/2 | `19d073b9b243d622b497940b376f43adf86243b59862d1e162fd6528b812526e` |

- Entry count: **11**
- Authored total: **620**
- Filesystem mode: `0664` for all eleven; canonical Git candidate mode: `100644` for all eleven.
- Recomputed manifest SHA-256: **`3d2467e5792d17d12080ee3ef26a875f415dab5a9327ca402f572435886fff1c`**
- Expected manifest SHA-256: **`3d2467e5792d17d12080ee3ef26a875f415dab5a9327ca402f572435886fff1c`**
- Product/test status contains exactly these eleven paths and no others. The separate OpenSpec planning artifacts are not candidate paths.

## Criterion matrix

| # | Result | Code/spec evidence | Existing test evidence consumed |
| --- | --- | --- | --- |
| 1 | **PASS** | `captureCheckpoint` closes inputs, derives canonical Git root/base/result/files, creates `checkpoint_id` and digest, validates, privately brands, resets to a plain prototype, and deep-freezes at `workspace/checkpoint.mjs:81-129`. Shared domain-separated derivation is at `contracts/validate.mjs:19-31`; the closed schema is at `schemas/checkpoint-capture-v1.schema.json:4-35`. | Exact shape, bindings, immutability, deterministic identity/digest, and read-only Git calls are asserted at `test/workspace/checkpoint.test.mjs:57-108`. M5.11.1 final GREEN/REFACTOR: **67/0/197**. |
| 2 | **PASS** | A real runtime producer exists as `reconcileCheckpoint` in `workspace/reconciliation.mjs:60-85`; it is not a schema/fixture substitute. | Runtime producer acceptance is exercised at `test/workspace/reconciliation.test.mjs:41-69`. Final focused proof includes this file: **75/0/268**. |
| 3 | **PASS** | Reconciliation validates exact live capture origin first, closes and cross-checks evidence, copies capture-owned bindings, emits only `VALID`, derives its own identity/digest, validates the pair, brands, and freezes at `workspace/reconciliation.mjs:26-85`. The schema fixes `state` to `VALID` and requires exact capture/evidence fields at `schemas/reconciled-checkpoint-v1.schema.json:4-43`. | Exact identity/digest, `VALID`, capture linkage, bindings, deep freeze, and determinism are asserted at `test/workspace/reconciliation.test.mjs:42-68`. |
| 4 | **PASS** | Capture and reconciliation semantic identity/digest checks are centralized at `contracts/validate.mjs:135-145`; exact cross-artifact binding checks are at `contracts/validate.mjs:195-205`. | Capture drift covers identity, digest, project, assignment, generation, repository/common-dir, base/result, and every file binding at `test/contracts/schema.test.mjs:68-107`. Reconciliation tamper and every capture/cross-binding mismatch are covered at `test/contracts/schema.test.mjs:37-65`; runtime evidence mismatch/closure is covered at `test/workspace/reconciliation.test.mjs:93-108`. |
| 5 | **PASS** | Runtime origin is a module-private ECMAScript private field and is checked before generic validation at `workspace/checkpoint.mjs:81-96` and `workspace/reconciliation.mjs:42-57`; reconciliation rejects non-origin capture before evidence inspection at `workspace/reconciliation.mjs:60-65`. Generic validation remains origin-neutral (`contracts/validate.mjs:56-58,179-192`). | Correctly hashed cloned/manual enumerable contracts pass generic integrity while `structuredClone`, spread, JSON reconstruction, and Proxy values fail runtime origin at `test/workspace/checkpoint.test.mjs:87-108` and `test/workspace/reconciliation.test.mjs:71-90`. Caller-owned output/state/identity/digest/origin/artifact claims fail at `test/workspace/checkpoint.test.mjs:111-123` and `test/workspace/reconciliation.test.mjs:93-108`. |
| 6 | **PASS** | The two producer modules import only Node Git/path helpers, canonical contract helpers, and each other; neither imports Main/store/parking/escalation/DB/token code (`workspace/checkpoint.mjs:1-6`, `workspace/reconciliation.mjs:1-5`). No writer, persistence, alternate ingress, or S5.12 composition exists in either producer. | Capture tests assert no commit/push/fetch and unchanged refs at `test/workspace/checkpoint.test.mjs:57-84,153-166`. Exact path/status audit shows no Main/store/parking/escalation/DB/token path changed. |
| 7 | **PASS** | Exactly one registry mapping for each contract exists at `contracts/schema-registry.mjs:7-25`. Shared canonical derivation and invariants are in `contracts/validate.mjs:19-44,135-145,175-176`; schemas and the shared fixture are the declared canonical files. | Registry, derivation, generic validation, and pair checks are asserted at `test/contracts/schema.test.mjs:25-35,68-74`. The authorized S3.2 fixture migration imports exported helpers and `validate`, with no local algorithm or live-origin assertion, at `test/contracts/s3-2-schemas.test.mjs:3-8,12-40,51-56`; corrected command: **59/0/195**. |
| 8 | **PASS** | The recomputed product/test status set is exactly the authorized eleven paths, including only the approved compatibility-test amendment. No other product/test path is modified or untracked. | Manifest/status recomputation above; corrected design lists the exact amendment. |
| 9 | **PASS** | Existing capture semantics remain: normalized absolute root, exact full commit/tree identities, staged-index/result equality, exact bytes/modes, path safety, deterministic sorting, and existing `CT_CHECKPOINT_UNSAFE` failures at `workspace/checkpoint.mjs:31-69,99-119`. Added producer context is required rather than defaulted. | Compatibility/safety cases cover byte mismatch, RFC 8785 mode, unsafe roots, unchanged refs, abbreviated/wrong identities, empty index, and staged drift at `test/workspace/checkpoint.test.mjs:126-185`. Prior integral checkpoint proof: **13/0/49**; aggregate candidate proof: **109/0/537**. |
| 10 | **PASS** | `tasks.md:13,22` records the explicit bounded `size:exception` of 760–960 and keeps S5.11 intact. Recomputed actual authored total is **620 <=960**. Apply evidence records separately reviewable M5.11.1 and M5.11.2 checkpoints and final coherent eleven-path rollback (`apply-progress.md:124-168`). | M5.11.1: **67/0/197**; M5.11.2 final: **75/0/268**. No chained PR boundary was authorized; the work boundary matches `size-exception`. |
| 11 | **PASS** | Parent snapshot fix `6c968e02c4a1d8e85af3b1f93810635ef2a207cc` is an ancestor of the integration base. `test/contracts/session-plan-snapshot.test.mjs` has identical blob `e96a1f7738b55e0f4f454be749c275ac52043ff4` at the fix and integration base. It is absent from the eleven entries. Planning artifacts are separately excluded by the manifest. | Read-only Git ancestry/blob recomputation matched apply-progress. Neither parent fix nor planning evidence contributes to the 620 count or rollback. |
| 12 | **PASS** | All eleven bytes, canonical modes, numstats, source base, integration tree, count, authored total, and canonical manifest hash independently match the frozen authority. | No tests were rerun. The read-only recomputation returned the exact expected manifest SHA-256 and no unexpected product/test path. |

## Task completion

- `openspec/changes/s5-11-checkpoint-provenance-producers/tasks.md` contains all six implementation-owned rows checked.
- Exact unchecked implementation markers matching `^\s*- \[ \]`: **none** in the SDD tasks artifact.
- Engram tasks observation 8619 agrees: all six rows checked and no parent-owned task row.
- The Plan STATUS remains the pre-integration authority snapshot (`S5.11` is still `🟢 LISTO` with planning checkboxes). Those Plan rows are not the SDD tasks artifact and are intentionally outside this frozen candidate; parent integration/documentation reconciliation is the next boundary.

## Strict TDD and assertion quality

Strict TDD is active from `openspec/config.yaml`. `apply-progress.md:34-39` contains the required `TDD Cycle Evidence` table for both Módulos, and every reported test file exists in the exact candidate.

| Módulo | RED | GREEN | REFACTOR / final |
| --- | --- | --- | --- |
| M5.11.1 | `bun test test/workspace/checkpoint.test.mjs test/contracts/schema.test.mjs` → 62 pass / 5 expected fail / 146 assertions | same command → 67/0/193 | same command → 67/0/197 |
| M5.11.2 | `bun test test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` → 55 pass / 6 expected fail / 151 assertions | same command → 61/0/193 | `bun test test/workspace/checkpoint.test.mjs test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` → 75/0/268 |

Assertion-quality audit: **PASS**. Tests assert concrete artifact shape, identity/digest equality and drift, exact error codes, object identity, deep freeze, private-origin invisibility, clone/spread/JSON/Proxy rejection, no Git ref mutation, exact pair binding, and closed inputs. Parameterized loops have fixed non-empty mutation tables and an assertion on every iteration; there are no ghost loops, tautologies, type-only checks, smoke-only tests, or CSS/implementation-detail assertions.

## Evidence commands consumed, not rerun

Per frozen-candidate authority, no test, install, or build command was run during this verification.

- `bun test test/workspace/checkpoint.test.mjs test/contracts/schema.test.mjs` — RED 62/5/146; GREEN 67/0/193; REFACTOR 67/0/197.
- `bun test test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` — RED 55/6/151; GREEN 61/0/193.
- `bun test test/workspace/checkpoint.test.mjs test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` — 75/0/268.
- `bun test test/contracts/schema.test.mjs test/contracts/s3-2-schemas.test.mjs` — scoped RED 58/1/184; corrected GREEN 59/0/195.
- `bun test test/workspace test/contracts` — candidate aggregate 109 pass / 0 fail / 537 assertions, exit 0.
- `bun test` — 655 pass / 1 fail / 3940 assertions, exit 1; **not PASS**.
- `bun test test/registry/storage.test.mjs` — untouched integration-base control 13 pass / 1 same failure at `test/registry/storage.test.mjs:178` because `.git/control-tower/tower.db` is absent.

Read-only verification commands included `codegraph status`, `codegraph explore "checkpoint provenance capture reconciliation producers S5.11"`, `git status --short --untracked-files=all`, Git revision/tree/ancestry/blob queries, full file reads, line-numbered source inspection, and an independent Python SHA-256/numstat/mode/canonical-JSON recomputation. `codegraph_explore` MCP was unavailable before CLI fallback; the upstream read-only CLI succeeded. No command mutated source or runtime state.

## Verification-unavailable disposition

The full suite remains typed **`verification_unavailable: pre-existing clean-clone runtime prerequisite`** and is not represented as a pass. The exact failure is causally controlled by the untouched integration-base run, predates S5.11 at origin commit `4a51f7ce26a60b2180069b45e4f7762985075687`, and is outside all eleven S5.11 paths. Maintainer authority accepts it as separate registry clean-clone hermeticity debt. This is a named residual risk, not evidence invented for S5.11 and not an automatic S5.11 failure.

## Scope and rollback proof

- Authorized implementation/test boundary: the exact eleven manifest entries above.
- No other product/test path exists in source status.
- Two Módulo evidence units are retained; the size exception is explicit and actual size is under its ceiling.
- Rollback is one coherent revert of all eleven producer/schema/registry/validator/fixture/test paths.
- Excluded from rollback and candidate identity/count: integration base/tree, parent snapshot fix/blob, proposal, spec, design, tasks, apply-progress, and this verify report.
- No partial schema, producer, origin assertion, validator invariant, or fixture rollback is valid.

## Blockers and next action

- S5.11 criterion blockers: **none**.
- Archive readiness: **not requested and not recommended from this worktree**; parent integration/documentation reconciliation remains outside the frozen candidate.
- Next recommended: **`parent-integration-request`**.

## Risks

1. Full clean-clone certification remains unavailable because registry storage tests assume clone-local runtime state; this is accepted separate debt and remains explicitly not PASS.
2. Private-field provenance is intentionally live-reference/module-instance evidence; cloning, serialization, Proxy wrapping, persistence, or crossing a realm removes origin proof by design.
3. Plan STATUS closure checkboxes remain unreconciled until the parent integration/documentation step; they do not invalidate the completed SDD tasks artifact.
