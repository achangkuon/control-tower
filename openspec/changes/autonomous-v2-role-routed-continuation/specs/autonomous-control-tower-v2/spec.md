# Delta for Autonomous Control Tower V2

## MODIFIED Requirements

### Requirement: Explicit V1 dependency and revisioned mapping

V2 MUST declare dependencies on released V1 install, enrollment, workspace, host-integration, diagnostics, authority, and role-visible capability contracts before enabling autonomous behavior. Every A–I and P6–P11 input MUST map to a revisioned V2 capability with preserved source references; completed V1 Sesiones and V1-only boundaries MUST remain unchanged.
(Previously: V2 declared stable V1 dependencies and revisioned mappings, but did not require role-visible capability contracts or explicitly preserve completed Sesiones.)

#### Scenario: V2 consumes a stable V1 contract

- GIVEN the referenced V1 contract, registry entry, and diagnostics are released and valid
- WHEN a V2 capability is enabled
- THEN it resolves the exact revisions before provisioning or continuation

#### Scenario: Missing or changed dependency blocks autonomy

- GIVEN a V1 or capability dependency is absent, incompatible, or unreleased
- WHEN V2 attempts to start
- THEN it blocks autonomous execution, identifies the unmet contract, and does not mutate V1 state

### Requirement: Bounded autonomous orchestration

V2 MAY automate provisioning, jornadas, continuation, host failover, campaigns, and delivery only within an approved, versioned Jornada and role-routed contract. It MUST NOT make these behaviors implicit in V1, Support, or local operation. Expansion, exceptions, material drift, irreversible actions, denial alternatives, and every merge MUST remain human-gated; automatic merge is forbidden.
(Previously: V2 bounded autonomous behavior to separately authorized contracts but did not make role routing and all human gates explicit.)

#### Scenario: Authorized Jornada runs

- GIVEN stable V1 contracts, valid role capabilities, and an approved Jornada
- WHEN Main provisions the prepared scope
- THEN execution and delivery remain attributable, bounded, and auditable

#### Scenario: V1 path cannot trigger autonomy

- GIVEN a V1 install, diagnose, enrollment, or Support action without V2 enablement
- WHEN it is invoked
- THEN no worker, Jornada, failover, campaign, assignment, merge, or delivery is started

### Requirement: Amended Hermes and per-project authority

V2 MUST separate Hermes presentation from each project's Main authority and local read-only Support. Hermes MAY present registered state, but MUST NOT select scope, host, worktree, worker, fallback, or repository authority. Main alone reconciles, assigns, dispatches, and coordinates delivery. Workers MUST NOT self-assign; Support MUST NOT communicate directly with workers; no all-to-all channel or duplicate orchestrator MAY authorize work. V1 brief approval remains manual.
(Previously: Hermes could not silently select scope or authorize mutation, while Main authority and Support boundaries were not stated for role-routed continuation.)

#### Scenario: Hermes presents two projects safely

- GIVEN two V1 projects and a registered Hermes identity
- WHEN Hermes displays state or routes bounded intent
- THEN project identity is explicit and Main remains authoritative for the selected project

#### Scenario: Local Support replaces remote presentation

- GIVEN Hermes is unavailable
- WHEN Support prepares a report for Main
- THEN the report is local, read-only, non-registering, and cannot authorize autonomous work

#### Scenario: Unauthorized worker action

- GIVEN a Worker has completed its assignment
- WHEN it proposes or launches a successor without Main assignment
- THEN the action is rejected and no repository or delivery mutation occurs

### Requirement: Historical V1 inputs remain consumable

V2 MUST consume the old broad-V1 PRD/RFC/REQUIREMENTS, A–I, P6–P11, and completed delivery/checkpoint artifacts through explicit revisioned mappings rather than rewriting their bytes or silently changing their acceptance meaning. V2 revisions MUST state preserved, superseded, and migrated relationships; completed Sesiones MUST remain readable and closed.
(Previously: V2 consumed historical inputs through revisioned mappings but did not explicitly preserve completed delivery/checkpoint state or forbid reopening it.)

#### Scenario: Historical reference is unchanged

- GIVEN a V2 mapping is published for an approved historical artifact
- WHEN the historical file, ArtifactRef, and completed delivery/checkpoint state are compared
- THEN historical bytes and identity remain unchanged, the completed state remains closed, and the mapping explains the relationship
