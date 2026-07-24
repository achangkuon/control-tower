# Control Tower Delivery and Claim — Revision 11

## Requirements

### Requirement: CT-R6 Separate delivery state, non-consuming receive, atomic claim, budget, attestation

Handoff state and delivery state MUST be separate persisted rows, with at most one live delivery and one live claim per generation. Argument-free `receive()` MUST peek without mutation, returning `{delivery:null}` or `{delivery:{delivery_id,id,state,generation,purpose}}`. `claim({request_identity,delivery_id,id,es,eg,purpose})` MUST atomically recheck ACTIVE identity and ON mode, require `es:"PUBLISHED"` for WORK or `es:"COMPLETION_ATTESTED"` for ATTESTATION_REDELIVERY, CAS delivery PENDING→CLAIMED, consume at most one budget unit, snapshot identity, and create one token/hash. Only a fresh successful claim returns exactly the common handoff shape plus `{delivery_id,purpose,token}` with `replayed:false`; exact replay returns the exact token-free shape with `replayed:true`. `attestCompletion` and `complete` MUST bind the live claim by validating the caller-provided bearer against the persisted token hash; `status` MUST never expose tokens.

Schema 4 and every P4 digest, column, immutable trigger, response, transaction boundary, and error precedence MUST match the P4 design amendment. Budget scope is the trusted root session across same-root MCP rebinds with an immutable limit of one claim; it is seeded and consumed only inside a successful first-claim transaction. A claim token MUST be HMAC-derived from the owner-only anchor secret and a persisted random salt, returned only on fresh commit, and stored only as salt plus SHA-256 hash—never as raw SQLite response data. CLAIM `decision_digest` MUST hash the exact token-free claim decision containing the persisted token hash/fence/budget members, while transition `response_digest` MUST hash the exact persisted token-free response template—not the public bearer response. Exact replay MUST verify the persisted identity/CAS/token-hash commitments and return the token-free replay shape without reconstructing or redisclosing the bearer. Later authority MUST hash the caller-provided bearer once and compare it to the persisted commitment. Receive selection MUST be `(created_at,delivery_id)` with no purpose priority and MUST remain non-consuming under races. Transition and idempotency uniqueness MUST be operation-scoped: the same UUID across different operations is legal, while changed/scope-conflicting reuse within one operation is `CT_IDEMPOTENCY_CONFLICT`.

P4 owns `CT-R6-S1/S2/S4/S5/S6` and the handoff/delivery projection of `CT-R3-S5`. Normative `CT-R6-S3` stays in this capability but P5 owns its implementation/test with real attestation and committed-result persistence. P4 MUST NOT claim or simulate that completion race.

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
- THEN only that delivery becomes CLAIMED, one claimant/token-hash/budget commitment is recorded, only the fresh winner receives the bearer, and a concurrent claimant cannot consume it

### Requirement: CT-R2 Canonical payload and provenance

Every handoff MUST validate schema/version, lineage, revision, repository/common-dir fingerprints, source merge, next-unit scope, dependencies, references, snapshots, provenance, decision summary, and JCS-canonical idempotency/evidence digests. Paths and executable-looking references MUST remain inert data; limits MUST be enforced without execution. P4 `create|validate|publish` MUST use the exact v1 payload shape, RFC 8785 rules, 65536-byte payload ceiling, per-field/array limits, derived fingerprints/digests, immutable producer `Ctx` provenance, transition scopes, CAS membership, and exact common responses pinned by the P4 design amendment. `validate` MUST accept exactly `{request_identity,id,es:"DRAFT",eg,payload_digest}` and `publish` exactly `{request_identity,id,es:"VALIDATED",eg}`; neither request MAY contain `validation_digest`, evidence, Main/Ctx authority, live observations, timestamps, or preview output. Fresh authoritative validation MUST derive the exact `handoff_validation_evidence_v1` JCS and `validation_digest` inside its writer transaction from constructor-owned current Main/Ctx authority, immutable persisted handoff payload/provenance, and the approved inert live observations, then derive CAS and atomically persist evidence JSON/digest. VALIDATE/PUBLISH idempotency MUST persist the canonical server-only replay envelopes, historical CAS inputs/digests, and public response links defined by the design; adapters return only `{id,state,generation,replayed}`. Exact replay verifies that persisted envelope/evidence/row/transition tuple without rereading mutable Git/filesystem state; changed accepted requests conflict, malformed persistence is `CT_SCHEMA_INVALID`, and publication binds the persisted/reverified value without caller digest input. P4-A2 owns canonical immutable payload/provenance and create-side scenario portions; P4-A3 owns validation/publication and completes `CT-R2-S1..S3` only after A2. P4-B owns delivery projection and claim.

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
