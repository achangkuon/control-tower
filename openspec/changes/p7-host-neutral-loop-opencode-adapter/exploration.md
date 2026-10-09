# Exploration: P7 Host-Neutral Loop and OpenCode Adapter

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers. P7 means `p7-host-neutral-loop-opencode-adapter`; neither value denotes positional Plan P6 or Plan P7.

## Executive decision

Slice 7 should be implemented as a host-neutral polling controller plus a thin OpenCode lifecycle adapter. The controller must own root binding, non-consuming peeks, throttling, wake serialization, retry behavior, and disposal invalidation. The OpenCode adapter must only translate lifecycle events and call `promptAsync`; it must not import SQLite, call `core.receive`, claim delivery, or duplicate continuation/domain rules.

P6 is a hard prerequisite. Its schema-5 `ct_quiescence_snapshot.polling_witness` is deliberately constrained to `UNAVAILABLE_BEFORE_P7`. P7 MUST NOT widen or edit Migration 005. If P7 persists a real polling witness, it needs a separate byte-checksummed additive migration (tentatively schema 6). If P7 keeps the witness transient and only drives polling/wake behavior, no migration is needed. This choice is a post-P6 reconciliation gate, not an implementation assumption.

## Planning status and apply gate

Proposal, spec, design, and tasks may proceed provisionally from this exploration. The post-P6 reconciliation gate belongs before apply/implementation: apply remains blocked until the merged P6 schema, checksums, dispatcher/capability surface, continuation APIs, and related integration facts have been re-read and reconciled. This gate does not block the remaining planning phases; it prevents provisional planning decisions from being treated as implementation authorization.

## Baseline and authoritative scope

Read-only inspection covered:

- `openspec/config.yaml`
- Parent exploration, proposal, design, tasks, and `control-tower-migration-polling` / `control-tower-identity-mode` specs
- The parallel P6 design/tasks in `Worktrees/tower-implementation`
- `plugin/tower-spike.js`, `core.mjs`, `mcp.mjs`, and existing migration/identity/lifecycle/fail-closed tests

The parent plan assigns CT-R5 entirely to Slice 7 for OpenCode, Slice 8 for Pi, and Slice 9 for Claude. The five CT-R5 scenario IDs remain unchanged; the later hosts are a conformance matrix, not new normative scenarios. P7 is planning-only here. P6 is pending and its merged implementation, checksums, dispatcher surface, and schema validator must be re-read before apply.

## CT-R5 scenario ownership: OpenCode

| Scenario | P7 proof obligation | Controller/adapter boundary |
|---|---|---|
| `CT-R5-S1 Child deletion preserves polling` | A child `session.deleted` event leaves the root controller alive, its timer scheduled, and the pending delivery untouched. | Adapter classifies the event as child; controller is not stopped. |
| `CT-R5-S2 Root deletion stops polling` | A root `session.deleted` event synchronously invalidates the controller and cancels polling before any later peek, wake, receive, or claim can run. | Adapter maps only the proven root ID to terminal disposal. |
| `CT-R5-S3 Child creation is ignored` | Child creation cannot start, restart, or alter root polling and cannot consume a pending delivery. | Adapter ignores `parentID`-bearing child creation. |
| `CT-R5-S4 Child idle is ignored` | Child idle cannot trigger a peek or wake; root polling remains unchanged. | Adapter forwards only root `session.idle`. |
| `CT-R5-S5 Root disposal stops before receive` | Disposal wins a race with a queued timer or in-flight asynchronous callback. No callback after disposal may peek, wake, receive, or claim. | Controller sets `disposed`/generation state before canceling timers or awaiting host cleanup. |

The OpenCode matrix must also cover wake rejection, throttling before any peek, serialized wake attempts, and pending-delivery preservation after a failed wake.

## Current implementation findings

`plugin/tower-spike.js` is a useful behavioral baseline but is not a valid P7 boundary:

- It imports `../control-tower/core.mjs`, opens the database, and directly calls legacy consuming `tower.receive(handle)`.
- It stops polling for every `session.deleted`, including child deletion; it has no root-ID terminal check.
- It records child IDs from `info.parentID`, but does not establish or prove one immutable root before treating other events as root events.
- It checks the legacy `ACTIVE` marker and legacy queue, not the constructor-bound continuation identity/mode contract.
- It rate-checks before touching the queue, which is the correct loss-prevention ordering, and serializes wake attempts with `waking`.
- It consumes a message before `client.session.promptAsync`. If `promptAsync` fails, the legacy message has already been consumed. P7 must not reproduce this loss for continuation delivery; a failed wake must leave the pending delivery pending.
- `dispose()` only clears the interval. It does not synchronously invalidate an asynchronous `check()` that has already passed its timer boundary, so disposal can race with a later database read/consume.
- A failed wake clears `waking` but does not establish a bounded retry/resume policy. A controller-owned retry policy is required.

The existing core already has a non-consuming `continuationReceive` peek on schema 4 and a constructor-capability dispatcher. The current dispatcher surface is P6-sensitive and must not be assumed stable until the P6 worktree merges. Legacy `receive(handle)` and continuation `receive` are distinct and must remain so.

## Proposed host-neutral controller contract

`host/loop.mjs` should expose a small injected-port controller. Candidate ports, matching the parent design, are:

```text
peek() -> pending delivery descriptor or null
wake(descriptor) -> Promise<void>
schedule(callback, delayMs) -> timer handle
cancel(timerHandle) -> void
trace(event, details) -> void
```

The controller should also receive a proven immutable `rootSessionId`, a clock or `now()` seam, and explicit throttle/retry configuration for deterministic tests. A candidate lifecycle API is:

```text
createPollingLoop({rootSessionId, peek, wake, schedule, cancel, trace, now, limits})
loop.rootSettled()        // starts or resumes root polling
loop.rootEvent(event)     // optional root-scoped event gate
loop.dispose()             // synchronous invalidation; idempotent
loop.isDisposed()
```

The exact names are open until the RED tests freeze the contract. The behavioral rules are not open:

1. Bind exactly one proven root. Unknown, ambiguous, or second-root events are ignored or fail closed; they never replace the bound root.
2. Start polling only after the root settled/idle signal. A child event never starts or stops it.
3. Check throttling before `peek`. Throttled ticks must not touch continuation or legacy storage.
4. `peek` is non-consuming. The controller never calls SQLite or domain APIs directly.
5. Serialize wake calls. While a wake is pending, subsequent ticks do nothing.
6. A wake failure clears the in-flight flag, records the failure, leaves the descriptor pending, and resumes only through a bounded controller retry/poll policy. It must not consume or acknowledge the delivery.
7. Mark the controller disposed before canceling timers and before any asynchronous adapter cleanup. Every callback captures the current lifecycle generation and no-ops when disposed or stale.
8. Root deletion/disposal cancels future polling before any wake/peek callback can run. Disposal is idempotent.
9. No lifecycle callback calls `receive` or `claim`; delivery consumption remains in the guarded continuation API invoked by the resumed agent. A legacy compatibility path, if retained, must be specified separately rather than hidden in the OpenCode adapter.

The throttle should count wake attempts that pass the throttle gate, including failed host wake attempts, so a broken host cannot create an unbounded retry storm. Exact window, backoff, and logging values should be frozen by tests; the current legacy values are `15` wakes per `5` minutes and a `2s` poll interval, but these are not yet normative for P7.

## OpenCode adapter responsibilities

`plugin/tower-spike.js` should become a thin mapping layer around `host/loop.mjs`:

| OpenCode input | Required behavior |
|---|---|
| Root `session.idle` | Bind/verify the root and invoke the controller's settled signal. |
| Child `session.idle` | Ignore. |
| Child creation/deletion (`parentID`) | Track only as needed for classification; never affect root polling. |
| Root `session.deleted` | Call controller disposal synchronously before returning. |
| Child `session.deleted` | Ignore for controller lifecycle. |
| Plugin `dispose` | Dispose the controller first; host cleanup may follow. |
| Controller wake | Call `client.session.promptAsync` for the proven root ID using the agreed wake payload. |

Root identity must be explicit and stable. A safe candidate is the first eligible parentless root event, after which all lifecycle events must match that session ID; missing or conflicting identity is ignored/fails closed. This must be confirmed against the actual OpenCode event shape before implementation. The adapter may provide host metadata capabilities, but it must not derive authority from event payloads, request arguments, environment variables, or SQLite rows.

The wake payload is an unresolved integration point. For continuation, the preferred shape is a generic “continuation pending” prompt or an opaque descriptor supplied by a transport port; the adapter must not fetch or consume domain payloads itself. The current legacy text injection (`[torre · de ...]`) is not a safe model for a non-consuming continuation peek.

## P6 schema-5 witness dependency

The parallel P6 amendment defines Migration 005 and schema 5 with:

- 22 additive `ct_*` objects and a 58-object schema-5 manifest;
- `ct_quiescence_snapshot.polling_witness CHECK(polling_witness = 'UNAVAILABLE_BEFORE_P7')`;
- server-owned quiescence and rollback evidence, with no request-supplied polling boolean/digest/witness;
- an explicit requirement that P7 add its own byte-checksummed migration before a real polling witness can be stored.

Consequences for P7:

- P7 MUST NOT alter the Migration 005 SQL, checksum, schema-5 manifest, or the `UNAVAILABLE_BEFORE_P7` check.
- P7's transient loop can run without a schema migration if it does not persist a real witness. This is the recommended first implementation boundary because CT-R5 is a runtime lifecycle contract, not a persistence requirement.
- If P7 must record a real “poller quiesced/disposed” witness for `finishRollback` or status, it needs a separate additive migration before that write. SQLite cannot broaden the existing CHECK safely. A likely design is a new schema-6 witness table or sidecar linked to the immutable snapshot; rebuilding `ct_quiescence_snapshot` or editing Migration 005 is forbidden.
- Any migration-006 work must be isolated from the loop/adapter work in its own Sesión, independently byte-checksummed and tested, and coordinated with the P6-owned `core.mjs`/migration surface. It should not be smuggled into the adapter PR.

The post-P6 gate must reconcile the actual merged schema version, accepted `bootstrapAdmin` transitions, manifest validator, `continuationStatus`, dispatcher operation list, and capability requirements. The parent design/tasks are planning inputs, not proof that P6 implementation has landed.

## Candidate files and ownership

| Path | P7 role | Conflict/ownership note |
|---|---|---|
| `host/loop.mjs` | New host-neutral state machine and injected ports. | Additive; should import no OpenCode/Pi/Claude SDK and no SQLite/core module. |
| `plugin/tower-spike.js` | OpenCode lifecycle/wake adapter only. | P7-owned runtime file; current implementation must be replaced without changing legacy core semantics accidentally. |
| `test/polling.test.mjs` | Deterministic controller tests for CT-R5 ordering, disposal races, throttling, wake failure, and pending preservation. | New file; use fake scheduler/clock, not real intervals. |
| `test/host-adapters.test.mjs` | OpenCode mapping/conformance tests, with the same fixture shape reserved for P8/P9. | New shared test file; freeze host-neutral contract before later adapters. |
| `test/fail-closed.test.mjs` | Regression-only input; continue running it. | Do not broaden the P7 change into legacy fail-closed refactoring. |
| `core.mjs` | Only a separately approved additive witness migration or a verified P6 integration seam. | P6 owns pending schema/core work in the parallel worktree; avoid edits in the normal P7 loop unit. |
| `mcp.mjs` | Only if the chosen OpenCode transport must expose a constructor-bound capability. | P6-sensitive; do not invent a second public API or expose caller authority. |
| `test/migration.test.mjs` | Only for a separately approved migration-006 unit. | P6/P7 migration conflict; not part of transient loop work. |

No Pi/Claude adapter, runtime publication, install cutover, dashboard, Telegram, or deployment file belongs to this slice.

## Conflict graph

- **P6 parallel worktree:** `core.mjs`, `mcp.mjs`, migration/recovery tests, and parent design/tasks are active conflict surfaces. P7 must re-read their merged result and must not edit the parent change directory in the P7 workspace.
- **P7 local runtime:** `plugin/tower-spike.js` is the main behavior replacement. It currently contains legacy queue semantics, so tests must prove that the refactor does not change Plan A fail-closed behavior or silently drop legacy messages if legacy support remains.
- **Shared future adapter contract:** `host/loop.mjs` and `test/host-adapters.test.mjs` are consumed by P8/P9. Avoid OpenCode-specific names in the controller and freeze the lifecycle-port semantics now.
- **Optional migration 006:** conflicts with P6's migration validator and schema manifest. Treat it as a separate chained Sesión, not as an incidental P7 code change.
- **P10:** install/runtime publication and actual cutover are downstream only. P7 must not modify `install.sh`, release paths, host configuration, or the actual Tower runtime.

## Reviewable Sesión strategy

Use chained, behavior-based Sesiones; do not bundle the optional migration with runtime behavior. Each Sesión targets at most 400 authored added/deleted lines, with tests in the same Sesión:

1. **S1.13 — controller lifecycle and invalidation**: RED `test/polling.test.mjs`, then `host/loop.mjs`; deterministic fake scheduler/clock; root binding, settled-only scheduling, and synchronous disposal. Target approximately 280–380 authored lines.
2. **S1.14 — polling and wake safety**: extend the same controller/test files with throttle-before-peek, wake serialization/failure, retries, and pending preservation. Target approximately 320–400 authored lines.
3. **S1.15 — OpenCode mapping**: RED additions in `test/host-adapters.test.mjs`, then the thin `plugin/tower-spike.js` adapter; root/child event classification, `session.deleted`, plugin disposal, and `promptAsync` mapping. Target approximately 320–400 authored lines.
4. **S1.16 — compatibility and transport composition**: only after reconciliation approves the concrete integration seam; add focused race/pending-delivery regressions and run the existing fail-closed suite without changing core behavior. Target approximately 240–380 authored lines.

A real polling-witness migration receives a newly planned Sesión only after the post-P6 gate proves persistence is required; no positional ID is assigned before that decision.

Every Sesión needs a focused test result, runtime-harness result or explicit `N/A`, a rollback boundary, and an authored-line receipt. The P7 branch must stop before Judgment Day or P8; this exploration does not authorize apply or review lifecycle actions.

## Non-goals

- Pi or Claude adapters and their conformance runs.
- P10 versioned runtime publication, `current` cutover, host configuration changes, or deployment.
- Actual Control Tower activation, delivery, database mutation, or runtime-state changes.
- Dashboard, Telegram, Proyecto-Alpha policy, work discovery, ownership selection, launching, or single-Sesión policy.
- Rewriting Migration 005, weakening its witness CHECK, or creating a caller-controlled polling proof.
- Adding `start`, moving SQLite/domain authority into adapters, or exposing claimant tokens/anchor secrets.
- PRs, commits, pushes, Gentle AI reviews, 4R lenses, or Judgment Day.

## Open questions and post-P6 reconciliation gate

1. Is P7 required to persist a real polling/quiescence witness, or is a transient controller sufficient for CT-R5? This decides whether optional Migration 006 exists.
2. What transport supplies `peek` and `wake` to the OpenCode adapter without importing `core.mjs` or duplicating SQLite/domain logic? The current plugin has no continuation-aware host transport.
3. Does OpenCode provide a reliable parentless root event and stable `parentID` metadata for every relevant lifecycle event? Define fail-closed behavior for missing/ambiguous metadata.
4. What exact wake payload should `promptAsync` send when `peek` is non-consuming and the agent must claim through the continuation API?
5. Should throttle accounting include failed wake attempts (recommended) and what bounded retry/backoff is normative?
6. If legacy `tower_*` queue behavior remains supported, where is its compatibility path located without violating the new adapter boundary or losing a message on wake failure?
7. Which P6 dispatcher/capability signatures are actually merged, and can an OpenCode adapter supply trusted metadata without changing the stdio MCP process contract?

Before P7 apply/implementation, revalidate:

- merged P6 schema/checksum/manifest and the exact `UNAVAILABLE_BEFORE_P7` constraint;
- P6's accepted `bootstrapAdmin` transition and schema version, including retry/failure behavior;
- the actual continuation `receive`/`claim` and dispatcher/capability APIs;
- whether P6 has already added or reserved any polling tables, routes, or tests;
- root/session identity fields and event shapes from the supported OpenCode host;
- that the selected P7 Sesión has no parent-design or P6-core conflict and remains within the 400-line budget.

Until this gate passes, P7 may continue through proposal, spec, design, and tasks provisionally, but apply/implementation remains blocked.
