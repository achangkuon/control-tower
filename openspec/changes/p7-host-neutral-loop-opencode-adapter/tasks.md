# P7 Host-Neutral Polling Loop and OpenCode Adapter — Tasks

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers. P7 means `p7-host-neutral-loop-opencode-adapter`; neither value denotes positional Plan P6 or Plan P7.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,160–1,560 cumulative authored additions + deletions; 240–400 per Sesión |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S1.13 → S1.14 → S1.15 → S1.16; each is an autonomous ≤400-line Sesión |
| Delivery strategy | auto-forecast; pause for a topology decision before apply |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

**Recommended chain boundary:** plan four sequential Sesiones in the stated order; do not create branches or PRs until a P7-specific topology is approved.

## Apply prerequisite — Bounded S1.11 contract approval

S1.11 owns preparation and exact maintainer approval of the bounded apply contract in `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`; its canonical Módulo and Tareas live in [`p7-p8-integrated-reconciliation/tasks.md`](../p7-p8-integrated-reconciliation/tasks.md#sesión-111--p7-reconciliation-record). The contract is explicitly not a production-readiness determination. S1.13–S1.16 consume the approved contract and close its P7 consumer-conformance obligations; they do not recreate or re-author it.

The contract selects Option A: Host Launcher / Change E injects an opaque consumer capability carrying non-consuming peek, immutable proven root identity, and validated `binding_epoch`; P7 consumes it and fails closed on absence or drift. P7 must not import `core.mjs`, `mcp.mjs`, or SQLite, expose a second/public continuation API, or manufacture provider authority. Concrete Change E provider/injection implementation and proof remain later obligations. P7 depends only on merged P6, not Change A, and preserves `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`, the C→D edge, and Change E ownership.

## Sesión 1.13 — Root Lifecycle and Synchronous Invalidation

**Área:** `host/loop.mjs`, `test/polling.test.mjs`.

**Recurso:** —. The boundary is a process-local deterministic fake scheduler/controller with no adapter composition, database, Tower state, external runtime, release token, shared host process, host SDK, SQLite, `core.mjs`, or `mcp.mjs`. Runtime harness: `N/A`.

### Módulo 1.13.1 — Controller lifecycle

**Scope:** `host/loop.mjs`, `test/polling.test.mjs`. **Budget:** 280–380 authored changed lines. **Finish:** one immutable proven root, settled-only one-shot scheduling, generation guards, and synchronous idempotent invalidation; no adapter composition.

- [x] Tarea 1.13.1.1 **RED:** Add failing deterministic cases in `test/polling.test.mjs` using a fake clock, FIFO one-shot scheduler, and deferred ports for invalid/first/repeated/conflicting root binding; exact-root settle gating; duplicate settled no-ops; queued stale callbacks; and root/plugin disposal before queued or deferred work. <!-- sdd-owner: implementation -->
- [x] Tarea 1.13.1.2 **GREEN:** Add `host/loop.mjs` with injected ports and `createPollingLoop` lifecycle methods sufficient to pass the lifecycle cases: first-write-wins opaque root binding, bound-root-only settle/deletion, one owned one-shot callback, generation rotation, and synchronous disposal before cancel/trace. <!-- sdd-owner: implementation -->
- [x] Tarea 1.13.1.3 **TRIANGULATE:** Extend `test/polling.test.mjs` with cancellation-throw and trace-throw cases plus disposal during deferred `peek` and deferred `wake` settlement; prove stale callbacks and completions perform no later `peek`, `wake`, `receive`, or `claim`. <!-- sdd-owner: implementation -->
- [x] Tarea 1.13.1.4 **REFACTOR:** Simplify `host/loop.mjs` and test helpers without changing behavior; preserve a host-SDK/SQLite/core/MCP-free controller boundary and frozen descriptor-free diagnostic state. <!-- sdd-owner: implementation -->
- [x] Tarea 1.13.1.5 Run `bun test test/polling.test.mjs` and `node --check host/loop.mjs`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness result `N/A` (deterministic fake scheduler is the process-local boundary), and the rollback boundary “remove only S1.13 blocks from `host/loop.mjs` and `test/polling.test.mjs`” in the S1.13 completion note in this file. <!-- sdd-owner: implementation -->

**S1.13 completion note (2026-08-12):**
- Focused test: `bun test test/polling.test.mjs` — PASS, 10 pass, 0 fail, 73 expect calls.
- Syntax check: `node --check host/loop.mjs` — PASS, exit 0 with no output.
- Full suite after `bun install --frozen-lockfile`: `bun test` — PASS, 620 pass, 0 fail, 3,691 expect calls across 40 files in 57.98s; tracked `bun.lock` and `package.json` hashes and status remained unchanged.
- Authored-line receipt: `host/loop.mjs` 164 additions + `test/polling.test.mjs` 214 additions = 378 authored lines.
- Runtime harness: `N/A` — the deterministic fake clock, FIFO one-shot scheduler, and deferred ports are the process-local runtime boundary.
- Rollback boundary: remove only S1.13 blocks from `host/loop.mjs` and `test/polling.test.mjs`.

## Sesión 1.14 — Polling and Wake Safety

### Módulo 1.14.1 — Polling and wake behavior

**Scope:** `host/loop.mjs`, `test/polling.test.mjs`. **Budget:** 320–400 authored changed lines. **Finish:** throttle-before-peek, deterministic polling, serialized wake, bounded retries, and pending-delivery preservation; S1.13 remains independently revertible.

- [x] Tarea 1.14.1.1 **RED:** Add failing deterministic cases in `test/polling.test.mjs` for throttle-before-peek and exact window reopening, empty/rejected peek scheduling, one in-flight wake, pre-call attempt accounting, synchronous wake throw, asynchronous wake rejection, and a pending sentinel that remains unconsumed/unclaimed. <!-- sdd-owner: implementation -->
- [x] Tarea 1.14.1.2 **GREEN:** Extend `host/loop.mjs` with validated frozen policy, monotonic sliding-window accounting, throttle scheduling before storage access, fresh non-consuming `peek` per tick, serialized `wake`, and safe trace events required by the RED cases. <!-- sdd-owner: implementation -->
- [x] Tarea 1.14.1.3 **TRIANGULATE:** Add cases for retry delays exactly `1000`, `2000`, and `4000` ms; fresh re-peek on every retry; fourth failure exhaustion; successful wake pausing in `AWAITING_SETTLE`; global-window retention across a later root settle; and malformed/regressing clock or scheduler failure pausing before peek. <!-- sdd-owner: implementation -->
- [x] Tarea 1.14.1.4 **REFACTOR:** Remove duplicated scheduling/accounting paths in `host/loop.mjs` and stabilize fake-scheduler helpers in `test/polling.test.mjs` while retaining opaque descriptors, no descriptor logging, and no consumption/claim behavior. <!-- sdd-owner: implementation -->
- [x] Tarea 1.14.1.5 Run `bun test test/polling.test.mjs` and `node --check host/loop.mjs`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness result `N/A` (deterministic injected ports are the runtime boundary), and the rollback boundary “remove only S1.14 polling/wake blocks while retaining inert S1.13 lifecycle behavior” in the S1.14 completion note in this file. <!-- sdd-owner: implementation -->

**S1.14 completion note (2026-08-12):**
- Focused test: `bun test test/polling.test.mjs` — PASS, 18 pass, 0 fail, 175 expect calls.
- Syntax check: `node --check host/loop.mjs` — PASS, exit 0 with no output.
- Full suite: `bun test` — PASS, 628 pass, 0 fail, 3,793 expect calls across 40 files in 75.64s.
- Authored-line receipt: `host/loop.mjs` +142/-38 and `test/polling.test.mjs` +207/-5 = 392 authored changed lines.
- Runtime harness: `N/A` — deterministic injected clock, scheduler, `peek`, and `wake` ports are the process-local runtime boundary.
- Rollback boundary: remove only S1.14 polling/wake blocks while retaining inert S1.13 lifecycle behavior.
- Reliability review: typed `UNAVAILABLE` — direct `review-reliability` dispatch required a controller-owned candidate lineage while the native review lifecycle is suspended; no lineage was created and no verdict was fabricated.

## Sesión 1.15 — OpenCode Lifecycle Conformance

### Módulo 1.15.1 — OpenCode adapter and shared harness

**Scope:** `plugin/tower-spike.js`, `test/helpers/host-adapter-conformance.mjs`, `test/host-adapters.test.mjs`. **Budget:** 320–400 authored changed lines. **Finish:** testable OpenCode lifecycle classification around the controller, with reusable CT-R5 conformance; trusted transport and production `promptAsync` composition remain S1.16 work.

**Ownership boundary:** S1.15 owns R3 fixture/root-proof evidence. R3 fixture evidence is deferred to existing S1.15.

- [ ] Tarea 1.15.1.1 **RED:** Create failing parameterized conformance cases in `test/helpers/host-adapter-conformance.mjs` and OpenCode cases in `test/host-adapters.test.mjs` with stable IDs `CT-R5-S1@OpenCode` through `CT-R5-S5@OpenCode`, covering child deletion/creation/idle no-ops, matching-root deletion, plugin disposal, malformed metadata, and conflicting identities. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.2 **GREEN:** Refactor `plugin/tower-spike.js` into a testable lifecycle adapter factory that classifies only reconciled proven root/child events, binds once, forwards exact bound-root settle/deletion to the controller, and invalidates synchronously on matching root deletion or plugin disposal. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.3 **TRIANGULATE:** Add OpenCode event-order and incomplete-metadata variants to `test/host-adapters.test.mjs`; prove an unknown event is never treated as root, child cache cleanup cannot stop polling, and the generic helper exposes only host actions/observations rather than OpenCode field names. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.4 **REFACTOR:** Reduce adapter and harness duplication while keeping `host/loop.mjs` host-neutral; verify `plugin/tower-spike.js` has no direct SQLite, `core.mjs`, `mcp.mjs`, consuming legacy `receive`, or delivery `claim` path. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.15.1.5 Run `bun test test/host-adapters.test.mjs`, `bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs`, and `node --check plugin/tower-spike.js`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness scenario/result for CT-R5-S1..S5, and the rollback boundary “remove only S1.15 adapter/fixture/conformance changes; retain the unused controller” in the S1.15 completion note in this file. <!-- sdd-owner: implementation -->

## Sesión 1.16 — Reconciled Transport and Wake Composition

### Módulo 1.16.1 — Trusted consumer transport and wake composition

**Blocked until:** `reconciliation.md` receives fresh structural revalidation and exact maintainer approval of the bounded apply contract. **Budget:** 240–380 authored changed lines; split before RED if the approved consumer files exceed this budget.

**Ownership boundary:** S1.16 owns R4 pinned-envelope consumer evidence plus its assigned Option A consumer conformance. It does not construct or prove the Change E provider/injection. If consumer work cannot proceed without `core.mjs`, `mcp.mjs`, SQLite, a second/public continuation API, or manufactured provider authority, stop before RED; later provider implementation that needs decomposition must go to `planificador-granular`, without assigning a Session here.

- [ ] Tarea 1.16.1.1 **RED:** After bounded-contract approval, add failing cases in `test/host-adapters.test.mjs` (and only approved consumer-seam tests) for the injected non-consuming capability, fail-closed absence or drift of trusted root/`binding_epoch`, exact generic `promptAsync` mapping, wake rejection, legacy automatic-wake preservation, and prohibition of descriptor/token/evidence/sender/domain interpolation. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.2 **GREEN:** Wire only approved consumer dependencies in `plugin/tower-spike.js` and approved consumer seam files so controller `peek` is trusted and non-consuming, `wake` calls `client.session.promptAsync` exactly once for the bound root, legacy automatic wake remains bounded/non-consuming/non-lossy, and missing or drifting proof/transport fails closed. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.3 **TRIANGULATE:** Add isolated consumer-capability and legacy compatibility coverage; prove stable safe error classification, no second/public continuation API, no `core.mjs`/`mcp.mjs`/SQLite import, no provider-authority manufacture, preserved pending delivery after rejected wakes, and no degradation to manual queue handling. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.4 **REFACTOR:** Consolidate composition boundaries and test fixtures without expanding authority or persistence; retain transient-only polling and keep Migration 005, schema manifest, P6 worktree, runtime configuration, and unrelated `.gitignore` untouched. <!-- sdd-owner: implementation -->
- [ ] Tarea 1.16.1.5 Run `bun test test/host-adapters.test.mjs`, the reconciliation-approved isolated transport test, `bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs`, `bun test`, `node --check plugin/tower-spike.js`, and `git diff --check`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness command/scenario/result, and the rollback boundary “revert only S1.16 composition/seam changes with no schema rollback” in the S1.16 completion note in this file. <!-- sdd-owner: implementation -->

## Constraints

- Keep Control Tower disarmed and use deterministic or isolated temporary fixtures only; never mutate the actual runtime database.
- Do not add persistence, a polling/quiescence witness, Migration 005 changes, P6 worktree changes, runtime publication/configuration, Pi/Claude adapters, or P8 work.
- Do not start a later Sesión until its predecessor’s verification, receipt, runtime-harness record, and rollback boundary are complete.
