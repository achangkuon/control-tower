# Checkpoint Provenance Specification

## Purpose

Define the two immutable, producer-owned provenance artifacts that let a later Main-owned flow prove capture and reconciliation refer to the same checkpoint, without trusting caller or consumer claims.

## Requirements

### Requirement: Canonical Capture Provenance

`captureCheckpoint` MUST emit a complete immutable `checkpoint-capture-v1` artifact for every successful canonical checkpoint capture. The capture producer SHALL be the sole authority for the artifact's identity, digest, and bindings to the exact project, assignment, generation, repository, base, and result observed by capture.

For identical authority-bearing capture context, the artifact identity and digest MUST be deterministic. If any authority-bearing binding changes, the artifact identity and/or digest MUST no longer validate as the same capture artifact.

#### Scenario: Capture emits deterministic producer-owned provenance

- GIVEN two canonical captures with identical project, assignment, generation, repository, base, and result context
- WHEN `captureCheckpoint` emits their provenance artifacts
- THEN each artifact is `checkpoint-capture-v1` with a valid producer-owned identity and digest
- AND the identity and digest are deterministic for that context

#### Scenario: Capture context cannot be reused for a distinct checkpoint

- GIVEN a valid capture artifact
- WHEN project, assignment, generation, repository, base, or result is changed
- THEN the changed artifact MUST fail canonical provenance validation as the original capture
- AND it MUST NOT retain a valid shared identity for both checkpoint contexts

### Requirement: Canonical Reconciliation Provenance

The reconciliation producer MUST emit a complete immutable `reconciled-checkpoint-v1` artifact only from the exact canonical capture artifact and the required reconciled evidence. The reconciliation producer SHALL be the sole authority for its identity, digest, `VALID` outcome, capture linkage, and bindings to project, assignment, generation, repository, base, and result.

A reconciliation artifact MUST link to the exact capture identity and digest from which it was reconciled. Its project, assignment, generation, repository, base, and result bindings MUST match that capture exactly. The producer MUST NOT emit canonical reconciliation provenance with any outcome other than `VALID`.

#### Scenario: Reconciliation binds the exact canonical capture

- GIVEN a valid canonical capture artifact and reconciled evidence that confirms its checkpoint context
- WHEN the reconciliation producer emits provenance
- THEN the artifact is `reconciled-checkpoint-v1` with its own valid deterministic identity and digest
- AND its outcome is `VALID`
- AND it links to the exact capture identity and digest
- AND all project, assignment, generation, repository, base, and result bindings match the capture

#### Scenario: Reconciliation rejects an incomplete or non-VALID basis

- GIVEN missing required reconciliation evidence, an incomplete canonical capture, or a reconciliation result other than `VALID`
- WHEN reconciliation provenance is requested
- THEN no canonical reconciliation artifact is emitted
- AND the operation MUST fail closed

### Requirement: Integrity and Drift Rejection

Canonical provenance validation MUST fail closed when any required identity, digest, project, assignment, generation, repository, base, result, capture linkage, or required reconciliation evidence is missing, malformed, or inconsistent. A schema-valid object, fixture, or caller-supplied value MUST NOT be treated as canonical producer evidence merely because its shape is valid.

#### Scenario: Tampered capture or reconciliation provenance is rejected

- GIVEN a producer-emitted capture or reconciliation artifact
- WHEN any authority-bearing binding, identity, digest, or exact-capture linkage is altered
- THEN canonical validation MUST reject the artifact
- AND no repaired, substituted, or synthesized provenance is accepted in its place

#### Scenario: Cross-artifact mismatch is rejected

- GIVEN a valid capture artifact and a reconciliation artifact that names a different project, assignment, generation, repository, base, result, capture identity, or capture digest
- WHEN the artifacts are validated as a provenance pair
- THEN validation MUST fail closed

### Requirement: Exclusive Producer Authority and Canonical Contract Path

Callers, consumers, Main, parking, fixtures, and any other component MUST NOT assert, complete, enrich, repair, re-author, or synthesize producer-owned provenance. Canonical capture and reconciliation provenance MUST be accepted only when emitted by their respective runtime producers.

The versioned artifact contracts MUST have one canonical schema, registry, validation, and fixture path in the approved S5.11 Área: `schemas/checkpoint-capture-v1.schema.json`, `schemas/reconciled-checkpoint-v1.schema.json`, `contracts/schema-registry.mjs`, `contracts/validate.mjs`, and `test/fixtures/contracts/schema-cases-v1.json`. Schemas, registry entries, validation, and fixtures MUST agree on the same canonical contracts; fixtures MAY demonstrate accepted and rejected cases but MUST NOT substitute for runtime producer output.

#### Scenario: Caller-completed provenance is rejected

- GIVEN a caller or consumer supplies an identity, digest, binding, capture link, or purported artifact that was not emitted by the owning producer
- WHEN canonical provenance is requested or validated
- THEN the supplied value MUST be rejected
- AND the system MUST NOT merge it into, repair, or use it to synthesize canonical provenance

#### Scenario: Schema-only reconciliation is insufficient

- GIVEN a schema-valid `reconciled-checkpoint-v1` object or fixture that was not emitted by the runtime reconciliation producer
- WHEN it is offered as reconciliation provenance
- THEN it MUST NOT be accepted as canonical reconciliation evidence

### Requirement: Existing Capture Compatibility and Session Boundary

For checkpoint inputs accepted by the existing capture behavior, S5.11 MUST preserve the existing capture observation semantics and SHALL add producer-owned provenance without requiring a caller or consumer to provide producer-owned fields. This requirement does not authorize changes outside the approved S5.11 Área.

S5.11 MUST NOT compose capture and reconciliation in Main, transport provenance to parking, mutate Main-owned state, park or escalate decisions, create a shadow store, introduce a second writer or alternate ingress, add database or delivery-token behavior, or implement any S5.12 responsibility.

#### Scenario: Existing valid capture remains producer-owned

- GIVEN checkpoint input accepted by the existing capture behavior
- WHEN capture provenance is produced under S5.11
- THEN the existing checkpoint observation remains available under its existing behavior
- AND the added provenance is complete and owned by the capture producer
- AND no caller or consumer is required to supply or complete producer-owned bindings

#### Scenario: Out-of-boundary behavior is not introduced

- GIVEN S5.11 producer artifacts have been emitted
- WHEN the producer stage completes
- THEN it has not composed or transported the artifacts through Main or parking
- AND it has not mutated Main-owned state, created a shadow store, second writer, or alternate ingress
- AND it has not performed database, delivery-token, escalation, or S5.12 behavior
