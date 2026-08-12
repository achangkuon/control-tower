# Main Authorization Response Binding Specification

## Purpose

Bind one canonical S5.7 parked-decision response to one terminal Main authorization transition without creating another authority or persistence path.

## Requirements

### Requirement: Main is the sole response-persistence authority

Only Main SHALL persist a selected response, and it MUST do so through the canonical S5.1 authorization store after the existing `assertMain` authority boundary succeeds. No caller-provided assertion, actor, capability, or origin claim MAY substitute for that boundary.

#### Scenario: Non-Main attempt

- GIVEN a selected response and any actor or capability that is not the bound Main authority
- WHEN response persistence is requested
- THEN the request MUST fail closed and the authorization-record bytes MUST remain unchanged.

### Requirement: The S5.7 response contract is canonical

The store MUST accept only a `parked-decision-response-v1` value accepted by S5.7's registered canonical validation and cross-record binding contract. It MUST verify the canonical response digest and MUST NOT duplicate, weaken, replace, or trust a caller assertion in place of S5.7 validation.

#### Scenario: Invalid or substituted response

- GIVEN a response with an invalid schema, digest, binding, label, narrative, index, boolean assertion, or unregistered contract path
- WHEN Main requests terminal response persistence
- THEN the request MUST fail closed with zero persisted effects.

### Requirement: Exact authorization and decision binding

Before transition, the response MUST bind the exact PENDING authorization ID and current authorization revision, parked-decision ID and canonical digest, exactly one option ID enumerated by the canonical parked decision, Session-plan snapshot digest, canonical parked-decision origin, and canonical response digest. A response, decision, or origin from another authorization context MUST be rejected as foreign.

#### Scenario: Bound selection is accepted

- GIVEN Main supplies a canonically valid response and canonical parked decision whose every required binding equals the current PENDING authorization context
- WHEN the selected response is persisted
- THEN the stored terminal authorization MUST contain that complete versioned response and its exact canonical bindings.

#### Scenario: Binding or origin drift

- GIVEN any authorization ID or revision, decision ID or digest, option ID, snapshot digest, origin, or response digest differs from the canonical expected value
- WHEN Main requests persistence
- THEN the request MUST fail closed, identify the rejected binding, and leave persisted bytes unchanged.

### Requirement: Eligible authorization lifecycle is required

A selected response MUST be persisted only for an unexpired PENDING authorization at its expected revision. Non-PENDING, consumed, terminal, expired, malformed-expiry, stale-revision, or foreign-origin inputs MUST be rejected without a terminal transition.

#### Scenario: Ineligible authorization

- GIVEN an authorization that is terminal, consumed, expired, malformed, stale, or foreign to the canonical parked decision origin
- WHEN a response is submitted
- THEN the store MUST reject it and MUST NOT alter the authorization record.

### Requirement: Response and terminal state have one atomic visibility boundary

The complete `parked-decision-response-v1` record and the authorization's terminal state MUST become visible only as one replacement of the same canonical authorization record. The replacement MUST remain protected by the existing Main authorization boundary, authorization/Jornada lock boundary, CAS revision check, transaction, atomic write, and `assertMain` boundary. Neither effect MAY be independently visible.

#### Scenario: Commit failure

- GIVEN a valid selected response and a forced failure before the atomic authorization-record replacement completes
- WHEN the persistence attempt ends
- THEN the prior PENDING authorization bytes MUST remain intact and no response-only or terminal-only record MAY exist.

### Requirement: Replay is exact and idempotent

A replay of the byte-identical canonical response against the same already-terminal authorization MUST return the existing terminal result without another transition, revision effect, or persistence record. A replay that differs in any response bytes or bound identity MUST fail closed with zero additional effects.

#### Scenario: Exact replay

- GIVEN the authorization already contains the complete canonical response and terminal state
- WHEN Main submits the byte-identical response again
- THEN the existing terminal result MUST be returned and the persisted authorization bytes MUST not change.

#### Scenario: Divergent replay

- GIVEN the authorization already contains a terminal response
- WHEN Main submits a response with a different option, digest, origin, revision, snapshot, decision, or any other byte difference
- THEN the request MUST fail closed and MUST create no additional transition or record.

### Requirement: Concurrent requests preserve one canonical outcome

Concurrent requests for the same authorization MUST honor the existing lock and CAS semantics. At most one eligible replacement MAY commit; a loser MUST either receive the exact existing replay result or fail closed without altering persisted bytes.

#### Scenario: Concurrent competing selections

- GIVEN two requests race at the same expected authorization revision
- WHEN they submit competing or otherwise non-identical selections
- THEN no more than one terminal authorization replacement MUST become visible and the losing request MUST have zero additional effect.

### Requirement: Existing authorization actions remain additive and compatible

Existing `MERGE` and `START_JORNADA` authorizations MUST retain their current validation and terminal-transition behavior without requiring a response field, record migration, or data repair. The selected-response capability MUST be additive and MUST NOT change the canonical authorization schema ownership.

#### Scenario: Legacy authorization flow

- GIVEN a valid existing `MERGE` or `START_JORNADA` authorization created before selected-response persistence
- WHEN its existing lifecycle is exercised without a parked-decision response
- THEN it MUST preserve its prior valid behavior without migration.

### Requirement: Scope and verification remain bounded

The change SHALL modify only `main-store/store.mjs` and `test/main-store.test.mjs`. It MUST NOT create a migration, database state, sidecar or shadow store/file, second writer, alternate authority/assertion/persistence path, terminal semantics only in `extensions`, Telegram behavior, S5.5 behavior, S1.12 behavior, or jornada planning. Focused `bun test test/main-store.test.mjs` and full `bun test` MUST pass with no new failures. Implementation MUST stop for a forbidden-path necessity, atomicity doubt, a new always-escalate decision, or material workload risk above the 390/400-line boundary.

#### Scenario: Bounded verification

- GIVEN the completed implementation candidate
- WHEN scope, line budget, focused tests, and the full suite are evaluated
- THEN only the two approved implementation paths MUST differ, both test commands MUST pass, and any stop condition MUST block further implementation pending escalation.
