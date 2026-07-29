# Plan 1 — Sustrato mecánico

**Estado:** 🔴 BLOQUEADO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Legacy P7 depende sólo de legacy P6; P8 depende de legacy P7 reconciliado e integrado. Change A no es dependencia de ninguno. |
| Outputs | Recovery/rollback fail-closed; controller host-neutral y adapter OpenCode; adapter Pi; adapter Claude opt-in; runtime versionado; verificación CT-only. |
| Roadmap | Completar `S1.11` y `S1.12`; después ejecutar `S1.13`–`S1.19`. Legacy P9–P11 esperan límites de PR demostrables. |
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

**Estado:** 🔴 BLOQUEADO

La definición canónica de esta Sesión, incluidos `M1.11.1` y `T1.11.1.1`–`T1.11.1.3`, vive en [`p7-p8-integrated-reconciliation/tasks.md`](../../changes/p7-p8-integrated-reconciliation/tasks.md#sesión-111--p7-reconciliation-record). Este `STATUS` no redefine sus Tareas.

## Sesión 1.12 — Reconciliación independiente P8

**Estado:** 🔴 BLOQUEADO

La definición canónica de esta Sesión, incluidos `M1.12.1` y `T1.12.1.1`–`T1.12.1.7`, vive en [`p7-p8-integrated-reconciliation/tasks.md`](../../changes/p7-p8-integrated-reconciliation/tasks.md#sesión-112--p8-reconciliation-and-preservation). Este `STATUS` no redefine sus Tareas.

## Sesiones legacy P7

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S1.13 | Root lifecycle e invalidación sincrónica | 📋 PLANIFICADO | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |
| S1.14 | Polling y wake safety | 📋 PLANIFICADO | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |
| S1.15 | Conformidad lifecycle OpenCode | 📋 PLANIFICADO | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |
| S1.16 | Transporte reconciliado y composición wake | 🔴 BLOQUEADO | [`tasks.md`](../../changes/p7-host-neutral-loop-opencode-adapter/tasks.md) |

## Sesiones P8

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S1.17 | Gate de reconciliación y pruebas RED | 🔴 BLOQUEADO | [`tasks.md`](../../changes/p8-slice-planning/tasks.md) |
| S1.18 | Pi adapter GREEN | 📋 PLANIFICADO | [`tasks.md`](../../changes/p8-slice-planning/tasks.md) |
| S1.19 | Refactor y regresión | 📋 PLANIFICADO | [`tasks.md`](../../changes/p8-slice-planning/tasks.md) |

Legacy P9–P11 todavía no tienen límites de PR demostrables. Sus responsabilidades se preservan sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
