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

- **Never invoke `herdr` to seat a worker. Always `torre asiento`.** It owns the topology in code
  (`hosts/herdr-topology.mjs`), works with Tower OFF or ON, and fails closed where prose is forgotten.
  A hand-written `herdr pane split` is drift.
  - `list` — every seat with kind, branch, occupancy and disposal blocker.
  - `pool`, `provisionar`, `asignar` — occupancy, idempotent provisioning, and a deterministic
    binding of the first free seat. All three answer with Herdr down.
  - `abrir <asiento>` — opens the pane inside `AGENTES` split `right`, verifies tab and both cwd values
    by readback, closes what it opened on mismatch, and refuses Main, Support and occupied seats.
  - `limpiar` — previews disposal; `--confirmar` removes only seats proven clean, merged and free.
- Herdr tabs are visibility, never Git isolation. `MAIN → SUPPORT → AGENTES`: MAIN hosts only Main,
  SUPPORT only read-only Support, workers only AGENTES, empty until approved.
- Permanent pool: `implementer-1`, `implementer-2`, `implementer-3`, plus `support-agent`. **Any other
  worktree is temporary and must be disposed once its work lands** — never promoted.
- A correct brief never overrides intrinsic bindings. If Herdr control is unavailable, stop: message
  transport is no fallback and grants no authority.
- The brief names the exact seat, branch, scope and shared resources.
- Never silently `cd`, recycle, reuse, move, close or reconcile a pane or seat. Disposal is never
  automatic; `--confirmar` is maintainer-authorized.
- Main alone dispatches; Support advises; workers never self-assign. Engram is evidence, never authority.
- Enforce bindings with Tower OFF or ON, and never activate Tower. `S9.5` automates this rule from the
  same module; it does not invent it.

## Decision Gates

| Condition | Action |
|---|---|
| Tower is OFF (`ACTIVE` absent) | Prepare the brief with Support; use only named seats. |
| Tower is ON and authority matches | Dispatch only approved assignments. |
| Control unavailable or any binding differs | Stop; never prompt or repair topology. |
| Delivery or closure applies | Load `torre-control-entregas`; keep implementation outside Main. |

## Execution Steps

1. Run `torre asiento list` and `pool`; read `ACTIVE` and Main authority.
2. Match every brief field against that listing; load `torre-control-soporte` for evidence and conflicts.
3. On maintainer approval, bind with `asignar`, seat with `abrir`, and record the returned pane IDs.
4. Route verified workers through `session-kickoff`; load `torre-control-entregas` for delivery and closure.
5. On closure, report the `limpiar` preview; disposal needs authorized `--confirmar`.

## Output Contract

Return Tower mode, the seat table, tab/pane bindings, Support evidence, dispatched assignments, discrepancies, pending approval, and every fail-closed stop.

## References

- `../../profiles/tower/main.md`
- `../torre-control-soporte/SKILL.md`
- `../torre-control-entregas/SKILL.md`
