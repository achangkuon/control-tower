---
name: planificador-granular
description: "Trigger: planificar, desglosar, enumerar Sesiones. Decompose approved scope into Plan → Sesión → Módulo → Tarea and classify each Sesión route."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Activation Contract

Activate when approved scope must become an executable plan: after a PRD/RFC/
REQUIREMENTS, spec, or verified audit, or when an existing plan has unenumerated
responsibilities. `_shared/plan-naming-convention.md` is canonical; read it first.

This is the only skill that decomposes approved scope into Plan → Sesión → Módulo →
Tarea. It does not investigate or elaborate one named Sesión; that is `session-plan`.

## Hard Rules

- Plan only from an approved authority. Record its exact path, section, decision, or scenario.
- Preserve exactly four levels and the seven closed statuses. Estimates never define a boundary.
- Each Sesión is what fits in one PR and declares `Estado`, `Depende de`, `Área`, `Recurso`, `Decisiones`, and binary acceptance criteria.
- Classify every Sesión as `direct`, `design-tasks`, `full-sdd`, or `blocked` with a concise reason and authority reference.
- `direct` uses a fresh general implementation executor and no `sdd-*` phase.
- `design-tasks` uses `session-plan` compact technical elaboration, then the same executor; it creates no proposal/spec artifacts.
- `full-sdd` is the only route that invokes the managed `proposal → spec → design → tasks → apply → verify` pipeline, once per Sesión.
- An unresolved always-escalate decision, contradictory evidence, or missing authority is `blocked` before SDD or implementation.
- Never create per-Module SDD. Modules use `apply → tests → focused review → Engram checkpoint`.

## Decision Gates

| Condition | Route |
|---|---|
| Scope is approved, clear, and has no unresolved design decision | `direct` — fresh general implementation executor; cite the authority and evidence. |
| Scope is approved but technical design must be chosen first | `design-tasks` — `session-plan` compact elaboration → same executor; cite the decision and constraint. |
| Scope is ambiguous, risky, or needs product/technical contracts clarified | `full-sdd` — proposal → spec → design → tasks → apply → verify once for the Session; cite the authority and unknown. |
| Authority is absent, evidence conflicts, or an always-escalate decision is open | `blocked` — stop and ask one maintainer decision. |

## Execution Steps

1. Anchor every responsibility to the approved authority and inspect what already shipped.
2. Cut candidates by independently reviewable one-PR result; split overflow into Sesiones, never a new level.
3. Enumerate `Área` from the real tree and declare shared `Recurso` claims.
4. Write binary acceptance criteria, including the no-path-outside-`Área` boundary.
5. List `Decisiones`; mark `derivable` only with approved authority plus a falsifiable criterion, otherwise `escala` with class and `Contamina:`.
6. Assign route, concise reason, and authority reference to every Sesión. Stop before SDD or implementation for `blocked`.
7. Render the acyclic dependency graph, split Módulos by files, and create at least three Tareas per Módulo in RED → GREEN → REFACTOR order.
8. Close the denominator, report unenumerated responsibilities, and recompute `%` from Sesión states.

## Output Contract

Return the authority; one row per Sesión with `ID · Resultado · Estado · Route ·
Reason · Authority · Depende de · Área · Recurso`; decisions; binary criteria;
Mermaid graph; computed capacity; unenumerated scope; `%` with its fraction; and
which Sesiones are `🟢 LISTO` or blocked. End with `skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../session-plan/SKILL.md`
- `../agente-soporte/SKILL.md`
