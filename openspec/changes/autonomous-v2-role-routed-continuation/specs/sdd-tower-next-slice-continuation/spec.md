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

Support MUST be invoked automatically after each valid checkpoint and MUST be invocable on demand by Main. It SHALL return one ranked primary proposal plus explicit alternatives and MUST be read-only. Support MAY communicate with Main only; direct Support-to-Worker communication, worker selection, and dispatch are forbidden.

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

Continuation MUST plan no more than two Sesiones ahead. A dependent Sesión MUST wait for the predecessor's integrated base and fresh reconciliation. Expansion beyond the approved Jornada, material or ambiguous drift, exceptions, irreversible actions, denial alternatives, and every merge MUST stop for a human gate.

#### Scenario: Dependent continuation waits

- GIVEN the next proposed Sesión depends on a predecessor not yet integrated
- WHEN continuation reaches assignment
- THEN Main does not assign it and reports the predecessor fence

#### Scenario: Jornada expansion

- GIVEN a proposal would exceed approved Jornada scope or limits
- WHEN Policy evaluates it
- THEN eligibility is denied and human approval is required for any expansion

### Requirement: Migration and rollback continuity

Enabling this continuation MUST preserve completed Sesiones, existing checkpoint/delivery contracts, and historical evidence. If role routing is disabled or invalid, Main MUST stop new assignments, retain evidence, and return to manual V2 continuation without rewriting prior state.

#### Scenario: Manual fallback

- GIVEN registry or routing validation fails during migration or runtime
- WHEN Main disables automatic continuation
- THEN completed state and pending evidence remain readable and new work requires the existing manual gates
