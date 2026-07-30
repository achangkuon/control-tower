# Proposal: S2.4 — Registry Storage and XDG Path Resolution

## Decision

Assign **S2.4** only within Change B as one PR (estimated 250–400 authored lines). Shared planning documents remain unchanged. This is the correct first Sesión because every later registry consumer needs a durable contract, while storage can be verified without deciding bootstrap policy or changing authority behavior. Módulo and Tarea decomposition belongs to `sdd-tasks`.

## Intent

Establish a path-neutral, secure persistence foundation for `project-registry-v1` before enrollment, project resolution, adapters, or Main consume it.

## Scope

### In Scope

- Resolve `${XDG_CONFIG_HOME:-$HOME/.config}/control-tower/projects.yaml` without repository, worktree, Git-common-directory, or Hermes coupling.
- Create and validate the parent directory with `0700`; load documents through existing strict registry contracts and enforce specified unique project IDs and globally unique aliases.
- Save validated documents using same-filesystem temporary files, flush/fsync, atomic rename, and `0600`; reject stale expected revisions and preserve the previous document on failure.
- Add focused Bun tests using temporary `HOME`/XDG roots.

### Out of Scope (Later Work)

- Initial enrollment, update/relocation bootstrap, legacy Hermes import, or any legacy-field policy.
- Read-only project/alias resolution; Hermes or Support adapters.
- Main identity rederivation or other consumer behavior.
- SQLite, Supabase, Main-store, or runtime mutation; Installable V1; P7/P8.

## Capabilities

### New Capabilities

- `project-registry-storage`: XDG path resolution plus validated, owner-only, atomic registry persistence and revision fencing.

### Modified Capabilities

None.

## Approach and Constraints

Reuse `schemas/project-registry-v1.schema.json` and `contracts/{validate,schema-registry,canonicalize}.mjs`; add narrow `registry/*.mjs` storage APIs and `test/registry/*.test.mjs`. Do not expand the schema, infer missing legacy facts, connect consumers, or write outside temporary test roots. DB mode is `none`; strict TDD applies.

## Dependencies

- Completed `sdd-tower-contract-schemas` (Change A).
- Approved PRD, RFC, and REQUIREMENTS; Bun 1.3.14 test baseline.

## Acceptance Outcomes

- [ ] XDG override/default behavior and path independence are proven.
- [ ] `0700`/`0600`, validation, duplicate/unknown-field rejection, atomic failure preservation, and monotonic revision fencing are proven.
- [ ] Focused registry, existing contract, and Main-store tests pass using isolated roots, with zero writes to `.git/control-tower/tower.db`.

## Risks

| Risk | Mitigation |
|---|---|
| Path or write failures corrupt prior state | Same-filesystem atomic replacement plus failure tests. |
| Scope drifts into unresolved consumers | Keep adapters, bootstrap, Main, Installable V1, and P7/P8 excluded. |

## Rollback Boundary

Revert only the new registry modules and tests. No consumer, repository, database, or runtime state changes; any created XDG registry file is inert and can be backed up or removed independently.
