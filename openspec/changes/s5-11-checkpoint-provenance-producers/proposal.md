# Canonical checkpoint provenance producers

## Intent

Make checkpoint capture and reconciliation independently trustworthy provenance producers. Each producer must create and own an immutable canonical artifact with its own identity and digest, and the two artifacts must carry sufficient cross-bindings for Main to later prove that they name the same checkpoint without accepting caller assertions.

This proposal covers Session S5.11 only. It preserves the approved Session hierarchy, its two canonical Módulos and Tareas, and its binary acceptance criteria as the implementation authority; it does not create a second work hierarchy.

## Problem

The current checkpoint flow does not provide a complete producer-owned provenance chain:

- Capture lacks a stable canonical identity and the full checkpoint context required by the approved Session contract.
- Reconciliation can be represented by schema or fixture data without a real runtime producer, its own digest, or a binding to the exact capture artifact.
- A downstream caller or consumer could therefore supply, complete, or synthesize provenance that the actual producers did not establish.

That gap prevents Main from proving artifact continuity at the security boundary. Trust would depend on claims made outside the components that observed and reconciled the checkpoint.

## Proposed outcome

Capture and reconciliation become the sole canonical producers of their respective provenance artifacts:

- The capture producer creates an immutable `checkpoint-capture-v1` artifact, owns its canonical identity and digest, and binds it to the exact project, assignment, generation, repository, base, and result context.
- The reconciliation producer creates an immutable `reconciled-checkpoint-v1` artifact with its own canonical identity, digest, and `VALID` outcome, derived from the canonical capture and reconciled evidence.
- The reconciliation artifact binds to the exact capture artifact and the checkpoint context required by the approved Session contract.
- Canonical schemas, validation, registry entries, and fixtures enforce one producer-owned path and fail closed on drift or missing provenance.

The exact contract field layout, canonicalization representation, and validation composition remain decisions for the specification and design stages. This proposal fixes ownership, trust boundaries, and observable outcomes only.

## Scope

Implementation is limited to the exclusive S5.11 Área:

- `workspace/checkpoint.mjs`
- `workspace/reconciliation.mjs`
- `schemas/checkpoint-capture-v1.schema.json`
- `schemas/reconciled-checkpoint-v1.schema.json`
- `contracts/schema-registry.mjs`
- `contracts/validate.mjs`
- `test/workspace/checkpoint.test.mjs`
- `test/workspace/reconciliation.test.mjs`
- `test/contracts/schema.test.mjs`
- `test/fixtures/contracts/schema-cases-v1.json`

The shared resource claim is limited to the canonical checkpoint-provenance producers and the canonical schema registry/fixture.

## Producer ownership and immutability

Each producer is authoritative for the artifact it emits:

- Capture identity, digest, and checkpoint bindings originate in the capture producer.
- Reconciliation identity, digest, `VALID` outcome, and bindings to the canonical capture originate in the reconciliation producer.
- Produced artifacts are complete at emission and are not enriched, repaired, or re-authored by callers, consumers, Main, parking, or another writer.
- Identity and digest validity must change when any authority-bearing checkpoint binding changes; distinct checkpoints must not retain a valid shared identity.

Immutability here means that the producer's emitted artifact is transported unchanged after creation. Main may later compose and transport the two artifacts, but it may not synthesize or mutate their provenance.

## Security boundary

Producer output, not caller input, is the trust anchor. The implementation must treat provenance supplied or completed by callers and consumers as untrusted and reject it rather than incorporating it into a canonical artifact.

Validation must fail closed when identity, digest, project, assignment, generation, repository, base, result, capture linkage, or required reconciliation evidence drifts or is incomplete. A schema-valid object or fixture without the canonical runtime producer is not sufficient evidence of provenance.

This boundary must not create a shadow store, second writer, alternate ingress, or any mutation path into Main-owned state.

## Non-goals

S5.11 does not:

- Compose the capture and reconciliation artifacts in Main.
- Transport artifacts to parking or implement the producer-to-parking path owned by S5.12.
- Mutate or open the Main store, add an alternate ingress, or introduce a second writer.
- Park or escalate decisions.
- Add database behavior, delivery-token behavior, or persistence migration.
- Permit caller assertions or consumer synthesis to fill missing provenance.
- Modify escalation, Main-store, parking, or any path outside the approved Área.
- Implement any S5.12 responsibility.

## Affected areas

| Area | Intended impact |
| --- | --- |
| Capture producer | Emits the canonical immutable capture artifact and owns its provenance. |
| Reconciliation producer | Becomes a real runtime producer and emits independently identified reconciliation provenance bound to the exact capture. |
| Contract schemas | Express the two versioned artifact contracts without transferring ownership to consumers. |
| Schema registry and validation | Provide one canonical registration and fail-closed validation path. |
| Contract fixtures | Demonstrate valid producer outputs and rejected drift without becoming substitute producers. |
| Workspace and contract tests | Prove producer ownership, determinism, cross-binding integrity, and forbidden synthesis paths. |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Contract details accidentally assign provenance authority to a caller or consumer. | Specification and design must trace every authority-bearing value to the owning producer and include rejection scenarios for caller-completed provenance. |
| Two artifacts appear valid independently but refer to different checkpoints. | Require verifiable cross-bindings and fail-closed mismatch coverage across all approved checkpoint context. |
| Schema or fixture work creates the appearance of support without a runtime reconciliation producer. | Success requires runtime producer evidence; schema-only or fixture-only completion explicitly fails. |
| Canonicalization or digest logic diverges between registry, validation, and producers. | Use the existing canonical contract path and remove duplicate lists or digest definitions during the approved REFACTOR Tareas. |
| Scope drifts into Main composition, parking, or persistence. | Enforce the exclusive Área and the S5.12 ownership boundary in review and acceptance checks. |
| A new visible versioned contract causes compatibility assumptions. | Specification must define compatibility and rejection scenarios before design chooses field shapes or implementation changes runtime behavior. |

## Rollback

No runtime or contract code changes are made by this proposal stage. If the later S5.11 implementation must be rolled back, revert the producer, schema, registry, validation, fixture, and test changes together so no partially registered contract or schema-only reconciliation artifact remains. Because S5.11 introduces no Main-store mutation, database change, parking write, or migration, rollback must not require data repair.

Rollback must not replace the producers with caller assertions, consumer synthesis, a shadow store, or a second writer; those remain forbidden even if implementation is reverted.

## Success criteria

S5.11 succeeds only when all of the following are measurably true:

1. `captureCheckpoint` emits an immutable `checkpoint-capture-v1` artifact with producer-owned identity and digest bound to the exact project, assignment, generation, repository, base, and result.
2. A canonical runtime reconciliation producer exists; schema and fixture artifacts alone do not satisfy completion.
3. The reconciliation producer emits an immutable `reconciled-checkpoint-v1` artifact with its own identity, digest, `VALID` outcome, and bindings to the exact canonical capture and checkpoint context.
4. Drift in identity, digest, project, assignment, generation, repository, base, result, or capture linkage is rejected closed.
5. Tests prove that no caller or consumer can assert, complete, or synthesize missing provenance.
6. Producers do not mutate Main store, park decisions, create a shadow store, add another writer, or open an alternate ingress.
7. Schemas, registry, invariants, and fixtures use the single canonical contract path.
8. The implementation diff touches no path outside the approved S5.11 Área.

## Authority and next stage

This proposal is governed by Session S5.11 in `openspec/plans/plan-5/STATUS.md` and decision 21 in `openspec/plans/decision-register.md`. Decision 21 fixes producer ownership and Main-owned composition: S5.11 owns canonical producer artifacts, while S5.12 alone owns composition and transport to parking.

The next recommended stage is specification, which should turn these boundaries into contract scenarios and acceptance behavior without expanding scope or revising the approved Módulos, Tareas, or binary criteria.
