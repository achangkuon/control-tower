# Agent Capability Registry Specification

## Purpose

Define per-project, Main-owned capability discovery and role visibility for V2 continuation. The registry is additive and MUST NOT rewrite completed Sesiones or existing delivery/checkpoint contracts.

## ADDED Requirements

### Requirement: Main-owned, project-scoped registry

Each enrolled project MUST have one authoritative capability registry owned by that project's Main. Entries MUST identify role, capability, registry version, contract/schema version, caller identity, project identity, availability, and expiry. A registry MAY expose capability metadata, but MUST NOT grant assignment or dispatch authority.

#### Scenario: Role-visible lookup

- GIVEN an active project registry contains a Support planning capability and a Worker execution capability
- WHEN Main requests the visible capabilities for Support
- THEN only the Support-allowed capability contract is returned, bound to the project and registry version

#### Scenario: Cross-project or role mismatch

- GIVEN a capability entry belongs to another project or caller role
- WHEN lookup is requested
- THEN lookup fails closed and returns no executable capability

### Requirement: Bound and fail-closed capability resolution

Capability use MUST validate exact project and caller identity, role, registry version, contract/schema version, availability window, and expiry before invocation. Missing, stale, unavailable, malformed, or mismatched entries MUST fail closed without assignment, dispatch, registration, or repository mutation.

#### Scenario: Expired capability

- GIVEN a previously valid capability is expired or marked unavailable
- WHEN Main or Support attempts invocation
- THEN the invocation is rejected with a stale/unavailable result and no side effect occurs

#### Scenario: Deterministic schema mismatch

- GIVEN a caller presents a schema version not declared by the registry entry
- WHEN the registry resolves the capability
- THEN resolution is rejected deterministically and the decision identifies the registry and schema mismatch

### Requirement: Versioned compatibility and sole registry authority

Registry updates MUST be versioned and auditable. Main MUST reconcile registry drift before reusing a report, contract, assignment, or recovery decision. No second orchestrator, shadow registry, all-to-all channel, or worker-created registry entry MAY authorize V2 behavior.

#### Scenario: Registry drift invalidates evidence

- GIVEN a report was created under registry version R1 and the project now exposes R2
- WHEN continuation evaluates the report
- THEN the report is invalidated and Main requires fresh role-visible evidence

#### Scenario: Worker attempts self-registration

- GIVEN a Worker receives an assignment
- WHEN it attempts to register a capability or create a successor assignment
- THEN the request is denied and Main remains the only assignment authority
