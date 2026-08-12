# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-12 contra `master@b4d7fcdec65046b9958dab488ee3cfc5b038ccd0` (tree `787357035fa34684ce3fbf4f1da76b923956ba58`). El ref local `origin/master` permanece en `3db3c121`; `master` está 17 commits por delante y este snapshot técnico no fue pusheado ni publicado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S1.15` y `S5.11` están cerradas técnica y localmente; el HEAD técnico es `master@b4d7fcd` (tree `7873570`), 17 commits por delante del ref local `origin/master@3db3c121`, sin push ni publicación remota.

`S1.16` y `S5.12` quedan 🟢 LISTO como siguientes Sesiones de P1 y P5, respectivamente, sin inicio ni crédito. Sólo pueden tratarse como disjuntas o ejecutarse en paralelo después de reevaluar la capacidad actual —grafo, `Área`, `Recurso` y contaminación—.

La hermeticidad clean-clone del registry queda como deuda separada y todavía no tiene ID de Sesión; no invalida el cierre post-integración de `S5.11` sobre Main. `S1.17`, `S5.2`/`S5.3`, `S5.9`/`S5.10`/`S5.5`, `S8.7`, `S10.1` y `S10.2` conservan sus bloqueos.

No se acredita ninguna Sesión posterior ni trabajo P9 no integrado; P9 sigue fuera del denominador Git-canónico.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/10 Planes cerrados (20%) · Sesiones cerradas en planes activos: 27/46 (59%). Cálculo auditable: P1 `15/19` + P4 `1/4` + P5 `6/12` + P7 `0/1` + P8 `5/8` + P10 `0/2` = `27/46`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable. P9 es un candidato separado ya autorizado pero no integrado en este Git canónico: no se agrega como fila ni se cuenta en ningún denominador hasta su integración.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 79% (15/19 S) | — | Main | S1.16, S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 50% (6/12 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10, S5.12 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | 🔴 BLOQUEADO | 0% (0/2 S) | — | Maintainer | S10.1, S10.2 | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
