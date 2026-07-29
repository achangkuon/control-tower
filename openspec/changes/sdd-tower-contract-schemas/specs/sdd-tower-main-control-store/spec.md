# SDD Tower Main Control Store Specification

## Purpose

Evidence and authority records.

## Requirements

### Requirement: Main records are atomic and immutable

The store MUST provide owner-only primitives for immutable Reports, authorizations, campaigns, and audit records. It MUST retain revisions/evidence, use safe permissions, and never persist credentials. Failed writes preserve prior records.

#### Scenario: Failed write

- GIVEN a committed report
- WHEN its next write fails
- THEN the original remains readable and unchanged.

### Requirement: Exact authority is terminal

Only Main MAY create or consume records. Maintainer approval MUST bind project/revision, plan, jornada, target, SHAs, checks, and expiry. Authorizations MUST leave `PENDING` once, never reopen, and audit effects. Hermes presents but MUST NOT write/direct; Support advises; campaign leaders cannot claim another project’s authority; delivery belongs to Main.

#### Scenario: Replay or foreign request

- GIVEN a consumed authorization or foreign-project campaign request
- WHEN a mutation arrives
- THEN it returns an auth/project error and repeats nothing.

### Requirement: Store use does not activate semantics

Store operations MUST NOT launch hosts, mutate production, or activate Tower. Tower MAY retain opaque refs, digests, mechanical status, and audit links, but MUST NOT interpret Plan, Policy, or OpenSpec semantics.

#### Scenario: Persistence while disarmed

- GIVEN Tower is OFF
- WHEN a report or campaign is persisted
- THEN only evidence changes and no worker or session starts.
