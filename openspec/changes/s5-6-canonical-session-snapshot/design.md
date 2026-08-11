# Design: Canonical Session Plan Snapshot

## Decision summary

Implement one pure ESM parser in `contracts/session-plan-snapshot.mjs`. It accepts exact plan bytes plus one target Session ID, computes the existing raw-byte digest, parses one complete plan-local target, closes the document dependency graph with separate local and external reference domains, validates the resulting `session-plan-snapshot-v1` object through the existing registry, and returns a deeply frozen snapshot.

The design deliberately emits one full target execution record, not full records for every graph node. This keeps Plan 5 conforming: nodes such as S3.2, S3.3, S3.4, and S4.1 close edges as external references without fabricated `Área`, `Recurso`, `Decisiones`, or criteria.

## Existing boundaries

| Boundary | Existing symbol or format | Design use |
|---|---|---|
| Raw and canonical digests | `digestArtifact` in `contracts/canonicalize.mjs` | Reuse unchanged for source and snapshot identity. |
| Canonical bytes | `canonicalize` | UTF-8 bytes of its result are the canonical snapshot bytes. |
| Contract errors | `failContract`, `ContractError` | All failures surface as `CT_SCHEMA_INVALID`; no raw parser exception escapes. |
| Schema registry | `schemaFiles`, `schemaNames`, `validatorFor` | Add one `sessionPlanSnapshot` entry. |
| Shared validation | `validate` and `invariants` in `contracts/validate.mjs` | Own structured cross-field invariants, never Markdown parsing. |
| Shared fixture | `test/fixtures/contracts/schema-cases-v1.json` | Add one valid `sessionPlanSnapshot` payload. |
| Plan grammar | `openspec/plans/plan-5/STATUS.md` | Parse only source-declared headings, fields, graph, decisions, and criteria. |
| Private continuation parser | `modulesFromPlan` in `continuation/derivation.mjs` | Isolation witness only; no import, copy, modification, or reuse. |

No core, adapter, DB, Tower, Engram, main-store, escalation, delivery, or continuation dependency is introduced.

## Architecture decisions

### ADR-1 — One public parser with an optional stale-binding assertion

Public API:

```js
parseSessionPlanSnapshot({
  plan_bytes,              // required Uint8Array; Buffer is accepted as a subtype
  target_session_id,       // required canonical ID: S<plan>.<session>
  expected_plan_digest,    // optional sha256:<lowercase hex>
}) => frozenSnapshot
```

`expected_plan_digest` exists only to verify a previously frozen binding. This follows the current `deriveNextModule` convention, which compares exact bytes with an expected plan digest. If absent, the parser creates a new snapshot from the supplied bytes. If present, it must equal the internally computed raw-byte digest.

The module also exports `sessionPlanSnapshotDigest(snapshot)`. It computes the RFC-8785/JCS digest over every snapshot field except `snapshot_digest`. `validate.mjs` uses this same function for the invariant, matching the existing `candidateRevision` pattern and avoiding a second identity list.

Rationale: one parser handles creation and stale-binding verification; a separate verifier would duplicate parsing and normalization.

### ADR-2 — One full target record and two explicit graph reference sets

The snapshot has three non-overlapping representations:

1. `target`: the only full plan-local execution record.
2. `graph.local_session_ids`: IDs with uniquely headed Session sections in these bytes.
3. `graph.external_session_ids`: graph node IDs with no headed Session section in these bytes.

An ID cannot appear in both graph arrays. The target ID must appear in `local_session_ids`. Edges reference the union of both arrays. External IDs remain strings only; there is no union arm capable of carrying execution fields.

Rationale: separate properties make promotion structurally impossible. A graph node is not mistaken for an incomplete execution record.

### ADR-3 — Source digest and snapshot digest have different jobs

- `source.content_digest` is `digestArtifact(plan_bytes, "raw-bytes")`. Whitespace, BOM, or line-ending drift changes it.
- `snapshot_digest` is `digestArtifact(snapshotWithoutDigest, "rfc8785-jcs")`. It binds the normalized target and graph representation without self-reference.
- `source.digest_mode` is the constant `raw-bytes`.

Raw plan bytes are not embedded. Recomputing `source.content_digest` proves their binding without duplicating the plan inside every downstream contract.

Rationale: S5.7/S5.8 need a compact snapshot binding, while S5.5 must still reject any source-byte drift.

### ADR-4 — Schema shape is closed and versioned

`schemas/session-plan-snapshot-v1.schema.json` uses JSON Schema 2020-12, `$id` `https://control-tower.local/schemas/session-plan-snapshot-v1.schema.json`, and this exact top-level shape:

```json
{
  "schema": "session-plan-snapshot",
  "schema_version": 1,
  "source": {
    "digest_mode": "raw-bytes",
    "content_digest": "sha256:..."
  },
  "snapshot_digest": "sha256:...",
  "target": {
    "session_id": "S5.6",
    "title": "Contrato canónico de snapshot de Sesión",
    "status": "LISTO",
    "depends_on": ["S5.4"],
    "area": ["contracts/session-plan-snapshot.mjs"],
    "resource": "registro canónico de contratos ...",
    "decisions": [],
    "acceptance_criteria": [{"checked": false, "text": "..."}]
  },
  "graph": {
    "local_session_ids": ["S5.1", "S5.2"],
    "external_session_ids": ["S3.2", "S3.3"],
    "edges": [{"from": "S3.2", "to": "S5.1"}]
  }
}
```

Every object sets `additionalProperties: false`; no extension field is introduced. Top-level fields are all required. Arrays use `uniqueItems` where their values are sets.

Local `$defs` define `sessionId`, `source`, `target`, `edge`, `criterion`, `decision`, and `contamination`. The digest property reuses `artifact-ref-v1.schema.json#/$defs/digest`; no digest regex is copied.

Decision definitions are discriminated by `kind`:

- `derivable`: required `kind`, `body`, `criterion`, and `authority`.
- `escala`: required `kind`, `body`, `classes`, `resolution`, and `contamination`.

`resolution` is `open` or `resolved`. `contamination` is itself discriminated by `state`: `none` requires an empty `session_ids`; `active` and `historical` require at least one ID. `Contamina:` maps to `active`; `Contaminaba:` maps to `historical`. This preserves the current-vs-resolved distinction already present in Plan 5.

Rationale: the schema preserves observable planning semantics while preventing graph-only field promotion and caller-defined extensions.

### ADR-5 — Markdown parsing is anchored, not heuristic

The parser recognizes only the source grammar already present in Plan 5:

| Source element | Accepted grammar | Normalized result |
|---|---|---|
| Session section | `## Sesión <n>.<n> — <title>` | `S<n>.<n>` plus trimmed title. |
| Graph | One `## Grafo de dependencias` section with one `mermaid` fence and a `graph <direction>` declaration | Explicit node declarations and directed edges. |
| State | One `**Estado:** <marker> <closed status>` field | Closed status without marker or trailing explanation. |
| Dependencies | Exactly one `**Depende de:**` or `**Dependencias:**` field | Backticked `S<n>.<n>` IDs; an explicit `—` means empty. |
| Area | One `**Área:**` field | Non-empty sorted list of backticked path/glob tokens; tokens are not expanded. |
| Resource | One `**Recurso:**` field | Trimmed source text, including explicit `—` when authored. |
| Decisions | One `**Decisiones:**` block | Ordered logical list items beginning with ``- `derivable` —`` or ``- `escala` —``. |
| Criteria | `**Criterios de aceptación de S<n>.<n>**` | Ordered checkbox records from that block only; task checkboxes are excluded. |

Graph node declarations map Mermaid aliases to canonical Session IDs found at the start of their labels. Reusing an alias as an edge endpoint is allowed; a second declaration, conflicting alias mapping, unresolved alias, duplicate edge, or multiple graph sections fails closed. Directions `LR`, `RL`, `TB`, `TD`, and `BT` are syntax only and do not affect canonical edges.

For decisions, logical continuation lines remain part of the same `body`. Label extraction is anchored to bold `Criterio:`, `Autoridad:`, `Clase:`, `Contamina:`, and `Contaminaba:` markers. Escalation classes are matched longest-first against the approved closed eight-class vocabulary, so `seguridad y permisos` is not split at its internal conjunction. Explicit bold `RESUELTA` or `RESUELTO` marks `resolution: resolved`; otherwise an escalation remains `open`.

Rationale: anchoring to authored labels rejects ambiguity instead of guessing from prose.

### ADR-6 — Canonical ordering preserves meaning

Before validation and digesting:

- sort `depends_on`, `area`, local IDs, external IDs, contamination IDs, and edges lexicographically;
- order edges by `from`, then `to`;
- preserve source order for decisions and acceptance criteria because their sequence is authored meaning;
- trim boundary whitespace and normalize continuation indentation, but never rewrite source bytes before computing `source.content_digest`;
- use `canonicalize(snapshot)` for canonical snapshot bytes.

Rationale: set-like values cannot vary with parser traversal order, while authored sequences retain their meaning.

### ADR-7 — Parser and validator own different invariants

`contracts/session-plan-snapshot.mjs` owns UTF-8 decoding and Markdown grammar. `contracts/validate.mjs` owns structured invariants after AJV succeeds:

- recompute `snapshot_digest` with `sessionPlanSnapshotDigest`;
- ensure local and external ID sets are disjoint and their union contains every edge endpoint;
- ensure the target is local and not external;
- ensure target `depends_on` equals the sorted inbound predecessor set for the target;
- reject duplicate edges and cycles;
- ensure every contamination ID resolves in the local/external union;
- reject duplicate decision bodies or criteria within the target.

`validate.mjs` never receives or parses Markdown bytes. `schema-registry.mjs` only maps `sessionPlanSnapshot` to the schema file. The parser constructs one object, computes its digest, and calls `validate("sessionPlanSnapshot", snapshot)` once.

Rationale: grammar, schema, and cross-field validation remain one directional pipeline instead of three competing parsers.

### ADR-8 — One stable fail-closed error family

Every invalid API input, UTF-8 failure, missing/duplicate block, malformed field, unresolved reference, digest mismatch, schema failure, or invariant failure throws frozen `ContractError` with code `CT_SCHEMA_INVALID`. No `SyntaxError`, `TypeError`, partial graph, or partial snapshot escapes.

Diagnostics use stable `reason` values (`type`, `encoding`, `missing`, `duplicate`, `ambiguous`, `unresolved`, `conflict`, `digest_mismatch`) and a source or JSON-pointer-like `path`. Human messages may add context but are not the machine contract.

Rationale: this is a versioned contract, not a Plan Manifest; introducing a second manifest-specific error family would be misleading.

### ADR-9 — Read-only behavior is structural and witnessed

The parser module imports only `canonicalize`, `digestArtifact`, `failContract`, and `validate`. It imports no filesystem writer, Engram client, continuation module, DB/core module, or runtime store.

Tests capture bytes before and after successful and rejected calls for:

- the authoritative Plan 5 document;
- temporary DB/WAL/SHM and Tower-state sentinel files;
- the input `Uint8Array` itself.

Source-import assertions reject `continuation/**`, Engram, core, main-store, delivery, escalation, and write APIs. Both success and rejection must leave every witness identical.

Rationale: byte witnesses prove the observable promise; the import boundary prevents a hidden mutation route.

## Deterministic parsing pipeline

1. Validate the argument object, `Uint8Array`, canonical target ID, and optional digest shape.
2. Compute `source.content_digest` from untouched bytes; reject a mismatched expected digest.
3. Decode once with fatal UTF-8 semantics; convert decoder failures to `CT_SCHEMA_INVALID`.
4. Locate exactly one dependency-graph section and Mermaid fence; collect declarations and edges, then resolve aliases.
5. Scan headed Session sections to build the plan-local ID set; reject duplicate headings.
6. Partition graph IDs into local and external arrays; require every local ID used by an edge to map consistently and every edge endpoint to resolve.
7. Select exactly one target plan-local section and parse only its complete execution fields.
8. Resolve target dependencies and semantic contamination against the graph/local domains; compare dependencies with inbound graph edges.
9. Canonically order set-like values, construct the closed object, and compute `snapshot_digest` without self-reference.
10. Validate once through `validate("sessionPlanSnapshot", value)` and return its deeply frozen result.

Any failure aborts before step 10 and returns no object.

## Rejection matrix

| Input defect | Owner | Result |
|---|---|---|
| Non-bytes input, invalid target ID, malformed claimed digest | API guard | `CT_SCHEMA_INVALID`; no decode. |
| Invalid UTF-8 | Decoder | `CT_SCHEMA_INVALID`; no fields emitted. |
| Missing/duplicate graph section or fence | Parser | Fail closed. |
| Missing/conflicting node declaration, unresolved alias, duplicate edge | Graph parser | Fail closed; no partial graph. |
| Graph-only ID requested as target | Target selector | Fail closed; no promotion. |
| Missing/duplicate target section or required target field | Session parser | Fail closed; no defaults. |
| Unsupported status or mismatched criteria header ID | Session parser | Fail closed. |
| Malformed decision kind/labels/class, non-binary criterion, unresolved contamination | Decision/criteria parser | Fail closed. |
| Claimed plan digest mismatch | Source binding | Fail closed before parsing semantics. |
| Snapshot digest mismatch, cycle, set overlap, dependency/edge conflict | Shared invariant | `CT_SCHEMA_INVALID`; no accepted snapshot. |
| Undeclared schema property | AJV | `CT_SCHEMA_INVALID`; input remains unchanged. |

## Test architecture

### `test/contracts/session-plan-snapshot.test.mjs`

Use Strict TDD and keep representative Markdown inline. Cover:

- raw-byte digest, one-byte drift, optional expected binding, and fatal UTF-8;
- authoritative Plan 5 S5.6 parsing, including S3.2/S3.3/S3.4/S4.1 as external graph references;
- missing/duplicate target and graph declarations, alias conflicts, duplicate/unresolved edges, cycles, and cross-domain identity conflict;
- complete target fields, both dependency labels, seven statuses, area/resource normalization, decision arms, criteria isolation, and contamination states;
- deterministic canonical bytes and digest under repeated calls;
- no external fallback and no continuation-parser import;
- read-only witnesses for success and rejection.

### Shared schema tests

- Add the valid snapshot to `schema-cases-v1.json`; the existing loop in `schema.test.mjs` then proves registration, deep freeze, and undeclared-field rejection.
- Extend `schema.test.mjs` with focused invariant mutations: digest mismatch, graph set overlap, graph-only target, unresolved edge, dependency-edge mismatch, contamination mismatch, duplicate criterion/decision, and cycle.
- `bun test test/contracts` is the focused command; `bun test` is the compatibility command.

No new fixture path is needed, and no test writes to the repository or runtime state.

## Review Workload and Commit Boundaries

### Source/test forecast

| Approved path | Authored line forecast | Notes |
|---|---:|---|
| `schemas/session-plan-snapshot-v1.schema.json` | 70–95 | Closed schema and local `$defs`. |
| `contracts/session-plan-snapshot.mjs` | 150–210 | API, grammar, normalization, snapshot digest. |
| `contracts/schema-registry.mjs` | 1–3 | One registry entry. |
| `contracts/validate.mjs` | 30–50 | Structured invariants only. |
| `test/contracts/session-plan-snapshot.test.mjs` | 150–210 | Parser, rejection, determinism, witnesses. |
| `test/contracts/schema.test.mjs` | 15–30 | Cross-field mutation cases. |
| `test/fixtures/contracts/schema-cases-v1.json` | 45–70 | One valid contract fixture. |
| **Total implementation forecast** | **461–668** | Above one 400-line review unit; partition is mandatory. |

### Documentation boundaries

Pure SDD artifacts stay separate and reversible:

1. `docs(sdd): propose S5.6 canonical Session snapshot` — proposal only (128 lines).
2. `docs(sdd): specify S5.6 canonical Session snapshot` — spec only (274 lines).
3. `docs(sdd): design S5.6 canonical Session snapshot` — design only.
4. Tasks remain their own later documentation boundary.

These boundaries are commit/review mechanics only. They do not create or rename any Plan, Session, Módulo, or Tarea.

### Implementation boundaries

| Boundary | Existing Módulo alignment | Expected lines | Behavior and rollback |
|---|---|---:|---|
| Contract identity | M5.6.1 plus required registry seam | 170–250 | Schema, digest helper, registry/invariant minimum, fixture, and identity tests. One revert removes the registered contract without leaving an orphan schema. |
| Canonical parser | M5.6.2 | 230–340 | Two-domain parser plus graph/Session/decision/criteria tests. One revert removes parsing while preserving the independently valid contract foundation. |
| Read-only hardening | M5.6.3 | 60–110 | Mutation witnesses, invariant edge cases, deterministic refactor, focused/full evidence. One revert removes hardening without rewriting prior commits. |

Tests stay with the behavior they prove. Each boundary records focused test output, full-suite output when applicable, and an explicit runtime-harness `N/A` because S5.6 is a pure library with no runtime adoption.

Tasks/apply MUST count authored additions plus deletions continuously and MUST stop before any implementation boundary crosses 400 lines. It must apply the auto-forecast partition or return to planning; it may not silently accept an over-budget boundary. This repository delivers by conventional commits and direct push to `master`; no PR is opened.

## Compatibility, rollback, and non-goals

The registry addition is additive. Existing schema names, validation results, canonicalization behavior, candidate identity, and continuation behavior remain unchanged. `continuation/derivation.mjs` remains byte-identical.

Rollback occurs in reverse implementation-boundary order, then removes the independent SDD documentation boundaries if the whole change is abandoned. There is no migration, persisted snapshot store, runtime wiring, DB downgrade, or state repair.

Explicit non-goals remain S5.7 parked-decision/response schemas, S5.8 selected-option authority persistence, S5.5 ledger/contamination/selection/resume behavior, Engram authority, runtime adoption, and every prohibited path from S5.6.

## Traceability

### Specification requirements and 31 scenarios

| Requirement | Scenario count | Component/test coverage |
|---|---:|---|
| R1 Exact source identity | 4 | API/source steps 1–3; raw bytes, drift, claimed digest, UTF-8 tests. |
| R2 Target and graph domains | 6 | ADR-2/5; local target, absent/duplicate target, external node, missing/duplicate graph node, no promotion, identity conflict tests. |
| R3 Complete execution contract | 4 | Target schema/parser; complete record, missing field, status vocabulary, duplicate-field tests. |
| R4 Decisions, criteria, contamination | 4 | Decision `$defs` and parser; derivable, escalation, malformed decision, malformed criteria/contamination tests. |
| R5 Canonical schema boundary | 3 | Registry, AJV, shared invariant; valid path, incomplete wiring, cross-field mismatch tests. |
| R6 One deterministic isolated parser | 4 | ADR-1/6; repeatability, external disagreement, missing-source fallback, forbidden second parser tests. |
| R7 Read-only outcomes | 2 | ADR-9 success/rejection byte witnesses. |
| R8 Compatibility and bounded ownership | 4 | Existing fixture loop, non-goal assertions, prohibited import/path checks, focused/full suite. |
| **Total** | **31** | Every Given/When/Then scenario is assigned. |

### S5.6 binary criteria

| Criterion | Design/test owner |
|---|---|
| Exact bytes/digest and one-byte drift | ADR-3; source-binding tests. |
| Graph plus target execution semantics | ADR-2/4/5; authoritative Plan 5 test. |
| Missing/duplicate/unresolved/ambiguous rejection | Rejection matrix and negative parser tests. |
| No Engram or narrative fallback | ADR-5/8; isolation tests. |
| No continuation import/modification/duplication | Existing-boundary witness and source-import assertion. |
| Identical bytes produce identical canonical output/digest | ADR-6; repeated-call test. |
| Registry, canonical validation, fixture | ADR-4/7; shared schema tests. |
| Read-only success and rejection | ADR-9; byte witnesses. |
| Focused and full Bun suites pass | Shared test commands and implementation evidence. |
| Diff stays inside `Área` and outside `Prohibido` | Path inventory check before every implementation boundary. |
