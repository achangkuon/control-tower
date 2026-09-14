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

- Read the plan only through `radar status` (states, queues, capacity) and `radar sesion <ID>` (one Sesión's full contract); never open the plan file or its generated view whole. If radar is missing or rejects the plan, stop and report; never read the file as a fallback.
- Read the repository instructions, Git evidence, and available checks directly.
- A repository with no `openspec/plan.yaml` has not adopted plan management, which is a choice and not a fault. Say what the request needs a plan for, offer to start one, and stop. Never fail, never improvise a substitute record, and never adopt it without the human saying yes.
- Return evidence and a proposed delta; only the responsible parent writes confirmed plan evidence.
- Treat `radar` capacity as a static forecast, never a live lock, reservation, or claim.
- Preserve human choice for scope, risk, authority, and any contradiction; do not select work to fill capacity.
- Do not implement, deliver, assign agents, create external sessions, or mutate planning data.

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
