# Tasks: P8 — Pi Adapter

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 620–780 authored additions + deletions |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 contract gate + RED; PR 2 adapter GREEN; PR 3 refactor/regression |
| Delivery strategy | auto-chain |
| Chain strategy | pending maintainer choice before apply |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Sesiones

| Sesión | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S1.17 | Validate approved legacy P6/legacy P7/Pi contracts and land all failing RED proofs | PR 1 | `bun test test/host-adapters.test.mjs` | N/A — planning/adapter tests must not activate Tower | Revert validation and RED cases only; retain the approved record |
| S1.18 | Implement generation-scoped Pi gate/coordinator and exact wake mapping | PR 2 | `bun test test/host-adapters.test.mjs` | N/A — fake Pi/loop only; no Tower runtime state | Revert `adapters/pi/` and GREEN implementation |
| S1.19 | Refactor seams and prove shared/regression behavior | PR 3 | `bun test test/host-adapters.test.mjs && bun test` | N/A — verification is fixture-only | Revert refactor/tests without schema or runtime rollback |

## Sesión 1.17 — Reconciliation Gate and RED Tests

### Módulo 1.17.1 — Reconciliation validation and RED proofs

- P8 remains blocked until legacy P7 is independently reconciled and integrated and P8's separate record is approved. Native `apply-ready` does not bypass either gate; P8 has no Change A dependency.
- [ ] Tarea 1.17.1.1 **First and blocking task:** consume and verify the approved `openspec/changes/p8-slice-planning/reconciliation.md` produced by S1.12; confirm it pins merged legacy P6 capability/root authority/pending preservation, legacy P7 factory/lifecycle/wake/disposal/fixture, and Pi classifier/session/send/manifest contracts. Do not begin any RED or implementation if any contract is missing or unapproved.
- [ ] Tarea 1.17.1.2 Verify the approved record preserves both DAG paths, C→D, no A→legacy P7/P8 edge, and Change E ownership; confirm it keeps all project/plan/slice/assignment/jornada/session and host/plugin/root identities distinct and separates `binding_epoch`, `host_epoch`, and controller `generation`.
- [ ] Tarea 1.17.1.3 Validate the approved record's assignment-bound in-container worktree, authorized base SHA, allowed branch, assignment, and session evidence; confirm Workspace Manager owns its lifecycle and P8 owns no worktree or host lifecycle/failover operation.
- [ ] Tarea 1.17.1.4 Add RED cases in `test/host-adapters.test.mjs` for trusted root/child/ambiguous classification, idle-only settlement, forged event fields, same-root/same-generation resume idempotence, and conflicting resume failure with unchanged owner/generation/timers.
- [ ] Tarea 1.17.1.5 Add RED cases in `test/host-adapters.test.mjs` for overlapping newer-generation replacement (dispose-before-bind), stale callbacks/completions inertness, synchronous root shutdown, exact `{ deliverAs: "followUp", triggerTurn: true }`, rejected-send preservation, and CT-R5-S1..S5.

## Sesión 1.18 — GREEN Adapter Implementation

### Módulo 1.18.1 — Pi adapter

- [ ] Tarea 1.18.1.1 Create `adapters/pi/index.ts` with opaque `PiSessionGate`, trusted root/child classifier, `GenerationCoordinator`, lease re-proofing, synchronous disposal, and no event-field authority.
- [ ] Tarea 1.18.1.2 Wire `installPiAdapter` in `adapters/pi/index.ts` to the reconciled `host/loop.mjs` lifecycle/wake ports; call `pi.sendMessage` once with exact options, never peek/receive/claim/retry, and preserve rejected pending descriptors.
- [ ] Tarea 1.18.1.3 Create `adapters/pi/package.json` with reconciliation-pinned private metadata only; add no SQLite/core, Migration 005, P10, installation, or runtime-state behavior.

## Sesión 1.19 — REFACTOR and Regression Verification

### Módulo 1.19.1 — Pi adapter verification

- [ ] Tarea 1.19.1.1 Refactor `adapters/pi/index.ts` and `test/host-adapters.test.mjs` for explicit owner checks, inert late callbacks, and readable RED→GREEN coverage without changing contracts.
- [ ] Tarea 1.19.1.2 Run `bun test test/host-adapters.test.mjs` and verify all listed lifecycle/wake/resume cases.
- [ ] Tarea 1.19.1.3 Run `bun test`; verify CT-R5-S1..S5, schema-neutral imports, and untouched Slice 6/7, Migration 005, P10, and Tower runtime state.
