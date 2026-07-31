# Proposal: Legacy Import Preflight

## Status

Unnumbered P2 Change B; no Sesión ID. `sdd-tasks` assigns it after one-PR forecasting.

## Intent

Convert incomplete Hermes records into read-only canonical candidates without granting legacy authority or mutating runtime state.

## Scope

### In Scope
- Parse legacy `{id,name,root,kind}` as untrusted hints; deterministically reject malformed records and exact duplicates (same `id`).
- Accept facts only through an authoritative derivation seam; report missing or unverifiable fields.
- Reuse project-registry validation and canonicalization.
- Optionally compare canonical contract values through `load()` only: project ID to project ID, alias to alias, and each path field only to itself; never `save()`.

### Out of Scope
- Enrollment, conflict resolution, source-path policy, writes, or public export.
- Project resolution, live Main rederivation, integrations, SQLite/runtime/`ACTIVE`, or P8 work.

## Capabilities

### New Capabilities
- `legacy-import-preflight`: Legacy parsing, canonical candidates, missing facts, and read-only conflicts.

### Modified Capabilities
None. `project-registry-storage` remains unchanged.

## Approach and Security

Create private `registry/legacy-import.mjs` with injected derivation and optional loading. Legacy fields MUST NOT authorize projects.

- Apply only existing lexical/path validation; add no path-escape, symlink, or credential-URL policy.
- Detect only same-class canonical conflicts; perform no cross-class inference or resolution.
- Issues and errors never echo raw legacy records, injected exception messages or causes, credentials, or secrets.
- A successful ready candidate intentionally contains the complete verified canonical entry supplied by the authoritative derivation seam.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `registry/legacy-import.mjs` | New | Private preflight. |
| `test/registry/legacy-import.test.mjs` | New | Authority, conflict, secrecy, and no-write proofs. |

## P8 Collision Boundary

P8 is neither approved nor required. The module stays additive and private; enrollment, resolution, rederivation, layout, Support, and dispatch remain excluded.

## Dependencies and Forecast

- Depends on completed `sdd-tower-project-registry`/S2.4 without amendment.
- 220–320 authored lines; 400/800-line risk Low; chained PRs not recommended; DB mode `none`.

## Risks

| Risk | Mitigation |
|---|---|
| Candidate mistaken for authority | Explicit preflight result; no write/public integration surface. |
| Future P8 API collision | Coordinate before any export or consumer wiring. |

## Rollback Plan

Revert the new module and tests. No registry, Git, database, runtime, or `ACTIVE` bytes require restoration.

## Success Criteria

- [ ] Exact legacy parsing and same-`id` duplicate failures are deterministic.
- [ ] Existing validation/canonicalization is reused; incomplete facts are not guessed.
- [ ] Optional conflicts use canonical same-class comparisons through `load()`, with no cross-class inference, `save()`, or runtime mutation.
- [ ] Failure output protects raw records, injected exceptions, credentials, and secrets while ready output carries the complete verified canonical entry.
- [ ] Forecast holds and strict OpenSpec checks pass.
