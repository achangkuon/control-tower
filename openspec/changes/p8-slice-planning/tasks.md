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

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Pin merged P6/P7/Pi contracts and land all failing RED proofs | PR 1 | `bun test test/host-adapters.test.mjs` | N/A — planning/adapter tests must not activate Tower | Revert `reconciliation.md` and RED cases only |
| 2 | Implement generation-scoped Pi gate/coordinator and exact wake mapping | PR 2 | `bun test test/host-adapters.test.mjs` | N/A — fake Pi/loop only; no Tower runtime state | Revert `adapters/pi/` and GREEN implementation |
| 3 | Refactor seams and prove shared/regression behavior | PR 3 | `bun test test/host-adapters.test.mjs && bun test` | N/A — verification is fixture-only | Revert refactor/tests without schema or runtime rollback |

## Phase 1: Reconciliation Gate and RED Tests

- P8 remains blocked until P7 is independently reconciled and integrated and P8's separate record is approved. Native `apply-ready` does not bypass either gate; P8 has no Change A dependency.
- [ ] 1.1 **First and blocking task:** create `openspec/changes/p8-slice-planning/reconciliation.md` pinning merged P6 capability/root authority/pending preservation, P7 factory/lifecycle/wake/disposal/fixture, and Pi classifier/session/send/manifest contracts; do not begin any RED or implementation until every contract is concrete and approved.
- [ ] 1.1a Record both DAG paths, C→D, no A→P7/P8 edge, and Change E ownership; keep all project/plan/slice/assignment/jornada/session and host/plugin/root identities distinct and separate `binding_epoch`, `host_epoch`, and controller `generation`.
- [ ] 1.1b Pin the assignment-bound in-container worktree, authorized base SHA, allowed branch, assignment, and session; confirm Workspace Manager owns its lifecycle and P8 owns no worktree or host lifecycle/failover operation.
- [ ] 1.2 RED in `test/host-adapters.test.mjs` for trusted root/child/ambiguous classification, idle-only settlement, forged event fields, same-root/same-generation resume idempotence, and conflicting resume failure with unchanged owner/generation/timers.
- [ ] 1.3 RED in `test/host-adapters.test.mjs` for overlapping newer-generation replacement (dispose-before-bind), stale callbacks/completions inertness, synchronous root shutdown, exact `{ deliverAs: "followUp", triggerTurn: true }`, rejected-send preservation, and CT-R5-S1..S5.

## Phase 2: GREEN Adapter Implementation

- [ ] 2.1 Create `adapters/pi/index.ts` with opaque `PiSessionGate`, trusted root/child classifier, `GenerationCoordinator`, lease re-proofing, synchronous disposal, and no event-field authority.
- [ ] 2.2 Wire `installPiAdapter` in `adapters/pi/index.ts` to the reconciled `host/loop.mjs` lifecycle/wake ports; call `pi.sendMessage` once with exact options, never peek/receive/claim/retry, and preserve rejected pending descriptors.
- [ ] 2.3 Create `adapters/pi/package.json` with reconciliation-pinned private metadata only; add no SQLite/core, Migration 005, P10, installation, or runtime-state behavior.

## Phase 3: REFACTOR and Regression Verification

- [ ] 3.1 Refactor `adapters/pi/index.ts` and `test/host-adapters.test.mjs` for explicit owner checks, inert late callbacks, and readable RED→GREEN coverage without changing contracts.
- [ ] 3.2 Run `bun test test/host-adapters.test.mjs` then `bun test`; verify CT-R5-S1..S5, all listed lifecycle/wake/resume cases, schema-neutral imports, and untouched Slice 6/7, Migration 005, P10, and Tower runtime state.
