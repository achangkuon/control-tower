---
name: chanks-4-puente
description: "Trigger: ejecutar Sesión, traducir plan a SDD, actualizar plan desde SDD. Translate evidence in both directions without writing the plan."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activate after validated kickoff to translate one Sesión contract into the shared SDD pipeline
and return resulting evidence to the responsible parent.

## Hard Rules

- Translate; do not redefine scope, authority, criteria, Zonas, or decisions.
- Show the loaded SDD preflight and ask for confirmation or change before entering it.
- One pipeline, three entry gates: `direct`→`apply`, `design-tasks`→`design`, `full-sdd`→`proposal`.
- `verify` and post-delivery `archive` are common and mandatory for every route.
- Never write plan data or a generated view. Return evidence and a preconditioned delta for the responsible parent to record.

## Decision Gates

| Revalidated route | First phase |
|---|---|
| `direct` | `apply` |
| `design-tasks` | `design` |
| `full-sdd` | `proposal` |
| No executable route | Do not enter SDD; return the computed cause. |

## Execution Steps

1. Translate handoff, Sesión, criteria, decisions, Módulos/Tareas, and base into SDD preflight inputs.
2. Show mode, artifact store, testing/TDD, and delivery strategy for confirmation or change.
3. Enter at the route gate and continue the one pipeline through `apply` and `verify`.
4. After review and delivery under repository policy, execute `archive`.
5. Translate progress, validation, delivery, and archive evidence into a delta with expected old value; return evidence to the responsible parent.

## Output Contract

Return plan↔SDD map, shown/confirmed preflight, entry gate, `verify`, review, delivery, and
`archive` evidence, plus the exact proposed parent record.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
