# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-01 contra `master` en `6fbd97c3b1f84735db61ccbd1fd510482206e4eb`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md).

## 📍 Punto de retoma

`S8.4` cerró mediante issue #123 y PR #126, integrada en `master@6fbd97c3b1f84735db61ccbd1fd510482206e4eb`; P8 avanza a `57% (4/7 S)`.

`S8.5` está 🟢 LISTO pero **UNASSIGNED**. Autonomous V2 también permanece **UNASSIGNED**; esta reconciliación no despacha ninguno de los dos alcances.

P1 permanece 🔴 BLOQUEADO en `S1.11` y `S1.12`. P2 conserva responsabilidades posteriores de Change B sin Sesiones enumeradas; las demás responsabilidades sin límite de un PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 19/38 (50%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (2/2 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 0% (0/2 S) | — | Main | S3.1, S3.2 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/3 S) | — | Main | S5.1, S5.2, S5.3 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Installable V1 release | 🔵 EN CURSO | 57% (4/7 S) | — | Maintainer | S8.5, S8.6, S8.7 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
