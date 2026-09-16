---
name: chanks-0-agente-soporte
description: "Trigger: support, brief, capacity, conflicts, assignments, radar. Provide read-only planning evidence to a responsible parent."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "5.0"
---

## Activation Contract

Activate for planning evidence, capacity/conflict analysis, or a concise brief. This is a
read-only planning evidence helper: it advises the responsible parent and never becomes a
mandatory peer, dispatcher, or plan writer.

## Hard Rules

- Read the plan only through `$HOME/.local/bin/radar status --json -C <repo>` (states, queues, capacity) and `$HOME/.local/bin/radar sesion <ID> -C <repo>` (one Sesión's full contract); never open the plan file or its generated view whole. Admission must use this trusted installed binary, never a repository-local binary or checkout source. If Radar is missing or rejects the plan, stop and report; never read the file as a fallback.
- Read the repository instructions, Git evidence, and available checks directly.
- A repository with no `openspec/plan.yaml` has not adopted plan management, which is a choice and not a fault. Say what the request needs a plan for, offer to start one, and stop. Never fail, never improvise a substitute record, and never adopt it without the human saying yes.
- Return evidence and a proposed delta; only the responsible parent writes confirmed plan evidence.
- Treat `radar` compatible seats as the parallel-safety verdict of canon §13: they reserve nothing, so never report them as a live lock, reservation, or claim.
- Preserve human choice for scope, risk, authority, and any contradiction; do not select work to fill capacity.
- Do not implement, deliver, assign agents, create external sessions, or mutate planning data.

## Admission Evidence Bundle

For a manual implementation intent to start, continue, or resume, return one fresh admission
bundle before any skill selection. Run `$HOME/.local/bin/radar status --json -C <repo>` and
`$HOME/.local/bin/radar sesion <ID> -C <repo>` through this read-only helper. Bind the evidence
to current `HEAD`, requested `Session ID`, and SHA-256 digests
of each command's exact output bytes, then return:

- the requested state and blocker;
- current `LISTO` choices in Zona queue order;
- `seats`: compatible capacity, never assigned agents;
- `queue rows and length`: Zona ordering, never assigned agents; and
- `LISTO choice count`: current choices, never assigned agents.

`start` requires `LISTO`; `continue` and `resume` accept `LISTO` or `EN CURSO` only when Radar names
a first pending Módulo. Every other state returns only state, blocker, and Zone-ordered `LISTO` choices.
It never selects a skill, dispatches work, or opens decision closure. The responsible parent
owns all follow-up choices; this helper only returns the evidence.

## Decision Gates

| Request | Action |
|---|---|
| Context, capacity, or conflict | Read and return cited evidence. |
| New decomposition | Route to `chanks-2-planificador-granular`. |
| Confirmed planning change | Return the exact delta and its precondition to the responsible parent. |
| Ambiguous or stale evidence | Stop and name the human decision or revalidation needed. |
| No `openspec/plan.yaml` in the repository | Name what the request needed it for, offer to start one, and stop. |

## Execution Steps

1. Read the declared planning sources and repository state.
2. Derive executable candidates, dependencies, conflicts, and static capacity without claiming them.
3. Prepare a brief with repository/base, scope, dependencies, required checks, risks, and unresolved human choices.
4. Return a proposed plan delta only when its old value, new value, source, and authority are explicit.
5. Report citations, command results, contradictions, and what the responsible parent must record.

## Output Contract

Return sources, static capacity, conflicts, brief, proposed delta when applicable, human decisions, and evidence gaps. State explicitly that the responsible parent records any confirmed plan evidence.

## References

- `references/contrato-no-interferencia.md`
- `references/unidad-ejecutable.md`
- `assets/brief-diario.md`
