# Índice Maestro / Hoja de Ruta — SDD Tower Implementation V1

> **Fuente de verdad de planificación.** Los contratos normativos viven en PRD, RFC y REQUIREMENTS; este índice registra orden, dependencias, estado y punto de retoma sin duplicarlos.
> **Última actualización:** 2026-07-28.

## 1. Resultado objetivo

Entregar jornadas autónomas acotadas que permitan seleccionar un proyecto, planificar e implementar slices con sesiones y worktrees aislados, preparar commits/push/PR automáticamente, autorizar cada merge por Telegram, continuar mediante Binding Deltas y recuperarse mediante fallback exclusivo OpenCode → Pi.

Control Tower permanece plan-agnostic. Main, Policy y los agentes de fase interpretan los artefactos de producto.

## 2. Documentos canónicos

| Artefacto | Estado | Ruta | Autoridad |
|---|---|---|---|
| PRD V1 | Aprobado | [`../prd/sdd-tower-implementation-v1.md`](../prd/sdd-tower-implementation-v1.md) | Problema, experiencia, alcance y aceptación de producto |
| RFC V1 | Aprobado | [`../rfc/sdd-tower-implementation-v1.md`](../rfc/sdd-tower-implementation-v1.md) | Arquitectura, roles, autoridad y adopción |
| REQUIREMENTS V1 | Aprobado | [`../specs/sdd-tower-implementation-v1-requirements.md`](../specs/sdd-tower-implementation-v1-requirements.md) | Schemas, estados, contratos, errores y escenarios |
| Plan Catalog | Creado y validado | [`manifest.yaml`](manifest.yaml) | Índice machine-readable de planes |
| Plan Manifest | Creado y validado | [`sdd-tower-implementation/manifest.yaml`](sdd-tower-implementation/manifest.yaml) | DAG machine-readable de 15 slices y referencias verificadas |
| OpenSpec changes de producto | Proposals creados | `../changes/sdd-tower-*/proposal.md` | Nueve changes A–I; cada uno continúa en fase `spec` |
| Installable V1 revision 1 | Active release contract | [`installable-v1/revisions/1/manifest.yaml`](installable-v1/revisions/1/manifest.yaml) | Local-first lifecycle, enrollment, authority, integrations, and release gates |
| Autonomous V2 revision 1 | Preserved continuation | [`autonomous-v2/revisions/1/manifest.yaml`](autonomous-v2/revisions/1/manifest.yaml) | Revisioned A–I/P6–P11 continuation over released V1 contracts |
| Product version map | Active canonical pointer | [`product-version-map.yaml`](product-version-map.yaml) | Atomic V1/V2 revision selection, ownership, checkpoints, and rollback metadata |

`docs/architecture/sdd-tower-implementation.md` es material de exploración, no autoridad normativa. Debe reconciliarse por separado antes de cualquier entrega documental, sin reemplazar los tres documentos aprobados.

### 2.1 Installable V1 / Autonomous V2 canonical publication

The active release lane is **Installable V1 revision 1**. **Autonomous V2 revision 1** preserves the approved broad-V1 PRD, RFC, REQUIREMENTS, A–I, and P6–P11 inputs and depends on the exact released V1 ArtifactRef before autonomous execution.

Canonical publication is serialized by the `installable-v1-provenance` owner at checkpoint `v1-provenance-published`. Autonomous V2 owns no canonical surface in this checkpoint and may consume the result only after digest and dependency validation. Rollback restores the prior pointer revision atomically while retaining both historical and failed-new revision bytes.

## 3. Regla de granularidad

```text
Fase
  → Sesión de 1–3 horas y un PR
      → Módulo Mx.y con una responsabilidad
          → Tarea atómica verificable
```

Reglas:

- Una sesión produce una unidad revisable.
- Cada PR SHOULD mantenerse por debajo de 400 líneas authored.
- Un cambio mayor MUST dividirse en una cadena explícita.
- Tests, schemas, documentación y código relacionado permanecen en la misma unidad funcional.
- Ninguna fase dependiente inicia apply mientras su dependencia no tenga evidencia suficiente.
- Planificación MAY adelantarse; implementación respeta el DAG.

## 4. Estado de un vistazo

### 4.1 Cadena de producto

| Fase | Estado | Qué falta | Próxima evidencia |
|---|---|---|---|
| Definición de producto | Completa | Nada | PRD aprobado |
| Arquitectura | Completa | Nada | RFC aprobado |
| Contrato normativo | Completo | Nada | REQUIREMENTS aprobado |
| Roadmap | Aprobado y mergeado | Mantener el punto de retoma actualizado | PR #47 / merge `0745f99` |
| Plan Catalog | Creado y validado | Implementar su JSON Schema en Change A | Manifest check: 15 slices / 4 ArtifactRefs |
| Installable V1 / Autonomous V2 split | Planning mergeado | Installable V1 debe completar tasks/forecast; Autonomous V2 puede comenzar Change A | PRs #60/#61; `master@1a10b38` |
| Implementación producto | No iniciada | Completar planning y dependencias por change | Apply por unidad |
| Piloto end-to-end | No iniciado | Gates A–G de REQUIREMENTS | Verify report V1 |

### 4.2 Sustrato mecánico existente

Snapshot obtenido mediante `gentle-ai sdd-status --json --instructions` el 2026-07-27:

| Change | Progreso | Estado nativo | Siguiente paso |
|---|---:|---|---|
| `autonomous-continuation-control-tower` | P6 completo | Mergeado mediante PRs #38–#45; cierre P6 en `e16d94b` | Preservar `apply-progress.md` como evidencia histórica |
| `p7-host-neutral-loop-opencode-adapter` | 0/28 | Estado nativo `apply-ready`, pero integración bloqueada por M0 | Aprobar su registro independiente `reconciliation.md` |
| `p8-slice-planning` | 0/8 | Estado nativo `apply-ready`, pero integración bloqueada por M0 | Esperar P7 reconciliado/integrado y aprobar su propio registro |

Observaciones:

- P0–P5 del sustrato están marcados completos.
- P6 está completo y mergeado. La evidencia vigente es la cadena de PRs #38–#45, culminada por `e16d94b`; el `apply-progress.md` histórico se conserva byte-for-byte y no se usa como contador fresco.
- P7 y P8 ya tienen proposal/spec/design/tasks; no deben repetir planificación.
- `apply-ready` nativo no abre ninguno de los dos gates: P7 requiere su registro aprobado; P8 requiere P7 reconciliado e integrado más su propio registro aprobado.
- P9 Claude, P10 runtime/cutover y P11 verificación/handoff permanecen dentro del change principal.
- Este roadmap no modifica ni reabre esos contratos mecánicos.
- PR #60 integró el planning de separación Installable V1 / Autonomous V2 hasta diseño; Installable V1 todavía debe completar `sdd-tasks` y revisar su forecast antes de RED.
- PR #61 integró spec, design y tasks de Change A (`sdd-tower-contract-schemas`); su primer paso ejecutable es WU1 task 1.1 RED.
- Los carriles limpios `Worktrees/installable-v1` y `Worktrees/autonomous-v2` parten de `master@1a10b38` y pueden avanzar en paralelo dentro de esos límites. Esto no inicia implementación ni modifica el gate separado de P7.

## 5. Dependencias macro

```text
Mechanism path: P6 ──→ P7 OpenCode ──→ P8 Pi ──────────┐
                                                       │
Product path:   A ──┬──→ B ──┐                         │
                    └──→ C ──┴──→ D ───────────────────┤
                                                       ▼
                                                E. Host Launcher
Required edge: C → D. There is no A → P7 or A → P8 edge.
P7 depends only on P6; P8 depends only on integrated P7.
Change E owns launch/inspect/stop/health, heartbeat, stop proof,
session naming, host-epoch enforcement, and exclusive failover.
                                                │
        ┌──────┴────────┐
        ▼               ▼
F. Telegram Delivery   G. Continuous Slice Loop
        └──────┬────────┘
               ▼
H. Multi-repository Campaigns
               │
               ▼
I. V1 Conformance Pilot
```

Claude continúa como opt-in y no bloquea el piloto Pi/OpenCode.

Invariantes de reconciliación: `P6 → P7 → P8 → Change E` y `A → B/C → D → Change E`; se preserva C→D, existe no A→P7/P8 edge y Change E conserva la autoridad de lifecycle/failover del host.

## 6. Roadmap por fase

## Fase 0 — Documentación canónica

**Estado:** completa después de aprobar este roadmap.

### M0.1 — PRD

- [x] Definir problema, usuario, alcance y no-objetivos.
- [x] Definir jornada, control remoto, recovery y campañas V1.
- [x] Aprobar criterios de aceptación de producto.

### M0.2 — RFC

- [x] Separar producto y mecanismo plan-agnostic.
- [x] Fijar roles, autoridad, stores y flujos.
- [x] Fijar single-host/fallback, Telegram, recovery y adopción.

### M0.3 — REQUIREMENTS

- [x] Fijar schemas y canonicalización.
- [x] Fijar state machines, APIs, errores y retención.
- [x] Fijar 26 escenarios y gates A–G.

## Fase 1 — Completar sustrato mecánico

**Objetivo:** terminar la continuidad host-neutral sin introducir semántica de planes.

### M1.1 — P6 Recovery/Rollback

- [x] Resolver el prerequisito documentado de proof/quiescence.
- [x] Implementar y verificar tareas 6.1–6.4.
- [x] Preservar Tower OFF, rollback y fail-closed.

**Proveniencia actual:** PRs #38–#45; cierre mergeado `e16d94b`. El archivo histórico `autonomous-continuation-control-tower/apply-progress.md` permanece sin reescritura.

### M1.2 — P7 OpenCode

- [ ] Ejecutar el change ya planificado `p7-host-neutral-loop-opencode-adapter`.
- [ ] Validar polling, wake y preservación de pending delivery.
- [ ] No repetir proposal/spec/design/tasks.
- [ ] Mantener apply bloqueado hasta aprobar su registro independiente M0; Change A no es dependencia.

### M1.3 — P8 Pi

- [ ] Ejecutar el change ya planificado `p8-slice-planning`.
- [ ] Validar idle-safe wake, resume y shutdown.
- [ ] No repetir proposal/spec/design/tasks.
- [ ] Mantener apply bloqueado hasta integrar P7 reconciliado y aprobar el registro independiente P8; Change A no es dependencia.

### M1.4 — P9–P11

- [ ] Mantener Claude como adapter opt-in.
- [ ] Publicar runtime versionado y probar cutover/rollback.
- [ ] Ejecutar verificación CT-only y matriz de conformidad.

## Fase 2 — Contratos y registro de producto

### Change A — `sdd-tower-contract-schemas`

**Depende de:** documentos aprobados.
**Produce:** schemas V1, canonicalización, validators, golden fixtures, Plan Catalog y Main control-store primitives.

**Estado:** spec, design y tasks mergeados mediante PR #61. Implementación no iniciada; próximo paso: WU1 task 1.1 RED en `Worktrees/autonomous-v2`.

Módulos propuestos:

- M2.1 schemas comunes y ArtifactRef;
- M2.2 registry/catalog/manifest/delta/report schemas;
- M2.3 jornada/assignment/authorization/campaign schemas;
- M2.4 RFC 8785 + SHA-256 golden fixtures;
- M2.5 validadores y error codes.

### Change B — `sdd-tower-project-registry`

**Depende de:** A.
**Produce:** registro XDG path-neutral, bootstrap local, import legacy Hermes, resolución read-only y rederivación Main.

Módulos propuestos:

- M2.6 storage y atomic update;
- M2.7 bootstrap/enrollment/revision;
- M2.8 alias UX y resolución inequívoca;
- M2.9 root/common-dir/remote validation;
- M2.10 Hermes read-only adapter.

## Fase 3 — Workspace y orquestación

### Change C — `sdd-tower-workspace-manager`

**Depende de:** A y B.
**Produce:** `inspect`, `create`, `retire`, receipts y wrapper legacy de `jornada.sh`.

Módulos propuestos:

- M3.1 inventario read-only;
- M3.2 worktree creation idempotente;
- M3.3 retirement fail-closed;
- M3.4 squash/PR fixtures heredados de `jornada.sh`;
- M3.5 legacy wrapper y guía de migración.

### Change D — `sdd-tower-main-policy-jornada`

**Depende de:** A, B y sustrato P6.
**Produce:** Main routing, Support briefs, Policy Reports, presets, snapshots, budgets y assignments.

Módulos propuestos:

- M3.6 jornada state machine;
- M3.7 Support conflict/capacity report;
- M3.8 Policy eligibility/drift taxonomy;
- M3.9 assignment authorization;
- M3.10 pause/revoke/expiry/recovery reconciliation.

## Fase 4 — Hosts y línea exclusiva

### Change E — `sdd-tower-host-launcher`

**Depende de:** C, D, P7 y P8.
**Produce:** adapter contract, launcher Pi/OpenCode, health, stop proof, host epoch y fallback exclusivo.

Módulos propuestos:

- M4.1 capabilities/launch/inspect/stop/health;
- M4.2 session naming y exact reuse;
- M4.3 heartbeat y liveness;
- M4.4 OpenCode → Pi failover;
- M4.5 conformidad y stale-epoch rejection.

## Fase 5 — Entrega y continuación

### Change F — `sdd-tower-telegram-delivery`

**Depende de:** A, B y D.
**Produce:** authorization store, botones/comando exacto, nonces, merge binding y post-check.

Módulos propuestos:

- M5.1 authorization state/store;
- M5.2 Telegram allowlist/callback/command;
- M5.3 Git/PR/check/SHA validation;
- M5.4 idempotent commit/push/PR;
- M5.5 merge consumption y post-check.

### Change G — `sdd-tower-continuous-slice-loop`

**Depende de:** A, C, D, E y F.
**Produce:** planning horizon, prepared SDD, reconciliation, Binding Delta, Policy publication y siguiente slice.

Módulos propuestos:

- M5.6 planning lane hasta tasks;
- M5.7 implementation reconciliation;
- M5.8 apply/verify evidence;
- M5.9 Binding Delta lifecycle;
- M5.10 compatible continuation/material escalation;
- M5.11 two-slice standard jornada pilot.

## Fase 6 — Campañas multiproyecto

### Change H — `sdd-tower-multi-repo-campaigns`

**Depende de:** B, D, F y G.
**Produce:** campaign manifest, lead Main coordination, local authority, ordered PRs y compensation validation.

Módulos propuestos:

- M6.1 campaign DAG;
- M6.2 participant Main protocol;
- M6.3 serialized delivery;
- M6.4 compensation validation;
- M6.5 two-repository scenario.

## Fase 7 — Conformidad V1

### Change I — `sdd-tower-v1-conformance-pilot`

**Depende de:** gates de A–H y sustrato P6–P11 necesario para Pi/OpenCode.
**Produce:** evidencia end-to-end contra Gates A–G de REQUIREMENTS.

Pilotos obligatorios:

1. `short` con OpenCode y un slice;
2. failover preautorizado OpenCode → Pi;
3. `standard` con dos slices y Binding Delta;
4. autorización Telegram con SHA drift y replay negativo;
5. recovery desde dirty worktree;
6. campaña de dos repositorios con compensation.

## 7. Estrategia de entrega

- `ask-on-risk` es la estrategia activa.
- Cambios >400 líneas MUST dividirse en chained PRs.
- La estrategia de chain se decide al confirmar el primer forecast de alto riesgo.
- PRD, RFC y REQUIREMENTS permanecen con su cambio documental.
- No se mezclan cambios del sustrato P6–P11 con semántica de producto.
- Cada merge requiere autorización exacta según REQUIREMENTS.
- No se crea commit, push o PR desde esta fase documental sin solicitud explícita del Maintainer.

## 8. Riesgos del roadmap

| Riesgo | Control |
|---|---|
| Expandir el sustrato para interpretar planes | Cambios A–I separados; Tower recibe refs/digests opacos |
| Duplicar P7/P8 planning | Consumir artifacts existentes y continuar desde apply |
| Crear un producto monolítico | Un change por responsabilidad y DAG explícito |
| Empezar hosts antes de recovery | E depende de P6, P7 y P8 |
| Telegram antes de identidad de proyecto | F depende de registry/Main |
| Continuous loop sin entrega/recovery | G depende de C–F |
| Campañas antes del caso single-project | H depende de G |
| PRs inmanejables | Forecast por change y chained PRs por encima de 400 líneas |

## 9. Decisiones cerradas

- Roles, autoridad y límites macro están cerrados por RFC.
- Schemas, estados, contratos y gates están cerrados por REQUIREMENTS.
- Pi/OpenCode single-host y fallback preautorizado están cerrados.
- Cada merge requiere autorización Telegram exacta.
- Hermes no posee repositorios ni dirige workers.
- Worktrees son efímeros y no se reciclan mediante branch switch.
- Multi-repo V1 usa PRs ordenados y compensaciones, no atomicidad ficticia.

Cambios posteriores deben crear una revisión explícita del documento correspondiente; no se redefinen desde tasks o implementación.

## 10. Punto de retoma

**Estado actual:** PRD, RFC, REQUIREMENTS, roadmap, Plan Catalog, Plan Manifest y proposals A–I están mergeados. PR #60 integró el split Installable V1 / Autonomous V2 hasta diseño y PR #61 integró el planning completo de Change A. No comenzó implementación en ninguno de los dos carriles.

**Sustrato:** P6 está mergeado mediante PRs #38–#45 y cierra en `e16d94b`. P7 y P8 conservan planning completo, pero ambos permanecen bloqueados por sus gates M0 aunque el estado nativo diga `apply-ready`; P8 además espera evidencia de P7 reconciliado e integrado. Antes de actuar se MUST consultar estado nativo y evidencia de reconciliación frescos.

**Próximo paso exacto:** ejecutar trabajo paralelo en los dos carriles dedicados sin confundir sus gates: en `Worktrees/installable-v1`, completar `sdd-tasks` y revisar el Review Workload Forecast antes de RED; en `Worktrees/autonomous-v2`, comenzar Change A WU1 task 1.1 RED desde el planning mergeado. Mantener A–I separados del sustrato plan-agnostic P6–P11 y no usar estos carriles para autorizar P7/P8.

**Estado local reconciliado:**

- Main es el checkout canónico y debe finalizar limpio y sincronizado con `origin/master`.
- `Worktrees/installable-v1` y `Worktrees/autonomous-v2` son carriles dedicados, limpios y sincronizados con `origin/master@1a10b38`; sus ramas de implementación están 0 ahead/behind.
- `Worktrees/agent-tower` permanece separado y sin cambios en `docs/p7-reconciliation-record@6e56728`; P7 conserva su gate de asignación/aprobación cerrado.
- Antes de escribir, cada carril debe respetar su planning y gates vigentes; la existencia del worktree no otorga autoridad por sí misma.
- El cambio local no incluido en PR #47 bajo `docs/architecture/sdd-tower-implementation.md` se preservó fuera del repo en `Backups/worktree-recycle-2026-07-27-123457` antes de retirar su worktree.
- No se borraron ramas locales o remotas.
- Evidencia técnica: [`openspec/maintenance/2026-07-27-worktree-retirement.md`](../maintenance/2026-07-27-worktree-retirement.md).

## 11. Vínculo con Engram

Las memorias de sesión deben apuntar a este archivo y sección, no duplicar el roadmap completo:

```text
topic: sdd-tower-v1/*
archivo: openspec/plans/master-index.md
anchor: Punto de retoma
```
