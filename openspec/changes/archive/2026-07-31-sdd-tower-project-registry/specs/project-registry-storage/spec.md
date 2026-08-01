# Delta for Project Registry Storage

## Purpose

Define the path-neutral, secure persistence boundary for the existing
`project-registry-v1` document. This capability MUST remain independent of
repository discovery, Git, Hermes, Main consumers, SQLite, and runtime state.

## ADDED Requirements

### Requirement: Resolve an isolated XDG registry path

The storage API MUST resolve the registry as
`${XDG_CONFIG_HOME:-$HOME/.config}/control-tower/projects.yaml`. A non-empty,
absolute `XDG_CONFIG_HOME` MUST override the default; an unset or empty value
MUST use the absolute `$HOME/.config` default. Missing, empty, or non-absolute
required roots MUST fail with a stable, safe path error. Resolution MUST NOT
depend on cwd, repository/worktree paths, Git common directories, or Hermes.

#### Scenario: Override and default are independent of cwd

- GIVEN isolated absolute `HOME` and `XDG_CONFIG_HOME` roots
- WHEN the registry path is resolved with and without the override
- THEN the paths are respectively `<XDG>/control-tower/projects.yaml` and `<HOME>/.config/control-tower/projects.yaml`
- AND changing cwd or repository location does not change either result

#### Scenario: Invalid environment boundary is rejected

- GIVEN a relative or unusable required configuration root
- WHEN the path is resolved
- THEN the operation fails with the stable path error and performs no filesystem or runtime write

### Requirement: Enforce the existing strict registry contract

Load and save MUST validate the complete document through the existing
`projectRegistry` contract without adding fields or legacy interpretation.
Unknown fields, malformed structured content, duplicate `project_id` values,
or aliases duplicated anywhere across projects MUST be rejected. Existing
contract error categories MUST remain observable (`CT_SCHEMA_INVALID` for
schema/parse rejection and `CT_MANIFEST_INVALID` for registry invariants).

#### Scenario: Valid document round-trips

- GIVEN a document satisfying `project-registry-v1` and its invariants
- WHEN it is saved and loaded
- THEN the returned document is validated against the same contract and preserves its declared fields and revisions

#### Scenario: Invalid document is not persisted

- GIVEN a document with an unknown field, duplicate project ID, or globally duplicated alias
- WHEN save is requested
- THEN validation fails with the appropriate stable contract error and the prior file remains unchanged

### Requirement: Provide secure atomic persistence and revision fencing

The parent directory MUST be an owner-only `0700` directory and the registry
file MUST be an owner-only regular file with mode `0600`. A successful mutation
MUST advance `registry_revision` monotonically by exactly one and advance each
changed entry's existing `registry_entry_revision` monotonically; stale
`expected_revision` values MUST be rejected before replacement. Writes MUST use
a same-directory temporary file, flush/fsync, atomic rename, and directory
durability; failed writes MUST remove temporary artifacts and preserve the
previous document.

#### Scenario: Fresh revision commits atomically

- GIVEN a validated registry at revision N and matching expected revision N
- WHEN a valid mutation is saved
- THEN revision N+1 is durably installed, permissions remain `0700`/`0600`, and no partial target is observable

#### Scenario: Stale or failed save preserves state

- GIVEN an existing registry and a stale expected revision or injected temp/fsync/rename failure
- WHEN save is attempted
- THEN a stable safe CAS/write error is returned, the old bytes remain readable, and temporary files are cleaned up

### Requirement: Keep the boundary test-isolated and non-runtime

Focused tests MUST use temporary `HOME`/XDG roots and MUST prove zero writes to
`.git/control-tower/tower.db`, SQLite, Main-store files, or runtime state. This
capability MUST NOT implement enrollment, bootstrap/import, alias resolution,
Hermes/Support adapters, or Main identity behavior.

#### Scenario: Isolated tests leave runtime untouched

- GIVEN temporary environment roots and a repository checkout
- WHEN registry load/save tests run
- THEN all registry artifacts remain under the temporary roots and the runtime database and Main consumers are unchanged

## Risks

Canonical proposal and requirements do not define missing-file behavior. This
spec intentionally does not choose whether a missing registry is an empty
document, a not-found result, or an error; design MUST resolve that boundary
before implementation. Malformed-file rejection is defined above because the
existing strict validator explicitly supports it.
