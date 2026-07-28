# P7 Host-Neutral Polling Loop and OpenCode Adapter — Tasks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,160–1,560 cumulative authored additions + deletions; 240–400 per behavior unit |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | P7-A1 → P7-A2 → P7-B → P7-C; each is an approved autonomous ≤400-line review slice |
| Delivery strategy | auto-chain; four serial units, one active at a time |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Approved chain boundary:** four serial `stacked-to-main` slices in the stated
order, with only one active at a time. Apply-time branch/base identities remain
unallocated until the allocation step that precedes exact record approval.

## Apply Gate — Post-P6 Reconciliation (blocks every RED task)

P7 apply is blocked until `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` is complete and approved. This gate is evidence-only: do not modify runtime, implementation, tests, P6 files, Migration 005, `core.mjs`, `mcp.mjs`, or unrelated `.gitignore` entries while reconciling.

Native `apply-ready` does not bypass this gate. P7 depends only on merged P6, not Change A. Its record MUST preserve `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`, the C→D edge, and Change E ownership.

- [x] Record distinct project/plan/slice/assignment/jornada/session and host/plugin/root identities; prove `binding_epoch`, Main-issued/Change-E-enforced `host_epoch`, and controller-local `generation` are not conflated. Concrete apply-time values remain pending in the allocation item below. <!-- sdd-owner: implementation -->
- [ ] Pin the assignment-bound `Worktrees/<plan>/<lane>/<slice>` path inside the registered project container, authorized base SHA, allowed `plan/...` or `feat/...` branch, assignment, and session; confirm Workspace Manager owns lifecycle and P7 owns none. <!-- sdd-owner: implementation -->

- [x] Create `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` and record merged-base evidence for P6: merged commit, schema version, Migration 005 byte length/checksum, schema-5 manifest identity, accepted `bootstrapAdmin`/replay behavior, and unchanged `polling_witness = 'UNAVAILABLE_BEFORE_P7'`. <!-- sdd-owner: implementation -->
- [x] Reconcile the merged continuation and capability seams from approved decisions and source analysis: argument-free non-consuming receive/peek result, claim boundary, stable errors, dispatcher/MCP constructor capabilities, trusted process metadata, root-ID/binding-epoch continuity contract, and no P6 route/table/test/reserved-name conflict. Concrete runtime binding remains pending; no runtime proof is claimed. <!-- sdd-owner: implementation -->
- [x] Capture exact OpenCode `1.18.7` package/plugin/SDK integrity, binary hash, isolated root/child/metadata/deletion/hook/prompt fixtures, and the trusted-host-binding plus non-consuming `session.get` root-proof rule in `reconciliation.md`. <!-- sdd-owner: implementation -->
- [x] Select and threat-model the private injected capability-gated MCP `receive` peek port in `reconciliation.md`; forbid a second public API and leave production broker/process wiring to Change E. The current legacy plugin is not clean-adapter proof. <!-- sdd-owner: implementation -->
- [x] Pin the exact legacy `client.session.promptAsync` request envelope and generic descriptor-free prompt in `reconciliation.md`; assert HTTP 204 separately, treat data `{}` as non-completion, and exclude consuming legacy automatic queue wake while preserving manual APIs. <!-- sdd-owner: implementation -->
- [x] Record that transient polling is compatible with merged P6 rollback/quiescence semantics, including the accepted harmless late generic wake and continued receive→claim→ack authority boundary; do not claim a persisted witness. <!-- sdd-owner: implementation -->
- [x] Run `bun test` against the merged P6 baseline and record the exact Bun version and zero-failure result in `reconciliation.md`; reforecast P7-A1, P7-A2, P7-B, and P7-C at ≤400 authored changed lines with their allowed files and rollback boundaries. <!-- sdd-owner: implementation -->
- [ ] Mark the reconciliation gate approved in `reconciliation.md` only when every evidence item is concrete and all transport, root-proof, prompt, legacy, and transient-polling decisions are resolved; otherwise leave P7 apply blocked. <!-- sdd-owner: implementation -->

Clean-adapter import conformance is an implementation-time P7-B/P7-C acceptance
criterion, not completed readiness evidence and not a pre-allocation blocker.
The explicit RED/REFACTOR tasks below must prove that the future adapter has no
direct core/MCP/SQLite/database-path access and no consuming receive path.

## P7-A1 — Root Lifecycle and Synchronous Invalidation (depends on approved reconciliation)

**Scope:** `host/loop.mjs`, `test/polling.test.mjs`. **Budget:** 280–380 authored changed lines. **Finish:** one immutable proven root, settled-only one-shot scheduling, generation guards, and synchronous idempotent invalidation; no adapter composition.

- [ ] **RED:** Add failing deterministic cases in `test/polling.test.mjs` using a fake clock, FIFO one-shot scheduler, and deferred ports for invalid/first/repeated/conflicting root binding; exact-root settle gating; duplicate settled no-ops; queued stale callbacks; and root/plugin disposal before queued or deferred work. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `host/loop.mjs` with injected ports and `createPollingLoop` lifecycle methods sufficient to pass the A1 cases: first-write-wins opaque root binding, bound-root-only settle/deletion, one owned one-shot callback, generation rotation, and synchronous disposal before cancel/trace. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Extend `test/polling.test.mjs` with cancellation-throw and trace-throw cases plus disposal during deferred `peek` and deferred `wake` settlement; prove stale callbacks and completions perform no later `peek`, `wake`, `receive`, or `claim`. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Simplify `host/loop.mjs` and A1 test helpers without changing behavior; preserve a host-SDK/SQLite/core/MCP-free controller boundary and frozen descriptor-free diagnostic state. <!-- sdd-owner: implementation -->
- [ ] Run `bun test test/polling.test.mjs` and `node --check host/loop.mjs`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness result `N/A` (deterministic fake scheduler is the process-local boundary), and the rollback boundary “remove only A1 blocks from `host/loop.mjs` and `test/polling.test.mjs`” in the P7-A1 completion note in this file. <!-- sdd-owner: implementation -->

## P7-A2 — Polling and Wake Safety (depends on P7-A1)

**Scope:** `host/loop.mjs`, `test/polling.test.mjs`. **Budget:** 320–400 authored changed lines. **Finish:** throttle-before-peek, deterministic polling, serialized wake, bounded retries, and pending-delivery preservation; A1 remains independently revertible.

- [ ] **RED:** Add failing deterministic cases in `test/polling.test.mjs` for throttle-before-peek and exact window reopening, empty/rejected peek scheduling, one in-flight wake, pre-call attempt accounting, synchronous wake throw, asynchronous wake rejection, and a pending sentinel that remains unconsumed/unclaimed. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Extend `host/loop.mjs` with validated frozen policy, monotonic sliding-window accounting, throttle scheduling before storage access, fresh non-consuming `peek` per tick, serialized `wake`, and safe trace events required by the A2 RED cases. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Add cases for retry delays exactly `1000`, `2000`, and `4000` ms; fresh re-peek on every retry; fourth failure exhaustion; successful wake pausing in `AWAITING_SETTLE`; global-window retention across a later root settle; and malformed/regressing clock or scheduler failure pausing before peek. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Remove duplicated scheduling/accounting paths in `host/loop.mjs` and stabilize fake-scheduler helpers in `test/polling.test.mjs` while retaining opaque descriptors, no descriptor logging, and no consumption/claim behavior. <!-- sdd-owner: implementation -->
- [ ] Run `bun test test/polling.test.mjs` and `node --check host/loop.mjs`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness result `N/A` (deterministic injected ports are the runtime boundary), and the rollback boundary “remove only A2 polling/wake blocks while retaining inert A1 lifecycle behavior” in the P7-A2 completion note in this file. <!-- sdd-owner: implementation -->

## P7-B — OpenCode Lifecycle Conformance (depends on P7-A2)

**Scope:** `plugin/tower-spike.js`, `test/helpers/host-adapter-conformance.mjs`, `test/host-adapters.test.mjs`. **Budget:** 320–400 authored changed lines. **Finish:** testable OpenCode lifecycle classification around the controller, with reusable CT-R5 conformance; trusted transport and production `promptAsync` composition remain P7-C work.

- [ ] **RED:** Create failing parameterized conformance cases in `test/helpers/host-adapter-conformance.mjs` and OpenCode cases in `test/host-adapters.test.mjs` with stable IDs `CT-R5-S1@OpenCode` through `CT-R5-S5@OpenCode`, covering child deletion/creation/idle no-ops, matching-root deletion, plugin disposal, malformed metadata, and conflicting identities. Before adapter production work, add a failing static import-boundary case against the current legacy `plugin/tower-spike.js` that scans static imports, dynamic imports, and `require` specifiers and reports the exact forbidden match when any adapter path reaches `core.mjs`, `mcp.mjs`, `bun:sqlite`/SQLite modules, or a database module/path. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Refactor `plugin/tower-spike.js` into a testable lifecycle adapter factory that classifies only reconciled proven root/child events, binds once, forwards exact bound-root settle/deletion to the controller, and invalidates synchronously on matching root deletion or plugin disposal. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Add OpenCode event-order and incomplete-metadata variants to `test/host-adapters.test.mjs`; prove an unknown event is never treated as root, child cache cleanup cannot stop polling, and the generic helper exposes only host actions/observations rather than OpenCode field names. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Reduce adapter and harness duplication while keeping `host/loop.mjs` host-neutral; verify `plugin/tower-spike.js` has no direct SQLite, `core.mjs`, `mcp.mjs`, consuming legacy `receive`, or delivery `claim` path. <!-- sdd-owner: implementation -->
- [ ] Run `bun test test/host-adapters.test.mjs`, `bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs`, and `node --check plugin/tower-spike.js`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness scenario/result for CT-R5-S1..S5, and the rollback boundary “remove only adapter/fixture/conformance changes; retain the unused controller” in the P7-B completion note in this file. <!-- sdd-owner: implementation -->

## P7-C — Reconciled Transport and Wake Composition (approved serial unit; depends on P7-B)

**Blocked until:** apply-time identities are allocated, the exact bound
reconciliation record is then approved, and approval evidence opens the gate.
Transport, root proof, exact `promptAsync`, legacy
auto-wake exclusion, transient behavior, and chain topology are resolved.
**Budget:** 240–380 authored changed lines; split before RED if the approved files exceed this budget.

**Stop condition:** if reconciliation requires a `core.mjs` or `mcp.mjs` change, stop this unit before RED. Require a design amendment and plan that seam as a separate ≤400-line unit; do not edit those files in P7-C.

- [ ] **RED:** After the P7-C block is cleared and before composition production work, add failing cases in `test/host-adapters.test.mjs` (and only reconciliation-approved seam tests) for the selected non-consuming transport, fail-closed absence of trusted transport/root proof, byte-identical root/binding-epoch continuity, exact generic `promptAsync` mapping, wake rejection, and prohibition of descriptor/token/evidence/sender interpolation. Add a failing composition-boundary scan over `plugin/tower-spike.js` and every reconciliation-approved seam file that reports any static/dynamic/`require` import reaching `core.mjs`, `mcp.mjs`, `bun:sqlite`/SQLite modules, or a database module/path; also snapshot the existing public continuation exports/routes and fail if P7 adds a second public continuation API instead of using the private injected port. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Wire only reconciliation-approved dependencies in `plugin/tower-spike.js` and approved seam files so controller `peek` is trusted and non-consuming, `wake` calls `client.session.promptAsync` exactly once for the bound root, and missing proof/transport fails closed without legacy consuming fallback. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Add isolated temporary-root transport coverage for the approved seam and the fixed legacy auto-wake exclusion; prove stable safe error classification, no second public continuation API, no direct core/SQLite import, and preserved pending delivery after rejected wakes. Consuming legacy automatic wake is not a P7 variant. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Consolidate composition boundaries and test fixtures without expanding authority or persistence; retain transient-only polling and keep Migration 005, schema manifest, P6 worktree, runtime configuration, and unrelated `.gitignore` untouched. <!-- sdd-owner: implementation -->
- [ ] Run `bun test test/host-adapters.test.mjs`, the reconciliation-approved isolated transport test, `bun test test/polling.test.mjs test/host-adapters.test.mjs test/fail-closed.test.mjs`, `bun test`, `node --check plugin/tower-spike.js`, and `git diff --check`; record exact results, an authored-line receipt from `git diff --numstat`, runtime harness command/scenario/result, and the rollback boundary “revert only P7-C composition/seam changes with no schema rollback” in the P7-C completion note in this file. <!-- sdd-owner: implementation -->

## Constraints

- Keep Control Tower disarmed and use deterministic or isolated temporary fixtures only; never mutate the actual runtime database.
- Do not add persistence, a polling/quiescence witness, Migration 005 changes, P6 worktree changes, runtime publication/configuration, Pi/Claude adapters, or P8 work.
- Do not start a later unit until its predecessor’s verification, receipt, runtime-harness record, and rollback boundary are complete.

## Evidence boundary and canonical count

Retry is source-only/unproven and must be established by P7-A2 deterministic RED
tests. A successful provider turn was unexercised because the isolated fixture had
no credentials or provider network traffic; it is not a readiness gate and must
not be described as runtime-proven. The canonical plan has **30 tasks** in the
approved serial `P7-A1 → P7-A2 → P7-B → P7-C` order. The roadmap's `0/28`
counter is a later revision follow-up because current roadmap bytes are
ArtifactRef-bound.
