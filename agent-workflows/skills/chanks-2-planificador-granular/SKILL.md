---
name: chanks-2-planificador-granular
description: "Trigger: planificar, desglosar, enumerar Sesiones. Run eight fixed steps and propose one of three routes for approved scope."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "5.0"
---

## Activation Contract

Activate to incorporate approved scope into one plan. Decompose and propose; return a bounded
planning delta for the responsible parent to confirm and record.

## Hard Rules

- Run all eight steps in order. Do not add a hierarchy level.
- Preserve `Zona → Sesión → Módulo → Tarea`; one Sesión belongs to one Zona.
- Load each reference only when its step needs it.
- The only routes are `direct`, `design-tasks`, and `full-sdd`.
- For `full-sdd`, leave Módulos and Tareas empty because design defines them.
- Do not write plan data or the generated view. Preserve human choice for scope, risks, and authority.

## Decision Gates

| Honest cut depth | Route |
|---|---|
| Contract and execution determined | `direct` |
| Fixed result; bounded technical design missing | `design-tasks` |
| Behavior or shared contract needs design | `full-sdd` |
| Authority or evidence missing/contradictory | Return the required human decision; do not propose a route. |

## Execution Steps

1. **Locate territory:** load `../chanks-1-heredado/references/ubicacion-y-cruces.md` and place the scope in a Zona.
2. **Resolve crossings:** declare Cimientos, dependencies, or a required recut; do not simulate a lock.
3. **Cut the Sesión:** define one independently reviewable result.
4. **Write binary contract:** fix observable, falsifiable criteria.
5. **Decompose:** for `direct`/`design-tasks`, enumerate file-based Módulos and atomic Tareas; for `full-sdd`, leave them empty.
6. **Declare decisions:** record authority, evidence, options, class, checkpoint, and contamination.
7. **Judge route:** load `references/juicio-de-ruta.md` and propose one route.
8. **Forecast size:** count authored additions+deletions; split into Sesiones or declare a chain when needed.

## Output Contract

Return the eight results, proposed route and authority, authored-size forecast, exact proposed
delta, human decisions, unenumerated responsibilities, and what the responsible parent must
record after confirmation.

## References

- `../chanks-1-heredado/references/ubicacion-y-cruces.md`
- `references/juicio-de-ruta.md`
- `../chanks-0-agente-soporte/SKILL.md`
