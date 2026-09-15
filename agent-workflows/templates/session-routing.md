<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->
## Durable Session Skill Routing

- Primary authority for starting or continuing one approved Sesión is `chanks-3-session-kickoff` at
  `{{REPO_ROOT}}/skills/chanks-3-session-kickoff/SKILL.md`.
- In a repository with `openspec/plan.yaml`, what comes next is chosen only from `radar status`:
  propose `LISTO` Sesiones in their Zona queue order and let the human choose. Memory, an old
  SDD change, the archived corpus, or the next ID after the last delivered Sesión never selects work.
  When one of them points at a Sesión that is not `LISTO`, report its computed state and blocker
  instead of recommending it.
- Planning is one fixed eight-step flow. `chanks-2-planificador-granular` executes it directly;
  it is not a parent router and has no child-skill hierarchy.
- A read-only planning evidence helper may prepare sources, conflicts, and a proposed delta.
  The responsible parent confirms and records plan evidence; no helper is a mandatory peer or plan writer.
- Kickoff runs in the user-approved current repository and branch. It verifies `HEAD`, branch,
  and Git contamination, revalidates the proposed route once against scoped code, and returns its
  delta to the responsible parent. It does not choose new work, dispatch agents, or claim a lock.
- After the human chooses which `LISTO` Sesiones run in parallel and approves a Pi worker for each,
  the responsible parent loads `chanks-3-despacho-herdr`. Manual pre-V1 dispatch accepts Pi workers
  only: Herdr owns only authorized seats and process topology, while Pi Intercom is message transport
  without selection, assignment, role, permission, review, or delivery authority. Before each handoff,
  Main uses one fresh Intercom live-roster readback bound to the exact human-approved alias, session,
  and cwd; a missing, ambiguous, disconnected, or mismatched identity fails closed before dispatch is
  declared. Ordinary Intercom `send` has no wait timeout; a worker-initiated human-decision `ask`
  timeout preserves the worktree and candidate as `BLOCKED`: Main does not guess the answer or report
  completion. Main sends each handoff with fire-and-forget `send` and returns after one delivery result
  per exact Sesión/worker handoff. Two approved Pi workers
  receive independent fire-and-forget handoffs: Main sends worker 2 without waiting for worker 1.
  Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`. Every
  progress and terminal `send` identifies the exact Sesión and worker; workers send `COMPLETED`,
  `BLOCKED`, or `FAILED` events to Main. A true human decision uses a worker-initiated blocking request;
  Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer,
  never an unthreaded substitute or its own `ask`. Main never initiates `ask`.
  Herdr JSON proves only seat and process identity; Intercom delivery results prove only message
  delivery; neither grants authority or proves work completion, and the worker reports terminal result
  evidence. A later disconnect creates no polling, retry, inferred completion, transport fallback, or
  autonomous resume; human reactivation and reapproval are required before a new dispatch. There is no persistent queue,
  roster, state, non-Pi fallback, or provisional cross-runtime bridge; the future tower V1 remains the
  heterogeneous and hybrid owner. This dispatch is an explicit Herdr request made with the Torre off;
  it is not Torre dispatch.
- After the responsible parent records a dispatched Sesión's delivery, it runs that skill's retire mode,
  which removes only worktrees that pass its six checks.
- The plan↔SDD bridge translates the approved or revalidated route into its execution path (canon §15).
  Only `full-sdd` enters Gentle AI's native SDD pipeline:
  - `full-sdd` enters at `proposal`.
- `direct` and `design-tasks` use Gentle AI's non-SDD implementation path, never create `openspec/changes/`,
  and never declare `cambio`; a `design-tasks` Sesión records its design in the plan.
- These are the only routes. `verify` and review are mandatory for all three routes; `archive` runs only for `full-sdd`, once per Sesión, never once per Módulo.
- The bridge and closure return evidence to the responsible parent; neither writes the plan.
  `blocked` is not a route. `BLOQUEADO` is calculated from authority, evidence, dependencies,
  contamination, and exhausted attempts; execution resumes only from the recorded checkpoint.
- Each Módulo is one independently revertible commit with its tests. With Strict TDD, each Tarea
  follows RED → GREEN → REFACTOR.
- Always-escalate decisions never become derivable. A Sesión BLOCKS only when authority or evidence is missing or contradictory, or contamination reaches acceptance criteria, the first Módulo, or another Sesión. Later-Módulo contamination parks that Módulo while approved earlier work continues.
- Preserve human choice for scope, risk, and authority. Radar's compatible seats are the parallel-safety verdict (canon §13); they reserve nothing live. For an explicit shared `Recurso`, require confirmed exclusive or serial execution evidence before mutation; release only actual resources that were demonstrably acquired, and return the evidence to the responsible parent. Report real Git contamination and conflicts rather than pretending a runtime acquired them.
- After installation, this manual block controls the generic builder routing. It does not claim
  global installation, runtime activation, or fresh-session verification; those remain separate evidence.
<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->
