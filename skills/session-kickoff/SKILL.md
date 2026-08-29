---
name: session-kickoff
description: "Trigger: start session, continue session, session kickoff, resume session. Route one approved Sesión through the proportional execution path."
license: Apache-2.0
metadata:
  author: emili
  version: "2.1"
---

## Activation Contract

Activate for generic intent to start or continue a work session: “start”, “kickoff”,
“continue”, “resume”, or equivalent. This parent owns mode detection and routing only.

## Hard Rules

- Detect the project and existing session state from Engram before choosing new or continuation mode.
- Do not invent a Plan, Sesión, Módulo, Tarea, status, or acceptance criterion. Load `planificador-granular` for approved-scope decomposition.
- Select exactly one route for one already-enumerated Sesión. Never run SDD independently for each Módulo.
- `direct` and `design-tasks` use a fresh general implementation executor, not an `sdd-*` phase.
- `full-sdd` is the only route that invokes the managed SDD pipeline, once for the whole Sesión.
- Run one readiness check before routing: current base, fresh authority, current evidence, executable Session contract, binary criteria, and decision contamination location must agree.
- After readiness passes, do not semantically re-audit the Session unless base, evidence, criteria, scope, or authority changes.
- An always-escalate decision blocks the Session only when it contaminates acceptance criteria/first Módulo or another Sesión names it in `Contamina:`. If it reaches only a later Módulo, park that Módulo and continue honestly up to it. Documents cannot substitute maintainer authority.
- Preserve the canonical four-level hierarchy and seven statuses from `_shared/plan-naming-convention.md`.

## Decision Gates

| Route | Action |
|---|---|
| No approved scope | Stop and route to `project-kickoff` or `architecture-audit`. |
| `direct` | Fresh general implementation executor using the approved Session contract. No `sdd-*` phase. |
| `design-tasks` | Load `session-plan` in compact technical-elaboration mode, then use the same fresh executor. No proposal/spec. |
| `full-sdd` | Run `sdd-propose` → `sdd-spec` → `sdd-design` → `sdd-tasks` → `sdd-apply` → `sdd-verify` once for the Session. |
| `blocked` | Stop and ask one maintainer decision. |

## Execution Steps

1. Detect the project and load the current plan/status from Engram.
2. For a new session, pass approved scope to `planificador-granular`; for continuation, select the recorded Sesión.
3. Perform the readiness check once and record the checked base/evidence/criteria/scope/authority identity plus contamination location. If any changes later, rerun readiness; otherwise reuse it without semantic re-audit.
4. Load only the selected route. For `design-tasks`, `session-plan` refines the named Session's existing Tareas and persists one compact Engram delta.
5. For `direct` or `design-tasks`, hand the fresh executor the approved Session contract, existing Módulos/Tareas, binary acceptance criteria, project instructions, applicable project skills, Strict TDD when active, and independently revertible ≤400-authored-line work-unit commit boundaries.
6. Run every Módulo as `apply → tests → focused review → Engram checkpoint`; the executor does not create a second hierarchy or per-Module SDD.
7. For `full-sdd`, run the managed pipeline once for the whole Session; its `sdd-apply` and `sdd-verify` stages produce and verify the result. Do not invoke a second executor or apply pass.
8. Run one integral requirements/runtime verification, then load `session-doc` for final closure. Do not advance with a failed criterion.

## Output Contract

Return mode, selected Sesión, route with its reason and authority reference, executor
handoff or SDD result, current module checkpoint, blockers, next action, and
`skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../planificador-granular/SKILL.md`
- `../session-plan/SKILL.md`
- `../session-doc/SKILL.md`
