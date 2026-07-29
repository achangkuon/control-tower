# Proposal: P7 Host-Neutral Polling Loop and OpenCode Adapter

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers. P7 means `p7-host-neutral-loop-opencode-adapter`; neither value denotes positional Plan P6 or Plan P7.

## Decision summary

Proceed provisionally with a host-neutral polling controller and a thin OpenCode lifecycle adapter. The controller will own root-session binding, non-consuming delivery peeks, throttling, wake serialization, bounded retry behavior, and synchronous disposal invalidation. The adapter will only classify OpenCode lifecycle events and invoke `client.session.promptAsync` for the proven root session.

The baseline P7 implementation will keep polling state transient and will not persist a real polling witness. Migration 005, its checksum, its schema-5 manifest, and its `UNAVAILABLE_BEFORE_P7` constraint are immutable legacy P6-owned inputs. If post-legacy-P6 reconciliation proves that a persisted witness is required, it must be proposed as a separately planned Sesión rather than folded into the loop or adapter.

Planning is complete. Apply remains blocked until the independent S1.11 `reconciliation.md` is approved against merged P6 evidence and the OpenCode integration seams. Native `apply-ready` or artifact presence does not satisfy this gate.

## Intent

Deliver the OpenCode portion of CT-R5 without coupling host lifecycle code to SQLite or continuation-domain authority. P7 should make root-only polling safe under child events, wake failures, queued callbacks, and disposal races while establishing a reusable controller contract for the later Pi and Claude adapters.

## Current-state gap

`plugin/tower-spike.js` combines host events, database access, legacy consuming receive behavior, wake orchestration, and timer lifecycle in one adapter. It can stop polling on child deletion, consume a message before a failed wake, and allow an asynchronous check to continue after disposal. It also lacks a stable, fail-closed proof of the root session.

This boundary cannot safely satisfy CT-R5 or serve as the shared lifecycle model for later host adapters.

## Scope

### In scope

- Add a host-neutral polling controller with injected `peek`, `wake`, scheduling, cancellation, tracing, and clock/configuration ports.
- Bind exactly one proven root session and reject or ignore ambiguous, missing, or conflicting root identity without replacing the binding.
- Start or resume polling only from a proven root settled/idle event.
- Check throttling before any non-consuming peek.
- Serialize wake attempts and count attempts that pass the throttle gate, including rejected host wakes.
- Preserve pending continuation delivery after wake failure and resume only through a bounded controller-owned retry or polling policy.
- Invalidate the controller synchronously and idempotently before timer cancellation or asynchronous host cleanup; stale callbacks must no-op.
- Refactor the OpenCode plugin into a thin lifecycle adapter that distinguishes root and child events and maps controller wake requests to `client.session.promptAsync`.
- Prove CT-R5-S1 through CT-R5-S5 for OpenCode, plus wake rejection, throttle-before-peek, wake serialization, and pending-delivery preservation.
- Use deterministic fake time/scheduling for controller tests and establish a reusable host-adapter conformance fixture for P8 and P9.
- Preserve existing OFF/fail-closed and legacy behavior unless an explicit, reconciled compatibility requirement says otherwise.

### Out of scope

- Editing, widening, rebuilding, or replacing P6 Migration 005, its checksum, schema-5 manifest, or polling-witness constraint.
- Persisting a real polling/quiescence witness in the baseline P7 loop and adapter slice.
- SQLite access, continuation authority, delivery claim/receive, or domain policy inside the controller or OpenCode adapter.
- Pi or Claude adapters and their conformance runs.
- Runtime publication, installation, host configuration, release cutover, or deployment owned by P10.
- Actual Control Tower activation, delivery, runtime database mutation, or production-state changes.
- Dashboard, Telegram, Servi-Task-U policy, work discovery, ownership, launching, or single-Sesión policy.
- Broad refactoring of legacy fail-closed behavior or invention of a second public continuation API.
- Changes in the parallel P6 worktree or rewrites of the parent change artifacts.

## Behavioral boundaries

| Boundary | Decision |
|---|---|
| Root identity | One immutable, proven root is bound. Child, unknown, ambiguous, or conflicting events cannot start, stop, or rebind polling. |
| Delivery access | `peek` is non-consuming. The controller and adapter never call consuming `receive` or `claim`. |
| Throttling | The throttle gate runs before `peek`; throttled ticks do not touch continuation or legacy storage. |
| Wake concurrency | At most one wake is in flight. Additional ticks no-op until it settles. |
| Wake failure | Failure is traced, the in-flight state is cleared, the descriptor remains pending, and retries stay bounded. |
| Disposal | Disposal marks the lifecycle stale synchronously, then cancels scheduling. Later callbacks cannot peek, wake, receive, or claim. |
| Adapter authority | OpenCode events supply lifecycle signals, not domain authority. The adapter only maps verified events and calls `promptAsync`. |
| Persistence | The baseline P7 slice is transient. Any real witness requires a separately approved additive migration after P6 reconciliation. |

## Approach

Create `host/loop.mjs` as an injected-port state machine with no OpenCode SDK, SQLite, or core imports. Its public names may be finalized by RED tests, but its ordering and ownership rules are fixed by this proposal.

Refactor `plugin/tower-spike.js` around that controller. The adapter will classify root versus child lifecycle events, dispose synchronously on proven root deletion or plugin disposal, and implement the host wake port with `client.session.promptAsync`. Child creation, child idle, and child deletion will not alter controller lifecycle.

Keep the transport that supplies a continuation-aware non-consuming `peek` and the exact wake payload explicit in design. Neither may cause the adapter to fetch, consume, acknowledge, or derive authority over a domain delivery.

Implementation should remain reviewable as S1.13–S1.16: controller/state-machine coverage, OpenCode mapping coverage, and only then any reconciled compatibility hardening. A persisted-witness migration is not part of those Sesiones.

## Affected areas

| Area | Expected impact |
|---|---|
| `host/loop.mjs` | New host-neutral polling and disposal state machine. |
| `plugin/tower-spike.js` | Reduced to OpenCode lifecycle classification and `promptAsync` mapping. |
| `test/polling.test.mjs` | Deterministic CT-R5 controller, race, throttle, retry, and pending-preservation coverage. |
| `test/host-adapters.test.mjs` | OpenCode conformance mapping with a fixture shape reusable by later hosts. |
| Existing fail-closed tests | Regression evidence only; no P7-led redesign. |
| `core.mjs`, `mcp.mjs`, migration tests | Reconciliation inputs, not baseline P7 edit targets. Any required change needs separate approval after P6 merges. |
| Parallel P6 worktree | Read-only dependency. P7 must not edit `/home/emili/projects/control-tower/Worktrees/tower-implementation`. |

## Dependencies and apply gate

P7 depends only on the merged P6 continuation and schema work; it has no Change A dependency. It participates in both integrated paths, `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`, without adding an A→P7/P8 edge. Before any apply or implementation begins, the team must consume the approved S1.11 record and verify that it reconciles:

- the merged schema version, Migration 005 bytes/checksum, schema manifest, and exact `UNAVAILABLE_BEFORE_P7` constraint;
- accepted `bootstrapAdmin` transitions and failure/retry behavior;
- actual continuation status, non-consuming receive/peek, claim, dispatcher, and capability signatures;
- any polling tables, routes, names, or tests added or reserved by P6;
- the trusted transport available to the OpenCode adapter without importing `core.mjs` or duplicating SQLite/domain logic;
- supported OpenCode root/session event fields, `parentID` behavior, deletion semantics, and fail-closed handling for incomplete metadata;
- the exact generic or opaque wake payload sent through `promptAsync`;
- whether legacy queue compatibility remains required and where it can live without consuming before a successful wake;
- whether transient polling is sufficient or a separate persisted-witness proposal is required.

Until the separate P7 record is approved and its decision gaps are resolved, `sdd-apply` is blocked even if proposal, specs, design, tasks, or native status say ready. P7 does not create, retire, recycle, or branch-switch worktrees and does not own host launch, inspect, stop, health, heartbeat, stop proof, session naming, `host_epoch`, or failover. Workspace Manager owns worktree lifecycle. Main owns `host_epoch` issuance and fencing authority; Change E owns launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, and exclusive failover.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| P7 assumes an unmerged P6 API or schema | Keep planning provisional and enforce the post-P6 reconciliation gate before apply. |
| Child lifecycle events stop or restart root polling | Bind one immutable root and contract-test every CT-R5 child/root event distinction. |
| A failed wake loses a pending delivery | Require non-consuming peek and forbid receive/claim in lifecycle callbacks; retry only through bounded controller policy. |
| Disposal races with queued or in-flight callbacks | Mark disposed/generation state synchronously before cancellation or cleanup; stale callbacks no-op. |
| Broken host wake causes a retry storm | Apply throttle before peek, count failed wake attempts, serialize wakes, and use bounded retry/backoff. |
| Host-specific details leak into the shared controller | Use injected ports and keep OpenCode event/payload mapping in the adapter. |
| Root identity is incomplete or spoofable | Fail closed on missing, ambiguous, or conflicting lifecycle metadata and never derive domain authority from events. |
| Legacy/OFF behavior regresses during adapter replacement | Keep compatibility explicit, run existing fail-closed regressions, and avoid core or migration edits in the baseline slice. |
| P7 conflicts with active P6 work | Treat P6-owned core, MCP, migration, and worktree files as read-only until merge and reconciliation. |
| Persistence scope expands into Migration 005 | Exclude witness persistence by default; require a separate additive, checksummed migration proposal if later justified. |

## Rollback plan

P7 does not publish or cut over a runtime. The host-neutral controller and OpenCode adapter changes must remain independently revertible to the pre-P7 plugin behavior while leaving P6 schema and continuation authority untouched. Because the baseline slice adds no persistent witness schema and performs no runtime-state migration, rollback requires no database downgrade.

If compatibility hardening is needed, keep it in a separate Sesión so it can be reverted without removing the controller contract. If a future persisted-witness migration is approved, it must define its own forward-safe rollback or disablement plan and must never roll back by editing Migration 005.

## Success criteria

- [ ] OpenCode passes CT-R5-S1 through CT-R5-S5 with stable scenario IDs.
- [ ] Child creation, child idle, and child deletion do not start, stop, or change root polling and do not consume pending delivery.
- [ ] Proven root deletion and plugin disposal synchronously prevent all later peek, wake, receive, or claim activity, including stale queued callbacks.
- [ ] Throttling occurs before peek, wake calls are serialized, retry behavior is bounded, and failed wakes leave delivery pending.
- [ ] `host/loop.mjs` imports no host SDK, SQLite module, or Control Tower core implementation.
- [ ] The OpenCode adapter does not open SQLite, call consuming legacy receive, claim delivery, or duplicate continuation-domain rules.
- [ ] Root identity remains immutable and ambiguous or conflicting events fail closed.
- [ ] Existing OFF/fail-closed regressions remain intact, and tests use isolated deterministic fixtures without mutating the actual Tower runtime database.
- [ ] Migration 005 and the active P6 worktree remain untouched.
- [ ] The post-P6 reconciliation gate is completed and recorded before apply begins.
- [ ] The controller and conformance fixture can be reused by P8 and P9 without OpenCode-specific controller semantics.
