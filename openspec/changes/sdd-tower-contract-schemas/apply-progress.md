# Apply Progress: SDD Tower V1 Contract Schemas

## Mode

Strict TDD. Delivery strategy: auto-chain with `stacked-to-main`. S2.1–S2.3 are implemented; no commit, delivery action, runtime activation, or Tower-state mutation was performed.

## Cumulative Progress

- [x] T2.1.1.1 RED schema fixtures and boundary tests
- [x] T2.1.1.2 GREEN ten schemas and duplicate-safe validator
- [x] T2.1.1.3 REFACTOR/triangulate schema invariants
- [x] T2.2.1.1 RED canonicalization, ArtifactRef, and idempotency fixtures/tests
- [x] T2.2.1.2 GREEN JCS, immutable Git proof, and retry inspection contracts
- [x] T2.2.1.3 REFACTOR/triangulate unsafe values, media/path guarantees, freezing, and self-reference exclusion
- [x] T2.3.1.1 RED Main-store authority and filesystem boundary tests
- [x] T2.3.1.2 GREEN startup authority, atomic CAS store, and terminal authorization
- [x] T2.3.1.3 REFACTOR/triangulate actor, opacity, import, and Change A/B boundaries

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T2.1.1.1 | `test/contracts/schema.test.mjs` | Unit/integration | Isolated clone: 282 pass, 0 fail | Missing `contracts/validate.mjs`: 0 pass, 1 fail, 1 error | Covered by T2.1.1.2 | Unknown fields, forbidden YAML, top-level/nested/decoded-equivalent duplicates | N/A — RED task |
| T2.1.1.2 | `test/contracts/schema.test.mjs` | Unit/integration | T2.1.1.1 RED preserved | Tests existed before production files | 29 pass, 0 fail | Ten valid contracts plus unknown-field and extension cases | Ajv registry and frozen error/result boundaries retained; 30 pass |
| T2.1.1.3 | `test/contracts/schema.test.mjs` | Unit/integration | 29 pass, 0 fail | Invariant cases were written before production validators | 29 pass, 0 fail | 30 pass: headers, catalog/DAG, runtime exclusion, delta links, campaign DAG, quoted/implicit timestamps | 30 pass, 0 fail after runtime-state preflight extraction |
| T2.2.1.1 | `test/contracts/{canonicalization,artifact-ref,idempotency}.test.mjs` | Unit/integration | `schema.test.mjs`: 30 pass, 0 fail, 63 assertions | Missing S2.2 modules: 0 pass, 3 fail, 3 errors | Covered by T2.2.1.2 | JCS, raw bytes, Git mismatches, hostile paths, executable-looking opaque files, and uncertain retries | N/A — RED task |
| T2.2.1.2 | Same three files | Unit/integration | T2.2.1.1 RED preserved | Tests existed before production modules | 12 pass, 0 fail, 54 assertions | Equivalent documents, UTF-16 ordering, exact bytes, fixed Git argv, five mismatch dimensions, and retry outcomes | Pure canonicalization/idempotency boundaries and frozen results retained |
| T2.2.1.3 | Same three files | Unit/integration | 13 pass, 0 fail, 58 assertions | Correction boundary tests: 3 pass, 2 fail, 22 assertions | 5 pass, 0 fail, 29 assertions | Added invalid raw inputs, Buffer/Uint8Array equivalence, RFC 8785 property ordering, deep immutability, and cyclic input cases | Added cycle-aware validation and deep freezing; 5 pass |
| T2.3.1.1 | `test/main-store.test.mjs` | Integration | `test/contracts`: 44 pass, 0 fail, 132 assertions | Missing `main-store/index.mjs`: 0 pass, 1 fail, 1 error | Covered by T2.3.1.2 | Forgery, actors, filesystem/CAS failure, authorization, opacity, and recursive imports | N/A — RED task |
| T2.3.1.2 | `test/main-store.test.mjs` | Integration | T2.3.1.1 RED preserved | Tests existed before all production modules | 8 pass, 0 fail, 43 assertions | Trusted binding, WeakSet brand, owner modes, CAS, terminal audit, opaque reports | Startup-only capability and atomic write helpers retained |
| T2.3.1.3 | `test/main-store.test.mjs` | Integration/static | 8 pass, 0 fail, 43 assertions | Maintainer denial and retained revision evidence added before final refactor | 8 pass, 0 fail, 44 assertions | All specified actors, Change A/B separation, Tower imports/OFF, no P7/P8 dependency | Revisions retained in one atomically replaced CAS record; 8 pass |

## Sesión Evidence

| Evidence | S2.1 result | S2.2 result | S2.3 result |
|---|---|---|---|
| Focused test command and exact result | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/schema.test.mjs` → exit 0; 30 pass, 0 fail, 63 assertions | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs` → exit 0; 14 pass, 0 fail, 69 assertions | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/main-store.test.mjs` → exit 0; 8 pass, 0 fail, 44 assertions |
| Relevant broader suite | Baseline isolated clone: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test` → exit 0; 282 pass, 0 fail, 2,094 assertions | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts` → exit 0; 44 pass, 0 fail, 132 assertions. Repository-wide `bun test` reached 341 pass and 2 fail because the shared live Tower `ACTIVE` marker is present; it was intentionally not touched. | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts test/main-store.test.mjs` → exit 0; 52 pass, 0 fail, 176 assertions |
| Runtime harness | N/A — S2.1 wires no adapter and leaves Tower runtime untouched; Bun contract tests are the planned harness | N/A — S2.2 exposes disconnected pure/immutable-Git contract APIs, wires no adapter, and leaves Tower OFF/state untouched | Filesystem/temp-store harness in the focused test → exit 0; owner modes, atomic failure preservation, CAS, terminal audit, and opacity exercised without activation |
| Rollback boundary | Remove S2.1 schema/validator paths and revert only S2.1 task/progress marks | Remove `contracts/{canonicalize,artifact-ref,idempotency,index}.mjs`, `test/contracts/{canonicalization,artifact-ref,idempotency}.test.mjs`, and `test/fixtures/contracts/canonicalization-v1.json`; revert only S2.2 task/progress marks and chain-strategy reconciliation | Remove `main-store/{authority,store,index}.mjs` and `test/main-store.test.mjs`; revert only T2.3.1 task/progress marks |

## Baseline and Environment Evidence

- Before S2.2 edits: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/schema.test.mjs` → exit 0; 30 pass, 0 fail, 63 assertions.
- Correction RED: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/canonicalization.test.mjs` → exit 1; 3 pass, 2 fail, 22 assertions.
- Correction GREEN/REFACTOR: the same command → exit 0; 5 pass, 0 fail, 29 assertions.
- `git diff --check` after implementation → exit 0 with no output.
- The repository-wide suite's two snapshot-restore failures are environmental guards reporting `.git/control-tower/ACTIVE` in shared live state. No S2.2 code path imports or mutates Tower runtime state.
- S2.3 RED: focused command → exit 1; 0 pass, 1 fail, 1 error (`Cannot find module '../main-store/index.mjs'`).
- S2.3 GREEN: focused command → exit 0; 8 pass, 0 fail, 43 assertions.
- S2.3 REFACTOR: focused command → exit 0; 8 pass, 0 fail, 44 assertions; Tower OFF preflight exited 0.

## Deviations and Issues

- No design deviation in S2.2 or S2.3 behavior/file scope.
- The live Tower marker prevented a clean repository-wide suite, so S2.2 completion relies on the fully green 44-test contract suite; the marker was preserved as required.
- The corrected S2.2 candidate is 449 authored additions/deletions, 49 above its approved exact 400-line boundary; no new planning level was introduced.
- S2.3 changed-path manifest: `test/main-store.test.mjs`, `main-store/{authority,store,index}.mjs`, and cumulative updates to this file plus `tasks.md`.
- S2.3 candidate totals 337 authored additions/deletions (302 production/test plus 35 cumulative task/evidence edits), below the approved 800-line hard stop.

## Prior Gatekeeper Correction Evidence

- `sha256sum package.json bun.lock` before the S2.1 frozen install: `503a053d9c0d2c6decd74e66f361d716aa606158d6c2e1da5854d6c47103158e` and `38a45bd2528010a74ad618943c8287f5c1e090e9bfc19473265c82892a2af7ac`.
- `bun install --frozen-lockfile` installed Ajv 8.17.1 and YAML 2.8.1 without changing either manifest or lockfile hash.
- No S2.1 production/test/schema code changed during this S2.2 batch.

## S2.3 Critical Remediation — 2026-07-30

The correction remained inside the approved six-path candidate and addressed only verify #6813 / discovery #6862. The existing S2.1/S2.2/S2.3 transcript above remains authoritative and unchanged; no commit, staging, delivery, Tower tool, review lifecycle, activation, or runtime-state mutation occurred.

### Remediation TDD Cycle Evidence

| Finding | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE / REFACTOR |
|---|---|---|---|---|---|---|
| Concurrent CAS | `test/main-store.test.mjs` | Multiprocess integration | 8 pass, 0 fail, 44 assertions | Focused run: exactly two successes; expected one (`11 tests: 8 pass, 3 fail, 49 assertions` cumulative RED) | Exactly one revision-2 success and one `CT_CAS_MISMATCH`; focused run 11 pass | Sequential stale-revision case retained; independent repeat 10/10 passed after lock-ownership cleanup |
| Terminal authorization failure | `test/main-store.test.mjs` | Filesystem integration | 8 pass, 0 fail, 44 assertions | Injected authorization replacement failure left one audit file while authorization remained `PENDING` | One failure-atomic authorization revision now contains terminal audit evidence; failed replacement leaves `PENDING` and no audit effect | Successful `APPROVED` transition, replay denial, and injected failure all pass; removed the two-file partial-commit boundary |
| Trusted store path | `test/main-store.test.mjs` | Authority integration | 8 pass, 0 fail, 44 assertions | Different absolute root returned no error instead of `CT_AUTH_INVALID` | `createMainStore()` asserts exact trusted `binding.store_path` before filesystem use | Matching temp root passes all existing tests; different absolute temp root fails closed |

### Remediation Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/main-store.test.mjs` → exit 0; 11 pass, 0 fail, 51 assertions |
| Broader suite | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts test/main-store.test.mjs` → exit 0; 55 pass, 0 fail, 183 assertions |
| Runtime harness | Temp-filesystem and two-process Bun harness in the focused test; concurrency repeat 10/10 passed; no adapter/runtime activation |
| Tower-state proof | Pre-existing `ACTIVE` marker remained true with 3 files; snapshot changed from `590416ca81df3995c071341485b9ff39be26a2080ea269f0949535c72b9fbafd` to `a92bf5f2bcaf9f26e246e42d110b58ada9c06ded069dfddfe0eb24eff64a49e1` because the already-active external Tower continued updating `tower.db`/`tower.log`; no Tower tool or candidate path touches that runtime |
| Quality | `git diff --check` → exit 0 with no output |
| Rollback boundary | Revert only this remediation's changes in `test/main-store.test.mjs`, `main-store/store.mjs`, `tasks.md`, and this appended evidence; preserve all original S2.1/S2.2/S2.3 implementation and transcript |
| Authored budget | Final cumulative count against `c38ff71283618a6790f7fa9880aec3c2bf12c88c`: 437 additions/deletions; hard maximum 800 |

All three persisted CRITICAL findings are corrected. Remaining environment warning: the shared Git common directory still has the pre-existing `ACTIVE` marker and changed independently during the run, so evidence proves no candidate dependency or Tower-tool interaction rather than literal OFF or byte-identical runtime state.

## Final S2.3 Authority-Isolation Correction — 2026-07-30

The latest verify report's sole CRITICAL was corrected within the same six-path candidate. Capability membership is now encapsulated by each `bindMainAuthority` instance; a capability minted by authority/project A cannot pass authority/project B. No delivery, Tower, review-lifecycle, activation, or live-state mutation action occurred.

### Final Correction TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T2.3.1.1–T2.3.1.3 exact-authority correction | `test/main-store.test.mjs` | Authority integration | 11 pass, 0 fail, 51 assertions | A→B capability was accepted: 11 pass, 1 fail, 52 assertions; expected `CT_AUTH_INVALID`, received `null` | Per-instance registry: 12 pass, 0 fail, 52 assertions | Revocation test RED: `authority.revoke` missing; final A→A, A→B, revoked A, and forged candidate coverage: 13 pass, 0 fail, 56 assertions | Module-global registry removed; closure-local WeakSet and deletion-based revocation retained; focused suite remained green |

### Final Correction Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/main-store.test.mjs` → exit 0; 13 pass, 0 fail, 56 assertions |
| Broader suite | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts test/main-store.test.mjs` → exit 0; 57 pass, 0 fail, 188 assertions |
| Repeated cross-authority probe | Focused A→B rejection test repeated 25/25 with exit 0 every iteration |
| Four critical boundary probes | Concurrent CAS: 1 pass/3 assertions; failed terminal replacement: 1/3; exact trusted path: 1/1; A→B rejection: 1/1 — all exit 0 |
| Runtime harness / Tower non-interaction | Temp-only Bun/filesystem harness. Before and after: pre-existing `ACTIVE`; `tower.db` 114688 bytes mtime 1785429178 and `tower.log` 45933 bytes mtime 1785429178, unchanged; no Tower tool or runtime path used |
| Quality | Tracked plus untracked `git diff --check` equivalents pass |
| Rollback boundary | Revert only the final correction in `main-store/authority.mjs`, its new cases in `test/main-store.test.mjs`, and these final task/progress additions |
| Authored budget | Final cumulative count: 490 authored additions/deletions against `c38ff71283618a6790f7fa9880aec3c2bf12c88c`; 310 lines below the hard maximum of 800 |

Risk remains limited to the newly explicit `authority.revoke(capability)` lifecycle surface; revocation is fail-closed and instance-scoped. Candidate is ready only for the explicitly authorized final independent verification.
