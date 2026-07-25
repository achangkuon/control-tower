# Control Tower Pi Adapter Specification

## Purpose

The Pi adapter SHALL translate trusted lifecycle evidence and controller wake requests into shared host-neutral behavior. It SHALL own no continuation authority.

## Requirements

### Requirement: Proven root identity and idle settlement

The adapter MUST accept `agent_settled` only for the single proven root when `ctx.isIdle()` is true. Missing, conflicting, stale, child, or non-idle evidence MUST fail closed without changing state.

#### Scenario: Ambiguous settlement is ignored

- GIVEN settlement evidence lacks a unique root or reports a child
- WHEN the adapter receives `agent_settled`
- THEN it makes no binding, polling, wake, or delivery change

### Requirement: Root-only lifecycle handling

The adapter MUST ignore child creation, settlement, idle, shutdown, and deletion. Child activity MUST NOT stop, start, or rebind root polling.

#### Scenario: Child activity cannot affect a live root

- GIVEN a proven root is polling and a pending handoff exists
- WHEN a child is created, settles, idles, or shuts down
- THEN root polling is unchanged and the handoff stays pending

### Requirement: Exact idle-safe follow-up wake

For an eligible controller wake, the adapter MUST call `pi.sendMessage` with exactly `deliverAs: "followUp"` and `triggerTurn: true`. Wake mapping MUST NOT consume or claim the handoff.

#### Scenario: Eligible wake uses the shared contract

- GIVEN the proven root is idle and an eligible descriptor exists
- WHEN the controller requests a Pi wake
- THEN Pi receives one follow-up with both required options

### Requirement: Rejected wake preservation

If Pi rejects a wake request, its pending descriptor MUST remain available; only the controller's bounded policy MAY retry it.

#### Scenario: Rejected send is retryable

- GIVEN an eligible descriptor and a `sendMessage` rejection
- WHEN the rejection is reported
- THEN the descriptor remains pending, without claim or loss, until policy retries or disposes it

### Requirement: Synchronous terminal disposal and stale-race safety

Proven-root `session_shutdown` MUST synchronously make the adapter terminal before later wake, peek, receive, or claim activity. Stale callbacks MUST be inert and MUST NOT revive polling or wake.

#### Scenario: Shutdown wins a queued callback race

- GIVEN a root shutdown and a previously queued wake callback
- WHEN shutdown is received before callback execution
- THEN disposal completes first and the callback does nothing

### Requirement: Reload and resume idempotence

Repeated reload or resume evidence for the same proven root MUST preserve one binding and lifecycle, without duplicate polling or wakes. Child evidence MUST NOT rebind it.

#### Scenario: Resume is safely repeated

- GIVEN a root has resumed and is already managed
- WHEN equivalent resume evidence arrives again
- THEN state is unchanged and no duplicate wake is emitted

### Requirement: Shared CT-R5 conformance

Pi MUST pass the unchanged CT-R5-S1 through CT-R5-S5 fixture: child shutdown/deletion preserves polling; root shutdown stops before wake/receive; child creation/idle are ignored; and root disposal wins queued races.

#### Scenario: Pi uses the common conformance matrix

- GIVEN the shared fixture runs CT-R5-S1 through CT-R5-S5
- WHEN it is parameterized for Pi
- THEN results match other supported adapters without Pi-specific lifecycle semantics

### Requirement: Schema-neutral authority boundary

The adapter MUST NOT create or alter schema/runtime state, receive or claim, or implement continuation policy. Authority MUST enter through trusted adapter capability; event fields MUST NOT grant authority.

#### Scenario: Caller identity cannot grant authority

- GIVEN an event contains forged root, host, or continuation metadata
- WHEN the adapter processes it without trusted capability evidence
- THEN it fails closed and performs no authoritative action

### Requirement: Pre-apply reconciliation gate

Implementation MUST remain blocked until a recorded decision reconciles the merged P6 and P7 schema, dispatcher/capability, controller-port, Pi-event, wake-payload, and polling-witness contracts.

#### Scenario: Unreconciled contracts block apply

- GIVEN the P6/P7 reconciliation decision is absent or unresolved
- WHEN implementation is requested
- THEN apply does not begin and no Pi runtime or schema artifact is changed
