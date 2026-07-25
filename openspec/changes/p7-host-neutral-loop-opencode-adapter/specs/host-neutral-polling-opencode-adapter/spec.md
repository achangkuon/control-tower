# Host-Neutral Polling and OpenCode Adapter Specification

## Purpose

Provide safe root-only continuation polling for OpenCode through a host-neutral controller, without giving lifecycle code delivery or persistence authority.

## Requirements

### Requirement: Host-Neutral Polling Boundary

The system MUST provide a host-neutral polling controller whose dependencies for non-consuming peek, wake, scheduling, cancellation, tracing, time, and configuration are supplied through ports. The controller MUST NOT depend on a host SDK, SQLite, or Control Tower core implementation. The controller and adapter MUST NOT call consuming `receive` or `claim`, open SQLite, or duplicate continuation-domain policy.

#### Scenario: Controller receives an available descriptor

- GIVEN a bound, live root and a non-consuming peek that reports a pending descriptor
- WHEN the controller processes an eligible poll tick
- THEN it MAY request a host wake without consuming or claiming the descriptor

### Requirement: Immutable Proven Root Lifecycle

The controller MUST bind exactly one proven root identity. Missing, ambiguous, child, or conflicting lifecycle metadata MUST fail closed and MUST NOT start, stop, or replace polling. Polling MUST start or resume only after a proven bound root reaches a settled or idle lifecycle state.

#### Scenario: CT-R5-S1 Child deletion preserves polling

- GIVEN a live bound root, child, and pending handoff
- WHEN the child is deleted
- THEN root polling continues and the handoff remains pending

#### Scenario: CT-R5-S3 Child creation is ignored

- GIVEN a live bound root is polling with a pending handoff
- WHEN a child session is created
- THEN root polling is unchanged and the handoff remains pending

#### Scenario: CT-R5-S4 Child idle is ignored

- GIVEN a live bound root and child with root polling active
- WHEN the child becomes idle
- THEN root polling continues and no delivery is woken or consumed

#### Scenario: Ambiguous identity fails closed

- GIVEN no root is bound or an event conflicts with the bound root identity
- WHEN the adapter receives the event
- THEN polling state remains unchanged and no peek or wake occurs

### Requirement: Polling and Wake Safety

The controller MUST evaluate its throttle gate before each peek; a throttled tick MUST NOT access continuation or legacy storage. At most one wake MAY be in flight. Every wake attempt that passes the throttle gate, including a rejected host wake, MUST count toward bounded retry or polling policy. A wake failure MUST be traced, clear its in-flight state, preserve the descriptor as pending, and permit only bounded controller-owned retry or polling.

#### Scenario: Throttle prevents storage access

- GIVEN a live bound root and an active throttle window
- WHEN a scheduled poll tick runs
- THEN no peek occurs and no wake is requested

#### Scenario: Rejected wake preserves pending delivery

- GIVEN an eligible tick observes a pending descriptor
- WHEN the host wake rejects
- THEN the descriptor remains pending, no delivery is consumed or claimed, and any subsequent retry remains bounded

#### Scenario: Concurrent ticks serialize wake

- GIVEN a wake is in flight for a bound root
- WHEN another eligible poll tick runs
- THEN it does not request another wake until the in-flight wake settles

### Requirement: Synchronous Disposal Invalidation

Disposal of the proven root or the plugin MUST synchronously and idempotently invalidate the controller before scheduling cancellation or asynchronous cleanup. Callbacks queued or completed after invalidation MUST no-op and MUST NOT peek, wake, receive, or claim.

#### Scenario: CT-R5-S2 Root deletion stops polling

- GIVEN a root session is polling
- WHEN the root is deleted or disposed
- THEN polling stops before wake or receive and no delivery is consumed

#### Scenario: CT-R5-S5 Root disposal stops before receive

- GIVEN a root is disposed while a poll wake or receive could occur
- WHEN disposal is processed
- THEN polling stops before wake or receive and no child or root event consumes a delivery

#### Scenario: Stale callback is inert

- GIVEN a poll callback was queued before controller invalidation
- WHEN the callback runs after invalidation
- THEN it performs no peek, wake, receive, or claim

### Requirement: OpenCode Lifecycle Adapter

The OpenCode adapter MUST treat host events solely as lifecycle signals. It MUST distinguish proven root events from child events, map an approved controller wake request only to `client.session.promptAsync` for the bound root, and keep OpenCode-specific event and payload mapping outside the controller. The OpenCode conformance contract MUST retain stable CT-R5-S1 through CT-R5-S5 scenario identifiers and be reusable by later host adapters without adding OpenCode semantics to the controller.

#### Scenario: Root idle wakes through OpenCode

- GIVEN a proven bound root reaches an eligible idle state and the controller requests a wake
- WHEN the adapter handles the wake request
- THEN it invokes `client.session.promptAsync` for that bound root only

### Requirement: Transient P7 Scope and Reconciliation Gate

The baseline P7 behavior MUST keep polling state transient and MUST NOT persist a polling or quiescence witness. It MUST NOT modify Migration 005, its checksum, the schema-5 manifest, or the P6 worktree. A persisted witness MUST require a separately approved additive migration. P7 implementation MUST remain blocked until post-P6 reconciliation records compatible continuation transport, schema constraints, lifecycle metadata, wake payload, compatibility requirements, and the decision that transient polling is sufficient.

#### Scenario: Reconciliation remains unresolved

- GIVEN the required post-P6 reconciliation has not been recorded or contains unresolved decision gaps
- WHEN implementation of P7 is considered
- THEN implementation MUST remain blocked and no P7 change is applied
