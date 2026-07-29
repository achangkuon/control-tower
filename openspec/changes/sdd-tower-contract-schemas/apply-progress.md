# Apply Progress: SDD Tower V1 Contract Schemas

## Mode

Strict TDD. Delivery strategy: auto-chain. This batch implements WU1 only; no delivery action was performed.

## Cumulative Progress

- [x] 1.1 RED schema fixtures and boundary tests
- [x] 1.2 GREEN ten schemas and duplicate-safe validator
- [x] 1.3 REFACTOR/triangulate schema invariants
- [ ] 2.1–2.3 WU2 canonicalization and ArtifactRefs
- [ ] 3.1–3.3 WU3 Main store and boundaries

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `test/contracts/schema.test.mjs` | Unit/integration | Isolated clone: 282 pass, 0 fail | Missing `contracts/validate.mjs`: 0 pass, 1 fail, 1 error | Covered by 1.2 | Unknown fields, forbidden YAML, top-level/nested/decoded-equivalent duplicates | N/A — RED task |
| 1.2 | `test/contracts/schema.test.mjs` | Unit/integration | 1.1 RED preserved | Tests existed before production files | 29 pass, 0 fail | Ten valid contracts plus unknown-field and extension cases | Ajv registry and frozen error/result boundaries retained; 30 pass |
| 1.3 | `test/contracts/schema.test.mjs` | Unit/integration | 29 pass, 0 fail | Invariant cases were written before production validators | 29 pass, 0 fail | 30 pass: headers, catalog/DAG, runtime exclusion, delta links, campaign DAG, quoted/implicit timestamps | 30 pass, 0 fail after runtime-state preflight extraction |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/schema.test.mjs` → exit 0; 30 pass, 0 fail, 63 assertions |
| Runtime harness | N/A — WU1 wires no adapter and leaves Tower runtime untouched; Bun contract tests are the planned harness |
| Rollback boundary | Remove `package.json`, `bun.lock`, `schemas/`, `contracts/`, `test/contracts/schema.test.mjs`, and `test/fixtures/contracts/schema-cases-v1.json`; revert WU1 task/progress marks only |

## Baseline Evidence

The baseline ran from a separate non-local clone with its own Git common directory and with Bun's transpiler cache disabled, so the live Tower marker/state was neither read as the test fixture nor mutated.

`BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test` → exit 0; 282 pass, 0 fail, 2,094 assertions across 11 files.

## Deviations and Issues

None. WU2 and WU3 remain untouched. The live Tower marker/state was preserved.

## Gatekeeper Correction Evidence

- `sha256sum package.json bun.lock` before frozen install: `503a053d9c0d2c6decd74e66f361d716aa606158d6c2e1da5854d6c47103158e` and `38a45bd2528010a74ad618943c8287f5c1e090e9bfc19473265c82892a2af7ac`.
- `bun install --frozen-lockfile` installed Ajv 8.17.1 and YAML 2.8.1 (6 packages) without changing either manifest or lockfile hash.
- `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/contracts/schema.test.mjs` → exit 0; 30 pass, 0 fail, 63 assertions.
- No production/test/schema code or task checkbox changed during correction. WU2 and WU3 remain untouched.
