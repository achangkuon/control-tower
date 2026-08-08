# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-08 contra `c7c247227f6bc888f9ff7ed48094a7aa92f9cc4c`; cierre técnico verificado de `S5.1` con 27/27 criterios.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S5.1` está ✅ COMPLETO sobre `c7c2472` (tree `17f24c6d`): 27/27 criterios verificados y 537/537 tests de regresión.

`S4.1` y `S5.4` están 🟢 LISTO, con `Área` y `Recurso` disjuntos; la capacidad inmediata es 2.

`S8.7` sigue 🔴 BLOQUEADO por tres decisiones del maintainer: autenticación, exposición de estado y callback expirado.

La declaración de release también conserva la decisión abierta sobre quién origina `trustedBindingProvider` en producción; `S5.2` espera `S4.1` y `S5.5` espera `S5.4`.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 28/46 (61%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🟢 LISTO | 0% (0/1 S) | — | Main | S4.1 | [STATUS · S4.1 sellada](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 20% (1/5 S) | — | Main | S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
