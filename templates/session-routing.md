<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->
## Durable Session Skill Routing

- Primary authority for generic session start/continue intent: `session-kickoff` at `{{REPO_ROOT}}/skills/session-kickoff/SKILL.md`.
- Load the parent first, then lazy-load exactly one route:
  - `direct`: fresh general implementation executor; never an `sdd-*` phase.
  - `design-tasks`: `session-plan` compact technical elaboration -> the same fresh executor; no proposal/spec.
  - `full-sdd`: `sdd-propose` -> `sdd-spec` -> `sdd-design` -> `sdd-tasks` -> `sdd-apply` -> `sdd-verify`, once for the whole Sesión.
  - `blocked`: stop and ask one maintainer decision.
- `planificador-granular` owns approved-scope decomposition and route classification; `session-plan` investigates one named Sesión; `agente-soporte` handles read-only capacity, conflicts, and assignments; `session-doc` performs final closure.
- Direct/design-tasks executor input is the approved Session contract, existing Módulos/Tareas, binary acceptance criteria, project instructions, applicable project skills, Strict TDD when active, and work-unit commit boundaries.
- Run each Módulo as `apply -> tests -> focused review -> Engram checkpoint`; run one integral requirements/runtime verification, then `session-doc`. Never run SDD per Módulo.
- Stop before SDD when an unresolved decision belongs to an always-escalate class.
- Claude, OpenCode, and Codex use their runtime copies. Pi has no native SkillsDir; load the exact canonical paths manually.
<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->
