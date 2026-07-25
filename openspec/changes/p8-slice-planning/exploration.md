## Exploration: Slice 8 — Pi Adapter

### Current State

The parent `autonomous-continuation-control-tower` plan gives Slice 8 the canonical title **P8 — Pi Adapter**. Its native scope is the Pi host conformance layer, not a new continuation-domain capability: tasks `8.1`–`8.4` cover Pi CT-R5 tests, a global Pi extension, reload/resume/shutdown hardening, and the slice gate. The parent design maps Pi as root `agent_settled` (guarded by `ctx.isIdle()`), terminal `session_shutdown`, and `pi.sendMessage(..., { deliverAs: "followUp", triggerTurn: true })`.

The repository currently contains the Slice 5 continuation core and tests, but no `host/loop.mjs`, no `adapters/pi/`, and no `test/host-adapters.test.mjs`. The existing `plugin/tower-spike.js` is an OpenCode-specific legacy waker: it imports the core, consumes `tower.receive`, stops on every `session.deleted` (including children), and can consume before a failed wake. P7 planning assigns those concerns to a host-neutral controller and a thin OpenCode adapter. P8 must consume that controller contract rather than recreate polling, throttling, disposal, or delivery rules.

The normative parent requirement is CT-R5: the same five scenarios must run unchanged for OpenCode, Pi, and Claude. Pi is therefore a conformance adapter over one controller, not a second polling implementation. P6 recovery/schema work and P7 controller/OpenCode work are not merged into this planning workspace. Existing P7 planning explicitly permits proposal/spec/design/tasks to proceed provisionally, while blocking apply until the merged P6 and P7 seams are reconciled.

### Affected Areas

- `adapters/pi/` — new global Pi extension and its host/install manifest. It should translate Pi lifecycle signals, bind one proven root, delegate to `host/loop.mjs`, and provide idle-safe follow-up message injection.
- `host/loop.mjs` — P7-owned read-only dependency. P8 relies on its injected ports, non-consuming peek, throttle-before-peek ordering, serialized wake, bounded retry, and synchronous disposal invalidation; Pi-specific behavior must remain outside this module.
- `test/host-adapters.test.mjs` — extend the shared conformance fixture with `CT-R5-S1..S5@Pi`, `agent_settled`, `ctx.isIdle()`, `session_shutdown`, and exact follow-up wake mapping. The fixture must remain reusable by Claude (P9).
- `test/polling.test.mjs` — normally unchanged in P8; only update it if reconciliation exposes a genuinely host-neutral contract defect owned by P7 rather than adding Pi-specific polling assertions there.
- `test/fail-closed.test.mjs` — regression-only input to prove legacy OFF behavior and message preservation remain intact; it is not a Pi implementation target.
- `core.mjs`, `mcp.mjs`, and migration tests — read-only reconciliation inputs for the baseline P8 slice. P8 must not add SQLite/domain logic, continuation routes, claimant handling, or schema objects.
- `install.sh` and runtime publication paths — downstream P10 ownership. P8 may define Pi-specific manifest metadata under `adapters/pi/`, but must not perform global cutover or modify the active runtime.

### Dependencies and Boundaries

- **P6 dependency:** P8 needs the merged schema/checksum/manifest, rollback/quiescence contract, continuation receive/claim surface, dispatcher capability requirements, and any accepted `bootstrapAdmin` transition. P8 does not own a migration. If a real polling witness is required, it must be introduced by a separately approved additive migration (the P7 plan identifies this as a possible schema-6 concern), never by editing Migration 005.
- **P7 dependency:** P8 needs the merged `host/loop.mjs` lifecycle API and the shared adapter-test fixture. The controller contract must be host-neutral and stable enough for Pi and Claude; P8 must not compensate for an unresolved P7 transport or wake-payload decision by importing `core.mjs`.
- **Authority boundary:** Pi event/context objects are lifecycle evidence only. Trusted host/plugin/root metadata enters through the adapter capability; caller event fields must not become continuation authority. The adapter must never open SQLite, call consuming `receive`, call `claim`, or implement policy.
- **Root lifecycle:** Only the proven root may settle/start or resume polling. Child creation, child settlement, and child shutdown/deletion are ignored. Root `session_shutdown` must synchronously dispose the controller before timer cancellation or asynchronous Pi cleanup.
- **Wake lifecycle:** The controller performs a non-consuming peek. On an eligible pending descriptor, the Pi adapter calls `pi.sendMessage` with `deliverAs: "followUp"` and `triggerTurn: true`; a rejected send leaves the descriptor pending and is retried only by the controller's bounded policy.

### Testing Surface

P8 should add deterministic Pi cases to the shared adapter matrix, using fake controller ports/scheduling rather than the actual Tower:

- `CT-R5-S1` child shutdown/deletion does not stop root polling or consume a pending handoff.
- `CT-R5-S2` root `session_shutdown` stops polling before any later wake/peek/receive/claim.
- `CT-R5-S3` child creation is ignored.
- `CT-R5-S4` child settlement/idle is ignored; root polling remains unchanged.
- `CT-R5-S5` root shutdown/disposal wins a queued callback race.
- `agent_settled` is accepted only for the proven root and only when `ctx.isIdle()` is true; ambiguous or conflicting identity fails closed.
- Follow-up wake calls use the exact Pi message options and preserve pending delivery when `sendMessage` rejects.
- Reload/resume and repeated shutdown are idempotent; child activity cannot rebind the root.

Run the focused host-adapter/polling tests plus `test/fail-closed.test.mjs` under the configured `bun test` runner. No test should touch the actual Tower, `ACTIVE`, or production database. If shared controller behavior is not green after P7, stop at reconciliation instead of hiding the defect in Pi tests.

### Approaches

1. **Thin Pi extension over the shared host-neutral controller** — map Pi lifecycle events and `ctx.isIdle()` to the P7 controller, and map controller wakes to idle-safe `pi.sendMessage` follow-ups.
   - Pros: preserves one CT-R5 state machine, keeps SQLite/domain authority out of host code, gives Claude the same reusable contract, and makes failure/disposal ordering testable with one fixture.
   - Cons: depends on the exact merged P7 lifecycle/port API and the real Pi extension manifest/message signatures; unresolved transport details require the post-merge gate.
   - Effort: Medium

2. **Pi-owned polling and direct continuation integration** — implement Pi timers, throttling, identity checks, and delivery access inside `adapters/pi/`.
   - Pros: locally straightforward if Pi APIs are treated in isolation.
   - Cons: duplicates CT-R5 semantics, risks child/root and shutdown races, couples the adapter to SQLite/core, and would make Pi behavior diverge from OpenCode and Claude. This violates the parent architecture.
   - Effort: High

### Recommendation

Use the thin Pi extension over `host/loop.mjs`. Proceed through proposal, specification, design, and tasks provisionally under the canonical title **P8 — Pi Adapter**, while making the first implementation task a post-P6/P7 reconciliation gate. Freeze the shared controller and wake-port contract before writing Pi code; then add Pi conformance tests, the global extension, and manifest metadata as independently reviewable work. Keep P8 transient and schema-neutral unless a separately approved migration is required by the reconciled P7/P6 contract.

Planning can continue through tasks while P6 and P7 remain unmerged because the parent plan and P7 artifact explicitly treat these phases as provisional planning inputs. Apply must remain blocked until the merged P6 schema/dispatcher and P7 controller/test fixture are re-read, Pi event semantics are confirmed, and any polling-witness decision is closed. Forecast the adapter plus tests against the 400-line review budget; split the test/adapter boundary if the concrete forecast exceeds it, even though the session ceiling is 800 lines.

### Risks

- P8 could encode an API that changes when P6 or P7 merges; the reconciliation gate must precede apply.
- Pi's `agent_settled` and `ctx.isIdle()` signals may be incomplete or ambiguous; missing root proof must fail closed rather than rebind or wake.
- `session_shutdown` can race queued timers or in-flight wakes; synchronous controller invalidation must precede cleanup.
- Incorrect `pi.sendMessage` options could create a normal new turn, duplicate work, or fail to wake; exact option mapping needs a focused contract test.
- A direct or consuming delivery call from the adapter could lose pending work on wake failure; only the controller's non-consuming port is permitted.
- A real quiescence/polling witness would introduce schema coupling; P8 must not edit Migration 005 or smuggle migration work into the adapter.
- Global Pi installation and versioned runtime cutover belong to P10; conflating them with P8 would widen the slice and exceed the review budget.

### Ready for Proposal

Yes — the canonical scope is sufficiently precise for provisional proposal/spec/design/tasks work: **P8 — Pi Adapter**, implementing the Pi CT-R5 conformance adapter over the P7 host-neutral loop with no new domain authority or migration. Tell the next phases that planning is allowed before P6/P7 merge, but apply is explicitly gated on post-merge reconciliation of schema, dispatcher/capability, loop ports, Pi event shape, wake payload, and any polling-witness decision.
