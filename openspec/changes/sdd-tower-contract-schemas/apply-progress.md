# Apply Progress: SDD Tower V1 Contract Schemas

## Mode

Strict TDD. Delivery strategy: auto-chain with `stacked-to-main`. This batch implements S2.2 only; no commit, delivery action, runtime activation, or Tower-state mutation was performed.

## Cumulative Progress

- [x] T2.1.1.1 RED schema fixtures and boundary tests
- [x] T2.1.1.2 GREEN ten schemas and duplicate-safe validator
- [x] T2.1.1.3 REFACTOR/triangulate schema invariants
- [x] T2.2.1.1 RED canonicalization, ArtifactRef, and idempotency fixtures/tests
- [x] T2.2.1.2 GREEN JCS, immutable Git proof, and retry inspection contracts
- [x] T2.2.1.3 REFACTOR/triangulate unsafe values, media/path guarantees, freezing, and self-reference exclusion
- [ ] T2.3.1.1–T2.3.1.3 S2.3 Main store and boundaries

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T2.1.1.1 | `test/contracts/schema.test.mjs` | Unit/integration | Isolated clone: 282 pass, 0 fail | Missing `contracts/validate.mjs`: 0 pass, 1 fail, 1 error | Covered by T2.1.1.2 | Unknown fields, forbidden YAML, top-level/nested/decoded-equivalent duplicates | N/A — RED task |
| T2.1.1.2 | `test/contracts/schema.test.mjs` | Unit/integration | T2.1.1.1 RED preserved | Tests existed before production files | 29 pass, 0 fail | Ten valid contracts plus unknown-field and extension cases | Ajv registry and frozen error/result boundaries retained; 30 pass |
| T2.1.1.3 | `test/contracts/schema.test.mjs` | Unit/integration | 29 pass, 0 fail | Invariant cases were written before production validators | 29 pass, 0 fail | 30 pass: headers, catalog/DAG, runtime exclusion, delta links, campaign DAG, quoted/implicit timestamps | 30 pass, 0 fail after runtime-state preflight extraction |
| T2.2.1.1 | `test/contracts/{canonicalization,artifact-ref,idempotency}.test.mjs` | Unit/integration | `schema.test.mjs`: 30 pass, 0 fail, 63 assertions | Missing S2.2 modules: 0 pass, 3 fail, 3 errors | Covered by T2.2.1.2 | JCS, raw bytes, Git mismatches, hostile paths, executable-looking opaque files, and uncertain retries | N/A — RED task |
| T2.2.1.2 | Same three files | Unit/integration | T2.2.1.1 RED preserved | Tests existed before production modules | 12 pass, 0 fail, 54 assertions | Equivalent documents, UTF-16 ordering, exact bytes, fixed Git argv, five mismatch dimensions, and retry outcomes | Pure canonicalization/idempotency boundaries and frozen results retained |
| T2.2.1.3 | Same three files | Unit/integration | 13 pass, 0 fail, 58 assertions | Correction boundary tests: 3 pass, 2 fail, 22 assertions | 5 pass, 0 fail, 29 assertions | Added invalid raw inputs, Buffer/Uint8Array equivalence, RFC 8785 property ordering, deep immutability, and cyclic input cases | Added cycle-aware validation and deep freezing; 5 pass |

## Sesión Evidence

| Evidence | S2.1 result | S2.2 result |
|---|---|---|
| Focused test command and exact result | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/schema.test.mjs` → exit 0; 30 pass, 0 fail, 63 assertions | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs` → exit 0; 14 pass, 0 fail, 69 assertions |
| Relevant broader suite | Baseline isolated clone: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test` → exit 0; 282 pass, 0 fail, 2,094 assertions | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts` → exit 0; 44 pass, 0 fail, 132 assertions. Repository-wide `bun test` reached 341 pass and 2 fail because the shared live Tower `ACTIVE` marker is present; it was intentionally not touched. |
| Runtime harness | N/A — S2.1 wires no adapter and leaves Tower runtime untouched; Bun contract tests are the planned harness | N/A — S2.2 exposes disconnected pure/immutable-Git contract APIs, wires no adapter, and leaves Tower OFF/state untouched |
| Rollback boundary | Remove S2.1 schema/validator paths and revert only S2.1 task/progress marks | Remove `contracts/{canonicalize,artifact-ref,idempotency,index}.mjs`, `test/contracts/{canonicalization,artifact-ref,idempotency}.test.mjs`, and `test/fixtures/contracts/canonicalization-v1.json`; revert only S2.2 task/progress marks and chain-strategy reconciliation |

## Baseline and Environment Evidence

- Before S2.2 edits: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/schema.test.mjs` → exit 0; 30 pass, 0 fail, 63 assertions.
- Correction RED: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/canonicalization.test.mjs` → exit 1; 3 pass, 2 fail, 22 assertions.
- Correction GREEN/REFACTOR: the same command → exit 0; 5 pass, 0 fail, 29 assertions.
- `git diff --check` after implementation → exit 0 with no output.
- The repository-wide suite's two snapshot-restore failures are environmental guards reporting `.git/control-tower/ACTIVE` in shared live state. No S2.2 code path imports or mutates Tower runtime state.

## Deviations and Issues

- No design deviation in S2.2 behavior or file scope.
- S2.3 remains untouched and pending.
- The live Tower marker prevented a clean repository-wide suite, so S2.2 completion relies on the fully green 44-test contract suite; the marker was preserved as required.
- The corrected S2.2 candidate is 449 authored additions/deletions, 49 above its approved exact 400-line boundary; no new planning level was introduced.

## Prior Gatekeeper Correction Evidence

- `sha256sum package.json bun.lock` before the S2.1 frozen install: `503a053d9c0d2c6decd74e66f361d716aa606158d6c2e1da5854d6c47103158e` and `38a45bd2528010a74ad618943c8287f5c1e090e9bfc19473265c82892a2af7ac`.
- `bun install --frozen-lockfile` installed Ajv 8.17.1 and YAML 2.8.1 without changing either manifest or lockfile hash.
- No S2.1 production/test/schema code changed during this S2.2 batch.
