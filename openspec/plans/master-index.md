# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-18 contra `master@401e8b4`; el candidato local todavía no tiene commit. La autoridad vigente es Moshi → Main → Herdr 0.8 interno → raíz OpenCode; Pi/Intercom queda diferido.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S4.2` queda ✅ COMPLETO en el candidato local verificado y pendiente de autorización para commit/push: Main lanza y custodia la raíz mediante Herdr 0.8; inspección/liveness/rehidratación siguen en `S4.3` y reapertura/recuperación en `S4.4`.

Las 35 decisiones `escala` de la ruta OpenCode están resueltas. Pi/Intercom, campañas y recuperación multi-host siguen fuera de esta cola.

La capacidad inmediata es `S5.9` y `S4.3`. `S5.2` conserva su corrección técnica pendiente; `S5.3` y `S5.5` esperan sus dependencias.

## 🎯 Cola de ejecución

`#1 S5.9` · `#2 S4.3` · `#3 S5.10` · `#4 S4.4` · `#5 S5.3` · `#6 S5.5` · `#7 S7.1` — recalculada 2026-08-18. Las posiciones posteriores esperan sus dependencias; Pi/Intercom y S8.7 no integran esta cola.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 31/46 (67%). Cálculo auditable: P1 `16/19` + P4 `2/4` + P5 `7/12` + P7 `0/1` + P8 `6/8` + P9 `0/2` = `31/46`; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 50% (2/4 S) | — | Main | S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 58% (7/12 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 75% (6/8 S) | — | Maintainer | S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🟢 LISTO | 0% (0/2 S) | — | Maintainer | S9.1, S9.2 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
