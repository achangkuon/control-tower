# Control Tower Completion and Attestation — Revision 11

## Requirements

### Requirement: CT-R1 Atomic lifecycle and actor authority

The system MUST implement `DRAFT→VALIDATED→PUBLISHED→CLAIMED→STARTED→COMPLETION_ATTESTED→COMPLETED`. `ack` is the sole claimant start operation; no `start` API MAY exist. Main alone MAY validate, publish, reject, revise, recover, or attest. Producers MAY submit immutable content only. Rollback also permits the non-live `WORK_SUSPENDED` and `ATTESTATION_SUSPENDED` states.

#### Scenario: CT-R1-S1 Ack is the sole start
- GIVEN an eligible CLAIMED handoff with a live fence, complete manifest, and valid revalidation evidence
- WHEN the claimant calls `ack`
- THEN the transaction records evidence and moves CLAIMED to STARTED, or changes nothing on failure

#### Scenario: CT-R1-S2 Main attests completion
- GIVEN STARTED evidence matching unit, repository/common-dir fingerprints, worktree/branch/base, merge SHA/URL, source, generation, claimant fence, JCS digest, and effects
- WHEN Main calls `attestCompletion`
- THEN one immutable unused attestation is created and STARTED moves atomically to COMPLETION_ATTESTED

#### Scenario: CT-R1-S3 Claimant consumes attestation
- GIVEN COMPLETION_ATTESTED, an unused attestation, and a live original or redelivery claim
- WHEN the claimant calls `complete` with matching generation, token, attestation, digest, and tuple
- THEN the attestation is consumed once, claim and delivery close, the result persists, and state is COMPLETED

#### Scenario: CT-R1-S4 Safe rejection and revision states
- GIVEN an unclaimed handoff in exactly DRAFT, VALIDATED, or PUBLISHED
- WHEN Main rejects it and later revises it
- THEN only the safe state becomes REJECTED and only Main creates immutable DRAFT revision N+1

#### Scenario: CT-R1-S5 Unsafe mutation or missing attestation
- GIVEN CLAIMED-or-later work, a non-Main actor, an `ATTESTATION_REDELIVERY`-purpose `ack`, or completion without a valid attestation
- WHEN the operation is attempted
- THEN a deterministic error is returned and state, evidence, events, and effects are unchanged

#### Scenario: CT-R1-S6 Revision source is exact
- GIVEN a REJECTED revision with immutable history
- WHEN Main revises it
- THEN the new revision is N+1 in DRAFT and no prior revision or producer source state is overwritten

### Requirement: CT-R12 Complete effect manifest and compensation proof

Before `ack`, the claimant MUST persist a complete effect manifest and boundary digest for every intended database, external API, or filesystem effect, including target, operation, observability, compensatability, and pre-state digest. STARTED rollback MUST include ordered compensation receipts and independent read-back proving every declared effect and the aggregate boundary equal the pre-start boundary. Any undeclared, unobservable, non-compensatable, or unprovable effect MUST forbid republish and leave the row STARTED/blocked or UNKNOWN/POISONED.

#### Scenario: CT-R12-S1 Manifest precedes ack
- GIVEN intended DB, API, or filesystem effects with an incomplete or unpersisted manifest
- WHEN the claimant calls `ack`
- THEN ack is rejected without STARTED or any effect

#### Scenario: CT-R12-S2 Complete manifest records external effects
- GIVEN a complete persisted manifest and pre-start boundary digest
- WHEN the claimant acks and executes its unit
- THEN every effect is recorded against the handoff and generation with observability and compensation metadata

#### Scenario: CT-R12-S3 Compensation receipts and read-back
- GIVEN STARTED effects and exact claimant termination proof
- WHEN Main verifies ordered receipts and independent read-back
- THEN rollback proof succeeds only if every effect and the aggregate boundary equal the pre-start boundary

#### Scenario: CT-R12-S4 Unprovable effects never republish
- GIVEN an undeclared, unobservable, non-compensatable, or read-back-mismatching effect
- WHEN STARTED recovery is considered
- THEN STARTED is not republished and remains blocked or becomes UNKNOWN/POISONED
