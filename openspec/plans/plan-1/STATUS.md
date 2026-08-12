# Plan 1 — Sustrato mecánico

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Legacy P7 depende sólo de legacy P6; P8 depende de legacy P7 reconciliado e integrado. Change A no es dependencia de ninguno. |
| Outputs | Recovery/rollback fail-closed; controller host-neutral y adapter OpenCode; adapter Pi; adapter Claude opt-in; runtime versionado; verificación CT-only. |
| Roadmap | `S1.11` está ✅ COMPLETO y publicado en `origin/master@3db3c121`. `S1.12` y `S1.13` están ✅ COMPLETO e integradas en el `master` local; `S1.13` cerró en `master@794611f` mediante la implementación `2bbeddb` y la corrección de compatibilidad de fixture `794611f`. El push remoto y Notion siguen pendientes. `S1.14` queda 🟢 LISTO y la cadena continúa `S1.14 → S1.15 → S1.16`. `S1.17` es una Sesión downstream distinta y sigue 🔴 BLOQUEADO por identidades y capacidad runtime reales ausentes. Legacy P9–P11 esperan límites de PR demostrables. |
| Referencias | [`autonomous-continuation-control-tower`](../../changes/autonomous-continuation-control-tower/), [`p7-host-neutral-loop-opencode-adapter`](../../changes/p7-host-neutral-loop-opencode-adapter/), [`p8-slice-planning`](../../changes/p8-slice-planning/), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). |

Legacy P6 se integró mediante PRs #38–#45 y cerró en `e16d94b`. Su [`apply-progress.md`](../../changes/autonomous-continuation-control-tower/apply-progress.md) es evidencia histórica y permanece sin reescritura.

## Sesiones cerradas

| ID | Resultado | Estado | Evidencia |
|---|---|---|---|
| S1.1 | Baseline y recovery legacy P6 | ✅ COMPLETO | PR #38 |
| S1.2 | Migration 005 pinning | ✅ COMPLETO | PR #39 |
| S1.3 | Fresh schema 4→5 migration | ✅ COMPLETO | PR #40 |
| S1.4 | Proof plane | ✅ COMPLETO | PR #41 |
| S1.5 | ON-mode dispositions | ✅ COMPLETO | PR #42 |
| S1.6 | Rollback plane | ✅ COMPLETO | PR #43 |
| S1.7 | Redelivery closure | ✅ COMPLETO | PR #44 |
| S1.8 | Closure claim-present correction | ✅ COMPLETO | PR #45 |
| S1.9 | Roadmap/catalog y enmiendas legacy P7/P8 | ✅ COMPLETO | `b96e4d9` |
| S1.10 | Plan Manifest revision 2 y ArtifactRefs | ✅ COMPLETO | `a1c75b3` |

## Sesión 1.11 — Reconciliación independiente legacy P7

**Estado:** ✅ COMPLETO — las tres Tareas quedaron cerradas en `a1dce22`: existe el registro P7, los chequeos binarios están documentados y el gate acotado fue aprobado por el maintainer. El cierre está publicado en `origin/master@3db3c121d48a07d7696afe6a88de044f30ea4695`; `a1dce22` es ancestro de ese tip remoto.

**Depende de:** `S1.9` ✅, `S1.10` ✅
**Área:** `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` y sus enmiendas de gate
**Recurso:** ninguno. Torre desarmada; sin estado de runtime.
**Ruta:** `direct` — el alcance está aprobado y sus tres Tareas son explícitas. **Autoridad:** [`p7-p8-integrated-reconciliation/tasks.md`](../../changes/p7-p8-integrated-reconciliation/tasks.md#sesión-111--p7-reconciliation-record).

**Decisiones:**

- `escala` — la aprobación del gate P7 (`T1.11.1.3`). **Clase:** seguridad y permisos. **RESUELTA por el maintainer:** el registro integrado en `a1dce22` queda `BOUNDED_APPLY_APPROVED`. Aprobar un gate es un acto de autoridad, no una derivación. **Contaminaba:** `S1.13`–`S1.16`; la cadena autorizada posterior conserva sus propias dependencias y criterios.

La definición canónica de esta Sesión, incluidos `M1.11.1` y `T1.11.1.1`–`T1.11.1.3`, vive en [`p7-p8-integrated-reconciliation/tasks.md`](../../changes/p7-p8-integrated-reconciliation/tasks.md#sesión-111--p7-reconciliation-record). Este `STATUS` no redefine sus Tareas.

## Sesión 1.12 — Reconciliación independiente P8

**Estado:** ✅ COMPLETO — integrada localmente en `master@6bb7019c66cf60e9ac874f05a176f946f9bd4589` (tree `1d34341f394cbeced9495e8384252dd975f9cab4`) mediante `5823ed6`. Los cuatro blobs coinciden con el candidato congelado y pasaron los checks de recibo, `ArtifactRef` y hashes. Este cierre es local: `origin/master` sigue en `3db3c121`, sin push ni publicación remota, y Notion queda pendiente hasta que ocurra una entrega remota.

**Depende de:** `S1.11` ✅
**Área:** `openspec/changes/p8-slice-planning/reconciliation.md`, `STATUS` de P8 y el recibo de persistencia
**Recurso:** ninguno. Torre desarmada; sin comportamiento ejecutable.
**Ruta:** `direct` — seis Tareas explícitas con comando de validación y frontera de rollback declarados. **Autoridad:** [`p7-p8-integrated-reconciliation/tasks.md`](../../changes/p7-p8-integrated-reconciliation/tasks.md#sesión-112--p8-reconciliation-and-preservation).

**Decisiones:**

- `escala` — la aprobación del gate P8 (`T1.12.1.3`). **Clase:** seguridad y permisos. **RESUELTA en el candidato integrado y verificado:** los checks de recibo, `ArtifactRef` y hashes pasaron sobre los cuatro blobs congelados. El cierre de `S1.12` no destraba `S1.17`: esa Sesión conserva su bloqueo externo por `assignment_id`, `session_id` y capacidad runtime reales ausentes. **Consecuencia operativa: `S1.17` no es candidata a modo nocturno.**

La definición canónica de esta Sesión, incluidos `M1.12.1` y `T1.12.1.1`–`T1.12.1.7`, vive en [`p7-p8-integrated-reconciliation/tasks.md`](../../changes/p7-p8-integrated-reconciliation/tasks.md#sesión-112--p8-reconciliation-and-preservation). Este `STATUS` no redefine sus Tareas.

## Grafo de dependencias P7

```mermaid
graph LR
  S112["S1.12 reconciliación P8 · ✅"] --> S113["S1.13 lifecycle · ✅"]
  S113 --> S114["S1.14 polling · 🟢"]
  S114 --> S115["S1.15 conformidad · 📋"]
  S115 --> S116["S1.16 transporte · 📋"]
```

## Sesiones legacy P7

| ID | Resultado | Estado | Depende de | Ref |
|---|---|---|---|---|
| S1.13 | Root lifecycle e invalidación sincrónica | ✅ COMPLETO | `S1.12` ✅ | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |
| S1.14 | Polling y wake safety | 🟢 LISTO | `S1.13` ✅ | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |
| S1.15 | Conformidad lifecycle OpenCode | 📋 PLANIFICADO | `S1.14` | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |
| S1.16 | Transporte reconciliado y composición wake | 📋 PLANIFICADO | `S1.15` | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |

## Sesión 1.13 — Root lifecycle e invalidación sincrónica

**Estado:** ✅ COMPLETO — integrada y verificada localmente en `master@794611f925f4fd2cb0de0b69cfdf2798d011543d`. La implementación está en `2bbeddb`; `794611f` corrige la compatibilidad del fixture del grafo de Plan 5 sobre la misma historia integrada. Este cierre no está publicado: `origin/master` permanece en `3db3c121`.

**Depende de:** `S1.12` ✅
**Área:** `host/loop.mjs`, `test/polling.test.mjs`
**Recurso:** —. Scheduler/controller falso, determinista y local al proceso; sin adapter, DB, estado de Torre, runtime externo, token de release, proceso host compartido, host SDK, SQLite, `core.mjs` ni `mcp.mjs`.
**Ruta:** `direct` — contrato acotado y Tareas preexistentes, sin decisión de diseño abierta. **Autoridad:** [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md#sesión-113--root-lifecycle-and-synchronous-invalidation) y aprobación bounded de `S1.11`.

**Decisiones:** —. La frontera bounded ya había sido aprobada en `S1.11`; `S1.13` no abrió ni resolvió contrato público, autoridad, persistencia o composición de adapter.

### Módulo 1.13.1 — Controller lifecycle

`T1.13.1.1`–`T1.13.1.5` están completas en el [`tasks.md` canónico](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md#sesión-113--root-lifecycle-and-synchronous-invalidation), que preserva el orden RED → GREEN → TRIANGULATE → REFACTOR → verificación. Este `STATUS` registra el cierre sin redefinir las Tareas ni acreditar trabajo de `S1.14`.

**Evidencia exacta de cierre:**

- Focused: `bun test test/polling.test.mjs` — PASS, 10 pass, 0 fail, 73 expect calls.
- Sintaxis: `node --check host/loop.mjs` — PASS, exit 0 sin output.
- Suite completa después de la corrección de compatibilidad: `bun test` — PASS, 620 pass, 0 fail, 3.691 expect calls en 40 archivos.
- Receipt de implementación: 378 líneas authored — `host/loop.mjs` 164 adiciones y `test/polling.test.mjs` 214 adiciones.
- Runtime harness: `N/A` — fake clock, scheduler one-shot FIFO y deferred ports forman la frontera determinista local al proceso.
- Rollback: remover sólo los bloques de `S1.13` en `host/loop.mjs` y `test/polling.test.mjs`.

## Sesiones P8

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S1.17 | Gate de reconciliación y pruebas RED | 🔴 BLOQUEADO — `T1.17.1.1`–`.2` pasaron; `.3` carece de `assignment_id`, `session_id` y capacidad runtime reales; `.4`–`.5` no iniciaron | [`tasks.md`](../../changes/p8-slice-planning/tasks.md) |
| S1.18 | Pi adapter GREEN | 📋 PLANIFICADO | [`tasks.md`](../../changes/p8-slice-planning/tasks.md) |
| S1.19 | Refactor y regresión | 📋 PLANIFICADO | [`tasks.md`](../../changes/p8-slice-planning/tasks.md) |

## Rutas de ejecución — reconciliadas el 2026-08-11

| ID | Estado | Ruta | Motivo |
|---|---|---|---|
| `S1.16` | 📋 PLANIFICADO | `design-tasks` | Los registros aprobados de `S1.11` y `S1.12` ya existen y `S1.13` está cerrada, pero la cadena autorizada exige cerrar antes `S1.14 → S1.15`. Luego se elige el seam de transporte no consumidor desde ese registro, sin inventarlo. |
| `S1.17` | 🔴 BLOQUEADO | `direct` al destrabar | Es downstream y distinta de `S1.12`. `T1.17.1.1`–`.2` pasaron; `.3` no puede validar un assignment-bound worktree sin `assignment_id`, `session_id` y capacidad de binding Workspace Manager/Main reales; `.4`–`.5` no empezaron. Al destrabar sólo aterriza pruebas RED contra contratos ya aprobados. |
| `S1.18` | 📋 PLANIFICADO | `direct` | Depende de `S1.17`. Implementación GREEN con alcance exacto (`adapters/pi/`), comando `bun test test/host-adapters.test.mjs` y rollback declarados. |
| `S1.19` | 📋 PLANIFICADO | `direct` | Depende de `S1.18`. Refactor de seams y regresión compartida; verificación sólo por fixtures y rollback sin schema. |

**Decisión latente en `S1.16`, hoy no disparada:** su condición de parada dice que si la reconciliación exige tocar `core.mjs` o `mcp.mjs`, la Sesión **para antes del RED** y ese seam se planifica como Sesión aparte. **Clase:** expansión de alcance. **Contamina:** `S4.2`, `S4.3` y `S4.4`, que dependen de `S1.16`.

### 🔴 La cadena de release está incompleta

[`release-chain.md`](../release-chain.md) incorpora `S1.16`–`S1.19` y deja `S1.11`–`S1.15` fuera «hasta que una dependencia explícita los incorpore». **Esa dependencia explícita existe y está escrita:**

- `p7-host-neutral-loop-opencode-adapter/tasks.md:25` — «`S1.11` owns creation and approval of `reconciliation.md`; `S1.13`–`S1.16` consume and validate that approved record».
- `p8-slice-planning/tasks.md:31` — `S1.17` exige legacy P7 reconciliado e integrado **y** el registro propio de P8 aprobado, es decir `S1.11` y `S1.12`.
- El Roadmap de este Plan (fila `Roadmap` del resumen) — «Completar `S1.11` y `S1.12`; después ejecutar `S1.13`–`S1.19`».

Por lo tanto `S1.11`, `S1.12`, `S1.13`, `S1.14` y `S1.15` **entran en la cadena de release**: sin ellas, `S1.16` y `S1.17` no pueden arrancar, y sin ésas no hay `S4.2`–`S4.4` ni `S7.1`.

**Reconciliado el 2026-08-12:** `S1.11` está ✅ COMPLETO en `origin/master@3db3c121`; `S1.12` y `S1.13` están ✅ COMPLETO, integradas y verificadas localmente, con el último cierre en `master@794611f`, pero todavía no publicadas. La cadena pendiente queda `S1.14 → S1.15 → S1.16`; `S1.14` pasa a 🟢 LISTO y `S1.15`–`S1.16` permanecen 📋 PLANIFICADO. `S1.17` conserva su bloqueo propio: faltan `assignment_id`, `session_id` y capacidad runtime reales, una capacidad de binding que Workspace Manager/Main todavía no expone. El cierre de `S1.13` no elimina ese bloqueo externo.

Legacy P9–P11 todavía no tienen límites de PR demostrables. Sus responsabilidades se preservan sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
