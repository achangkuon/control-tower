---
name: chanks-4-puente
description: "Trigger: ejecutar Sesión, traducir plan a SDD, actualizar plan desde SDD. Translate evidence in both directions without writing the plan."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.1"
---

## Activation Contract

Activate after validated kickoff to translate one Session contract into its authorized execution path
and return resulting evidence to the responsible parent.

## Hard Rules

- Read plan evidence through `../chanks-0-agente-soporte/SKILL.md`. Translate; never redefine scope,
  authority, Zona, decisions, exact files, completion, or plan status.
- A native Encargo Session defaults to a native ODD technical record. It does not become a second product plan,
  executor, lock, storage system, candidate footprint, state machine, or topology control.
  Scope/files expansion needs approved change and fresh compatibility before affected mutation.
- Native SDD is available only for an explicit human `solicitud_sdd`; legacy SDD is available only to
  an authorized legacy `full-sdd`. Only a human-selected native SDD or authorized legacy `full-sdd`
  NEW-start may prepare SDD; never prepare a non-SDD route, non-OpenSpec store, or unauthorized Session.
- Before either eligible new start, bind native v2 `planningHome` and `actionContext` to the selected
  canonical workspace (`repo-local`, `<workspace>/openspec`, workspace-only edit root), retain the
  already-valid human NEW-start authority and preflight, and require `sdd-status` to return `sdd-new`.
  Unknown scope, workspace-planning, or store fails; do not guess.
- Only then run `python3 scripts/prepare_new_change.py --workspace "$workspace" --change "$change" --intent new --route full-sdd --native-artifact-store openspec`. It derives initialized Git/OpenSpec change/archive paths and creates only the empty named container with descriptor-relative no-follow semantics.
- Never prepare for excluded intent or route, a noncanonical/symlinked workspace, collision, or exact legacy/dated archive match.
  The helper creates no parents, marker, proposal, grant, native phase,
  local state machine, or authority claim. Immediately read fresh native v2 `sdd-status` after preparation
  and obey only its returned route; validation inputs do not grant authority.
- For CONTINUE/RESUME existing authorized native SDD or legacy `full-sdd`, do not prepare or create a
  container. Bind the existing change and fresh native v2 `sdd-status`, then follow the exact
  provider-returned continuation from the preserved checkpoint. Stop only for an actual invalid or missing
  authority, change, or provider stop. Existing native ODD resumption remains its ordinary reconciliation.
- Strict TDD is forwarded from effective explicit configuration, never inferred from test presence.
  Technical checks/review follow Gentle AI native policy. Respect review decline/provider fallback;
  review outcome never authorizes delivery. Native ODD has one Session review boundary, never a
  per-task/per-Módulo reviewer loop.
- Never write plan data or a generated view. Return evidence and a preconditioned delta to the
  responsible parent; actual delivery evidence and ordinary delivery policy decide closure.

## Legacy-only route and cadence

The following preserves genuinely older contracts, including Módulo commits; it never imposes Módulos,
Tareas, trailers, or commit cadence on native ODD.

- Only legacy `full-sdd` enters Gentle AI's native SDD pipeline at `proposal`; legacy `direct` and
  `design-tasks` use the non-SDD path. `verify` and review apply under their retained legacy contract;
  `archive` runs only for legacy `full-sdd` after delivery.
- Every legacy Tarea is internal RED → GREEN → REFACTOR evidence only. It must not create a commit or
  native RDD review checkpoint. Planning/SDD artifacts stay outside the 400-line review reference.
- By default, open exactly one native RDD transaction for the complete immutable legacy Session candidate
  after all Módulos and criterion-by-criterion `verify`, before delivery and before any Módulo commit.
  Only after approval, materialize one independently revertible commit per completed Módulo from reviewed
  bytes; every Módulo commit includes implementation and tests and carries `Modulo: <ID>`.
- Earlier/per-Módulo review is only a human-selected oversized or independently deliverable exception;
  a Módulo's mere existence never selects it.

## Decision Gates

| Contract | Execution path |
|---|---|
| Native Encargo without explicit SDD | ODD technical record, configured checks, and one Session review boundary. |
| Native explicit human `solicitud_sdd` | Eligible NEW-start recipe above, then existing native SDD controls. |
| Legacy `direct` / `design-tasks` | Preserved non-SDD legacy execution. |
| Legacy `full-sdd` new start | Eligible NEW-start recipe above, then retained legacy SDD flow. |
| CONTINUE/RESUME existing authorized native SDD or legacy `full-sdd` | Bind the existing change and fresh status; do not prepare/create a container; follow the provider-returned continuation. |
| Missing admission, authority, change, or provider stop | Stop with the actual cause. |

## Execution Steps

1. Bind admitted identity, exact files, constraints, HEAD, authority, and compatibility evidence.
2. For native ODD, create/reconcile only Gentle AI's subordinate ODD document and Engram continuity record.
3. For an eligible explicit native SDD or legacy `full-sdd` new start, perform the exact confined preparation recipe above.
4. For an existing authorized native SDD or legacy `full-sdd` CONTINUE/RESUME, bind its change and fresh status;
   do not prepare, and follow only the provider-returned continuation from its preserved checkpoint.
5. Implement through the authorized native or legacy path and report observed TDD/check evidence.
6. At the complete normalized candidate boundary, follow the applicable review policy once; return
   review result/fallback, actual delivery evidence, and archive evidence only when its SDD contract requires it.

## Output Contract

Return plan↔execution map, native/legacy discriminator, preparation evidence when eligible, TDD/check
results, one review outcome or fallback, actual delivery evidence, applicable archive evidence, and
exact parent-record delta. Never report review as delivery authority or ODD continuity as plan status.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
