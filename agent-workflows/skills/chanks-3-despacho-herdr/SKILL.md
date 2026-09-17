---
name: chanks-3-despacho-herdr
description: "Trigger: dispatch human-selected approved Sessions into their declared persistent worker pool through Herdr, with the Torre off."
license: Apache-2.0
metadata:
  author: emili
  version: "1.1"
---

## Activation Contract

Activate only after the human names the complete batch of Sesión IDs and assigns each one to a
specific approved Pi worker. Manual pre-V1 dispatch accepts Pi workers only. This is an explicit
Herdr request for independent Sesión work with the Torre off; it is not Torre dispatch. Herdr owns
only the authorized seats and process topology; Pi Intercom is only the message transport. Dispatch
does not grant execution authority, ODD continuity, plan status, or delivery authority. Preserve the
admitted discriminator: native Encargo work resumes under the same Session identity through native
ODD record/code/evidence reconciliation; legacy work resumes at first pending Módulo for legacy. Load
the `herdr` skill for every Herdr command, flag, and error code.

Read the complete reusable worker-pool declaration from repository `AGENTS.md` before any pool
operation. It is the sole source for the declared workers, their persistent worktrees and tabs, their
preparation command, and its stale-environment predicate. Missing or incomplete declaration fails
closed before branch or agent creation and never falls back to ephemeral per-Session worktrees. Keep
this procedure generic: no hardcoded package manager, worker count, or worker names.

Dispatch and retirement both follow the single shared lock procedure in
`references/retiro.md`'s `## Shared lock protocol` exactly. It is the only lock algorithm and
pathname for this skill: do not restate, vary, steal, or delete it. The declaration is reusable
configuration, not persistent roster or planning state.

## Hard Rules

- Dispatch only the human's explicit complete list of Sesión IDs, each with its approved Pi worker. Never select, add, reorder, or substitute work.
- Reject a non-Pi agent kind before creating anything; never substitute the approved runtime. Every listed Sesión must be `LISTO` in `radar status`; read each contract with `radar sesion <ID>`. Preserve same Session identity for native Encargo continuity and first pending Módulo for legacy; never make topology a fake execution controller.
- Under the acquired lock, validate and reserve the complete human-selected batch before the first launch: every Session remains LISTO and compatible, every Session maps to a declared apt worker, and all selected workers are distinct.
- A selected worker is either an existing reusable worker or a declared, explicitly provisionable, not-yet-created worker. An existing worker must prove free, clean, and non-Main from Git, Radar, and a fresh live Herdr readback; a dirty tree, active prior agent, pending delivery, identity mismatch, or ambiguous readback rejects it. Ordinary assignment rejects a missing previously provisioned worker; a partial first provisioning stops ordinary admission and never creates per-Session worktrees.
- `issue-resolver` only handles a human-selected Session backed by a Control Tower issue. Do not infer the issue or reuse an occupied worker.
- Each declared worker's worktree, tab, and dependencies persist. Under the held shared flock and before launch, the complete human batch may reserve an absent declared slot only when its exact worktree path and tab are both absent, its declaration authorizes first provisioning, and no branch, pending delivery, or conflicting identity exists. A partial first provisioning requires fresh maintainer authorization bound to the exact pool declaration plus current Git, Herdr, and path+inode readback; only proof of no agent, Session branch, dirty tree, or pending delivery and remaining artifact identity matching the declaration may complete only the missing provisioning or preparation, then revalidate the complete worker. Any ambiguity preserves artifacts and lock evidence: never remove a persistent worker or infer readiness. First provisioning creates its persistent worktree and tab once from verified master, runs the declared preparation, and the worker then remains persistent. An assignment uses that worker's declared worktree, creates a fresh `work/<id>` branch from verified master, and starts a new Session-named Pi agent in its declared Herdr tab.
- An existing branch or ambiguous readback stops the complete batch without reset or force. Do not launch any agent until every selected worker and branch reservation has succeeded; order cannot cause partial dispatch.
- Run declared preparation only on provisioning or when the declared environment is missing or stale. A valid reassignment performs zero reinstall. Never copy or link dependencies across checkouts.
- Read every tab and agent ID from Herdr's JSON responses; never predict them. Herdr owns only the authorized seats and process topology.
- Pi Intercom is only the message transport. Intercom never grants selection, assignment, role, permission, review, or delivery authority.
- Before the first handoff, Main completes fresh Herdr agent readback and one fresh Intercom live-roster identity validation for the entire batch, bound to every exact human-approved alias, session, and cwd. A missing, ambiguous, disconnected, or mismatched Intercom identity must fail closed before declaring the Sesión dispatched; any failure uses the pre-send owned rollback rule.
- Ordinary Intercom `send` has no wait timeout. A true human decision uses a blocking request initiated by the worker; its worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`: Main does not guess the answer or report completion.
- Every progress and terminal `send` identifies the exact Sesión and worker. Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer; never an unthreaded substitute or its own `ask`. Main never initiates `ask`.
- Herdr JSON proves only seat and process identity. Intercom delivery results prove only message delivery; neither grants authority or proves work completion. The worker reports terminal result evidence.
- Before the first handoff, preparation, branch, launch, batch-readback, or roster-validation failure closes only agents launched by this batch and cleans only new branches created by this batch. Preserve worker worktrees, tabs, and dependencies. Release only an owned lock after proven rollback; ambiguous rollback retains the lock and asks the human.
- After the first handoff is sent, never roll back, clean, reset, delete, or close any batch branch or agent: a later send failure or ambiguity preserves all worker branches, worktrees, tabs, agents, and candidates, marks unsent or uncertain Sessions `BLOCKED` for human reconciliation, and never resends or infers delivery. Main remains non-waiting and does not poll.
- Stop when `HERDR_ENV=1` is absent and offer the subagent flow instead. On an ambiguous or failed Herdr response, use the owned rollback rule and stop.
- Never load `torre-control`, never read or write `.git/control-tower/ACTIVE` or `~/.local/share/control-tower/`, and never answer a blocked agent's question for the human outside that exact inbound human-decision `reply`.
- The dispatched agent commits only on `work/<id>`; it never pushes master and never writes `openspec/plan.yaml`. The responsible parent integrates one Sesión at a time and solely writes `openspec/plan.yaml`.
- A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume. Human reactivation and reapproval are required before any new dispatch.
- No retries, persistent queue, roster, state, autonomous resume, non-Pi fallback, or provisional cross-runtime bridge. Tower V1 remains the future heterogeneous and hybrid owner.

## Decision Gates

| Condition | Action |
|---|---|
| No complete human list, a listed Sesión is not `LISTO`, a declared worker is not Pi, or the `AGENTS.md` declaration is incomplete | Release only an owned lock, create nothing, and report the failed prerequisite. |
| The batch has a Cimiento or Recurso conflict, duplicate/undeclared/unapt worker, branch collision, or any failed reservation | Release only an owned lock; launch zero agents. Do not dispatch a prefix of the batch. |
| An existing worker is dirty, Main, occupied, pending delivery, identity-mismatched, unavailable in fresh Git/Radar/Herdr readback, or missing after prior provisioning | Release only an owned lock; create nothing and never infer reuse. |
| Partial first provisioning (exact worktree without declared tab, tab without worktree, or interrupted preparation) | Stop ordinary admission. Under the owned flock, resume only with fresh maintainer authorization bound to the exact pool declaration plus current Git/Herdr/path+inode readback; prove no agent, Session branch, dirty tree, or pending delivery and remaining artifact identity matching the declaration, complete only missing provisioning/preparation, then revalidate as complete. Any ambiguity or drift stays `BLOCKED`: preserve artifacts and lock evidence; never remove a worker or infer readiness. |
| An absent declared slot lacks explicit first-provisioning authorization, or has a branch, pending delivery, or conflicting identity | Release only an owned lock; create nothing and never infer reuse. |
| `issue-resolver` lacks a human-selected Control Tower issue-backed Session | Release only an owned lock; create nothing. |
| Before the first handoff, preparation, branch creation, Herdr launch, batch readback, or complete roster validation fails | Close only this batch's launched agents and clean only this batch's new branches. Preserve the declared worker. Retain the lock and ask the human if rollback is ambiguous. |
| After the first handoff, a send fails or is ambiguous | Preserve all branches, worktrees, tabs, agents, and candidates; mark unsent or uncertain Sessions `BLOCKED` for human reconciliation. Never roll back, resend, infer delivery, wait, or poll. |
| A later Intercom disconnect occurs | Do not poll, retry, infer completion, use a transport fallback, or resume; require human reactivation and reapproval before a new dispatch. |
| A worker-initiated human-decision `ask` times out | Preserve the worktree and candidate as `BLOCKED`; never guess the answer or report completion. |
| `HERDR_ENV` is not `1` | Stop; offer the subagent flow. |
| The responsible parent recorded a dispatched Sesión's delivery | Run the persistent-worker retire mode in `references/retiro.md`. |

## Execution Steps

1. Read the complete reusable worker-pool declaration from repository `AGENTS.md`. Reject missing or incomplete declaration before creating branches or agents.
2. Acquire the lock exactly through `references/retiro.md`'s `## Shared lock protocol`, including its bounded stale-lock recovery; prove byte-identical ownership before any release. Use only its normal-acquisition or expressly authorized recovery path; every other pre-existing, partial, unreadable, ambiguous, or foreign state stops without mutation.
3. Under the acquired lock, fetch and confirm local master equals remote master; that commit is the base. Re-read `radar status` and `radar sesion <ID>` for every human-selected Session.
4. Under the acquired lock, collect Git, Radar, and fresh live Herdr readback for every selected declared worker. For an existing reusable worker, prove it is free, clean, non-Main, has no pending delivery or active prior agent, and has its exact declared identity. Partial first provisioning stops ordinary admission; resume only through the exact authorized repair route in the failure matrix.
5. Under the acquired lock, validate and reserve the complete human-selected batch: all Sessions remain LISTO and compatible, no Cimiento or Recurso conflict exists, each maps to a distinct declared apt worker, `issue-resolver` has its Control Tower issue, and every `work/<id>` is absent. Reserve an absent declared slot only if its declaration authorizes first provisioning and no branch, pending delivery, or conflicting identity exists. If any check fails, release only the owned lock and launch zero agents.
6. For each reserved absent explicitly provisionable slot, Provision its persistent worktree and tab once from the verified master, run the declared preparation, and record the created tab from Herdr JSON; it then remains persistent. For every existing worker, run declared preparation only when the declaration proves the environment missing or stale; otherwise perform zero reinstall. Create each reserved fresh `work/<id>` branch from the verified master in its persistent declared worktree; any late conflict triggers rollback before any agent launch.
7. Open or reuse only the declared worker's Herdr tab, which is existing or provisioned, start a new Pi agent named after the Session, and record tab and agent IDs from Herdr JSON. Do not predict IDs.
8. Read back every agent launched by this batch, then complete one fresh Intercom live-roster readback and identity validation for every worker in the batch, binding every exact human-approved alias, session, and cwd. Any failed or ambiguous batch readback or identity uses the pre-send owned rollback rule.
9. Only after every worker passes, send the independent fire-and-forget handoffs from `../chanks-0-agente-soporte/assets/assignment-implementation.md` with Intercom `send`; the worker runs `../chanks-3-session-kickoff/SKILL.md` inside its own tab. Two approved Pi workers receive independent fire-and-forget handoffs: ordinary `send` has no wait timeout, so Main sends worker 2 without waiting for worker 1; Main returns after the delivery result for each handoff; Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`. After the first send, any later send failure or ambiguity preserves all batch artifacts and marks unsent or uncertain Sessions `BLOCKED` for human reconciliation; never resend, infer delivery, or roll back.
10. Workers send progress to Main through Intercom and send terminal `COMPLETED`, `BLOCKED`, or `FAILED` events; every progress and terminal `send` identifies the exact Sesión and worker. The worker reports terminal result evidence. A true human decision uses a worker-initiated `ask`; Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer, never an unthreaded substitute or its own `ask`. Main never initiates `ask`. If that `ask` times out, preserve the worktree and candidate as `BLOCKED`; do not guess the answer or report completion.
11. A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume. Require human reactivation and reapproval before a new dispatch. After the responsible parent integrates and records a Sesión, run the retire mode in `references/retiro.md`.

## Output Contract

Return one row per Sesión — Sesión · declared worker · worktree · branch · tab · agent — with IDs
from Herdr JSON; the complete lock/reservation result; each refused Sesión and its exact reason;
Git, Radar, Herdr, Intercom, preparation, branch, launch, readback, rollback, and retirement
outcomes. Include one fresh complete-batch Intercom live-roster readback and one Intercom delivery result per exact
Sesión/worker handoff, worker progress and terminal events, and every blocked agent needing the
human. Herdr JSON proves only seat and process identity; Intercom delivery results prove only
message delivery; neither grants authority or proves work completion. The worker reports terminal
result evidence.

## References

- `references/retiro.md`
- `herdr` skill, emitted by `herdr --skill`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-3-session-kickoff/SKILL.md`
