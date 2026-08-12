---
name: agente-soporte
description: "Trigger: support, daily brief, capacity, conflicts, assignments, repo/plan/Tower questions. Read-only planning support beside the Tower."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Activation Contract

Activate for a support request about safe capacity, conflict mapping, assignment
briefs, daily context, repository/plan state, or Tower state. Do not own generic
session start/continue intent or approved-scope decomposition; those belong to
`session-kickoff` and `planificador-granular`.

## Hard Rules

- Read-only. Never edit, stage, commit, push, open/update a PR, merge, mutate a DB, or change a worktree.
- Never register, acquire, release, or transfer Tower locks. Use `tower_status` for state and `tower_send` only for an approved brief to the orchestrator.
- The orchestrator is the only `tower_send` recipient. Never message a worker directly.
- Verify repository, plan, Git, and Tower sources; report discrepancies instead of averaging them.
- Never guess `Área`, `Recurso`, branch, base, DB mode, dependencies, or capacity.

## Decision Gates

| Condition | Action |
|---|---|
| User asks for daily context or blockers | Produce the daily brief with cited sources and arithmetic. |
| User asks for decomposition or a new Sesión | Route to `planificador-granular`; do not plan it here. |
| A Sesión lacks `Área` or `Recurso` | Report it missing and exclude it from parallel-safe capacity. |
| Sources disagree | Report the discrepancy as the finding. |
| Delivery, ordering, tokens, or closure arise | Hand off to `torre-control-entregas`. |

## Execution Steps

1. Gather repository instructions, canonical index/status, reservations, plan/spec, Git, and forge authority.
2. Define executable Sesiones, conflict edges, dependencies, DB ownership, and requested/recommended/maximum-safe counts. For a daily brief, derive today's named Plan/Sesión/Módulo objective with an auditable baseline → projected target.
3. Verify worktree, branch, scope, resources, and queue position for each proposed assignment.
4. Present sources, rationale, blockers, and confidence; obtain explicit approval before drafting delivery.
5. Draft one bounded brief per agent and send the approved set only to the orchestrator, then stop.

## Output Contract

Return sources, Sesiones, conflict edges, the three counts, `worktree | branch |
scope | db_mode | dependencies` per assignment, queue rationale, blockers, and
confidence. Every daily brief also returns the objective projection: baseline, named
closure targets, projected target, percentage-point delta, execution Módulos,
unlocks, required conditions, and confidence, explicitly distinguished from actual
progress. End with `skill_resolution: paths-injected`.

## References

- `references/contrato-no-interferencia.md`
- `references/unidad-ejecutable.md`
- `assets/brief-diario.md`
- `../_shared/plan-naming-convention.md`
