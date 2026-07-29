# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-29 contra `master` en `fa20b908f129b9f26b2b1fd7d341a170eea4384c`.

## 📍 Punto de retoma

La migración canónica de nombres cerró como `S0.2` mediante PR #69, merge `fa20b908f129b9f26b2b1fd7d341a170eea4384c`; P0 permanece completo.
Lo siguiente es completar `S1.11` y `S1.12`; `p7-host-neutral-loop-opencode-adapter` (legacy P7) y `p8-slice-planning` permanecen bloqueados hasta aprobar sus registros independientes.
En paralelo, Change A continúa por `S2.2`; no depende de los changes legacy P7/P8 y no debe reabrir PRD, RFC ni REQUIREMENTS.
Las responsabilidades aún sin límite de PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

| ID | Plan | Estado | Est. | Dueño | Qué falta | Ref |
|----|------|--------|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🟢 LISTO | — | Main | S2.2, S2.3 | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 📋 PLANIFICADO | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | — | Main | — | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | — | Main | — | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad V1 | 📋 PLANIFICADO | — | Maintainer | — | [STATUS](plan-7/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
