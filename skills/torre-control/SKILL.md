---
name: torre-control
description: "Trigger: Control Tower operator route, Tower start, Main dispatch, Herdr coordination. Route approved work through Main and Support."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activate for Tower start/resume, briefs/dispatch/delivery or Herdr topology. Main owns the route.

## Hard Rules

- Herdr tabs provide visibility, never Git isolation. Mandatory topology: `MAIN → SUPPORT → AGENTES`; MAIN hosts only Main, SUPPORT only read-only Support, workers only AGENTES; AGENTES stays empty until assignments are approved.
- Bind MAIN to the Main worktree, SUPPORT to the permanent Support worktree, and every worker to its exact named implementer worktree. Starting Support or a worker from Main or another seat is forbidden. A correct brief cannot override intrinsic bindings; Main-path mismatch fails closed even when the brief matches.
- Load installed Herdr control before topology actions. If control/live state is unavailable, stop; message transport is no fallback and grants no topology or authority.
- The approved brief names exact target tab label/ID, worktree path and branch, assignment, scope, dependencies, shared resources, plus an existing pane ID or explicit authorization to create exactly one pane in that tab.
- Before the first prompt, live readback must match tab label/ID, pane ID, `cwd` and `foreground_cwd`. After authorized create/move, bind its returned pane ID by readback. Every changed/new fact needs renewed approval.
- Fail closed on missing worktree, dirty seat without disposition, changed foreground cwd, wrong tab/pane/cwd, unapproved occupant, or auto-open into MAIN. Never silently `cd`, recycle, reuse, move, close, or reconcile any pane/seat.
- Main alone dispatches; Support advises; workers never self-assign. Route each verified worker's unchanged assignment through `session-kickoff`. Engram is continuity evidence, never authority.
- Enforce bindings with Tower OFF or ON. Herdr is manual today; future S9.5 automates this established rule and does not invent it. Do not activate Tower.

## Decision Gates

| Condition | Action |
|---|---|
| Tower is OFF (`ACTIVE` absent) | Prepare the exact brief with Support, await approval, use only named existing seats; do not activate Tower. |
| Tower is ON and authority matches | Read live Tower state and dispatch only approved assignments. |
| Control/readback unavailable or role/tab/pane/cwd differs | Stop; never prompt or silently repair topology. |
| Delivery/closure applies | Load `torre-control-entregas`; keep implementation outside Main. |

## Execution Steps

1. Load Herdr control; read `MAIN → SUPPORT → AGENTES`, `ACTIVE`, Main authority, tabs, panes, and registered worktrees live.
2. Enforce intrinsic seats/occupancy; match every brief field/branch; load `torre-control-soporte` for evidence/capacity/conflicts/brief.
3. Obtain exact maintainer approval, including any one-pane create/move; reverify tab, returned pane ID, both cwd values, and approved facts.
4. Route verified workers through `session-kickoff`; load `torre-control-entregas` only for delivery/closure.

## Output Contract

Return Tower mode/authority, topology, seat/tab/pane bindings with branch/both cwd values, Support evidence, approved assignments/dispatched workers, discrepancies, pending approval, and every fail-closed stop.

## References

- `../../profiles/tower/main.md`
- `../torre-control-soporte/SKILL.md`
- `../torre-control-entregas/SKILL.md`
