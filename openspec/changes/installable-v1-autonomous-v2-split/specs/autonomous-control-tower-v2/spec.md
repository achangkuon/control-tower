# Autonomous Control Tower V2 Specification

## Purpose

Define the autonomous product lane formerly described as broad V1. V2 consumes stable Installable V1 contracts and preserves the approved A–I and P6–P11 work without relabeling historical artifacts in place.

## Requirements

### Requirement: Explicit V1 dependency and revisioned mapping

V2 MUST declare dependencies on released V1 install, enrollment, workspace, host-integration, diagnostics, and authority contracts before enabling autonomous behavior. Every A–I and P6–P11 input MUST map to a revisioned V2 capability with preserved source references; V1-only boundaries MUST remain non-goals of V1.

#### Scenario: V2 consumes a stable V1 contract

- GIVEN the referenced V1 contract is released and its diagnostics pass
- WHEN a V2 capability is enabled
- THEN it resolves the exact V1 revision before provisioning or continuation

#### Scenario: Missing or changed dependency blocks autonomy

- GIVEN a V1 dependency is absent, incompatible, or unreleased
- WHEN V2 attempts to start
- THEN it blocks autonomous execution and identifies the unmet contract without mutating V1 state

### Requirement: Bounded autonomous orchestration

V2 MAY automate provisioning, jornadas, continuation, host failover, campaigns, and delivery only within separately authorized V2 contracts. It MUST NOT make those behaviors implicit in V1 installation, enrollment, Support, or local operation; Git mutation, merge, deployment, and multi-repository delivery MUST retain their V2 authorization and evidence boundaries.

#### Scenario: Authorized jornada runs

- GIVEN stable V1 contracts and an explicitly authorized V2 jornada
- WHEN V2 provisions the prepared scope
- THEN execution, failover, campaign, and delivery events remain bounded, attributable, and auditable

#### Scenario: V1 path cannot trigger autonomy

- GIVEN a V1 install, diagnose, enrollment, or Support action
- WHEN it is invoked without V2 enablement
- THEN no worker provisioning, jornada, failover, campaign, merge, or delivery is started

### Requirement: Amended Hermes and per-project authority

V2 MUST separate Hermes global presentation and remote intent from each project's Main authority and local Support. Hermes MAY resolve and present registered state, but it MUST NOT silently select product scope, host, worktree, fallback, or repository authority. A wake, callback, free-text message, or recommendation MUST NOT itself authorize a worker or repository mutation.

#### Scenario: Hermes presents two projects safely

- GIVEN two V1 projects and a registered Hermes identity
- WHEN Hermes displays state or routes bounded intent
- THEN project identity is explicit and Main remains authoritative for the selected project

#### Scenario: Local Support replaces remote presentation

- GIVEN Telegram/Hermes is unavailable
- WHEN Support prepares a report for Main
- THEN the report is local, read-only, non-registering, and cannot authorize autonomous work

### Requirement: Historical V1 inputs remain consumable

V2 MUST consume the old broad-V1 PRD/RFC/REQUIREMENTS, A–I, and P6–P11 artifacts through explicit revisioned mappings rather than rewriting their bytes or silently changing their acceptance meaning. V2 revisions MUST state preserved, superseded, and migrated relationships.

#### Scenario: Historical reference is unchanged

- GIVEN a V2 mapping is published for an approved historical artifact
- WHEN the historical file and its ArtifactRef are compared
- THEN historical bytes and identity remain unchanged and the new mapping explains the relationship
