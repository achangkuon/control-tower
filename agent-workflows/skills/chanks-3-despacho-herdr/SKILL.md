---
name: chanks-3-despacho-herdr
description: "Trigger: dispatch approved Sesiones in Herdr, one tab per Sesión, parallel agents with the Torre off. Open independent agent sessions for the human's chosen Sesiones."
license: Apache-2.0
metadata:
  author: emili
  version: "1.0"
---

## Activation Contract

Activate only after the human names the Sesiones to run in parallel and the agent kind for each.
This is an explicit Herdr request for independent Sesión work with the Torre off; it is not Torre
dispatch. Load the `herdr` skill for every Herdr command, flag, and error code.

## Hard Rules

- Dispatch only the human's explicit list of Sesión IDs, each with its agent kind. Never select, add, or reorder work.
- Every listed Sesión must be `LISTO` in `radar status`; read each contract with `radar sesion <ID>`. Otherwise stop and create nothing.
- Never dispatch in parallel two Sesiones that share a Cimiento or a Recurso; report the conflict and create nothing for the second one.
- Each Sesión gets one sibling worktree `Worktrees/<id>` on branch `work/<id>` from the verified master, one Herdr tab, and one agent named after the Sesión — never the main checkout.
- Read every tab and agent ID from Herdr's JSON responses; never predict them.
- Stop when `HERDR_ENV=1` is absent and offer the subagent flow instead. On an ambiguous or failed Herdr response, close only what this dispatch opened and stop.
- Never load `torre-control`, never read or write `.git/control-tower/ACTIVE` or `~/.local/share/control-tower/`, and never answer a blocked agent's question for the human.
- The dispatched agent commits only on `work/<id>`; it never pushes master and never writes `openspec/plan.yaml`. The responsible parent integrates one Sesión at a time.

## Decision Gates

| Condition | Action |
|---|---|
| No explicit list, or a listed Sesión is not `LISTO` | Stop and create nothing. |
| Two listed Sesiones share a Cimiento or a Recurso | Dispatch the first; report the conflict for the second. |
| `HERDR_ENV` is not `1` | Stop; offer the subagent flow. |
| Ambiguous or failed Herdr response | Close only what this dispatch opened; stop. |
| A dispatched agent is blocked | Tell the human which tab needs them; never answer for them. |

## Execution Steps

1. Run `radar status` and `radar sesion <ID>` for each listed Sesión, and apply the gates.
2. Fetch and confirm the local master equals the remote master; that commit is the base.
3. For each Sesión, create `Worktrees/<id>` on `work/<id>` from the base and initialize its CodeGraph index.
4. Open one Herdr tab with that worktree as its directory, start the chosen agent kind named after the Sesión, and record the tab and agent IDs from the JSON responses.
5. Send the handoff from `../chanks-0-agente-soporte/assets/assignment-implementation.md`; the agent runs `../chanks-3-session-kickoff/SKILL.md` inside its own tab.
6. Wait on each agent's state without reading its transcript, then read only its final report.

## Output Contract

Return one row per Sesión — Sesión · worktree · branch · tab · agent, with IDs from Herdr's JSON —
plus every refused Sesión with its reason and every blocked agent that needs the human.

## References

- `herdr` skill, emitted by `herdr --skill`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-3-session-kickoff/SKILL.md`
