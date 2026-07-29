# P7 Host-Neutral Polling Loop and OpenCode Adapter — Tasks

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers. P7 means `p7-host-neutral-loop-opencode-adapter`; neither value denotes positional Plan P6 or Plan P7.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,160–1,560 cumulative authored additions + deletions; 240–400 per Sesión |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S1.13 → S1.14 → S1.15 → provisional S1.16; each is an autonomous ≤400-line Sesión |
| Delivery strategy | auto-forecast; pause for a topology decision before apply |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

**Recommended chain boundary:** plan four sequential Sesiones in the stated order; do not create branches or PRs until a P7-specific topology is approved.

## Apply prerequisite — Approved S1.11 reconciliation

S1.11 owns creation and approval of `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`; its canonical Módulo and Tareas live in [`p7-p8-integrated-reconciliation/tasks.md`](../p7-p8-integrated-reconciliation/tasks.md#sesión-111--p7-reconciliation-record). S1.13–S1.16 consume and validate that approved record; they do not recreate or re-author it.

Native `apply-ready` does not bypass this gate. P7 depends only on merged P6, not Change A. The approved record MUST preserve `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`, the C→D edge, and Change E ownership.

## Sesión 1.13 — Root Lifecycle and Synchronous Invalidation

### Módulo 1.13.1 — Controller lifecycle

**Scope:** `host/loop.mjs`, `test/polling.test.mjs`. **Budget:** 280–380 authored changed lines. **Finish:** one immutable proven root, settled-only one-shot scheduling, generation guards, and synchronous idempotent invalidation; no adapter composition.

- [ ] Tarea 1.13.1.1 **RED:** Add failing deterministic cases in `test/polling.test.mjs` using a fake clock, FIFO one-shot scheduler, and deferred ports for invalid/first/repeated/conflicting root binding; exact-root settle gating; duplicate settled no-ops; queued stale callbacks; and root/plugin disposal before queued or deferred work. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.13.1.2 **GREEN:** Add `host/loop.mjs` with injected ports and `createPollingLoop` lifecycle methods sufficient to pass the lifecycle cases: first-write-wins opaque root binding, bound-root-only settle/deletion, one owned one-shot callback, generation rotation, and synchronous disposal before cancel/trace. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.13.1.3 **TRIANGULATE:** Extend `test/polling.test.mjs` with cancellation-throw and trace-throw cases plus disposal during deferred `peek` and deferred `wake` settlement; prove stale callbacks and completions perform no later `peek`, `wake`, `receive`, or `claim`. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.13.1.4 **REFACTOR:** Simplify `host/loop.mjs` and test helpers without changing behavior; preserve a host-SDK/SQLite/core/MCP-free controller boundary and frozen descriptor-free diagnostic state. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.13.1.5 Run `bun test test/polling.test.mjs` and `node --check host/loop.mjs`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness result `N/A` (deterministic fake scheduler is the process-local boundary), and the rollback boundary “remove only S1.13 blocks from `host/loop.mjs` and `test/polling.test.mjs`” in the S1.13 completion note in this file. <!-- sdd-owner: implementation -->

## Sesión 1.14 — Polling and Wake Safety

### Módulo 1.14.1 — Polling and wake behavior

**Scope:** `host/loop.mjs`, `test/polling.test.mjs`. **Budget:** 320–400 authored changed lines. **Finish:** throttle-before-peek, deterministic polling, serialized wake, bounded retries, and pending-delivery preservation; S1.13 remains independently revertible.

- [ ] Tarea 1.14.1.1 **RED:** Add failing deterministic cases in `test/polling.test.mjs` for throttle-before-peek and exact window reopening, empty/rejected peek scheduling, one in-flight wake, pre-call attempt accounting, synchronous wake throw, asynchronous wake rejection, and a pending sentinel that remains unconsumed/unclaimed. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.14.1.2 **GREEN:** Extend `host/loop.mjs` with validated frozen policy, monotonic sliding-window accounting, throttle scheduling before storage access, fresh non-consuming `peek` per tick, serialized `wake`, and safe trace events required by the RED cases. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.14.1.3 **TRIANGULATE:** Add cases for retry delays exactly `1000`, `2000`, and `4000` ms; fresh re-peek on every retry; fourth failure exhaustion; successful wake pausing in `AWAITING_SETTLE`; global-window retention across a later root settle; and malformed/regressing clock or scheduler failure pausing before peek. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.14.1.4 **REFACTOR:** Remove duplicated scheduling/accounting paths in `host/loop.mjs` and stabilize fake-scheduler helpers in `test/polling.test.mjs` while retaining opaque descriptors, no descriptor logging, and no consumption/claim behavior. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.14.1.5 Run `bun test test/polling.test.mjs` and `node --check host/loop.mjs`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness result `N/A` (deterministic injected ports are the runtime boundary), and the rollback boundary “remove only S1.14 polling/wake blocks while retaining inert S1.13 lifecycle behavior” in the S1.14 completion note in this file. <!-- sdd-owner: implementation -->

## Sesión 1.15 — OpenCode Lifecycle Conformance

### Módulo 1.15.1 — OpenCode adapter and shared harness

**Scope:** `plugin/tower-spike.js`, `test/helpers/host-adapter-conformance.mjs`, `test/host-adapters.test.mjs`. **Budget:** 320–400 authored changed lines. **Finish:** testable OpenCode lifecycle classification around the controller, with reusable CT-R5 conformance; trusted transport and production `promptAsync` composition remain S1.16 work.

- [ ] Tarea 1.15.1.1 **RED:** Create failing parameterized conformance cases in `test/helpers/host-adapter-conformance.mjs` and OpenCode cases in `test/host-adapters.test.mjs` with stable IDs `CT-R5-S1@OpenCode` through `CT-R5-S5@OpenCode`, covering child deletion/creation/idle no-ops, matching-root deletion, plugin disposal, malformed metadata, and conflicting identities. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.2 **GREEN:** Refactor `plugin/tower-spike.js` into a testable lifecycle adapter factory that classifies only reconciled proven root/child events, binds once, forwards exact bound-root settle/deletion to the controller, and invalidates synchronously on matching root deletion or plugin disposal. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.3 **TRIANGULATE:** Add OpenCode event-order and incomplete-metadata variants to `test/host-adapters.test.mjs`; prove an unknown event is never treated as root, child cache cleanup cannot stop polling, and the generic helper exposes only host actions/observations rather than OpenCode field names. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.4 **REFACTOR:** Reduce adapter and harness duplication while keeping `host/loop.mjs` host-neutral; verify `plugin/tower-spike.js` has no direct SQLite, `core.mjs`, `mcp.mjs`, consuming legacy `receive`, or delivery `claim` path. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.5 Run `bun test test/host-adapters.test.mjs`, `bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs`, and `node --check plugin/tower-spike.js`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness scenario/result for CT-R5-S1..S5, and the rollback boundary “remove only S1.15 adapter/fixture/conformance changes; retain the unused controller” in the S1.15 completion note in this file. <!-- sdd-owner: implementation -->

## Sesión 1.16 — Reconciled Transport and Wake Composition

### Módulo 1.16.1 — Trusted transport and wake composition

**Blocked until:** `reconciliation.md` approves the concrete transport, root-proof rule, exact `promptAsync` envelope, and legacy-compatibility decision. **Budget:** 240–380 authored changed lines; split before RED if the approved files exceed this budget.

**Stop condition:** if reconciliation requires a `core.mjs` or `mcp.mjs` change, stop S1.16 before RED. Require a design amendment and plan that seam as a separate Sesión; do not edit those files in S1.16.

- [ ] Tarea 1.16.1.1 **RED:** After the S1.16 block is cleared, add failing cases in `test/host-adapters.test.mjs` (and only reconciliation-approved seam tests) for the selected non-consuming transport, fail-closed absence of trusted transport/root proof, byte-identical root/binding-epoch continuity, exact generic `promptAsync` mapping, wake rejection, and prohibition of descriptor/token/evidence/sender interpolation. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.2 **GREEN:** Wire only reconciliation-approved dependencies in `plugin/tower-spike.js` and approved seam files so controller `peek` is trusted and non-consuming, `wake` calls `client.session.promptAsync` exactly once for the bound root, and missing proof/transport fails closed without legacy consuming fallback. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.3 **TRIANGULATE:** Add isolated temporary-root transport coverage for the approved seam and legacy-decision variants; prove stable safe error classification, no second public continuation API, no direct core/SQLite import, and preserved pending delivery after rejected wakes. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.4 **REFACTOR:** Consolidate composition boundaries and test fixtures without expanding authority or persistence; retain transient-only polling and keep Migration 005, schema manifest, P6 worktree, runtime configuration, and unrelated `.gitignore` untouched. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.5 Run `bun test test/host-adapters.test.mjs`, the reconciliation-approved isolated transport test, `bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs`, `bun test`, `node --check plugin/tower-spike.js`, and `git diff --check`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness command/scenario/result, and the rollback boundary “revert only S1.16 composition/seam changes with no schema rollback” in the S1.16 completion note in this file. <!-- sdd-owner: implementation -->

## Constraints

- Keep Control Tower disarmed and use deterministic or isolated temporary fixtures only; never mutate the actual runtime database.
- Do not add persistence, a polling/quiescence witness, Migration 005 changes, P6 worktree changes, runtime publication/configuration, Pi/Claude adapters, or P8 work.
- Do not start a later Sesión until its predecessor’s verification, receipt, runtime-harness record, and rollback boundary are complete.
