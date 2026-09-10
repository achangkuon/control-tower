<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->
## Durable Session Skill Routing

- Primary authority for starting or continuing one approved Sesión is `session-kickoff` at
  `{{REPO_ROOT}}/skills/session-kickoff/SKILL.md`.
- Planning is one fixed eight-step flow. `chanks-2-planificador-granular` executes it directly; it is
  not a parent router and has no child-skill hierarchy.
- Kickoff receives the assigned Sesión, verifies HEAD, branch and clean tree, then revalidates
  its proposed route once against the code in the Zona. It sends the exact delta to Support;
  it does not choose new work or become a second dispatcher.
- The plan↔SDD bridge translates the approved or revalidated route into exactly one entry gate:
  - `direct` enters at `apply`.
  - `design-tasks` enters at `design`.
  - `full-sdd` enters at `proposal`.
- These are the only routes. Continue forward from the selected gate through one shared SDD
  pipeline. `verify` and post-delivery `archive` are common and mandatory for all three routes;
  run the pipeline once per Sesión, never once per Módulo.
- The bridge returns execution and closure evidence to Support; it does not write the plan.
  Support owns the common plan update and closure record.
- `blocked` is not a route. `BLOQUEADO` is calculated from authority, evidence, dependencies,
  contamination and exhausted attempts; execution resumes only from the recorded checkpoint.
- Each Módulo is one independently revertible commit with its tests. With Strict TDD, each
  Tarea follows RED → GREEN → REFACTOR.
- `chanks-0-agente-soporte` remains read-only: it prepares the Jornada brief, capacity forecast,
  conflicts, assignments and plan updates.
- Always-escalate decisions never become derivable. Block the Sesión only when authority or
  evidence is missing or contradictory, or contamination reaches acceptance criteria, the first
  Módulo, or another Sesión. Later-Módulo contamination parks that Módulo while approved earlier
  work continues.
- Claude, OpenCode, and Codex use their runtime copies. Pi discovers `~/.agents/skills`
  natively. After project trust, `.pi/settings.json` exposes Control Tower's three exact local
  skills; manually loading exact canonical paths is fallback only.
<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->
