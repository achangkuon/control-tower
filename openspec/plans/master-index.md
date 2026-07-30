# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-30 contra `origin/master` en `bbb59af9ca4de9223e0ec06474725f13329993b6`.

## 📍 Punto de retoma

`S2.2` cerró el issue #71 y se integró mediante PR #72 en `origin/master@bbb59af9ca4de9223e0ec06474725f13329993b6`; P2 continúa listo.
El siguiente alcance aprobado es `S2.3` — Main Store and Boundaries — comenzando por `M2.3.1`; su implementación todavía no comenzó.
P1 permanece bloqueado en `S1.11` y `S1.12`; `p7-host-neutral-loop-opencode-adapter` (legacy P7) y `p8-slice-planning` siguen esperando sus registros independientes.
Las responsabilidades aún sin límite de PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md); no se reabren PRD, RFC ni REQUIREMENTS.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global:** 1/8 Planes cerrados (13%) · Sesiones cerradas en Planes activos: 12/22 (55%).

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (2/2 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | — (legacy P9–P11 sin Sesiones definidas) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🟢 LISTO | — (Change B sin Sesiones definidas) | — | Main | S2.3 | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 📋 PLANIFICADO | — (sin Sesiones definidas) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | — (sin Sesiones definidas) | — | Main | — | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | — (sin Sesiones definidas) | — | Main | — | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones definidas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad V1 | 📋 PLANIFICADO | — (sin Sesiones definidas) | — | Maintainer | — | [STATUS](plan-7/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
