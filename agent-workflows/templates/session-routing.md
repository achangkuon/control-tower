<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->
## Durable Session Skill Routing

<!-- SESSION-ADMISSION-CONTRACT:CANONICAL -->
```json
{
  "intents": ["start", "continue", "resume"],
  "evidence": {
    "source": "Radar via the read-only planning evidence helper",
    "commands": ["radar status --json", "radar sesion <ID>"],
    "binding": ["HEAD", "Session ID", "SHA-256(radar status --json exact bytes)", "SHA-256(radar sesion <ID> exact bytes)"]
  },
  "admissible": {
    "start": {"states": ["LISTO"]},
    "continue": {"states": ["LISTO", "EN CURSO"], "requires": {"native_encargo": "same Session identity plus reconciliation of native ODD record, code, and evidence", "legacy": "first pending Módulo for legacy"}},
    "resume": {"states": ["LISTO", "EN CURSO"], "requires": {"native_encargo": "same Session identity plus reconciliation of native ODD record, code, and evidence", "legacy": "first pending Módulo for legacy"}},
    "route": "chanks-3-session-kickoff"
  },
  "non_admissible": {
    "output": ["state", "blocker", "Zone-ordered LISTO choices"],
    "forbidden_fallbacks": ["chanks-3-session-kickoff", "chanks-1-cierre-de-decisiones"]
  },
  "decision_closure": "separate explicit human request for the named decision",
  "semantics": {
    "seats": "compatible capacity, never assigned agents",
    "queue": "Zone-ordered rows and length, never assigned agents",
    "listo_choices": "count of current LISTO choices, never assigned agents"
  },
  "tower_boundary": "manual-only; no Tower runtime or skills"
}
```
<!-- /SESSION-ADMISSION-CONTRACT:CANONICAL -->

This canonical contract is authoritative for manual admission. The bundle binds current `HEAD`,
Session ID, and exact stdout digests. `start` requires `LISTO`; `continue`/`resume` require same
Session identity plus native ODD record, code, and evidence for Encargo, or first pending Módulo
for legacy. Every rejected state returns only state, blocker, and Zone-ordered `LISTO` choices;
there is no fallback to kickoff or decision closure.

- Primary authority for starting or continuing an approved Session is
  `chanks-3-session-kickoff` at `{{REPO_ROOT}}/skills/chanks-3-session-kickoff/SKILL.md`.
- Radar chooses no work: propose only Zona-ordered `LISTO` rows and let the human choose; it never selects work.
  Memory, old SDD changes, archives, and next IDs never select work. Installed Radar is the only admission
  binary; never execute a repository checkout binary.
- Native coordination is Zona → Session with exact authorized files, Cimientos, Recurso, authority,
  and four-part Encargo. ODD is default; only explicit human `solicitud_sdd` enters Gentle AI's
  existing native SDD preflight/authority/archive flow. Complexity does not create an SDD menu.
- A responsible parent may use `chanks-0-agente-soporte` for read-only evidence and
  `chanks-2-planificador-granular` for Session preparation. Neither writes the plan, creates a
  lock, assigns agents, or creates no fake topology control.
- `chanks-4-puente` translates admitted intent/constraints to the authorized native flow. Native
  ODD document/Engram continuity is subordinate technical evidence, not plan status or authority.
  Technical checks/review follow Gentle AI native policy; review outcome never authorizes delivery.
- After human approval binds the parallel count, exact LISTO Session IDs, and exact Pi worker alias,
  exact Pi session ID, exact cwd/worktree, runtime, and kind for each Session, the responsible parent
  loads `chanks-3-coordinador-manual`, which delegates approved dispatch to
  `chanks-3-despacho-herdr`. This is an explicit Herdr request made with the Torre off, not Torre
  dispatch. Manual pre-V1 dispatch accepts Pi workers only. Herdr owns only authorized seats and
  process topology; Pi Intercom is message transport only. They do not grant execution, selection,
  review, delivery, ODD continuity, or plan authority. The worker preserves same Session identity
  for native Encargo and first pending Módulo for legacy.
- Dispatch fails closed before dispatch is declared. Ordinary Intercom `send` has no wait timeout:
  workers receive fire-and-forget `send`, the responsible parent returns after one delivery result
  per exact Sesión/worker handoff, and Main performs no ordinary `herdr agent wait`, `prompt --wait`,
  poll, or `intercom ask`. A true human decision is a worker-initiated blocking request; a
  worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`;
  Main does not guess the answer or report completion. A declared Recurso requires confirmed exclusive or serial execution evidence before mutation; release only actual resources demonstrably acquired.
  Before each handoff, Main uses one fresh Intercom live-roster readback bound to the exact human-approved alias, exact Pi session ID, and exact cwd/worktree; it fails closed before dispatch is declared.
  A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume; human reactivation and reapproval are required. Every progress and terminal `send` identifies the exact Sesión and worker. Main answers only an exact inbound human-decision request with `reply`, never an unthreaded substitute or its own `ask`; Main never initiates `ask`.
  Herdr JSON proves only seat and process identity; Intercom delivery results prove only message delivery; neither grants authority or proves work completion, and the worker reports terminal result evidence. fresh Intercom and Herdr readbacks must prove the sender matches the exact binding; the reported commit is the dispatched worktree candidate before integration, otherwise no integration, retry, remapping, or inferred terminal.
  Two approved Pi workers receive independent fire-and-forget handoffs; Main sends worker 2 without waiting for worker 1.
  Workers report `COMPLETED`, `BLOCKED`, or `FAILED`; no provisional cross-runtime bridge exists and the future tower V1 remains the heterogeneous and hybrid owner.
- Issue patches are a separate human-authorized manual route, not an admission exception to
  the canonical Session JSON above. For a reproducible defect in an already approved flow,
  the human binds one Control Tower issue, exact Git base, restoring outcome, `issue-resolver`,
  exact files, Cimientos and Recursos. `chanks-3-coordinador-manual` routes only that approval
  to `chanks-3-despacho-herdr`'s Issue-Patch Mode and its `assets/issue-patch-handoff.md`.
  Fresh exact-file/Cimiento/Recurso comparison against every active Session and the same base
  must succeed; unknown or conflicting scope stops only the patch. The launched actual Pi
  session ID must be proved by fresh Herdr and Intercom readbacks before send, never inferred
  from a tab alias. Verify the immutable commit, issue branch and worker before serial
  integration, issue-patch closure and patch retirement. No fake LISTO, Session kickoff,
  `radar.despacho/v1` marker, plan progress, queue or ledger; absent planned-work closure
  declares «nada que registrar». The Session-only route above remains unchanged.
- The bridge and `chanks-5-session-doc` return closure evidence before retire mode to the responsible
  parent. Actual delivery evidence, ordinary policy, and Chanks plan/document close gates decide
  closure. Radar compatible capacity is the parallel-safety verdict. Forecasts reserve nothing live;
  no worker/runtime implementation is implied by this manual routing block.
<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->
