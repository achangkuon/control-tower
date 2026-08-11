# Proposal: Canonical Session Plan Snapshot

## Decision summary

Create one versioned, canonical `session-plan-snapshot-v1` contract and one read-only parser for an already-approved Session plan. The snapshot is bound to the exact raw plan bytes and `digestArtifact(planBytes, "raw-bytes")`; it exposes only the Session identity and state, dependency graph, `Área`, `Recurso`, declared `Decisiones`, binary acceptance criteria, and semantic contamination present in those bytes.

This prerequisite gives S5.7 and S5.5 one stable input instead of letting each consumer interpret planning Markdown independently. One parser eliminates representational drift: every consumer receives the same canonical snapshot for the same bytes, and any byte-level plan change invalidates that snapshot rather than silently changing meaning.

## Problem

S5.5 needs executable Session planning semantics, but the repository has no canonical contract for them. The only current Markdown parser is the private Module enumerator in `continuation/derivation.mjs`; it reads Module headings only and cannot represent Session state, dependencies, resource ownership, decisions, acceptance criteria, or semantic contamination. Extending or reusing that parser would cross S5.6's approved boundary and would leave later consumers coupled to continuation behavior.

Without a single canonical parser, S5.7 and S5.5 could derive different snapshots from the same plan, fill missing fields from narrative sources, or continue after the underlying plan bytes changed. That would make decision binding and safe resume depend on parser choice rather than on one frozen artifact identity.

## Intended outcome

For exact plan bytes, the change produces a deterministic, immutable snapshot that:

- binds the source as raw bytes and a `sha256:<hex>` raw-bytes digest;
- identifies the target Session and its declared state;
- carries closed references for dependency edges and semantic contamination;
- exposes `Área`, `Recurso`, `Decisiones`, and binary acceptance criteria exactly as authored;
- rejects missing, duplicate, ambiguous, partial, or unresolved data without returning a partial snapshot;
- validates through the repository's canonical schema registry and validation path; and
- performs no runtime or persistent-state mutation.

## Users and consumers

| Consumer | Use |
|---|---|
| S5.7 contract work | Bind parked-decision and selected-response contracts to one exact Session snapshot and digest. |
| S5.5 deferred continuation | Consume the canonical Session graph, execution boundaries, criteria, and semantic contamination without reparsing Markdown. |
| Contract maintainers | Review one schema, one parser, one registry entry, and one invariant path rather than reconciling multiple interpretations. |

S5.8 consumes the snapshot binding through the S5.7 response contract; it does not expand S5.6's ownership.

## Scope

### In scope

- Add `schemas/session-plan-snapshot-v1.schema.json` with immutable source identity and closed Session references.
- Add `contracts/session-plan-snapshot.mjs` as the sole canonical parser for this contract.
- Reuse `digestArtifact(..., "raw-bytes")`; do not introduce a second digest implementation.
- Parse and canonicalize only Session identity/state, dependency graph, `Área`, `Recurso`, `Decisiones`, binary criteria, and explicit semantic contamination found in the supplied bytes.
- Register the schema in `contracts/schema-registry.mjs`.
- Add cross-field invariants through `contracts/validate.mjs`.
- Add valid and invalid contract fixtures and focused tests under the approved S5.6 `Área`.
- Verify deterministic output, fail-closed rejection, canonical validation, and read-only behavior.

Approved implementation paths are limited to:

- `contracts/session-plan-snapshot.mjs`
- `schemas/session-plan-snapshot-v1.schema.json`
- `contracts/schema-registry.mjs`
- `contracts/validate.mjs`
- `test/contracts/session-plan-snapshot.test.mjs`
- `test/contracts/schema.test.mjs`
- `test/fixtures/contracts/schema-cases-v1.json`

### Non-goals

- Parked-decision or selected-response schemas, registry entries, invariants, or fixtures; those belong to S5.7.
- Main-store selected-option authority persistence or authorization terminal transition; those belong to S5.8.
- S5.5 parked ledger, contamination evaluation, option selection, or resume behavior.
- Imports from or edits to `continuation/**`, including its private Module enumerator.
- Engram as runtime authority or as a source used to complete the snapshot.
- Changes to `escalation/**`, `main-store/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, `openspec/plans/**`, or `openspec/specs/**`.
- DB, Tower, delivery, host, or other live runtime mutation.
- Any scope beyond Session 5.6 or any new Plan, Session, Módulo, or Tarea hierarchy.

## Approved rules

| Rule | Required behavior |
|---|---|
| Source identity | The snapshot binds exact raw plan bytes plus `digestArtifact(..., "raw-bytes")`. Any byte drift invalidates the complete snapshot. |
| Source authority | Every exposed value comes from the supplied bytes. Missing information is not completed from Engram, defaults, runtime state, or another document. |
| Parser ownership | Exactly one canonical parser produces `session-plan-snapshot-v1`; consumers do not independently parse the planning Markdown. |
| Fail-closed parsing | Missing fields, duplicates, ambiguity, partial format, unresolved Session references, or inconsistent cross-field data produce no snapshot. |
| Determinism | Identical bytes produce byte-identical canonical output and the same digest. |
| Read-only boundary | Parsing and validation mutate no plan file, DB/WAL/SHM file, Tower state, or runtime store. |
| Canonical validation | The schema is present in `schemaFiles`, validated by the shared validator, covered by shared fixtures, and protected by cross-field invariants. |

These rules are already approved by S5.6 in `openspec/plans/plan-5/STATUS.md`; this proposal introduces no new public, security, or product decision.

## Compatibility

The change is additive. Existing schemas and validators retain their current behavior, while the new schema joins the same registry and validation path. `contracts/canonicalize.mjs` remains the digest authority and is imported without modification unless implementation evidence proves a defect outside this proposal, in which case work stops for replanning.

The private parser in `continuation/derivation.mjs` remains untouched and continues serving its existing Module-only behavior. No runtime consumer adopts the new snapshot in S5.6, so rollback does not require data migration, store conversion, or compatibility shims.

## Dependencies and references

- Primary authority: `openspec/plans/plan-5/STATUS.md`, Session 5.6.
- S5.6 depends on S5.4, which is complete.
- Existing digest authority: `contracts/canonicalize.mjs`.
- Existing canonical registry and validation boundaries: `contracts/schema-registry.mjs` and `contracts/validate.mjs`.
- Existing insufficient private boundary, inspected but not modified: `continuation/derivation.mjs`.
- Supporting readiness: Engram observation 8261, `plans/s5-5/technical-readiness`.
- Approved prerequisite enumeration: Engram observation 8273 revision 3, `plans/plan-5/s5-5-prerequisite-enumeration`.
- Approved Option B context: Engram observation 8274, `plans/s5-8/terminal-response-representation`.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A permissive Markdown parser returns plausible but incomplete data. | Treat absence, ambiguity, duplication, unresolved references, and partial structure as contract errors; never return a partial snapshot. |
| Consumers drift by reparsing the source independently. | Export one canonical parser and require later contracts to bind its versioned output and digest. |
| Parsed equality hides source drift. | Bind exact raw bytes and raw-bytes digest, so even semantically similar byte changes invalidate the snapshot. |
| Schema and parser diverge. | Use the shared registry, cross-field invariant path, and shared valid/invalid fixtures; duplicate field lists are rejected by design review. |
| The parser crosses into runtime authority. | Keep it a pure read-only contract library with no Engram, continuation, DB, Tower, or store access. |
| The change exceeds the 400-line review budget. | Return to the planner before apply; do not add a hierarchy level or absorb S5.7/S5.8/S5.5 work. |

## Rollback

Revert the S5.6 implementation commit as one unit, removing the parser, schema, registry entry, invariants, tests, and fixtures together. Because S5.6 performs no runtime adoption, migration, or state mutation, rollback restores the prior contract surface without data repair. S5.7, S5.8, and S5.5 remain blocked until a canonical replacement is approved.

## Success criteria

- [ ] The snapshot binds exact plan bytes and their raw-bytes digest; a one-byte drift invalidates it.
- [ ] The contract exposes Session identity/state, dependency graph, `Área`, `Recurso`, `Decisiones`, binary criteria, and semantic contamination.
- [ ] Missing data, duplicates, unresolved references, partial format, or ambiguity fail closed without a partial snapshot.
- [ ] The parser reads neither Engram nor any narrative fallback source.
- [ ] No code imports, edits, or duplicates the private parser in `continuation/**`.
- [ ] Identical input bytes produce byte-identical canonical output and the same digest.
- [ ] `session-plan-snapshot-v1` is registered in `schemaFiles`, validated through the canonical path, and covered by shared fixtures.
- [ ] Parsing and validation are read-only in both success and rejection cases.
- [ ] `bun test test/contracts` and the full `bun test` suite pass without new failures during implementation verification.
- [ ] The implementation diff touches no path outside the approved `Área` and no prohibited path.
