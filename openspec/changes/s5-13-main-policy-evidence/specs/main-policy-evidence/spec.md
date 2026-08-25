# Main Policy Evidence Specification

## Purpose

Establish a Main-owned, read-only evidence route that uses trusted project authority and the S5.6 canonical parser to let Policy evaluate continuation eligibility while retaining dispatch exclusively in Main.

## Requirements

### Requirement: Main Establishes Trusted Evidence Before I/O

Main MUST prove its constructor-bound evidence capability before any evidence I/O. It MUST resolve exactly one trusted registry project entry and derive the exact safe roadmap Plan path from that authority. Absent, ambiguous, stale, foreign, cross-project, or unsafe project evidence MUST fail closed. Request callers MUST NOT supply or override the project, repository root, Plan path, raw bytes, digest, parser, provider callback, or any authority fact.

#### Scenario: Trusted project evidence is acquired

- GIVEN Main has a valid constructor-bound capability and one trusted, safe project entry
- WHEN Main starts an evidence operation
- THEN it proves the capability before I/O and derives the Plan path only from that trusted entry

#### Scenario: Trusted evidence is not uniquely safe

- GIVEN project evidence is absent, ambiguous, stale, foreign, cross-project, or unsafe
- WHEN Main starts an evidence operation
- THEN the operation MUST fail closed before snapshot creation and MUST perform zero dispatches

#### Scenario: A caller supplies an authority fact

- GIVEN a request contains a project, root, path, bytes, digest, parser, provider callback, or authority fact
- WHEN Main starts the evidence operation
- THEN Main MUST NOT use that request value as evidence authority

### Requirement: Canonical Snapshot Evidence Uses One Read and S5.6 Only

After trusted capability and path resolution, Main MUST perform exactly one raw-byte read for an operation. Every requested target snapshot MUST derive from those same bytes. S5.6 MUST be the sole parser and canonical validator for every target snapshot, and every resulting snapshot MUST retain the canonical digest derived from those bytes. The route MUST NOT use a fallback re-read, alternate parser, caller-provided digest, or per-target byte source.

#### Scenario: Multiple target snapshots are requested

- GIVEN Main has derived a safe Plan path and multiple target snapshots are required
- WHEN it acquires Plan evidence
- THEN it MUST read raw bytes once, submit those bytes to S5.6 for every target, and retain one shared canonical digest

#### Scenario: Canonicalization cannot validate the bytes

- GIVEN the single raw-byte read cannot be canonically parsed or validated by S5.6
- WHEN Main requests target snapshots
- THEN the operation MUST fail closed and MUST NOT substitute another parser or read the Plan again

### Requirement: Revision Facts Remain Independent

The evidence route, canonical snapshots, Policy evaluation, and diagnostics MUST preserve `binding.revision`, `registry_revision`, and `registry_entry_revision` as separate facts. The system MUST NOT equate, substitute, alias, or use one revision fact in place of another.

#### Scenario: Revision evidence reaches Policy

- GIVEN Main has acquired canonical evidence for a trusted project
- WHEN it supplies that evidence to Policy
- THEN each of the three revision facts MUST remain independently identifiable and validated

### Requirement: Policy Evaluates Canonical Evidence Without Authority or Dispatch

Policy MUST evaluate canonical evidence and MUST bind the expected blocked and candidate session IDs and their declared semantics. Policy MUST reject malformed, ambiguous, stale, or foreign canonical evidence. Policy MUST NOT read a Plan, resolve registry or Main authority, acquire evidence, assign work, or dispatch.

#### Scenario: Canonical evidence matches the declared sessions and semantics

- GIVEN Policy receives valid canonical evidence with the expected blocked and candidate session IDs and declared semantics
- WHEN it evaluates eligibility
- THEN it MUST return an admissible decision without acquiring evidence, assigning work, or dispatching

#### Scenario: Canonical evidence is invalid or does not bind the expected sessions

- GIVEN Policy receives malformed, ambiguous, stale, foreign, or mismatched canonical evidence
- WHEN it evaluates eligibility
- THEN it MUST reject the evidence and MUST perform zero acquisition, assignment, or dispatch actions

### Requirement: Main Is the Sole Dispatch Owner

Main MUST execute the continuation sequence in exactly this order: `reconcile → Support → Policy → Main dispatch`. Support MUST preserve its existing read-only role and MUST NOT become an evidence owner or dispatch owner. Main MUST dispatch only when Policy returns an admissible decision with an eligible candidate. A `DENY`, `STOP`, rejection, or absence of an eligible candidate MUST result in zero dispatches.

#### Scenario: An admissible candidate is available

- GIVEN reconcile and Support complete successfully and Policy returns an admissible decision with an eligible candidate
- WHEN Main completes the sequence
- THEN Main alone MUST dispatch after Policy

#### Scenario: Continuation is denied, stopped, rejected, or has no candidate

- GIVEN reconcile and Support have run and Policy returns `DENY`, `STOP`, a rejection, or no eligible candidate
- WHEN Main completes the sequence
- THEN the operation MUST produce zero dispatches

### Requirement: Acquisition and Evaluation Are Read-Only

Main evidence acquisition, S5.6 canonicalization, Support participation, and Policy evaluation MUST be read-only. The route MUST NOT mutate the Plan, registry, store, DB, Support state, runtime state, or any persistent evidence source. The eventual implementation MUST provide byte and state witnesses for both admissible and rejected outcomes.

#### Scenario: An admissible route completes

- GIVEN trusted evidence is acquired and Policy returns an admissible decision
- WHEN the route completes through evaluation
- THEN byte and state witnesses MUST show no mutation by acquisition or evaluation

#### Scenario: A route fails closed

- GIVEN the route fails at capability, trusted resolution, canonicalization, or Policy evaluation
- WHEN the failure is reported
- THEN byte and state witnesses MUST show no mutation by acquisition or evaluation

### Requirement: Scope, Integration, and Parked Work Remain Bounded

The eventual change MUST modify only `continuation/main-policy-evidence.mjs`, `policy/jornada.mjs`, and their focused tests, except that `continuation/integrated-base.mjs` and its focused test MAY change only when design proves the current callback payload cannot carry the required result without weakening the authority boundary. The default MUST preserve `continuation/integrated-base.mjs` unchanged. The eventual direct-commit unit MUST NOT exceed 400 authored additions plus deletions. The route MUST NOT introduce enrollment, plugin, host transport, provider transport, a second parser, a new authority store, dynamic assignment, delivery behavior, or another public dispatch owner.

#### Scenario: Design evaluates integrated-base participation

- GIVEN design evaluates whether the existing integrated-base callback payload can carry the Main-owned result
- WHEN the payload is sufficient
- THEN the implementation MUST leave `continuation/integrated-base.mjs` unchanged

#### Scenario: The implementation forecast exceeds the hard cap

- GIVEN refined design or task planning forecasts more than 400 authored additions plus deletions
- WHEN implementation planning is reviewed
- THEN implementation MUST stop and replan before source mutation

#### Scenario: Parked S5.5 identities are checked

- GIVEN the eventual change is prepared or verified
- WHEN its scope and rollback boundary are evaluated
- THEN parked candidate `d2c014754b914aeab253f275bf0ce116b22d25e95ec62041abf1b51eba0cc9e3` and patch `f5f344624257dc7140afb8cecb84dafa715a28985e742c70818fae5aebb73c75`, including their five `escalation/**` and test paths, MUST remain byte-identical and outside this change

### Requirement: Production Provider Adoption Remains Separate

This change MUST consume only already-provided `authority + capability`. It MUST NOT create, enroll, discover, serialize, transport, install, or otherwise claim production injection of `trustedBindingProvider`. The unresolved production-provider adoption caveat MUST remain assigned to S7.1 release/pilot evidence and MUST NOT block S5.13 acceptance.

#### Scenario: S5.13 is verified without production provider adoption

- GIVEN S5.13 has canonical Main evidence and Policy evaluation using already-provided authority and capability
- WHEN its acceptance is evaluated
- THEN it MUST NOT claim production provider adoption is complete, and the separate S7.1 caveat MUST remain explicit
