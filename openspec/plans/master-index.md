# Índice Maestro / Hoja de Ruta — SDD Tower Implementation V1

> **Fuente de verdad de planificación.** Los contratos normativos viven en PRD, RFC y REQUIREMENTS; este índice registra orden, dependencias, estado y punto de retoma sin duplicarlos.
> **Última actualización:** 2026-07-27.

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

`docs/architecture/sdd-tower-implementation.md` es material de exploración, no autoridad normativa. Debe reconciliarse por separado antes de cualquier entrega documental, sin reemplazar los tres documentos aprobados.

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
| OpenSpec split | Proposals completos | Specs, designs y tasks de A–I | Estado nativo: `nextRecommended: spec` |
| Implementación producto | No iniciada | Completar planning y dependencias por change | Apply por unidad |
| Piloto end-to-end | No iniciado | Gates A–G de REQUIREMENTS | Verify report V1 |

### 4.2 Sustrato mecánico existente

Snapshot obtenido mediante `gentle-ai sdd-status --json --instructions` el 2026-07-27:

| Change | Progreso | Estado nativo | Siguiente paso |
|---|---:|---|---|
| `autonomous-continuation-control-tower` | 26/50 | `apply` ready; verify bloqueado | Continuar tareas pendientes desde P6 |
| `p7-host-neutral-loop-opencode-adapter` | 0/28 | `apply` ready; verify bloqueado | Implementar después de satisfacer dependencia mecánica P6 |
| `p8-slice-planning` | 0/8 | `apply` ready; verify bloqueado | Implementar después de P7 |

Observaciones:

- P0–P5 del sustrato están marcados completos.
- P6 es el primer slice incompleto. Sus tasks registran un prerequisito de enmienda para proof/quiescence antes de sus cambios de producción.
- P7 y P8 ya tienen proposal/spec/design/tasks; no deben repetir planificación.
- P9 Claude, P10 runtime/cutover y P11 verificación/handoff permanecen dentro del change principal.
- Este roadmap no modifica ni reabre esos contratos mecánicos.

## 5. Dependencias macro

```text
Documentos aprobados
        │
        ▼
A. Contract schemas + Plan Catalog
        ├──────────────┐
        ▼              ▼
B. Project Registry   C. Workspace Manager
        │              │
        └──────┬───────┘
               ▼
D. Main + Policy + Jornada
               │
Mechanism P6 → P7 OpenCode → P8 Pi
               │
               ▼
E. Host Launcher + single-host failover
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

- [ ] Resolver el prerequisito documentado de proof/quiescence.
- [ ] Implementar y verificar tareas 6.1–6.4.
- [ ] Preservar Tower OFF, rollback y fail-closed.

### M1.2 — P7 OpenCode

- [ ] Ejecutar el change ya planificado `p7-host-neutral-loop-opencode-adapter`.
- [ ] Validar polling, wake y preservación de pending delivery.
- [ ] No repetir proposal/spec/design/tasks.

### M1.3 — P8 Pi

- [ ] Ejecutar el change ya planificado `p8-slice-planning`.
- [ ] Validar idle-safe wake, resume y shutdown.
- [ ] No repetir proposal/spec/design/tasks.

### M1.4 — P9–P11

- [ ] Mantener Claude como adapter opt-in.
- [ ] Publicar runtime versionado y probar cutover/rollback.
- [ ] Ejecutar verificación CT-only y matriz de conformidad.

## Fase 2 — Contratos y registro de producto

### Change A — `sdd-tower-contract-schemas`

**Depende de:** documentos aprobados.
**Produce:** schemas V1, canonicalización, validators, golden fixtures, Plan Catalog y Main control-store primitives.

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

**Estado actual:** PRD, RFC, REQUIREMENTS, roadmap, Plan Catalog, Plan Manifest y proposals A–I aprobados estructuralmente y mergeados mediante PR #47 (`0745f99`). No comenzó implementación del producto macro.

**Sustrato:** el último snapshot de este plan registró `autonomous-continuation-control-tower` en 26/50; P6 era el primer slice pendiente. P7 y P8 conservan planning completo. Antes de actuar se MUST consultar estado nativo fresco porque el workstream mecánico avanza de forma independiente.

**Próximo paso exacto:**

1. ejecutar `sdd-status` fresco para `sdd-tower-contract-schemas`;
2. continuar Change A desde `spec`, sin repetir su proposal;
3. aprobar secuencialmente spec, design y tasks de Change A;
4. no iniciar apply de producto hasta que el change correspondiente complete planning y sus dependencias estén satisfechas;
5. mantener A–I separados del sustrato plan-agnostic P6–P11.

**Estado local reconciliado:**

- Main es el checkout canónico y debe finalizar limpio y sincronizado con `origin/master`.
- Los homes `agent-tower`, `multi-agentic-dashboard` y `tower-implementation` fueron retirados de forma segura y recreados desde el `master` canónico, con `HEAD` detached para no revivir ramas de tarea obsoletas.
- Antes de escribir, cada asignación debe crear una rama nueva y acotada desde la base canónica vigente; los worktrees reciclados no otorgan autoridad por sí mismos.
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
