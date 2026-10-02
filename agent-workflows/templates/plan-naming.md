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
  files are Cimientos and require exact per-file reservations.
- A Sesión is one independently reviewable result inside one Zona. Plans carry no time
  estimate field, and time never defines or limits a level.
- Use the work vocabulary exactly: **Jornada** is one workday and gets one Support brief;
  **Conversación** is one human-agent terminal interaction; **Sesión** is the plan work unit
  and closes with a delivered commit.
- Native Session IDs are flat, permanent, and mute: `S23`. Never encode Zona, owner,
  position, or meaning. Preserve legacy Módulo/Task IDs and delivered history without renumbering.
- Status is computed, never written. The closed set is `📋 PLANIFICADO`, `🟢 LISTO`,
  `🔵 EN CURSO`, `🔴 BLOQUEADO`, `🟡 DIFERIDO`, `✅ COMPLETO`, `📚 ARCHIVADO`.
  `BLOQUEADO` means cannot advance; `DIFERIDO` means deliberately postponed.
- The only editable planning source is `openspec/plan.yaml`; `openspec/ROADMAP.md` is its
  generated view. Parallel generated status or index files are forbidden.
- Native preparation confirms coordination and an Encargo with exactly `pedido_contexto`,
  `resultado_comportamiento`, `restricciones_decisiones`, and `referencias`. Verifiable outcomes
  and constraints belong inside those parts, not separate native scope/criteria or Módulo/Task fields.
- Fresh Radar admission is mandatory. Native resume reconciles the same Session, its ODD record,
  code, and evidence; only legacy resume requires a first pending Módulo.
- Exact `archivos` delimit native writes; incomplete preparation stays blocked. Scope/file expansion
  requires human approval and fresh compatibility before mutation; a forecast acquires nothing live.
- `Decisiones` retain their authority. Derivation needs approved authority and a falsifiable criterion;
  the eight always-escalate classes remain closed. Contamination of a native outcome, first required
  work, or another Session blocks; later-Módulo parking applies only to legacy contracts.
- Capacity includes implementation and planning seats under a human ceiling. The canonical
  file governs the current forecast; runtime acquisition and planning-horizon mechanics live
  in their own contracts.

If a project file or skill contradicts the canon, fix and report the drift. Do not fork the
rule or invent a local variant.
<!-- /PLAN-NAMING:GLOBAL -->
