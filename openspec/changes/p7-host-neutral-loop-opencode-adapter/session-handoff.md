# P7 Session Handoff — Bounded Apply Contract Approved

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers. P7 means `p7-host-neutral-loop-opencode-adapter`; neither value denotes positional Plan P6 or Plan P7.

## Current decision

P7 planning is complete through tasks in hybrid storage. S1.11 defines a maintainer-approved bounded apply contract, explicitly not production readiness, tied to the frozen candidate by Engram observation 8423. P6 is merged through PRs #38–#45, closing at `e16d94b`; its historical `apply-progress.md` remains untouched. Do not begin implementation until the P7 chain topology is selected.

The contract selects Option A: Host Launcher / Change E injects an opaque consumer capability carrying non-consuming peek, immutable proven root identity, and validated `binding_epoch`; P7 consumes it and fails closed on absence or drift. P7 must not import `core.mjs`, `mcp.mjs`, or SQLite, expose a second/public continuation API, or manufacture provider authority. P7 depends only on merged P6, not Change A. Preserve both paths—`P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`—without an A→P7/P8 edge.

## Planned delivery chain

| Order | Sesión | Forecast |
|---:|---|---:|
| 1 | S1.13 — root lifecycle and synchronous invalidation | 280–380 authored lines |
| 2 | S1.14 — polling and wake safety | 320–400 authored lines |
| 3 | S1.15 — OpenCode lifecycle conformance | 320–400 authored lines |
| 4 | S1.16 — trusted consumer transport and wake composition | 240–380 authored lines |

Planned order: **S1.13 → S1.14 → S1.15 → S1.16**.

The cumulative forecast is **1,160–1,560 authored added/deleted lines**, with every Sesión constrained to **≤400 authored lines**. The chain topology is still pending and must be selected before apply.

## Next executable action

Select the P7 chain topology. After that selection, S1.13 may begin with its first strict-TDD RED task under the bounded apply approval recorded in Engram observation 8423.

R1/R2 close as consumer-conformance obligations across already-authorized P7 Sesiones. R3 lifecycle/root-classification evidence is deferred to existing S1.15. R4 pinned-envelope consumer evidence is deferred to existing S1.16, which does not own provider construction. Legacy automatic wake must remain available through a bounded, non-consuming, non-lossy compatibility route; legacy cases must not degrade to manual queue handling. Concrete Change E provider/injection implementation and proof remain later obligations, not evidence of S1.11 apply completion. No new Sesión is assigned here; if later provider work requires decomposition, stop for `planificador-granular`.

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

This S1.11 documentary transition records the maintainer's T1.11.1.3 bounded apply approval. It does not claim apply completion or production readiness, implement P7 or the Change E provider, mutate runtime state, or grant worktree/host authority. The P7 normative specification, P6 historical apply progress, runtime/source/test files, and unrelated artifacts remain byte-for-byte unchanged.
