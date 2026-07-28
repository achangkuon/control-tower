# P7 Session Handoff — Planning Complete, Apply Blocked

## Current decision

P7 planning is complete through tasks in hybrid storage, but apply remains blocked. P6 is merged through PRs #38–#45, closing at `e16d94b`; its historical `apply-progress.md` remains untouched. The current base is canonical integrated R2. The readiness architecture, OpenCode `1.18.7` fixture evidence, and approved serial `stacked-to-main` topology are resolved. Do not begin implementation until exact apply-time identities/worktree/base/branch are allocated and bound, and the maintainer then approves and publishes approval for that exact bound `reconciliation.md`. Native `apply-ready` does not bypass this gate.

P7 depends only on merged P6, not Change A. Preserve both paths—`P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`—without an A→P7/P8 edge.

## Planned delivery chain

| Order | Unit | Forecast |
|---:|---|---:|
| 1 | P7-A1 — root lifecycle and synchronous invalidation | 280–380 authored lines |
| 2 | P7-A2 — polling and wake safety | 320–400 authored lines |
| 3 | P7-B — OpenCode lifecycle conformance | 320–400 authored lines |
| 4 | P7-C — reconciled transport and wake composition | 240–380 authored lines; approved serial unit |

Approved order: **P7-A1 → P7-A2 → P7-B → P7-C**.

The cumulative forecast is **1,160–1,560 authored added/deleted lines**, with every unit constrained to **≤400 authored lines**. The approved topology is `stacked-to-main`, one active unit at a time. Branch, base, assignment, session, and host identities remain intentionally unallocated.

The canonical P7 plan has **30 tasks**. The roadmap's `0/28` counter is a later
revision follow-up because its current bytes are bound by the revision-2
ArtifactRef; do not rewrite those bytes during allocation or approval.

## Next executable action

Use the prepared reconciliation record at:

`openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`

Use the recorded pre-allocation evidence and readiness decisions, then allocate assignment/jornada/
session, worktree/base/branch, host/plugin/root identities, and `binding_epoch`.
After those bindings exist, request exact maintainer approval and publish the
approval evidence to open the gate. Only then may P7-A1 begin its first strict-TDD
RED. The approved readiness contract already pins
OpenCode `1.18.7`, trusted binding plus `session.get`, the private injected peek
port, exact prompt envelope, legacy auto-wake exclusion, transient semantics, and
the A1→A2→B→C topology. No approval identity, timestamp, or ArtifactRef is implied.

Retry remains source-only/unproven and belongs to P7-A2 deterministic strict-TDD
coverage. A successful provider turn remains unexercised because the isolated
fixture used no credentials or provider network traffic; it belongs to apply-time
adapter verification. Neither is a readiness blocker or runtime-proven evidence.

The record must also keep every project/plan/slice/assignment/jornada/session and host/plugin/root identity distinct; separate capability `binding_epoch`, Main-issued/Change-E-enforced `host_epoch`, and controller-local `generation`; and pin the assignment-bound in-container worktree, authorized base SHA, allowed branch, assignment, and session. Workspace Manager owns worktree lifecycle. Change E owns host lifecycle, heartbeat, stop proof, session naming, host-epoch enforcement, and exclusive failover. P7 owns neither boundary.

## Relevant artifacts

- Exploration: `openspec/changes/p7-host-neutral-loop-opencode-adapter/exploration.md`
- Proposal: `openspec/changes/p7-host-neutral-loop-opencode-adapter/proposal.md`
- Specification: `openspec/changes/p7-host-neutral-loop-opencode-adapter/specs/host-neutral-polling-opencode-adapter/spec.md`
- Design: `openspec/changes/p7-host-neutral-loop-opencode-adapter/design.md`
- Tasks: `openspec/changes/p7-host-neutral-loop-opencode-adapter/tasks.md`
- Required reconciliation record: `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`
- Committed structured fixture: `openspec/changes/p7-host-neutral-loop-opencode-adapter/evidence/opencode-1.18.7-runtime-fixture.json` at precursor `44becc1153b24273796c1d6823f481179358757b`
- Reproduction procedure: `openspec/changes/p7-host-neutral-loop-opencode-adapter/evidence/README.md` at the same precursor
- This handoff: `openspec/changes/p7-host-neutral-loop-opencode-adapter/session-handoff.md`
- Merged P6 provenance: PRs #38–#45; closing merge `e16d94b`

## Preservation statement

This M0 correction is documentation-only. It does not allocate identities or a
worktree, approve the record, implement P7, mutate runtime state, or grant
worktree/host authority. The P7 normative specification, P6 historical apply
progress, runtime/source/test files, and unrelated artifacts remain byte-for-byte
unchanged.
