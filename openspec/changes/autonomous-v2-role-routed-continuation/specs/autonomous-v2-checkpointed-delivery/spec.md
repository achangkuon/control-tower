# Delta for Autonomous V2 Checkpointed Delivery

## MODIFIED Requirements

### Requirement: Policy ownership

System MUST apply global safety floors, project Policy/Jornada snapshots, and bounded user-authorized exceptions. Tower MUST consume opaque refs. Safety floors are non-negotiable: no project policy, Jornada snapshot, or user-authorized exception MAY relax no-early-mutation, candidate immutability after freeze, or the append-only candidate ledger.
(Previously: one sentence bound the no-early-mutation safety floor and the no-automatic-merge delivery policy under a single exception clause, making merge authorization non-configurable per project.)

#### Scenario: Policy exception

- GIVEN a Jornada's global policy revision
- WHEN Main records a bounded user-authorized exception
- THEN the candidate binds its revision/evidence without relaxing any safety floor

#### Scenario: Exception cannot reach a floor

- GIVEN a bounded exception that would permit a remote effect before `DELIVERY_READY`
- WHEN Main evaluates it
- THEN it is rejected as a floor violation, no effect occurs, and the rejected floor is named

### Requirement: Candidate identity

One Sesión MUST equal one reviewable unit whose shape is resolved from the project's declared delivery policy; `slice_id` remains product identity. Immutable `candidate_revision` MUST freeze project/plan/Sesión/artifact identity, base/result/tree/commit/head/target, assignment, Main-issued role/capability binding, `host_epoch`, Policy/Jornada, delivery-policy, manifest and registry revisions, verification digest, and required checks/reviews.
(Previously: candidate identity equated a Sesión with one reviewable PR and froze delivery and policy inputs but not role/capability, delivery-policy, manifest, or registry bindings. The pull request is one delivery shape among several, not the definition of a reviewable unit.)

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

Planning MAY prepare at most as many Sesiones ahead as the project's declared delivery policy permits, defaulting to two when the policy is absent or does not declare a ceiling. The ceiling MUST be bound to the candidate by revision and digest. The system MUST reject work beyond the resolved ceiling. Dependent execution and delivery MUST wait for the predecessor's integrated base, fresh reconciliation, and current role/capability bindings.
(Previously: the ceiling was fixed at two as a product invariant, and the integrated-base fence did not name role-routed bindings. The depth a project plans ahead is a risk preference; rejecting work beyond the resolved ceiling remains a safety floor.)

#### Scenario: Horizon ceiling

- GIVEN the resolved ceiling of planned future Sesiones is reached
- WHEN another is proposed
- THEN it is rejected beyond the ceiling and no assignment is created

#### Scenario: Undeclared ceiling

- GIVEN a delivery policy that is absent or declares no ceiling
- WHEN planning depth is evaluated
- THEN the ceiling resolves to two and the unresolved policy is named

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

### Requirement: Delivery and merge

System MUST create the automatic final local commit, verify its exact commit/tree, then freeze the candidate with commit/head SHA. Only then MAY any remote effect proceed. Remote delivery MUST be idempotent and MUST take the shape resolved from the project's declared delivery policy, including whether a pull request is opened or updated and whether delivery pushes directly to the target branch. Unknown results MUST reconcile read-only before retry. Merge authorization is governed by the Merge authorization requirement and MUST NOT be inferred from the delivery shape.
(Previously: one requirement bound the commit/verify/freeze ordering floor, mandatory pull-request delivery, and a blanket prohibition on automatic merge. Ordering remains a floor; delivery shape and merge authorization are project policy.)

#### Scenario: Unknown result

- GIVEN an unknown remote delivery result
- WHEN delivery retries
- THEN it reconciles read-only first and never duplicates the effect

#### Scenario: Ordering floor

- GIVEN a candidate whose commit/tree is not yet verified and frozen
- WHEN any remote effect is requested
- THEN it is denied, no remote change occurs, and the unmet ordering step is named

#### Scenario: Delivery shape follows policy

- GIVEN a project delivery policy bound to the candidate by revision and digest
- WHEN delivery publishes
- THEN it takes the shape that policy declares, and no other shape satisfies delivery

## ADDED Requirements

### Requirement: Merge authorization

Every merge MUST carry an explicit authorization bound to the immutable candidate and current ledger. The authorizing party MUST be resolved from the project's declared delivery policy, bound to the candidate by revision and digest. Absent, unparseable, or unbound policy MUST fail closed to human authorization. V2 MAY automate preparation and delivery within an approved Jornada; it MUST NOT merge without a resolved, current authorization.

#### Scenario: Missing merge authorization

- GIVEN a delivered candidate with complete automated checks
- WHEN merge is requested without a current authorization for the resolved authorizing party
- THEN merge is denied and the candidate remains unchanged

#### Scenario: Policy resolves the authorizing party

- GIVEN a project delivery policy bound to the candidate by revision and digest
- WHEN merge authorization is evaluated
- THEN the party named by that policy authorizes, and no other party's authorization satisfies the gate

#### Scenario: Unresolved policy falls back to human

- GIVEN a project delivery policy that is absent, unparseable, or not bound to the candidate
- WHEN merge authorization is evaluated
- THEN the gate requires explicit human authorization and names the unresolved policy
