# Control Tower Delivery and Claim — Revision 11

## Requirements

### Requirement: CT-R6 Separate delivery state, non-consuming receive, atomic claim, budget, attestation

Handoff state and delivery state MUST be separate persisted rows, with at most one live delivery and one live claim per generation. Argument-free `receive()` MUST peek without mutation, returning `{delivery:null}` or `{delivery:{delivery_id,id,state,generation,purpose}}`. `claim({request_identity,delivery_id,id,es,eg,purpose})` MUST atomically recheck ACTIVE identity and ON mode, require `es:"PUBLISHED"` for WORK or `es:"COMPLETION_ATTESTED"` for ATTESTATION_REDELIVERY, CAS delivery PENDING→CLAIMED, consume at most one budget unit, snapshot identity, and create one token/hash, returning the common handoff shape plus `{delivery_id,purpose,token}`. `attestCompletion` and `complete` MUST bind the live claim; `status` MUST never expose tokens.

#### Scenario: CT-R6-S1 Claim/receive race
- GIVEN one pending delivery, eligible handoff, and one budget unit
- WHEN receive and claim race
- THEN at most one claim succeeds and losers return deterministic empty/error results without mutation

#### Scenario: CT-R6-S2 Budget exhaustion
- GIVEN no remaining budget
- WHEN another claim is attempted
- THEN it returns `CT_SESSION_BUDGET_EXHAUSTED` and creates no claim or delivery mutation

#### Scenario: CT-R6-S3 Attestation single-use race
- GIVEN one unused attestation bound to the live fence and digest
- WHEN two valid completes race
- THEN one commits, the exact loser replays that success, and a conflicting request returns `CT_IDEMPOTENCY_CONFLICT`

#### Scenario: CT-R6-S4 Receive is a peek
- GIVEN a PUBLISHED delivery with an eligible handoff
- WHEN `receive` is called
- THEN it returns the exact delivery shape without changing handoff, delivery, budget, identity, generation, or pending status

#### Scenario: CT-R6-S5 Crash before claim preserves delivery
- GIVEN `receive` returned a delivery and the process crashes before `claim`
- WHEN another eligible receive occurs
- THEN the same delivery is still PENDING and claimable, with no budget or claim consumed

#### Scenario: CT-R6-S6 Claim consumes delivery atomically
- GIVEN a PENDING WORK or ATTESTATION_REDELIVERY delivery and an eligible claimant
- WHEN `claim` commits
- THEN only that delivery becomes CLAIMED, one claimant/token/budget is recorded, and a concurrent claimant cannot consume it

### Requirement: CT-R2 Canonical payload and provenance

Every handoff MUST validate schema/version, lineage, revision, repository/common-dir fingerprints, source merge, next-unit scope, dependencies, references, snapshots, provenance, decision summary, and JCS-canonical idempotency/evidence digests. Paths and executable-looking references MUST remain inert data; limits MUST be enforced without execution.

#### Scenario: CT-R2-S1 Valid payload
- GIVEN mandatory fields, authoritative references, matching fingerprints, canonical hashes, and in-bound limits
- WHEN Main validates the payload
- THEN validation succeeds and the payload remains inert

#### Scenario: CT-R2-S2 Inert executable-looking reference
- GIVEN an in-root documentation or executable-looking filename
- WHEN validation examines the reference
- THEN it is never executed, sourced, imported, or interpreted

#### Scenario: CT-R2-S3 Invalid provenance or limits
- GIVEN an escaping/non-canonical reference, mismatched repository, or oversized payload
- WHEN validation runs
- THEN the deterministic `CT_PAYLOAD_INVALID` error is returned with no mutation
