# Delta for Autonomous V2 Checkpointed Delivery

## MODIFIED Requirements

### Requirement: Candidate identity

One Sesión MUST equal one reviewable PR; `slice_id` remains product identity. Immutable `candidate_revision` MUST freeze project/plan/Sesión/artifact identity, base/result/tree/commit/head/target, assignment, Main-issued role/capability binding, `host_epoch`, Policy/Jornada, manifest and registry revisions, verification digest, and required checks/reviews.
(Previously: candidate identity froze delivery and policy inputs but not role/capability, manifest, or registry bindings.)

#### Scenario: Freeze

- GIVEN the final local commit exists and all identity, role, capability, and configuration inputs are verified
- WHEN the candidate freezes
- THEN its commit/head and bound inputs cannot be replaced

### Requirement: Successor reconciliation

Changed Git repository/ref, base, code/result/tree/commit/head, target, assignment, host epoch, Policy/Jornada, manifest, registry, capability contract, availability/expiry, runtime, verification digest, or required check/review configuration MUST invalidate the candidate. Main MUST reconcile, re-verify, and freeze a successor; appended outcomes alone MUST NOT restore validity.
(Previously: only selected delivery, policy, host, verification, and check inputs invalidated a candidate.)

#### Scenario: Deterministic stale rejection

- GIVEN any bound input differs from the frozen candidate
- WHEN the stale candidate executes, assigns, or delivers
- THEN it is rejected with the differing binding identified and no effect occurs

#### Scenario: Degraded dependency

- GIVEN a bound capability or runtime dependency becomes unavailable or expired
- WHEN continuation evaluates the candidate
- THEN it fails closed and requires a fresh successor after availability is proven

### Requirement: Planning horizon

Planning MAY prepare at most two Sesiones ahead. The system MUST reject work beyond that ceiling. Dependent execution and delivery MUST wait for the predecessor's integrated base, fresh reconciliation, and current role/capability bindings.
(Previously: the ceiling and integrated-base fence did not name role-routed bindings.)

#### Scenario: Horizon ceiling

- GIVEN two future Sesiones are planned
- WHEN another is proposed
- THEN it is rejected beyond the ceiling and no assignment is created

#### Scenario: Dependent fence

- GIVEN a dependent Sesión lacks an integrated predecessor or fresh bindings
- WHEN execution is requested
- THEN it is denied until integration and reconciliation complete

### Requirement: Pilot recovery

Recovery MUST remain fail closed and MUST permit automatic reassignment only when Main proves the exact project, base/path/mode, checkpoint, recoverability state, claimant termination, generation, and current role/capability bindings. Otherwise Main MUST escalate to a human without mutation.
(Previously: recovery fenced uncertain host ownership, stop proof, or evidence but did not enumerate continuation proof inputs.)

#### Scenario: Proven interrupted worker

- GIVEN an interrupted Worker and exact matching checkpoint, base, paths, mode, recoverability, and termination proof
- WHEN Main reconciles recovery
- THEN it may issue one fresh assignment bound to the verified successor

#### Scenario: Insufficient recovery proof

- GIVEN any proof is absent, stale, mismatched, or dependency availability is uncertain
- WHEN recovery is requested
- THEN it blocks reassignment, preserves evidence, and escalates to a human

#### Scenario: Recovery fence

- GIVEN unproven host ownership or prior effect
- WHEN recovery starts
- THEN it blocks mutation until ownership and candidate reconcile

## ADDED Requirements

### Requirement: Human merge gate

Every merge MUST require explicit human authorization bound to the immutable candidate and current ledger. V2 MAY automate preparation and delivery within an approved Jornada, but MUST NOT merge automatically.

#### Scenario: Missing merge authorization

- GIVEN a delivered candidate with complete automated checks
- WHEN merge is requested without current human authorization
- THEN merge is denied and the candidate remains unchanged
