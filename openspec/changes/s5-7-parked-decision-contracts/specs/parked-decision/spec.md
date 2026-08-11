# Parked Decision Contracts Specification

RFC 2119 keywords are normative.

## Requirement: Complete parked record

A `parked-decision-v1` value MUST include stable ID, exact question, non-empty line-addressed evidence with contradiction, at least two options, origin Session/Módulo, checkpoint, one approved escalating class, frozen scope, timestamp, and canonical digest. Scope MUST contain the exact `session_plan_snapshot_digest`, Session IDs, area, and resources; nothing MAY be inferred from runtime or narrative.

- **Complete:** GIVEN every §11 field, WHEN constructed, THEN canonical validation accepts and deeply freezes it.
- **Incomplete:** GIVEN any field, evidence coordinate, consequence, origin, checkpoint, class, or scope binding is absent, WHEN validated, THEN `CT_SCHEMA_INVALID` returns no partial record.

## Requirement: Option identity is stable and unique

Every option MUST carry a stable unique `option_id`, label, and consequence. Label, position, or narrative MUST NOT identify selection.

- **Unique:** GIVEN distinct IDs, WHEN frozen, THEN IDs remain canonical regardless of property order.
- **Invalid:** GIVEN absent/duplicate ID or missing consequence, WHEN validated, THEN the complete record is rejected.

## Requirement: Selected response binds exact identities

A `parked-decision-response-v1` value MUST bind `response_id`, `authorization_id` and revision, `parked_decision_id` and digest, exactly one `option_id`, `session_plan_snapshot_digest`, timestamp, and canonical digest. Construction MUST accept only an option enumerated by the supplied canonical parked record and copy exact decision/snapshot bindings.

- **Enumerated:** GIVEN a canonical record and enumerated ID, WHEN constructed, THEN the frozen exact binding is accepted.
- **Unknown:** GIVEN label, text, index, or unknown ID, WHEN constructed, THEN it fails closed.

## Requirement: Every binding mismatch invalidates the response

Digest invariants MUST reject changes to response, authorization, decision, option, snapshot, revision, or timestamp. Cross-record binding MUST reject response decision ID/digest, snapshot digest, or option inconsistent with the parked record.

- **Field drift:** GIVEN a valid response, WHEN a bound field changes unsealed, THEN validation rejects it.
- **Cross-record drift:** GIVEN a resealed response for another record, WHEN checked against the original, THEN binding fails closed.

## Requirement: Canonical representation never replaces identity

Both digests MUST use `digestArtifact(..., "rfc8785-jcs")` over all fields except their own digest. Property order MUST NOT change identity. Labels/narrative MUST NOT appear in response as substitutes.

- **Order:** GIVEN equivalent property orders, WHEN digested, THEN identities match.
- **Label:** GIVEN label without exact ID, WHEN selected, THEN it is rejected.

## Requirement: Canonical validation is the only schema path

Both schemas MUST be registered, validated through `contracts/validate.mjs`, covered by shared fixtures, and protected by cross-field invariants. Undeclared properties MUST fail closed without input mutation.

- **Registered:** GIVEN both fixtures, WHEN validated by registered name, THEN each is accepted and frozen.
- **Invalid:** GIVEN duplicate options, wrong digest, or undeclared field, WHEN validated, THEN `CT_SCHEMA_INVALID` is returned.

## Requirement: Pure bounded contract

Implementation MUST NOT read/write authority, stores, DB, Tower, plans, or runtime state; create, validate, transition, consume, or persist authorization; exceed approved paths or 400 implementation lines; or fail `bun test test/contracts`/`bun test`.

- **Pure:** GIVEN valid in-memory values, WHEN constructed, THEN no external effect occurs.
- **Violation:** GIVEN runtime adoption, persistence, authority behavior, prohibited path, budget breach, or failing suite, WHEN verified, THEN S5.7 is rejected.
