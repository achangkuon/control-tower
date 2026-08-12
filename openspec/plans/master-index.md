# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-12 contra `master@794611f925f4fd2cb0de0b69cfdf2798d011543d` (tree `34bed8b7bd062c8e3cdcce20153c0a378053dcf7`). `origin/master` permanece en `3db3c121`; este snapshot es local y no publicado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S1.13` es el último cierre integrado y verificado en el `master` local `794611f`: implementación `2bbeddb` más corrección de compatibilidad de fixture `794611f`, con suite final 620/0. `origin/master` sigue en `3db3c121`, por lo que no hay publicación remota ni claim de shipment.

`S1.14` queda 🟢 LISTO, sin crédito de progreso. La próxima decisión canónica sigue siendo del maintainer sobre `S5.9`: forma pública/API y frontera de seguridad. `S5.10` continúa 🔴 BLOQUEADO por `S5.9` integrada y por sus propias decisiones de provenance contractual y seguridad; `S5.5` permanece 🔴 BLOQUEADO hasta integrar ambas. El orden serial sigue `S5.8` ✅ → `S5.9` 🔴 → `S5.10` 🔴 → `S5.5` 🔴.

P10 queda 🔴 BLOQUEADO con `0/2 S`: `S10.1` espera la decisión sobre ejecución antes/sin supervisión y `S10.2` espera la arquitectura visible/de seguridad, la reconciliación del interlock de `remote-control` y un `Área` explícita. `S1.17`, `S5.2`/`S5.3`, `S5.5` y `S8.7` conservan sus bloqueos registrados.

P9 es un candidato de planificación separado, ya autorizado pero todavía sin integrar; no forma parte del denominador Git-canónico. Notion se difiere porque no hubo push ni entrega remota; el parent reconciliará ese snapshot por separado.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/10 Planes cerrados (20%) · Sesiones cerradas en planes activos: 24/44 (55%). Cálculo auditable: P1 `13/19` + P4 `1/4` + P5 `5/10` + P7 `0/1` + P8 `5/8` + P10 `0/2` = `24/44`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable. P9 es un candidato separado ya autorizado pero no integrado en este Git canónico: no se agrega como fila ni se cuenta en ningún denominador hasta su integración.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 68% (13/19 S) | — | Main | S1.14, S1.15, S1.16, S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 50% (5/10 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | 🔴 BLOQUEADO | 0% (0/2 S) | — | Maintainer | S10.1, S10.2 | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
