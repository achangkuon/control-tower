---
name: planificador-granular
description: "Trigger: planificar, desglosar, enumerar Sesiones. Decompose approved scope into Plan → Sesión → Módulo → Tarea and classify each Sesión route."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.2"
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
- `direct` uses a fresh general implementation executor and no `sdd-*` phase. This skill is sole author of its Módulos/Tareas.
- `design-tasks` uses `session-plan` to amend existing Tareas through one compact Engram delta, then the same executor. This skill remains sole author of the hierarchy; `session-plan` creates no proposal/spec or parallel decomposition.
- `full-sdd` invokes the managed `proposal → spec → design → tasks → apply → verify` pipeline once per Sesión. SDD design/tasks are sole authors of Módulos/Tareas; the Plan/STATUS links that decomposition and MUST NOT duplicate it.
- Route by authority freshness, decision class/contamination, coupling, and whether criteria are verifiable without inventing product meaning. Risk or the number of technical seams alone never selects `full-sdd`.
- Escalating is not blocking (convention §11). `BLOQUEADO`/`blocked` only when the open decision reaches the acceptance criteria or the first Módulo, or another Sesión's `Contamina:` names it; a later-Módulo decision leaves the Sesión `🟢 LISTO` with that Módulo 🔴. Missing authority or contradictory evidence always blocks; an open decision alone does not.
- Most Sesiones `BLOQUEADO` means the pass applied Sesión state to Módulo-level contamination. Recompute before reporting.
- Emit a `Cola de ejecución`: topological positions across Plans, recomputed each pass, never renumbering IDs.
- Size output per convention §12 and declare every omitted artifact.
- Never create per-Module SDD. Modules use `apply → tests → focused review → Engram checkpoint`.

## Decision Gates

| Condition | Route |
|---|---|
| Current approved Session contract has a binary-verifiable outcome and every remaining choice is derivable | `direct` — this skill authors Módulos/Tareas; fresh general executor. |
| Product outcome is fixed, but bounded technical discovery is required to make existing Tareas executable | `design-tasks` — this skill authors Módulos/Tareas; `session-plan` may amend those Tareas once. |
| Approved Session outcome/boundaries exist, but behavior, lifecycle, or a shared contract still needs design within authority | `full-sdd` — SDD design/tasks solely author Módulos/Tareas; Plan/STATUS links them. |
| Authority is absent/stale, evidence contradicts, no honest binary Session criteria exist, or an open decision contaminates criteria/first Módulo | `blocked` — stop and ask one maintainer decision; SDD must not invent its own exam. |
| An open decision contaminates only a later Módulo | Route normally; mark that Módulo 🔴 and park the decision. |

## Execution Steps

1. Anchor every responsibility to the approved authority and inspect what already shipped.
2. Cut candidates by independently reviewable one-PR result; split overflow into Sesiones, never a new level.
3. Enumerate `Área` from the real tree and declare shared `Recurso` claims.
4. Write binary acceptance criteria, including the no-path-outside-`Área` boundary.
5. List `Decisiones`; mark `derivable` only with approved authority plus a falsifiable criterion, otherwise `escala` with class and `Contamina:`. Locate each escalating decision at the Módulo it first reaches.
6. Assign route, concise reason, and authority reference to every Sesión, applying the contamination test above. Stop before SDD or implementation for `blocked`.
7. For `direct`/`design-tasks`, split Módulos by files and create at least three Tareas per Módulo in RED → GREEN → REFACTOR order. For `full-sdd`, record only the Session contract and links reserved for SDD decomposition. Render the dependency graph unless convention §12 exempts it.
8. Forecast independently revertible work-unit commits at ≤400 authored additions+deletions, keeping tests/docs with behavior; split the Sesión or plan chained PRs without adding a hierarchy level when needed.
9. Order every `🟢 LISTO` and `📋 PLANIFICADO` Sesión topologically across Plans into the `Cola de ejecución`, numbering new Plans so IDs match their queue positions.
10. Close the denominator, report unenumerated responsibilities, and recompute `%` from Sesión states.

## Output Contract

Return the authority; the `Cola de ejecución` with positions across Plans; one row
per Sesión with `ID · Resultado · Estado · Route · Reason · Authority · Depende de ·
Área · Recurso`; decisions with the Módulo each one reaches; binary criteria;
unenumerated scope; `%` with its fraction; which Sesiones are `🟢 LISTO` or blocked;
Mermaid graph and computed capacity, or the declared reason each was omitted. End
with `skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../session-plan/SKILL.md`
- `../agente-soporte/SKILL.md`
