---
name: session-plan
description: "Trigger: technical readiness or compact technical elaboration for a named Sesión. Verify root cause, refine existing Tareas, and recommend an execution route."
license: Apache-2.0
metadata:
  author: emili
  version: "2.1"
---

## Activation Contract

Activate only when `session-kickoff` or `planificador-granular` names an existing
Sesión and requests readiness or `design-tasks` technical elaboration: verified root
cause, affected paths, reusable patterns, design decisions, Tarea amendments, or
route advice. Generic session start/continue belongs to `session-kickoff`; approved-
scope decomposition belongs to `planificador-granular`.

## Hard Rules

- Investigate exactly one already-enumerated Sesión; read its authority and `Área` first.
- Verify root causes and design constraints in the code. Report evidence, paths, and symbols.
- Do not create or rename a Plan, Sesión, Módulo, or Tarea; do not split work by time or invent a one-PR boundary.
- Refine only the existing Módulos/Tareas. Do not duplicate the planner's hierarchy or create proposal/spec artifacts.
- Persist readiness and technical-elaboration deltas compactly to Engram; do not create Markdown by default.
- Do not resolve maintainer decisions. An unresolved always-escalate decision recommends `blocked` before SDD or implementation.

## Decision Gates

| Condition | Action |
|---|---|
| Sesión ID or authority is absent | Stop and report the missing input. |
| Root cause and implementation are clear | Recommend `direct`; no design artifact is needed. |
| Technical design decisions must be made or existing Tareas refined | Recommend `design-tasks`; persist the compact design/Tarea delta, then use the general implementation executor. |
| Product contract, public API, security, data loss, scope, or other ambiguity requires SDD | Recommend `full-sdd`; do not run SDD here. |
| Always-escalate decision, contradictory evidence, or missing authority | Recommend `blocked`; do not substitute documentation for approval. |

## Execution Steps

1. Load the named Sesión, authority reference, `Área`, `Decisiones`, existing Módulos/Tareas, and current status.
2. Inspect affected paths and identify the verified root cause, readiness, dependencies, and reusable patterns.
3. In technical-elaboration mode, record design decisions and amend or refine existing Tareas only; preserve IDs and acceptance criteria unless the authority explicitly changes them.
4. List unresolved unknowns and distinguish derivable decisions from escalation; stop on always-escalate classes.
5. Persist a compact Engram record containing evidence, decisions, amendments, unknowns, and authority references. Avoid Markdown by default.
6. Recommend exactly one route: `direct`, `design-tasks`, `full-sdd`, or `blocked`, with a concise reason and authority reference.

## Output Contract

Return the Sesión ID, authority reference, verified root cause, affected paths,
reusable patterns, technical design decisions, amended existing Tareas, unknowns,
recommended route with reason, compact Engram key, blockers, and
`skill_resolution: paths-injected`. Do not return a new hierarchy, proposal/spec,
or duplicate task list.

## References

- `../_shared/plan-naming-convention.md`
- `../planificador-granular/SKILL.md`
- `../session-kickoff/SKILL.md`
