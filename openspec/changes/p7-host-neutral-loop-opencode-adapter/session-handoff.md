# P7 Session Handoff — Planning Complete, Apply Blocked

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers. P7 means `p7-host-neutral-loop-opencode-adapter`; neither value denotes positional Plan P6 or Plan P7.

## Current decision

P7 planning is complete through tasks in hybrid storage, but apply remains blocked. P6 is merged through PRs #38–#45, closing at `e16d94b`; its historical `apply-progress.md` remains untouched. Do not begin implementation until the independent S1.11 `reconciliation.md` is completed and approved and the P7 chain topology is selected. Native `apply-ready` does not bypass this gate.

P7 depends only on merged P6, not Change A. Preserve both paths—`P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`—without an A→P7/P8 edge.

## Planned delivery chain

| Order | Sesión | Forecast |
|---:|---|---:|
| 1 | S1.13 — root lifecycle and synchronous invalidation | 280–380 authored lines |
| 2 | S1.14 — polling and wake safety | 320–400 authored lines |
| 3 | S1.15 — OpenCode lifecycle conformance | 320–400 authored lines |
| 4 | S1.16 — reconciled transport and wake composition | 240–380 authored lines; provisional |

Planned order: **S1.13 → S1.14 → S1.15 → provisional S1.16**.

The cumulative forecast is **1,160–1,560 authored added/deleted lines**, with every Sesión constrained to **≤400 authored lines**. The chain topology is still pending and must be selected before apply.

## Next executable action after P6 merges

Create and complete the reconciliation record at:

`openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`

Re-read the merged P6 schema, Migration 005 checksum and manifest, continuation and capability surfaces, OpenCode lifecycle fixtures, trusted non-consuming peek transport, exact `promptAsync` envelope, legacy compatibility decision, and transient-polling compatibility. Record concrete file, symbol, commit, and test evidence; obtain approval; then select the P7 chain topology. Only after all three apply gates are satisfied may S1.13 begin with its first strict-TDD RED task.

The record must also keep every project/plan/slice/assignment/jornada/session and host/plugin/root identity distinct; separate capability `binding_epoch`, Main-issued/Change-E-enforced `host_epoch`, and controller-local `generation`; and pin the assignment-bound in-container worktree, authorized base SHA, allowed branch, assignment, and session. Workspace Manager owns worktree lifecycle. Change E owns host lifecycle, heartbeat, stop proof, session naming, host-epoch enforcement, and exclusive failover. P7 owns neither boundary.

## Relevant artifacts

- Exploration: `openspec/changes/p7-host-neutral-loop-opencode-adapter/exploration.md`
- Proposal: `openspec/changes/p7-host-neutral-loop-opencode-adapter/proposal.md`
- Specification: `openspec/changes/p7-host-neutral-loop-opencode-adapter/specs/host-neutral-polling-opencode-adapter/spec.md`
- Design: `openspec/changes/p7-host-neutral-loop-opencode-adapter/design.md`
- Tasks: `openspec/changes/p7-host-neutral-loop-opencode-adapter/tasks.md`
- Required reconciliation record: `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`
- This handoff: `openspec/changes/p7-host-neutral-loop-opencode-adapter/session-handoff.md`
- Merged P6 provenance: PRs #38–#45; closing merge `e16d94b`

## Preservation statement

This S1.9 amendment is documentation-only. It does not create a reconciliation record, implement P7, mutate runtime state, or grant worktree/host authority. The P7 normative specification, P6 historical apply progress, runtime/source/test files, and unrelated artifacts remain byte-for-byte unchanged.
