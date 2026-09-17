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
- Before preparation, bind native v2 `planningHome` and `actionContext` to the selected canonical workspace (`repo-local`, `<workspace>/openspec`, workspace-only edit root), retain the already-valid human NEW-start authority and preflight, and require `sdd-status` to return `sdd-new`. Unknown scope, workspace-planning, or store fails; do not guess.
- Only then run `python3 scripts/prepare_new_change.py --workspace "$workspace" --change "$change" --intent new --route full-sdd --native-artifact-store openspec`. It mechanically derives the initialized Git/OpenSpec changes and archive paths and creates only the empty named container with descriptor-relative no-follow semantics.
- Never prepare for excluded intent or route, a non-OpenSpec store, noncanonical or symlinked workspace path, collision, or exact legacy/dated archive match. The helper explicitly fails on unsupported systems; it creates no parents, marker, proposal, grant, native phase, local state machine, or authority claim.
- Immediately read fresh native v2 `sdd-status` after preparation and obey only its returned route. The validation inputs do not grant authority; human authority and native action context remain caller-owned.
- `verify` and review are mandatory for every route; `archive` runs only for `full-sdd`, after delivery.
- Never write plan data or a generated view. Return evidence and a preconditioned delta for the responsible parent to record.

## TDD, Commit, and Review Cadence

This cadence applies to `direct`, `design-tasks`, and `full-sdd`; it does not change which route
owns native SDD or archive.

- Every Tarea is internal RED → GREEN → REFACTOR evidence only. It must not create a commit or a native RDD review checkpoint.
- Planning and SDD artifacts stay outside the 400-line review reference under repository policy; their presence never recreates a per-Módulo review or attempt.
- By default, open exactly one native RDD transaction for the complete immutable Session candidate after all Módulos and criterion-by-criterion `verify`; it occurs before delivery and before any Módulo commit.
- Only after that review approves, materialize exactly one independently revertible commit per completed Módulo from the reviewed bytes; every Módulo commit includes that Módulo's implementation and tests and carries the single trailer `Modulo: <ID>`.
- Earlier or per-Módulo review is an exception only when the human explicitly selected an oversized or independently deliverable unit. The mere existence of a Módulo never selects this exception.

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
3. Implement every Módulo through the route's path, verify the Sesión's binary criteria, and review the complete uncommitted Session candidate before creating its Módulo commits.
4. After approval, materialize the reviewed bytes into the Módulo commits without content changes, deliver under repository policy, and execute `archive` only for `full-sdd` after delivery.
5. Translate progress, validation, delivery, and `full-sdd` archive evidence into a delta with expected old value. For `direct` and `design-tasks`, include the criterion-by-criterion verify evidence for the body of the delivery-record commit, and return evidence to the responsible parent.

## Output Contract

Return plan↔route map, the preflight when `full-sdd`, execution path, `verify`, review, delivery,
and `full-sdd` `archive` evidence, plus the exact proposed parent record.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
