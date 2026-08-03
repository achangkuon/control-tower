# SDD Tower Next-Sesión Continuation Specification

## Purpose

This full capability specification defines role-routed continuation for existing Autonomous V2 without creating another orchestrator or rewriting historical state.

## ADDED Requirements

### Requirement: Role-routed continuation sequence

Continuation SHALL follow exactly: Worker evidence → Main reconciliation → Support proposal → Policy eligibility → Main assignment. Main MUST validate evidence and issue assignments; Workers MUST only execute issued assignments.

#### Scenario: Eligible continuation

- GIVEN a verified Worker checkpoint and integrated predecessor base
- WHEN Main reconciles and invokes Support
- THEN Support returns a ranked proposal, Policy evaluates eligibility, and Main alone assigns the next Sesión

#### Scenario: No executable scope

- GIVEN evidence contains no executable scope or leaves a decision gap
- WHEN Support analyzes it
- THEN Support reports the minimum missing decision/evidence and escalates to human review without assignment

### Requirement: Support invocation and communication boundary

Support MUST be invoked automatically after each valid checkpoint and MUST be invocable on demand by Main. It SHALL return one ranked primary proposal plus explicit alternatives and MUST be read-only. Support MUST execute as a native subagent Main spawns inside its own session: it MUST NOT register with the Tower, hold a lock, or possess any channel to a Worker, and it MUST read current bytes on each invocation rather than carrying context between them. Support MAY communicate with Main only; direct Support-to-Worker communication, worker selection, and dispatch are forbidden. The host MUST provide isolated-context subagent delegation returning structured output; a host without it MUST refuse autonomous continuation rather than substitute an inline path.

#### Scenario: Support holds no Tower identity

- GIVEN Support has produced a proposal
- WHEN the Tower board and lock table are read
- THEN Support appears in neither, and no lock transfer can name it

#### Scenario: Host lacks subagent delegation

- GIVEN a host that cannot spawn an isolated-context subagent returning structured output
- WHEN autonomous continuation starts
- THEN it is refused with the missing capability named, manual Tower operation stays available, and no inline substitute runs

#### Scenario: Primary and alternatives

- GIVEN multiple eligible continuations are visible
- WHEN Support is invoked
- THEN it returns one ranked primary, alternatives with reasons, and the evidence/contract bindings for each

#### Scenario: Degraded or stale evidence

- GIVEN checkpoint, manifest, registry, runtime, or capability evidence is stale or unavailable
- WHEN Support is invoked
- THEN it returns no executable proposal, identifies the degraded input, and requests reconciliation or human review

### Requirement: Policy eligibility and denial handling

Policy MUST evaluate approved intent/Jornada and bound evidence for allow/deny eligibility, but MUST NOT route or dispatch. An allow permits automatic Main dispatch only within the approved Jornada. A denial MUST block dispatch, explain the decision, and MAY include an evidence-backed alternative; Support MUST validate that alternative and a human MUST decide whether to adopt it.

#### Scenario: Allow inside Jornada

- GIVEN Policy allows the exact proposal and the Jornada is active, unexpired, and within limits
- WHEN Main receives the eligibility result
- THEN Main may dispatch the exact bound assignment and no other scope

#### Scenario: Denial with alternative

- GIVEN Policy denies the primary proposal and Support drafts an evidence-backed alternative
- WHEN Support validates it
- THEN dispatch remains blocked until a human approves the alternative, after which Main alone may dispatch

### Requirement: Bounded planning and predecessor integration

Continuation MUST plan no more Sesiones ahead than the project's declared delivery policy permits, defaulting to two when unresolved. A dependent Sesión MUST wait for the predecessor's integrated base and fresh reconciliation. Expansion beyond the approved Jornada, material or ambiguous drift, exceptions, irreversible actions, and denial alternatives MUST stop for a human gate. Merge MUST stop for the authorizing party the delivery policy resolves, defaulting to a human.

#### Scenario: Dependent continuation waits

- GIVEN the next proposed Sesión depends on a predecessor not yet integrated
- WHEN continuation reaches assignment
- THEN Main does not assign it and reports the predecessor fence

#### Scenario: Jornada expansion

- GIVEN a proposal would exceed approved Jornada scope or limits
- WHEN Policy evaluates it
- THEN eligibility is denied and human approval is required for any expansion

### Requirement: Next-unit derivation and Worker claim

Derivation MUST read the ordered unit enumeration from the plan document, whose content is written at planning time and verified by digest, and the fulfilment state from the immutable Tower delivery ledger. Narrative memory MUST NOT be an authority for derivation, because it is upsert-keyed and not content-addressed against repository state. Derivation MUST remain correct when the plan document has not changed since the last session close, since project policy MAY close a unit without updating documentation.

A Worker MAY report the next step it read from the plan. That report is a claim, never an assignment. Main MUST derive the next unit independently and compare. Agreement MUST raise no privilege beyond confirming the derived result; disagreement MUST fail closed with both values named, because it indicates an ambiguous plan or one moved during execution.

#### Scenario: Module closed without documentation update

- GIVEN a unit was closed under a policy whose close depth does not update the plan document
- WHEN Main derives the next unit
- THEN the enumeration comes from the unchanged plan document, fulfilment from the ledger, and derivation succeeds

#### Scenario: Worker claim agrees

- GIVEN a Worker reports a next step matching the independently derived unit
- WHEN Main compares them
- THEN the derived unit proceeds and the agreement is recorded as evidence

#### Scenario: Worker claim disagrees

- GIVEN a Worker reports a next step differing from the independently derived unit
- WHEN Main compares them
- THEN continuation fails closed, no assignment is created, and both the claimed and derived units are named

#### Scenario: Narrative memory is not authority

- GIVEN narrative memory records a unit as complete but the ledger holds no fulfilment for it
- WHEN Main derives the next unit
- THEN the ledger governs and the unit is not treated as fulfilled

### Requirement: Migration and rollback continuity

Enabling this continuation MUST preserve completed Sesiones, existing checkpoint/delivery contracts, and historical evidence. If role routing is disabled or invalid, Main MUST stop new assignments, retain evidence, and return to manual V2 continuation without rewriting prior state.

#### Scenario: Manual fallback

- GIVEN registry or routing validation fails during migration or runtime
- WHEN Main disables automatic continuation
- THEN completed state and pending evidence remain readable and new work requires the existing manual gates
