---
name: chanks-3-despacho-herdr
description: "Trigger: dispatch approved Sesiones in Herdr, one tab per Sesión, parallel agents with the Torre off. Open independent agent sessions for the human's chosen Sesiones."
license: Apache-2.0
metadata:
  author: emili
  version: "1.0"
---

## Activation Contract

Activate only after the human names the Sesiones to run in parallel and the Pi worker for each.
Manual pre-V1 dispatch accepts Pi workers only. This is an explicit Herdr request for independent
Sesión work with the Torre off; it is not Torre dispatch. Herdr owns only the authorized seats and
process topology; Pi Intercom is only the message transport. Load the `herdr` skill for every Herdr
command, flag, and error code.

## Hard Rules

- Dispatch only the human's explicit list of Sesión IDs, each with its approved Pi worker. Never select, add, or reorder work.
- Reject a non-Pi agent kind before creating anything; never substitute the approved runtime.
- Every listed Sesión must be `LISTO` in `radar status`; read each contract with `radar sesion <ID>`. Otherwise stop and create nothing.
- Never dispatch in parallel two Sesiones that share a Cimiento or a Recurso; report the conflict and create nothing for the second one.
- Each Sesión gets one sibling worktree `Worktrees/<id>` on branch `work/<id>` from the verified master, one Herdr tab, and one Pi agent named after the Sesión — never the main checkout.
- Read every tab and agent ID from Herdr's JSON responses; never predict them. Herdr owns only the authorized seats and process topology.
- Pi Intercom is only the message transport. Intercom never grants selection, assignment, role, permission, review, or delivery authority.
- Before each handoff, Main uses one fresh Intercom live-roster readback bound to the exact human-approved alias, session, and cwd. Its identity must be present, unambiguous, connected, and exactly match the approved Pi worker. A missing, ambiguous, disconnected, or mismatched Intercom identity must fail closed before declaring the Sesión dispatched.
- Ordinary Intercom `send` has no wait timeout. A true human decision uses a blocking request initiated by the worker; its worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`: Main does not guess the answer or report completion.
- Every progress and terminal `send` identifies the exact Sesión and worker. Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer; never an unthreaded substitute or its own `ask`. Main never initiates `ask`.
- Herdr JSON proves only seat and process identity. Intercom delivery results prove only message delivery; neither grants authority or proves work completion. The worker reports terminal result evidence.
- Stop when `HERDR_ENV=1` is absent and offer the subagent flow instead. On an ambiguous or failed Herdr response, close only what this dispatch opened and stop.
- Never load `torre-control`, never read or write `.git/control-tower/ACTIVE` or `~/.local/share/control-tower/`, and never answer a blocked agent's question for the human outside that exact inbound human-decision `reply`.
- The dispatched agent commits only on `work/<id>`; it never pushes master and never writes `openspec/plan.yaml`. The responsible parent integrates one Sesión at a time.
- A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume. Human reactivation and reapproval are required before any new dispatch.
- No retries, persistent queue, roster, state, autonomous resume, non-Pi fallback, or provisional cross-runtime bridge. Tower V1 remains the future heterogeneous and hybrid owner.

## Decision Gates

| Condition | Action |
|---|---|
| No explicit list, a listed Sesión is not `LISTO`, or the approved worker is not Pi | Stop and create nothing. |
| Two listed Sesiones share a Cimiento or a Recurso | Dispatch the first; report the conflict for the second. |
| The fresh Intercom live-roster readback or the worker identity is missing, ambiguous, disconnected, or mismatched | Close only what this dispatch opened; do not declare the Sesión dispatched. |
| A later Intercom disconnect occurs | Do not poll, retry, infer completion, use a transport fallback, or resume; require human reactivation and reapproval before a new dispatch. |
| A worker-initiated human-decision `ask` times out | Preserve the worktree and candidate as `BLOCKED`; never guess the answer or report completion. |
| `HERDR_ENV` is not `1` | Stop; offer the subagent flow. |
| Ambiguous or failed Herdr response | Close only what this dispatch opened; stop. |
| A dispatched agent is blocked | Tell the human which tab needs them; use `reply` only for its exact inbound human-decision request and the human's answer. |
| The responsible parent recorded a dispatched Sesión's delivery | Run the retire mode in `references/retiro.md`. |

## Execution Steps

1. Validate the human's complete approved list: every Sesión is `LISTO`, every worker is Pi, and no Cimiento or Recurso conflicts. Reject any non-Pi worker before creating anything.
2. Fetch and confirm the local master equals the remote master; that commit is the base.
3. For each approved Pi worker, create `Worktrees/<id>` on `work/<id>` from the base and initialize its CodeGraph index.
4. Open one Herdr tab with that worktree as its directory, start the approved Pi agent named after the Sesión, and record the tab and agent IDs from the JSON responses. Herdr stops at the authorized seat and process topology; Herdr JSON proves only seat and process identity.
5. Before each handoff, Main uses one fresh Intercom live-roster readback and binds its exact human-approved alias, session, and cwd to the approved Pi worker. If identity is present, unambiguous, connected, and matched, send the handoff from `../chanks-0-agente-soporte/assets/assignment-implementation.md` with Intercom `send`; the worker runs `../chanks-3-session-kickoff/SKILL.md` inside its own tab. Ordinary Intercom `send` has no wait timeout, and Main returns after the delivery result.
6. Two approved Pi workers receive independent fire-and-forget handoffs: Main sends worker 2 without waiting for worker 1. Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`.
7. Workers send progress to Main through Intercom and send terminal `COMPLETED`, `BLOCKED`, or `FAILED` events; every progress and terminal `send` identifies the exact Sesión and worker. The worker reports terminal result evidence. A true human decision uses a worker-initiated `ask`; Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer, never an unthreaded substitute or its own `ask`. Main never initiates `ask`. If that `ask` times out, preserve the worktree and candidate as `BLOCKED`; do not guess the answer or report completion.
8. A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume. Require human reactivation and reapproval before a new dispatch. After the responsible parent integrates and records a Sesión, run the retire mode in `references/retiro.md`.

## Output Contract

Return one row per Sesión — Sesión · worktree · branch · tab · agent, with IDs from Herdr's JSON —
plus every refused Sesión with its reason, one fresh Intercom live-roster readback and one Intercom delivery result per exact Sesión/worker handoff, worker progress and terminal events, every blocked agent that needs the human, and every retire result. Herdr JSON proves only seat and process identity; Intercom delivery results prove only message delivery; neither grants authority or proves work completion. The worker reports terminal result evidence.

## References

- `references/retiro.md`
- `herdr` skill, emitted by `herdr --skill`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-3-session-kickoff/SKILL.md`
