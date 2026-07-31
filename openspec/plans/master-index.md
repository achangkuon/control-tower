# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-30 contra `HEAD=master=origin/master` en `f110874c1a4181da4efe4b59a5f604c797357896`.

## 📍 Punto de retoma

`S2.4` cerró mediante PRs #82, #84, #86 y #88 con verificación PASS y 0 CRITICAL; PR #90 integró su cierre y las cuatro Sesiones enumeradas de P2 están ✅ COMPLETO.
P2 queda 📋 PLANIFICADO porque Change B conserva trabajo sin Sesiones enumeradas; la dependencia S2.4 de `S3.1` está satisfecha, por lo que `S3.1` y P3 quedan 🟢 LISTO.
La cadena restante es `S3.2` → `S5.1` → `S4.1` → `S5.2` → `S5.3` → `S7.1`; ninguna Tarea de implementación está completa.
P8 debe definir el primer límite restante de un PR desde las dependencias de enrollment, resolución de proyecto/Main y Support read-only; `S8.1` y `S8.2` están ✅ COMPLETO.
P1 permanece bloqueado en `S1.11` y `S1.12`; las responsabilidades sin límite de PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 16/32 (50%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (2/2 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 📋 PLANIFICADO | — (trabajo restante de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 0% (0/2 S) | — | Main | S3.1, S3.2 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/3 S) | — | Main | S5.1, S5.2, S5.3 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad V1 | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Installable V1 release | 🔵 EN CURSO | — (trabajo restante sin Sesión enumerada) | 320–400 líneas | Maintainer | — | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
