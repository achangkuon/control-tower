# SDD Tower Contract Schemas Specification

## Purpose

Contracts for A–I.

## Requirements

### Requirement: V1 schemas reject ambiguity

The system MUST publish schemas for Registry, ArtifactRef, Catalog, Manifest, Delta, Report, Jornada, Assignment, Authorization, and Campaign. Validators MUST reject undeclared fields except extensions.

#### Scenario: Schema boundary

- GIVEN a payload with an undeclared field
- WHEN it is validated
- THEN it fails with `CT_SCHEMA_INVALID` and creates no effect.

### Requirement: Artifacts preserve plan invariants

Manifests and Deltas MUST carry identity/producer headers. Catalog IDs and DAG edges MUST resolve; manifests MUST exclude runtime state. Delta chains MUST be immutable and revision-linked; stale refs MUST fail closed.

#### Scenario: Stale evidence

- GIVEN a ref with mismatched commit, path, digest, project, or revision
- WHEN consumed
- THEN it returns `CT_ARTIFACT_REF_INVALID` or `CT_MANIFEST_INVALID`.

### Requirement: Authority and opacity are preserved

Maintainer authority is final. Hermes presents intent but MUST NOT direct workers; Main owns routing, assignments, and delivery; Support is advisory/read-only; Policy is per plan; Planning and Implementation are per slice. Workspace Manager and Host Launcher are mechanisms. Reconciliation and Delta production are Implementation phases. Tower transports opaque refs and remains plan-agnostic.

#### Scenario: Opaque transport

- GIVEN different Policy Reports
- WHEN Tower stores their refs
- THEN it applies one mechanical contract and MUST NOT parse or route plan meaning.
