# Tasks: Canonical Parked-Decision Contracts

Strict TDD is active with `bun test`. Only S5.7's approved paths may change. One behavioral commit is the rollback unit; stop on any failing criterion, prohibited path, unresolved test, new decision, or implementation diff over 400 authored lines.

## Módulo M5.7.1 — Contrato de decisión estacionada

- [x] **Tarea T5.7.1.1 — RED:** add failing tests for every §11 field, exact snapshot-bound scope, missing evidence coordinates, missing consequence, and duplicate/absent `option_id`. Command: `bun test test/contracts/parked-decision.test.mjs test/contracts/schema.test.mjs`.
- [x] **Tarea T5.7.1.2 — GREEN:** add the closed `parked-decision-v1` schema, canonical constructor/digest, registry entry, invariant, and shared fixture.
- [x] **Tarea T5.7.1.3 — REFACTOR:** reuse canonical slug/revision/path/timestamp/digest `$defs`; prove property order does not change identity.

## Módulo M5.7.2 — Contrato de respuesta seleccionada

- [x] **Tarea T5.7.2.1 — RED:** require exact decision ID/digest, one enumerated option ID, snapshot digest, authorization ID/revision, response identity, and fail each mismatch.
- [x] **Tarea T5.7.2.2 — GREEN:** add the closed `parked-decision-response-v1` schema, constructor, digest, binding assertion, registry entry, invariant, and fixture without authority effects.
- [x] **Tarea T5.7.2.3 — REFACTOR:** reject label/index/narrative substitution and prove canonical property ordering.

## Módulo M5.7.3 — Registro e invariantes cruzadas

- [x] **Tarea T5.7.3.1 — RED:** prove both unknown schemas fail before registration and that fixture/invariant coverage is absent.
- [x] **Tarea T5.7.3.2 — GREEN:** register both schemas; enforce unique options, evidence ranges, frozen-origin scope, both digests, and cross-record binding.
- [x] **Tarea T5.7.3.3 — REFACTOR:** complete valid/invalid shared cases, run `bun test test/contracts`, then final `bun test`, scope diff, and `git diff --check` on exact bytes.

## Traceability and workload

- Parked completeness/options: T5.7.1.1–T5.7.1.3 and T5.7.3.2.
- Response enumeration/bindings/no authority: T5.7.2.1–T5.7.2.3 and T5.7.3.2.
- Registry/fixtures/suites/scope: T5.7.3.1–T5.7.3.3.
- Forecast: 240–330 authored implementation lines; chained PRs: No; decision before apply: No; budget risk: Medium.

Apply-progress and verify evidence MUST record base/commit/tree, paths, line count, RED failure reason, GREEN/focused/full results, all ten binary criteria, runtime harness `N/A` (pure contract), rollback boundary, and remaining risks.
