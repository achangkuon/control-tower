---
name: torre-control
description: "Trigger: Control Tower operator route, Tower start, Main dispatch, Herdr coordination. Route approved work through Main and Support."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activate when starting or resuming Tower, preparing assignments, dispatching approved workers, or coordinating delivery. Main owns this route and lazy-loads only the child required now.

## Hard Rules

- Herdr tabs provide visibility, never Git isolation. Keep `MAIN` as coordinator, start `SUPPORT` first read-only, and keep `AGENTES` empty until assignments are approved.
- Bind `MAIN` to the Main worktree, `SUPPORT` to the permanent Support worktree, and each worker to its exact named implementer worktree. Starting Support or a worker from Main or another seat is forbidden.
- Main alone dispatches. Support advises; workers never self-assign.
- The approved brief names exact worktree path and branch, assignment, scope, dependencies, and shared resources.
- Before any prompt or dispatch, verify each pane/agent `cwd` and `foreground_cwd` exactly equal its approved worktree path.
- Fail closed on a missing worktree, cwd mismatch, dirty-seat disposition gap, or foreground process that changed cwd. A Main-path mismatch fails closed. Never silently `cd`, recycle, or reuse another seat.
- Route each approved worker's unchanged assignment through `session-kickoff`.
- Enforce this binding with Tower OFF or ON. Herdr is manual today; future S9.5 automates this established rule and does not invent it.
- Engram is optional continuity evidence, never authority.

## Decision Gates

| Condition | Action |
|---|---|
| Tower is OFF (`ACTIVE` absent) | Load Support, prepare the exact brief, wait for approval, then use only named existing seats. |
| Tower is ON and authority matches | Read live Tower state and dispatch only approved assignments. |
| `AGENTES` has an unapproved occupant | Stop; report topology drift without silent reconciliation. |
| Support/worker starts from Main/another seat, or either cwd differs | Invalidate dispatch; do not prompt, `cd`, recycle, or reuse. |
| Any approved fact changed | Invalidate dispatch and require renewed exact approval. |
| Delivery or closure applies | Load `torre-control-entregas`; keep implementation outside Main. |

## Execution Steps

1. Verify `MAIN`, `SUPPORT`, `AGENTES`, `ACTIVE`, Main authority, and registered worktrees live.
2. Match every brief path and branch; verify both cwd values before confirming Support.
3. Load `torre-control-soporte` for evidence, capacity, conflicts, and the exact brief.
4. Obtain explicit maintainer approval of exact assignments.
5. Reverify approved facts and cwd values, then route workers through `session-kickoff`.
6. Load `torre-control-entregas` only for delivery and closure.

## Output Contract

Return Tower mode, Main authority, seat bindings with branch and both cwd values, Support evidence, approved assignments, dispatched workers, discrepancies, and approval still required. Name every fail-closed stop.

## References

- `../../profiles/tower/main.md`
- `../torre-control-soporte/SKILL.md`
- `../torre-control-entregas/SKILL.md`
