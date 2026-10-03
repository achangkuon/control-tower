<!-- PLAN-NAMING:GLOBAL -->
## Plan Naming Standard

Status: ACTIVE. The Zone model approved 2026-09-01 replaces the former multi-plan model.
This manual section survives `gentle-ai sync`. It governs planning vocabulary only; Gentle AI governs implementation, review and delivery.

The single source of truth is:

    {{PLAN_NAMING_CANON}}   (copia runtime; se instala desde control-tower/Main/agent-workflows/)

Read it before writing or updating a plan, proposal, design, or task breakdown. Do not
restate it from memory.

Hard rules, enforced in every project:

- A product has exactly one plan. Native Sessions (`encargo` present) use only
  `Zona → Sesión`; technical decomposition belongs to Gentle AI, not Chanks.
- A Zona is stable territory defined by real, disjoint, exhaustive paths. Cross-Zona shared
  files are Cimientos and require exact per-file declarations, not live reservations.
- A Sesión is one independently reviewable result inside one Zona. Plans carry no time
  estimate field, and time never defines or limits a level.
- Use the work vocabulary exactly: **Jornada** is one workday, not a V1 orchestration step;
  **Conversación** is one human-agent terminal interaction; **Sesión** is the plan work unit
  and closes with a delivered commit.
- Native Session IDs are flat, permanent, and mute: `S23`. Never encode Zona, owner,
  position, or meaning. Preserve legacy Módulo/Task IDs and delivered history without renumbering.
- Status is computed, never written. The closed set is `📋 PLANIFICADO`, `🟢 LISTO`,
  `🔵 EN CURSO`, `🔴 BLOQUEADO`, `🟡 DIFERIDO`, `✅ COMPLETO`, `📚 ARCHIVADO`.
  `BLOQUEADO` means cannot advance; `DIFERIDO` means deliberately postponed.
- The only editable planning source is `openspec/plan.yaml`; `openspec/ROADMAP.md` is its
  generated view. Never read the whole plan: use Radar summaries and `radar sesion <ID>` per
  human-chosen Session; for authorized edits, locate and read only the exact entry. Run `radar check`
  after each plan edit and `radar render` only after it passes. Parallel generated status or index files are forbidden.
- Native preparation confirms coordination and an Encargo with exactly `pedido_contexto`,
  `resultado_comportamiento`, `restricciones_decisiones`, and `referencias`. Verifiable outcomes
  and constraints belong inside those parts, not separate native scope/criteria or Módulo/Task fields.
- Read fresh Radar state (`radar status --json`, `radar sesion <ID>`) before acting. V1 has no
  admission/reservation step and creates no dispatch markers: execution alone leaves a Session
  `LISTO` until stage 5 records delivery. Native resume reconciles the same Session, its ODD record,
  code, and evidence; only legacy resume requires a first pending Módulo.
- Exact `archivos` delimit native writes; incomplete preparation stays blocked. Scope/file expansion
  requires human approval and fresh compatibility before mutation; a forecast acquires nothing live.
- `Decisiones` retain their authority. Derivation needs approved authority and a falsifiable criterion;
  the eight always-escalate classes remain closed. Contamination of a native outcome, first required
  work, or another Session blocks; later-Módulo parking applies only to legacy contracts.
- V1 parallel lots require human approval and `compatible` for every pair in Radar's
  `compatibilidad[]`; capacity/asientos remain forecasts. Live reservations/acquisition, Pista
  coordination and dispatch machinery are V2/V3, not part of V1.

If a project file or skill contradicts the canon, fix and report the drift. Do not fork the
rule or invent a local variant.
<!-- /PLAN-NAMING:GLOBAL -->
