---
name: chanks-4-puente
description: "Trigger: ejecutar Sesión, traducir plan a SDD, actualizar plan desde SDD. Translate evidence in both directions without writing the plan."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activate after validated kickoff to translate one Sesión contract into its route's execution path
and return resulting evidence to the responsible parent.

## Hard Rules

- This work reads the plan through `../chanks-0-agente-soporte/SKILL.md`. A repository with no `openspec/plan.yaml` has not adopted plan management: say what this step needed it for, offer to start one, and stop. Never improvise a substitute record.
- Translate; do not redefine scope, authority, criteria, Zonas, or decisions.
- Only `full-sdd` enters Gentle AI's native SDD pipeline, at `proposal`; `direct` and `design-tasks` use its non-SDD implementation path (canon §15).
- For `full-sdd`, show the loaded SDD preflight and ask for confirmation or change before entering it.
- `verify` and review are mandatory for every route; `archive` runs only for `full-sdd`, after delivery.
- Never write plan data or a generated view. Return evidence and a preconditioned delta for the responsible parent to record.

## Decision Gates

| Revalidated route | Execution path |
|---|---|
| `direct` | Non-SDD implementation from the plan's Módulos and Tareas |
| `design-tasks` | A bounded design recorded in the plan, then non-SDD implementation |
| `full-sdd` | Native SDD pipeline from `proposal` |
| No executable route | Do not start; return the computed cause. |

## Execution Steps

1. Translate handoff, Sesión, criteria, decisions, Módulos/Tareas, and base into the route's inputs.
2. For `full-sdd`, show mode, artifact store, testing/TDD, and delivery strategy for confirmation or change.
3. Implement through the route's path and verify against the Sesión's binary criteria. Give every Módulo commit the trailer `Modulo: <ID>` so the Sesión can resume from Git.
4. After review and delivery under repository policy, execute `archive` only for `full-sdd`.
5. Translate progress, validation, delivery, and `full-sdd` archive evidence into a delta with expected old value. For `direct` and `design-tasks`, include the criterion-by-criterion verify evidence for the body of the delivery-record commit, and return evidence to the responsible parent.

## Output Contract

Return plan↔route map, the preflight when `full-sdd`, execution path, `verify`, review, delivery,
and `full-sdd` `archive` evidence, plus the exact proposed parent record.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
