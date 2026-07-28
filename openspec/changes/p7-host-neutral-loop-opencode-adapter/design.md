# Design: Host-Neutral Polling Loop and OpenCode Adapter

## Decision summary

P7 will add a transient, host-neutral polling state machine and make the OpenCode plugin a thin lifecycle and wake adapter. The controller owns one immutable root binding, one-shot scheduling, throttle-before-peek ordering, serialized wake attempts, bounded retries, and synchronous generation invalidation. The adapter owns OpenCode event classification and the `client.session.promptAsync` call. Neither layer owns SQLite, continuation transitions, delivery consumption, claims, or polling persistence.

The baseline deliberately adds no polling witness and does not edit Migration 005, its checksum, its schema-5 manifest, or `polling_witness = 'UNAVAILABLE_BEFORE_P7'`. The implementation remains blocked until merged P6 and supported OpenCode behavior satisfy the reconciliation checklist in this design.

M0 integration keeps P7 blocked until its independent `reconciliation.md` is approved. Native `apply-ready` is insufficient. P7 depends only on merged P6—not Change A—and preserves both DAG paths: `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E` with the required C→D edge.

### Integrated identity and authority boundary

The reconciliation record MUST keep `project_id`, `plan_id`, `slice_id`, `assignment_id`, `jornada_id`, `session_id`, `host_process_instance`, `plugin_instance`, and `root_session_id` distinct. Capability `binding_epoch`, Main-issued/Change-E-enforced `host_epoch`, and this controller's process-local, non-authoritative `generation` are separate values and MUST NOT be substituted for one another.

Assignment evidence pins `Worktrees/<plan>/<lane>/<slice>` inside the registered project container to an authorized base SHA, exactly `plan/<plan>/<slice>` or `feat/<plan>/<slice>`, the assignment, and the session. Workspace Manager alone owns worktree inspect/create/retire; P7 never creates, retires, recycles, or branch-switches a worktree. Change E alone owns host launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, and exclusive failover. P7 remains a substrate adapter, not product or mechanism authority.

## Scope and decision status

### Normative P7 decisions

These decisions follow from the proposal and specification and are not reopened by P6 reconciliation:

| Area | Decision |
|---|---|
| Authority boundary | Lifecycle code may request a non-consuming peek and a host wake only. It never receives authority to claim, acknowledge, consume, or mutate delivery state. |
| Root binding | The controller accepts one proven opaque root ID on a first-write-wins basis. A missing, child, unknown, or conflicting ID cannot bind, rebind, start, resume, or dispose the controller. |
| Start condition | Polling starts or resumes only from an accepted settled signal for the bound root. |
| Scheduler model | Scheduling uses one-shot callbacks. There is at most one owned timer and one asynchronous tick for a lifecycle generation. Real intervals are not used. |
| Throttle order | The wake-attempt window is evaluated before every peek. A throttled callback performs no peek or wake. |
| Wake safety | A non-null descriptor may cause a wake request, but remains unconsumed. Wake attempts are serialized and recorded before invoking the wake port, including synchronous throws and rejected promises. |
| Retry safety | An initial wake plus three deterministic retries are allowed per settled cycle. Exhaustion pauses until a later accepted root-settled signal. The global wake window also bounds attempts across cycles. |
| Successful wake | Success transitions to `AWAITING_SETTLE` with no timer. The next proven root-settled signal starts a new cycle; this avoids repeatedly waking the same still-pending descriptor before the agent can claim it. |
| Disposal | Disposal invalidates state and advances the generation synchronously before aborting work, canceling a timer, tracing, or performing host cleanup. It is idempotent. |
| Persistence | Controller state, retry counters, timer handles, generations, and throttle timestamps are process memory only. No witness is persisted. |
| Adapter boundary | OpenCode-specific event fields and prompt payloads remain outside `host/loop.mjs`. The controller has no OpenCode, SQLite, core, MCP, or filesystem import. |
| Delivery boundary | A wake prompt contains no domain payload, bearer, claim token, continuation evidence, or descriptor fields. The resumed agent uses the separately guarded continuation `receive` and `claim` routes. |

### Provisional seams requiring post-P6 reconciliation

The following are intentionally not implementation guarantees. They MUST be resolved and recorded before apply:

1. The concrete transport that implements the controller's `peek` port without importing `core.mjs` into the OpenCode adapter or opening SQLite there.
2. How the OpenCode plugin and capability-enabled MCP process share stable `host_process_instance`, `plugin_instance`, proven `root_session_id`, and committed `binding_epoch` without accepting them from request or environment authority.
3. The supported OpenCode event shapes that prove a parentless root, identify children, and identify deletion targets.
4. The exact `promptAsync` request shape supported by the pinned OpenCode version.
5. Whether the existing legacy queue waker remains required and, if so, its separately bounded non-lossy compatibility location.
6. Confirmation that P6 rollback and quiescence behavior accepts the P7 transient baseline without a persisted polling witness.

The current P7 worktree is schema-4-era code. The read-only P6 worktree currently demonstrates Migration 005 constants and the immutable `UNAVAILABLE_BEFORE_P7` constraint, while its inspected dispatcher and continuation receive surfaces still reflect the pre-merge implementation boundary. Those observations identify conflicts; they do not authorize P7 to code against the P6 worktree.

## Architecture

```text
OpenCode lifecycle event
        |
        v
OpenCode classifier ---------------------- unknown/child/conflict --> trace + no-op
        |
        | proven root bind/settled/deleted
        v
host/loop.mjs state machine
        |
        | one-shot tick
        v
clock -> throttle gate -- throttled --> schedule at exact window opening
        |
        | eligible
        v
non-consuming peek transport -- null/error --> ordinary poll scheduling
        |
        | opaque pending descriptor
        v
wake-attempt accounting -> serialized wake port
        |
        v
OpenCode promptAsync(bound root, generic prompt)
        |
        v
resumed agent uses continuation receive/claim tools

Root deletion/plugin dispose
        |
        v
synchronous generation invalidation -> abort -> timer detach/cancel -> host cleanup
```

The composition root may inject a P6-backed transport after reconciliation. The controller and OpenCode classifier do not know whether the transport is in-process, an MCP bridge, or another trusted local channel. That choice cannot weaken constructor-capability authority or expose a second public continuation API.

## Controller contract

`host/loop.mjs` will export one factory with no runtime imports beyond platform primitives:

```js
createPollingLoop({
  peek,      // async ({ rootSessionId, generation, signal }) => descriptor | null
  wake,      // async ({ rootSessionId, descriptor, generation, signal }) => void
  schedule,  // (callback, delayMs) => timerHandle; one-shot
  cancel,    // (timerHandle) => void; synchronous best effort
  trace,     // (eventName, safeAttributes) => void; best effort
  now,       // () => monotonic integer milliseconds
  policy,    // exact validated values below
})

loop.bindRoot(rootSessionId)       // boolean; first valid value wins
loop.rootSettled(rootSessionId)    // boolean; starts/resumes only exact bound root
loop.rootDeleted(rootSessionId)    // boolean; disposes only exact bound root
loop.dispose(reason)               // void; unconditional plugin-level disposal
loop.getState()                    // frozen, descriptor-free diagnostic snapshot
```

### Port contracts

| Port | Contract |
|---|---|
| `peek` | Returns an opaque descriptor or `null`. It is non-consuming and must preserve pending state. Rejection is an observation failure, not evidence of no delivery. The controller never inspects, logs, or mutates descriptor fields. |
| `wake` | Requests a host wake for the exact bound root. It may use the descriptor only as an availability witness; OpenCode ignores its domain fields. It must check `signal.aborted` immediately before the host call. Fulfillment means only that the host accepted the wake, not that a claim occurred. |
| `schedule` | Registers exactly one one-shot callback after `delayMs`. It returns an opaque handle synchronously. Test schedulers define stable FIFO ordering for equal deadlines. |
| `cancel` | Synchronously requests cancellation for one handle. A queued callback may still run; generation checks make it inert. A cancellation error cannot reverse disposal. |
| `trace` | Receives fixed event names and bounded safe metadata. Trace failures are swallowed. Raw descriptors, prompt content, tokens, request payloads, and raw host errors are forbidden. |
| `now` | Returns finite, non-negative, monotonic integer milliseconds. Regression or malformed time pauses the cycle before peek and emits `poll.clock_invalid`. |

The production transport may normalize P6's current candidate `{delivery: descriptor|null}` response to `descriptor|null`. That response shape remains provisional until P6 merges. The controller does not import or call the dispatcher itself.

### Policy

The controller validates and freezes this exact baseline policy:

```js
{
  pollIntervalMs: 2_000,
  wakeWindowMs: 5 * 60_000,
  maxWakeAttemptsPerWindow: 15,
  retryDelaysMs: [1_000, 2_000, 4_000],
}
```

The values preserve the existing 2-second poll interval and 15-wakes-per-5-minutes safety envelope while adding deterministic bounded retry. There is no jitter in P7; fake scheduling and production scheduling therefore have identical ordering. Invalid, missing, mutable, non-integer, negative, or internally inconsistent policy fails construction before a root can bind.

Wake timestamps use a sliding window. At time `T`, entries `<= T - wakeWindowMs` are pruned. If the remaining count is at the limit, the callback does not peek and schedules the next callback for exactly `oldestAttempt + wakeWindowMs - T`. The timestamp is recorded immediately before calling `wake`, so a synchronous throw and an asynchronous rejection both consume an attempt.

### Opaque root and descriptor rules

A root ID is an opaque, non-empty, NUL-free UTF-8 string within the reconciled host bound. The controller compares it byte-for-byte and never derives it from worktree, process, environment, request, or descriptor data. `bindRoot` accepts only the first valid ID. Repeating that ID is idempotent; any other ID returns `false`, traces `poll.root_conflict`, and leaves state unchanged.

A descriptor is only a non-null availability signal. The controller does not require P6 field names, compare deliveries, select a claim, construct prompt text from it, or retain it after the current asynchronous attempt. This keeps continuation schema and domain policy outside the host-neutral loop.

## State machine

### States

| State | Meaning | Owned timer | Port activity allowed |
|---|---|---:|---|
| `UNBOUND` | No proven root has been accepted. | No | None |
| `BOUND` | Root is immutable; no settled signal has started a cycle. | No | None |
| `POLLING` | A tick is scheduled or running. | At most one | `peek`; then possibly `wake` |
| `THROTTLED` | Wake window is full. | Exactly one unless scheduling failed | No `peek` or `wake` |
| `RETRY_WAIT` | A failed wake has a deterministic retry deadline. | Exactly one unless scheduling failed | No activity before deadline |
| `WAKING` | One host wake promise is in flight. | No | No second wake or peek |
| `AWAITING_SETTLE` | Host accepted a wake; wait for the root to settle again. | No | None |
| `RETRY_EXHAUSTED` | Initial attempt and three retries failed in this cycle. | No | None until a new accepted settled signal |
| `PAUSED` | Scheduler or clock failure prevented safe progress. | No | None until a new accepted settled signal |
| `DISPOSED` | Terminal invalidated lifecycle. | No | None |

### Transitions

| Input/outcome | From | To | Required effect |
|---|---|---|---|
| first proven `bindRoot(R)` | `UNBOUND` | `BOUND` | Store immutable `R`; no schedule. |
| `rootSettled(R)` | `BOUND`, `AWAITING_SETTLE`, `RETRY_EXHAUSTED`, `PAUSED` | `POLLING` | Rotate generation, reset per-cycle attempts, and schedule an immediate tick. Global throttle history is retained. |
| duplicate settled event | `POLLING`, `THROTTLED`, `RETRY_WAIT`, `WAKING` | unchanged | No new timer, tick, generation, or attempt. |
| throttled tick | `POLLING` or `RETRY_WAIT` | `THROTTLED` | Do not call `peek`; schedule exact window-open deadline. |
| empty peek | `POLLING` | `POLLING` | Clear per-cycle retry count and schedule `pollIntervalMs`. |
| rejected peek | `POLLING` | `POLLING` | Trace safe error code and schedule `pollIntervalMs`; no wake accounting. |
| pending descriptor | `POLLING` | `WAKING` | Record attempt, set in-flight synchronously, then invoke `wake`. |
| wake fulfilled | `WAKING` | `AWAITING_SETTLE` | Clear in-flight; schedule nothing. |
| wake rejected with retry remaining | `WAKING` | `RETRY_WAIT` | Clear in-flight before scheduling the indexed retry delay. Descriptor remains pending. |
| fourth failed wake in cycle | `WAKING` | `RETRY_EXHAUSTED` | Clear in-flight, trace exhaustion, schedule nothing. |
| matching root deletion | any live bound state | `DISPOSED` | Run synchronous disposal ordering. |
| plugin disposal | any non-disposed state | `DISPOSED` | Run synchronous disposal ordering regardless of root binding. |
| child/unknown/conflicting input | any | unchanged | No generation, timer, peek, wake, or root mutation. |

A retry tick performs the throttle gate and a fresh non-consuming `peek` again. It never reuses a stale descriptor across a delay. If the descriptor disappeared, the loop returns to ordinary polling without a wake. This avoids waking for work already claimed elsewhere.

### Tick ordering

Every scheduled callback captures its generation `G` and performs this order:

1. Reject if disposed, `G` is stale, another tick is active, or a wake is in flight.
2. Read and validate monotonic time.
3. Prune wake timestamps and evaluate the throttle gate.
4. If throttled, schedule the exact window-opening deadline and return without storage access.
5. Mark the single asynchronous tick active and invoke `peek({rootSessionId, generation:G, signal})`.
6. After fulfillment or rejection, recheck disposal, generation, and abort signal before any state change or wake.
7. For a descriptor, obtain valid monotonic time again, record the attempt, set `WAKING`, and invoke `wake` exactly once.
8. After wake settlement, recheck generation before clearing or scheduling. A stale completion changes nothing.
9. Clear tick/wake in-flight flags only for the still-current generation.

Because scheduling is one-shot, concurrent callbacks can arise only from a broken scheduler, cancellation race, or stale queue. The captured generation and in-flight guards make all three inert.

## Lifecycle generation and disposal ordering

`generation` is a monotonically increasing safe integer. Binding establishes the first live generation. Every accepted cycle restart rotates it so callbacks from an earlier settled cycle cannot resume later. Disposal advances it one final time and is terminal.

`dispose(reason)` and matching `rootDeleted` perform synchronous steps in this exact order:

1. If already disposed, return without side effects.
2. Set `state = DISPOSED` and increment `generation`.
3. Abort the prior generation's `AbortController`.
4. Detach the timer handle from controller state and clear retry/descriptor references.
5. Request timer cancellation inside `try/catch`.
6. Emit best-effort `poll.disposed` metadata.
7. Return; only then may the adapter begin asynchronous host cleanup.

No `await` occurs in these steps. A callback queued before step 2 sees a stale generation and performs no port call. A `peek` already awaiting at step 2 receives an abort signal; after settlement it fails the generation check and cannot call `wake`. A `wake` invoked before disposal may settle afterward, but its completion is stale and cannot schedule, peek, consume, or invoke a second wake. P7 does not claim that `promptAsync` can retract a host request already accepted before disposal.

## OpenCode adapter design

`plugin/tower-spike.js` remains the OpenCode entrypoint and exports a testable adapter factory. It receives or closes over only:

```js
createOpenCodeAdapter({
  client,
  continuationTransport, // provisional P6-reconciled peek capability
  rootIdentitySource,     // provisional reconciled proof source
  schedule,
  cancel,
  now,
  trace,
  policy,
})
```

The production `TowerSpikePlugin` composition must fail closed with no polling when the trusted transport or root proof is unavailable. It must not fall back to legacy consuming `tower.receive`, direct SQLite, an environment-supplied root, or an unverified idle ID.

### Event classification

The semantics below are normative; exact field extraction is provisional until captured against the supported OpenCode version.

| Classified event | Adapter action |
|---|---|
| proven parentless root metadata | Call `bindRoot(rootId)` once. A second root is a conflict and cannot replace it. |
| bound root `session.idle` | Call `rootSettled(rootId)`. |
| known child creation | Record only the child-to-root classification needed for later events. Do not call the controller. |
| known child idle | Ignore for controller lifecycle. |
| known child deletion | Remove optional classification cache only after deciding it is a child; do not dispose or restart the controller. |
| bound root `session.deleted` | Call `rootDeleted(rootId)` synchronously before returning or awaiting cleanup. |
| unknown/malformed event | Trace a bounded classification reason and do nothing. “Not known as a child” is never proof of root. |
| plugin `dispose` | Call `loop.dispose('plugin-dispose')` synchronously, then perform any host cleanup. |

The classifier may use a child cache only as supporting evidence. Missing `parentID`, missing IDs, disagreement between `properties.info.id` and `properties.sessionID`, or an event naming an unbound/different root fails closed. Idle alone cannot establish a root unless the reconciled OpenCode contract proves that exact shape is parentless and unambiguous.

### Wake mapping

After reconciliation, the OpenCode wake port must perform exactly one call for the bound root:

```js
client.session.promptAsync({
  path: { id: rootSessionId },
  body: {
    parts: [{
      type: "text",
      text: "A Control Tower continuation is pending. Use the continuation receive and claim tools to inspect and claim it.",
    }],
  },
})
```

The wording and SDK envelope above are the preferred provisional shape and MUST be pinned by adapter RED tests after verifying the supported SDK. No descriptor field is interpolated. A prompt rejection propagates to the controller's retry policy; it does not consume, claim, acknowledge, or remove the descriptor.

### Trusted metadata and transport seam

The adapter must not create a second authority path. The reconciled composition must satisfy all of these:

- `peek` reaches the existing argument-free, non-consuming continuation receive behavior under the same constructor-bound `Ctx` used by registration and claim.
- The root ID used by lifecycle classification, controller binding, trusted metadata, receive, and `promptAsync` is byte-identical.
- The binding epoch comes only from the accepted registration transition and is updated atomically in the capability provider, not from an event or request.
- Default MCP behavior without both trusted metadata and process identity remains legacy-only and fail closed.
- Transport errors preserve their stable `CT_*` code for safe trace classification, while raw details and delivery descriptors remain private.
- No adapter import reaches `core.mjs`, `mcp.mjs`, `bun:sqlite`, or a database path.

If the merged architecture cannot satisfy this without a new core/MCP route, apply stops for a separate design amendment. P7 must not invent a second public continuation API during implementation.

## Data ownership

| Data | Owner | Lifetime | Forbidden use |
|---|---|---|---|
| root session ID | Reconciled OpenCode proof source; immutable copy in controller | Plugin instance | Request/environment authority, rebind from events, descriptor derivation |
| lifecycle generation | Controller | Process memory | Persistence or caller override |
| timer handle | Controller | Current generation | Adapter-owned interval |
| wake timestamps/retry count | Controller | Plugin process | SQLite witness or domain budget |
| delivery descriptor | Continuation transport/domain | Current peek/wake call only | Logging, prompt interpolation, claim, mutation, persistence |
| binding epoch | Continuation registration/capability provider | Registered plugin identity | Event-derived or request-derived value |
| prompt payload | OpenCode adapter | One wake call | Domain delivery content, token, evidence, sender text |
| polling witness | None in baseline P7 | Not stored | Migration 005 edits or synthetic quiescence proof |

## Determinism and concurrency invariants

1. At most one root ID is bound for a controller lifetime.
2. At most one timer handle is owned by the current generation.
3. At most one tick and one wake are in flight; a wake is part of its tick, so no second peek starts while it is pending.
4. Every wake invocation has exactly one preceding attempt timestamp in the retained window.
5. No throttle rejection has a `peek` or `wake` call after it in the same callback.
6. No successful wake schedules another tick before a new accepted root-settled signal.
7. No failed wake schedules more than the three configured retries in one settled cycle.
8. A new settled cycle resets its retry count but does not reset the global throttle window.
9. Generation invalidation precedes cancellation and makes queued/settled asynchronous completions inert.
10. No lifecycle path calls a consuming receive or claim.

## Observability

The controller emits fixed event names through the injected trace port:

- `poll.root_bound`, `poll.root_conflict`, `poll.cycle_started`
- `poll.scheduled`, `poll.throttled`
- `poll.peek_empty`, `poll.peek_failed`
- `poll.wake_attempted`, `poll.wake_succeeded`, `poll.wake_failed`
- `poll.retry_exhausted`, `poll.clock_invalid`, `poll.schedule_failed`
- `poll.stale_callback`, `poll.disposed`

Allowed attributes are `generation`, `state`, `reason`, `delay_ms`, `window_attempts`, `cycle_attempt`, and a bounded stable error `code` or `name`. Root IDs, worktree paths, descriptors, prompt text, tokens, raw errors, and payloads are excluded. Trace order is asserted in deterministic tests. Production tracing must not write to OpenCode stdout; the concrete safe sink is part of reconciliation.

`getState()` returns a frozen descriptor-free snapshot for tests and diagnostics: `{state,generation,rootBound,timerScheduled,tickInFlight,wakeInFlight,windowAttempts,cycleAttempts}`. It is observational only and grants no lifecycle action or root value.

## Failure modes

| Failure | Behavior | Recovery |
|---|---|---|
| missing trusted root or transport | No bind or polling; no SQLite access. | Correct composition and emit a new proven root event. |
| conflicting root | Trace and ignore; existing binding remains. | Dispose the plugin and create a new instance if rebinding is legitimately required. |
| child/ambiguous metadata | No controller call. | Later complete, proven root metadata may proceed. |
| invalid/regressing clock | Pause before peek. | New root-settled signal after clock repair starts a new generation. |
| scheduler throws | State becomes `PAUSED`; no untracked timer is assumed. | New root-settled signal retries scheduling. |
| timer cancellation throws | Disposal remains terminal because invalidation already occurred. | No controller recovery; recreate plugin instance if needed. |
| peek rejects | Trace stable code; no wake; ordinary polling resumes. | Transport may recover on later poll. |
| wake throws/rejects | Attempt remains counted, descriptor remains pending, bounded retry applies. | Success, retry exhaustion plus later root settle, or plugin recreation. |
| trace throws | Swallow; state machine continues. | Repair trace sink independently. |
| process crash | All transient polling state disappears; no witness is claimed. | Host restarts and proves/binds a new plugin lifecycle. |
| already-issued prompt completes after disposal | Completion is ignored by controller and cannot schedule more work. | The resumed agent still must pass continuation identity and claim fences. |
| legacy compatibility is required but unresolved | Apply remains blocked; do not silently remove or consume legacy messages. | Approve a separate non-lossy compatibility unit. |

## Candidate file changes

| Path | Change | Status |
|---|---|---|
| `host/loop.mjs` | Add the controller, policy validation, generation logic, and injected ports. | Baseline P7 |
| `test/polling.test.mjs` | Add fake clock/scheduler and controller state/order/race tests. | Baseline P7 |
| `plugin/tower-spike.js` | Replace direct core/legacy queue behavior with OpenCode classification, controller composition, and generic `promptAsync` wake mapping. | Baseline after reconciliation |
| `test/helpers/host-adapter-conformance.mjs` | Add reusable CT-R5 harness contract for OpenCode, Pi, and Claude adapters. | Baseline P7 |
| `test/host-adapters.test.mjs` | Run CT-R5-S1..S5 for OpenCode and OpenCode-specific malformed-event/prompt tests. | Baseline P7 |
| `test/fail-closed.test.mjs` | Run unchanged as regression evidence. | No planned edit |
| `core.mjs`, `mcp.mjs` | Reconciliation inputs only. Any required transport change needs an explicit design amendment and separate work unit. | Not baseline edit targets |
| `test/migration.test.mjs` | Run only if relevant; no baseline P7 edit. | Not an edit target |
| Migration 005/P6 worktree | Immutable read-only dependency. | Never edit |

No install, publication, runtime configuration, Pi/Claude adapter, dashboard, Telegram, parent change artifact, P6 file, or unrelated `.gitignore` change belongs to P7.

## Strict-TDD test strategy

The repository has strict TDD enabled with `bun test`. Each behavior unit follows RED -> GREEN -> TRIANGULATE/REFACTOR, keeps tests with behavior, and records focused command, exact result, authored-line count, runtime harness result or `N/A`, and rollback boundary.

### Controller tests

Use a fake scheduler with explicit `advanceBy`, `runNext`, and FIFO ordering for equal deadlines. It must expose queued callbacks even after cancellation so stale-generation behavior can be proved. Use deferred promises for peek and wake races; never use real time, real intervals, SQLite, or the actual Tower database.

Required focused proofs include:

- first root wins; repeated root is idempotent; conflicting/invalid roots are inert;
- polling does not start on bind and starts immediately only on exact root settle;
- throttle is checked before peek and schedules the exact window-opening deadline;
- window-boundary pruning and attempt recording are deterministic;
- empty and failed peek scheduling, with no wake accounting on peek failure;
- one wake in flight despite duplicate callbacks and settled events;
- synchronous wake throw and asynchronous rejection both count and preserve pending delivery;
- retry delays are exactly `1000, 2000, 4000`, each retry re-peeks, and the fourth failure exhausts the cycle;
- successful wake pauses until a later root settle and retains global throttle history;
- root/plugin disposal before a queued callback, during a deferred peek, and during a deferred wake settlement;
- cancellation and trace failures cannot reverse disposal;
- no `receive`, `claim`, SQLite, core, MCP, or host SDK import exists in `host/loop.mjs`.

### Adapter conformance

`test/helpers/host-adapter-conformance.mjs` should export a parameterized harness accepting host actions such as `rootSettled`, `childCreated`, `childSettled`, `childDeleted`, `rootDeleted`, `dispose`, and observations for scheduled work, peek/wake counts, and a still-pending sentinel. The scenario labels remain exactly:

- `CT-R5-S1@OpenCode` child deletion preserves polling;
- `CT-R5-S2@OpenCode` root deletion stops polling;
- `CT-R5-S3@OpenCode` child creation is ignored;
- `CT-R5-S4@OpenCode` child idle is ignored;
- `CT-R5-S5@OpenCode` root disposal stops before receive.

OpenCode-specific tests add malformed/missing/conflicting metadata, supported event ordering, plugin-dispose ordering, exact root ID passed to `promptAsync`, generic prompt shape, wake rejection, and no descriptor interpolation. The same fixture API is reserved for P8/P9 without adding OpenCode field names to the controller.

### Commands planned for apply

```text
bun test test/polling.test.mjs
bun test test/host-adapters.test.mjs
bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs
bun test
node --check host/loop.mjs
node --check plugin/tower-spike.js
git diff --check
```

An isolated P6-backed transport integration test may be added only after reconciliation. It must create temporary repositories/runtime roots, keep continuation OFF except within the fixture's explicit setup, and never mutate the actual Tower runtime database.

## Behavior-based work units

These are planning boundaries for later tasks, not PR creation instructions. Each unit includes its tests and targets at most 400 authored added/deleted lines.

| Unit | Finished behavior | Files | Forecast | Focused verification | Rollback boundary |
|---|---|---|---:|---|---|
| P7-A1 Root lifecycle and invalidation | Immutable bind, settle gating, one-shot generation scheduling, stale callback protection, synchronous idempotent disposal. | `host/loop.mjs`, `test/polling.test.mjs` | 280-380 | lifecycle/disposal subset of polling tests | Revert A1 controller/test blocks; no runtime adapter exists. |
| P7-A2 Polling and wake safety | Throttle-before-peek, deterministic empty/error polling, serialized wake, global attempt window, retries, success pause, exhaustion. | same | 320-400 | full `test/polling.test.mjs` | Revert A2 additions; A1 remains inert and reviewable. |
| P7-B OpenCode lifecycle conformance | Proven root/child mapping, CT-R5-S1..S5, synchronous root/plugin disposal, reusable host fixture. | `plugin/tower-spike.js`, `test/helpers/host-adapter-conformance.mjs`, `test/host-adapters.test.mjs` | 320-400 | host adapter suite | Revert adapter/fixture unit; completed controller remains unused. |
| P7-C Reconciled transport and wake composition | Approved non-consuming transport, exact generic `promptAsync` mapping, capability identity continuity, fail-closed absence behavior, legacy decision. | adapter plus only approved seam files/tests | 240-380; split before RED if larger | adapter + isolated transport + fail-closed | Revert only composition/seam changes; no schema rollback. |

A transport change in `core.mjs` or `mcp.mjs` is not automatically part of P7-C. If reconciliation requires one, it receives its own amended design and <=400-line work unit. No persisted-witness work unit exists in the baseline.

## Rollback

P7 has no database migration or persisted witness, so rollback requires no down-migration and cannot edit Migration 005.

1. Revert P7-C to disable the transport/wake composition while retaining tested adapter/controller code.
2. Revert P7-B to restore the pre-P7 plugin only if the recorded legacy compatibility decision permits it; otherwise disable the plugin entrypoint fail closed.
3. Revert P7-A2 and P7-A1 independently to remove the unused controller and tests.
4. Leave all P6 schema, continuation, recovery, delivery, and authority rows untouched.
5. Runtime publication or host configuration rollback remains P10-owned because P7 performs no cutover.

The operational kill path is plugin disposal or removal from composition. Since all P7 state is transient, process exit also removes timers and counters, but it is not represented as a persistent quiescence proof.

## Apply-blocking reconciliation checklist

Before `sdd-apply`, create and approve `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`. Every item below MUST include concrete merged-commit/file/test evidence; unchecked or ambiguous items keep apply blocked.

- [ ] Validate the M0 Plan Manifest/ArtifactRefs and both DAG paths; prove no Change A dependency or A→P7/P8 edge and preserve Change E ownership.
- [ ] Record each integrated identity separately, keep `binding_epoch`, `host_epoch`, and controller `generation` distinct, and reject missing or conflated evidence.
- [ ] Pin the assignment-bound in-container worktree path, authorized base SHA, allowed branch shape, `assignment_id`, and `session_id`; confirm P7 has no worktree lifecycle authority.

- [ ] P6 is merged into the P7 base. Record the merged commit and confirm the read-only worktree was not copied as an implementation source.
- [ ] Record merged schema version, exact Migration 005 byte length/checksum, schema-5 manifest identity, accepted `bootstrapAdmin` transitions, replay behavior, and the unchanged `polling_witness = 'UNAVAILABLE_BEFORE_P7'` constraint.
- [ ] Confirm no P6 polling table, route, test, or reserved name conflicts with `host/loop.mjs`, controller methods, trace names, or P7 tests.
- [ ] Record the merged argument-free continuation receive signature, exact non-consuming descriptor result, claim boundary, error behavior, and schema-5 compatibility.
- [ ] Record the merged dispatcher/MCP constructor-capability signatures and how production OpenCode supplies trusted metadata and process identity without request/environment authority.
- [ ] Select and threat-model one trusted `peek` transport. Prove the plugin imports no core/SQLite implementation and no second public continuation API is created.
- [ ] Prove root ID and binding epoch continuity across OpenCode lifecycle classification, trusted metadata, registration, receive, claim, and wake target.
- [ ] Capture supported OpenCode version and real fixtures for root creation/idle/deletion, child creation/idle/deletion, `parentID`, `sessionID`, incomplete metadata, and event ordering. Define the exact root-proof rule.
- [ ] Verify and pin the exact `client.session.promptAsync` call and generic prompt. Confirm prompt content contains no descriptor, token, evidence, sender, or domain payload.
- [ ] Decide whether legacy queue waking remains required. If yes, approve a separate non-consuming/non-lossy compatibility boundary; if no, record the intentional behavior removal and regression expectations.
- [ ] Confirm transient polling is sufficient for P7 and compatible with merged P6 `beginRollback`/`finishRollback` semantics. If persistence is required, stop P7 and propose a separate additive migration; never edit Migration 005.
- [ ] Re-run the full merged baseline with the actual configured Bun version and record zero failures before the first RED edit.
- [ ] Reforecast each behavior unit at <=400 authored changed lines and verify no unit touches parent artifacts, P6 worktree files, runtime publication/configuration, or unrelated `.gitignore` entries.

## Acceptance traceability

| Requirement | Design proof |
|---|---|
| Host-neutral boundary | Injected port contract, forbidden imports, opaque descriptor, candidate file boundary |
| Immutable proven root | first-write-wins binding, exact-ID lifecycle methods, fail-closed classifier |
| CT-R5-S1/S3/S4 | child events remain entirely in adapter no-op classification |
| Throttle before peek | tick steps 2-4 and exact sliding-window policy |
| Wake serialization/failure | `WAKING`, one-shot scheduling, pre-call accounting, retry table |
| Pending preservation | non-consuming fresh peek; no receive/claim/ack; prompt has no descriptor payload |
| CT-R5-S2/S5 and stale callback | generation capture, synchronous disposal steps, deferred-race tests |
| OpenCode mapping | event table and provisional exact `promptAsync` envelope |
| Reusable conformance | parameterized host fixture with stable CT-R5 IDs |
| Transient scope | data ownership, no migration/witness, rollback without database changes |
| Reconciliation gate | explicit evidence checklist and required `reconciliation.md` |

## Risks

| Risk | Mitigation |
|---|---|
| P6 API/schema drift | Apply remains blocked until merged evidence is recorded; controller depends only on normalized ports. |
| OpenCode metadata cannot prove a root | Fail closed; do not infer root from an unknown idle session. |
| Transport would require direct core/SQLite imports | Stop for a design amendment rather than weakening the boundary. |
| Successful wake repeats a still-pending delivery | Pause in `AWAITING_SETTLE`; require a new root settle and retain the global throttle window. |
| Broken host creates a retry storm | Initial plus three retries per cycle and 15 attempts per 5-minute global window. |
| Disposal races async work | Generation and abort invalidation precede cancellation; every async continuation rechecks. |
| Retry exhaustion strands a pending delivery | Trace exhaustion; a later proven root settle or plugin recreation starts a new bounded cycle. The descriptor remains pending. |
| Legacy queue behavior is silently lost | Explicit reconciliation decision and separate compatibility boundary if required. |
| Transient state cannot prove rollback quiescence | Do not claim a witness; confirm P6 compatibility or move persistence to a separate additive proposal. |
| Shared fixture leaks OpenCode semantics | Generic host actions and observations live in the helper; OpenCode event fields remain only in adapter tests. |
