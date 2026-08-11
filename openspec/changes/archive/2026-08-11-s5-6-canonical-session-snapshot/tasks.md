# Tasks: Canonical Session Plan Snapshot

## Execution contract

Strict TDD is active. Every RED must fail for the named missing behavior before implementation; every GREEN must pass its focused command before refactor; every behavioral commit must be green, independently revertible, and keep tests with the behavior they prove.

Only these implementation paths are allowed:

- `contracts/session-plan-snapshot.mjs`
- `schemas/session-plan-snapshot-v1.schema.json`
- `contracts/schema-registry.mjs`
- `contracts/validate.mjs`
- `test/contracts/session-plan-snapshot.test.mjs`
- `test/contracts/schema.test.mjs`
- `test/fixtures/contracts/schema-cases-v1.json`

`continuation/**`, `escalation/**`, `main-store/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, `openspec/plans/**`, and `openspec/specs/**` remain prohibited implementation paths. All S5.6 invariant failures must use `CT_SCHEMA_INVALID`; the generic graph helpers in `validate.mjs` currently emit `CT_MANIFEST_INVALID` and must not be reused unchanged.

Because the parser calls `validate` and `validate.mjs` imports `sessionPlanSnapshotDigest`, the Bun ESM import/module-initialization test is mandatory before the first behavioral commit.

## Strict-TDD execution order

The canonical registry seam must exist before a public parser can be green. Preserve the approved task IDs while executing this dependency-ready order:

1. T5.6.3.1 RED for absent registry/invariant/fixture wiring.
2. T5.6.1.1 RED for raw-byte identity, drift, encoding, and required fields.
3. T5.6.1.2 and T5.6.3.2 as the paired GREEN that establishes the registered identity contract; neither is complete until their shared focused command passes.
4. T5.6.1.3 REFACTOR/TRIANGULATE, then behavioral commit 1.
5. T5.6.2.1 and T5.6.2.2 RED for complete grammar and rejection behavior.
6. T5.6.2.3 GREEN, then T5.6.2.4 TRIANGULATE/REFACTOR and behavioral commit 2.
7. T5.6.3.3 read-only/isolation hardening, focused and full verification, then behavioral commit 3.

This ordering does not create another Módulo or Tarea. It only respects the dependency between the existing Módulos.

## Módulo M5.6.1 — Identidad y schema del snapshot

- [x] **Tarea T5.6.1.1 — RED: freeze exact source identity and mandatory shape failures.**
  - Allowed paths: `test/contracts/session-plan-snapshot.test.mjs`, `test/contracts/schema.test.mjs`.
  - Precondition: T5.6.3.1 has already demonstrated that an unregistered/invariant-free contract is incomplete; no S5.6 source module or schema exists.
  - Work: add failing cases for `Uint8Array`/Buffer input, exact `digestArtifact(..., "raw-bytes")`, one-byte and line-ending drift, optional expected digest mismatch, fatal UTF-8, missing target ID, and missing required target/schema fields. The RED must fail because S5.6 behavior is absent, not because the test is malformed.
  - Completion/evidence: record the failing test names and expected `CT_SCHEMA_INVALID` assertions in apply-progress; input bytes remain unchanged during every RED.
  - Focused command: `bun test test/contracts/session-plan-snapshot.test.mjs test/contracts/schema.test.mjs`.

- [x] **Tarea T5.6.1.2 — GREEN: establish the versioned identity contract and minimal parser path.**
  - Allowed paths: `contracts/session-plan-snapshot.mjs`, `schemas/session-plan-snapshot-v1.schema.json`, `test/contracts/session-plan-snapshot.test.mjs`.
  - Precondition: T5.6.1.1 and T5.6.3.1 are red for the intended reasons; execute together with T5.6.3.2 so the public API never lands against an unknown schema.
  - Work: add the closed 2020-12 schema shape and `$defs`; implement `parseSessionPlanSnapshot` input/source guards, fatal UTF-8, exact raw-byte binding, the minimal headed-target path needed by the identity cases, and `sessionPlanSnapshotDigest` without self-reference. Return only a frozen value accepted by the canonical validator.
  - Completion/evidence: identity cases pass; one-byte drift and invalid encoding return only `CT_SCHEMA_INVALID`; `snapshot_digest` and `source.content_digest` have distinct verified meanings; no partial value escapes.
  - Focused command: `bun test test/contracts/session-plan-snapshot.test.mjs test/contracts/schema.test.mjs`.

- [x] **Tarea T5.6.1.3 — REFACTOR/TRIANGULATE: remove duplicate digest and identity knowledge.**
  - Allowed paths: `contracts/session-plan-snapshot.mjs`, `contracts/validate.mjs`, `test/contracts/session-plan-snapshot.test.mjs`, `test/contracts/schema.test.mjs`.
  - Precondition: paired GREEN T5.6.1.2/T5.6.3.2 passes, including the Bun ESM initialization case.
  - Work: ensure raw identity calls the existing `digestArtifact` directly; ensure snapshot identity is computed by one exported helper used by parser and validator; remove copied digest regexes and duplicate field-omission lists; triangulate with two different valid snapshots and one stale digest.
  - Completion/evidence: parser and invariant compute identical snapshot digests; source drift changes only the expected identities; focused contract directory remains green; behavioral commit 1 is revertible as a complete registered identity contract.
  - Focused command: `bun test test/contracts`.

## Módulo M5.6.2 — Parser único del contrato de Sesión

- [x] **Tarea T5.6.2.1 — RED: specify complete two-domain Session semantics.**
  - Allowed paths: `test/contracts/session-plan-snapshot.test.mjs`.
  - Precondition: behavioral commit 1 is green and exposes only the registered identity foundation.
  - Work: add representative failing cases for the authoritative Plan 5 S5.6 target; local/external graph partition; S3.2/S3.3/S3.4/S4.1 reference-only closure; status, dependencies, `Área`, `Recurso`, both decision arms, active/historical/none contamination, and acceptance criteria isolated from task checkboxes.
  - Completion/evidence: every positive expectation fails because the complete parser is absent; the test proves graph-only nodes have no execution fields and the plan-local target has all required fields.
  - Focused command: `bun test test/contracts/session-plan-snapshot.test.mjs`.

- [x] **Tarea T5.6.2.2 — RED: lock the rejection matrix before implementation.**
  - Allowed paths: `test/contracts/session-plan-snapshot.test.mjs`, `test/contracts/schema.test.mjs`.
  - Precondition: T5.6.2.1 is red and its representative source is structurally valid.
  - Work: add failing cases for absent/duplicate target; missing/multiple/conflicting graph declarations; unresolved aliases/edges; duplicate edges; cycles; cross-domain ID conflicts; incomplete/duplicate fields; unsupported status; malformed decision labels/classes; non-binary or duplicate criteria; unresolved contamination; external fallback; graph-only target promotion; and dependency-edge mismatch.
  - Completion/evidence: every rejection expects frozen `ContractError` code `CT_SCHEMA_INVALID`, zero partial output, and unchanged input. Add an explicit assertion that S5.6 invariants do not route through `CT_MANIFEST_INVALID` helpers.
  - Focused command: `bun test test/contracts/session-plan-snapshot.test.mjs test/contracts/schema.test.mjs`.

- [x] **Tarea T5.6.2.3 — GREEN: implement the sole anchored Markdown parser.**
  - Allowed paths: `contracts/session-plan-snapshot.mjs`, `contracts/validate.mjs`, `test/contracts/session-plan-snapshot.test.mjs`, `test/contracts/schema.test.mjs`.
  - Precondition: T5.6.2.1 and T5.6.2.2 fail for their named missing behaviors; registry/schema/identity foundation is green.
  - Work: implement one fatal UTF-8 pipeline for the unique graph section, Mermaid declarations/edges, headed Session sections, target selection, closed status, both dependency labels, area code spans, resource text, anchored decisions/classes/resolution/contamination, and named binary criteria. Resolve external graph-only dependencies without promotion. Add S5.6-specific cross-field helpers that call the existing `invalid`/`CT_SCHEMA_INVALID` path; do not reuse generic manifest graph helpers unchanged. Parse no Engram, runtime, default, or continuation source.
  - Completion/evidence: authoritative Plan 5 S5.6 produces a schema-valid frozen snapshot; every negative matrix case fails closed; S3.2/S3.3/S3.4/S4.1 are reference-only; the import graph contains no `continuation/**` dependency.
  - Focused command: `bun test test/contracts/session-plan-snapshot.test.mjs test/contracts/schema.test.mjs`.

- [x] **Tarea T5.6.2.4 — TRIANGULATE/REFACTOR: canonicalize ordering and prove determinism.**
  - Allowed paths: `contracts/session-plan-snapshot.mjs`, `contracts/validate.mjs`, `test/contracts/session-plan-snapshot.test.mjs`.
  - Precondition: T5.6.2.3 is green across the complete positive and rejection matrix.
  - Work: sort set-like dependencies, area, node IDs, contamination IDs, and edges; preserve authored decision/criterion order; normalize only parsed boundary whitespace; prove identical bytes/target yield byte-identical `canonicalize(snapshot)` output and digest across repeated calls; prove changed raw bytes invalidate the old binding even when parsed semantics are equal.
  - Completion/evidence: repeated and reordered-traversal fixtures produce the same canonical output, while one-byte source drift changes the raw binding; behavioral commit 2 remains under 400 authored lines and can be reverted without removing the registered identity foundation.
  - Focused command: `bun test test/contracts/session-plan-snapshot.test.mjs`.

## Módulo M5.6.3 — Registro y frontera read-only

- [x] **Tarea T5.6.3.1 — RED: prove schema-only wiring is incomplete.**
  - Allowed paths: `test/contracts/schema.test.mjs`, `test/contracts/session-plan-snapshot.test.mjs`.
  - Precondition: no S5.6 registry entry, invariant, or fixture exists.
  - Work: add failing assertions that `sessionPlanSnapshot` must appear in `schemaNames`, validate through `validate`, enforce snapshot/graph/reference invariants, exist in the shared fixture, and initialize correctly when parser and validator import each other under Bun ESM.
  - Completion/evidence: RED names the missing registry/invariant/fixture/module-initialization behavior; failures are not satisfied by direct AJV construction or a second validator.
  - Focused command: `bun test test/contracts/schema.test.mjs test/contracts/session-plan-snapshot.test.mjs`.

- [x] **Tarea T5.6.3.2 — GREEN: wire the sole canonical registry, invariants, and fixture.**
  - Allowed paths: `contracts/schema-registry.mjs`, `contracts/validate.mjs`, `contracts/session-plan-snapshot.mjs`, `test/contracts/schema.test.mjs`, `test/contracts/session-plan-snapshot.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - Precondition: T5.6.3.1 and T5.6.1.1 are red; execute as the paired GREEN with T5.6.1.2.
  - Work: register exactly one `sessionPlanSnapshot` schema; add the valid fixture; enforce snapshot digest, disjoint graph domains, target locality, edge closure/DAG, dependency-edge equality, contamination closure, and duplicate decision/criterion rejection through S5.6-specific `CT_SCHEMA_INVALID` invariants. Add the Bun ESM import/module-initialization test for the parser↔validator helper cycle.
  - Completion/evidence: shared fixture loop validates/freezes the payload and rejects undeclared fields; each cross-field mutation returns `CT_SCHEMA_INVALID`; importing parser then validator and validator then parser initializes and runs without TDZ/undefined-export failure.
  - Focused command: `bun test test/contracts/schema.test.mjs test/contracts/session-plan-snapshot.test.mjs`.

- [x] **Tarea T5.6.3.3 — REFACTOR/HARDEN: prove read-only isolation and final compatibility.**
  - Allowed paths: `contracts/session-plan-snapshot.mjs`, `contracts/validate.mjs`, `test/contracts/session-plan-snapshot.test.mjs`, `test/contracts/schema.test.mjs`.
  - Precondition: behavioral commits 1 and 2 are green; all parser/schema semantics are implemented.
  - Work: add before/after byte witnesses for Plan 5, input bytes, temporary DB/WAL/SHM/Tower sentinels on success and rejection; assert no forbidden imports or writer APIs; run negative scope checks; refactor only if witnesses expose a mutation path. Then run focused and full verification once on the exact final bytes.
  - Completion/evidence: all witnesses remain byte-identical; `continuation/derivation.mjs` and every prohibited path remain unchanged; `bun test test/contracts` and `bun test` pass with exact counts recorded; runtime harness is `N/A` because S5.6 has no runtime adoption; behavioral commit 3 is independently revertible.
  - Focused command: `bun test test/contracts` followed by `bun test`.

## Traceability

### Requirements and all 31 scenarios

| Requirement | Scenarios | Owning Tareas |
|---|---:|---|
| R1 exact source identity | 4/4 | T5.6.1.1, T5.6.1.2, T5.6.1.3 |
| R2 target and graph domains | 6/6 | T5.6.2.1, T5.6.2.2, T5.6.2.3 |
| R3 complete execution contract | 4/4 | T5.6.2.1, T5.6.2.2, T5.6.2.3 |
| R4 decisions, criteria, contamination | 4/4 | T5.6.2.1, T5.6.2.2, T5.6.2.3 |
| R5 canonical schema boundary | 3/3 | T5.6.3.1, T5.6.3.2 |
| R6 deterministic isolated parser | 4/4 | T5.6.2.2, T5.6.2.3, T5.6.2.4, T5.6.3.3 |
| R7 read-only outcomes | 2/2 | T5.6.3.3 |
| R8 compatibility and bounded ownership | 4/4 | T5.6.3.2, T5.6.3.3 |
| **Total** | **31/31** | Every scenario has an owner. |

### S5.6 acceptance criteria

| Criterion | Owning Tareas |
|---|---|
| Exact bytes/digest and one-byte drift | T5.6.1.1–T5.6.1.3 |
| Graph plus target execution semantics | T5.6.2.1, T5.6.2.3 |
| Missing/duplicate/unresolved/ambiguous fails closed | T5.6.2.2, T5.6.2.3 |
| No Engram/narrative fallback | T5.6.2.2, T5.6.2.3, T5.6.3.3 |
| No continuation parser import/modification/duplication | T5.6.2.3, T5.6.3.3 |
| Identical bytes produce identical output/digest | T5.6.2.4 |
| Registry, canonical validation, invariant, fixture | T5.6.3.1, T5.6.3.2 |
| Read-only success and rejection | T5.6.3.3 |
| Focused and full Bun verification | T5.6.3.3 |
| Diff remains inside `Área` and outside `Prohibido` | Every Tarea; final proof T5.6.3.3 |

No requirement, scenario, or acceptance criterion is deferred.

## Apply-progress checkpoints

After each behavioral commit boundary, upsert and merge—not overwrite—Engram topic `sdd/s5-6-canonical-session-snapshot/apply-progress` with:

- base SHA, current HEAD/tree, commit SHA if created, and completed Tarea IDs;
- exact changed paths and authored additions/deletions for that boundary and cumulatively;
- RED test names/failure reason, GREEN focused command/result, and full-suite result when run;
- Bun ESM initialization evidence when boundary 1 closes;
- forbidden-path/import check and Tower-disarmed evidence;
- rollback boundary and runtime-harness result (`N/A` with pure-library reason);
- next exact Tarea and any budget/scope risk.

Apply must read and merge the existing checkpoint before continuing. A failed test, unresolved invariant, forbidden path, or boundary at/above 400 authored lines keeps the current Tarea incomplete and stops advancement.

## Review Workload Forecast

### Reconciled per-path forecast

| Approved path | Authored lines |
|---|---:|
| `schemas/session-plan-snapshot-v1.schema.json` | 70–95 |
| `contracts/session-plan-snapshot.mjs` | 150–210 |
| `contracts/schema-registry.mjs` | 1–3 |
| `contracts/validate.mjs` | 30–50 |
| `test/contracts/session-plan-snapshot.test.mjs` | 150–210 |
| `test/contracts/schema.test.mjs` | 15–30 |
| `test/fixtures/contracts/schema-cases-v1.json` | 45–70 |
| **Reconciled total implementation forecast** | **461–668** |

The total is the sum of final per-path authored ranges. Boundary ranges below allocate that same 461–668 forecast by responsibility and are not a second additive forecast. Uncertainty comes from Plan 5 grammar breadth, decision parsing, negative fixtures, and whether invariant test cases share helpers without obscuring behavior. Any refactor churn is measured in the actual boundary diff and cannot be hidden in the final-path estimate.

### Pure SDD documentation commit boundaries

| Documentation boundary | Lines | Delivery rule |
|---|---:|---|
| Proposal only | 128 | Separate reversible documentation commit. |
| Corrected spec only | 274 | Separate reversible documentation commit. |
| Design only | 309 | Separate reversible documentation commit. |
| Tasks only | 205 | Separate reversible documentation commit; no split is needed because it remains below 400 authored lines. |

### Behavioral commit boundaries

| Boundary | Tarea ownership | Allocated lines | Overlapping paths and exact responsibility |
|---|---|---:|---|
| 1 — Registered identity contract | T5.6.3.1, T5.6.1.1–T5.6.1.3, T5.6.3.2 | 180–235 | `session-plan-snapshot.mjs`: API/source/snapshot identity; `validate.mjs`: S5.6 invariant family; both tests: identity/registry/ESM cycle; schema, registry, fixture: initial complete contract. |
| 2 — Canonical two-domain parser | T5.6.2.1–T5.6.2.4 | 225–325 | `session-plan-snapshot.mjs`: graph/target/decision/criteria grammar; `validate.mjs`: graph/reference invariants; tests: positive/rejection/determinism matrix. No schema shape expansion. |
| 3 — Read-only compatibility hardening | T5.6.3.3 | 56–108 | Parser/validator only for proven refactor; tests own byte witnesses, import/scope checks, and final focused/full compatibility evidence. No new behavior. |
| **Allocated total** | All 10 Tareas | **461–668** | Equals the reconciled per-path total; overlap is responsibility allocation, not duplicated line counting. |

Every behavioral boundary keeps tests and behavior together, remains below 400 at its maximum forecast, and has one explicit `git revert` boundary. Actual authored additions plus deletions govern; estimates never override measured diffs.

Chained PRs recommended: No

Chained behavioral commits required: Yes

400-line budget risk: High

Estimated changed lines: 461–668 authored implementation lines

Decision needed before apply: No

The maintainer already selected auto-forecast, all three behavioral boundaries remain below 400 at maximum forecast, and this repository uses direct push to `master` with no PR. Tasks/apply must stop before a boundary reaches 400, preserve the existing Módulo/Tarea hierarchy, and repartition commit mechanics only; it must not invent another Session, Módulo, Tarea, or fifth level.
