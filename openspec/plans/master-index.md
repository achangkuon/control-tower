# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-12 contra `master@427b14e968e625142c63cd330a0bd8d8f912e31a` (tree `3826d2237cc78ec9f4af6214b2eabc16f0667924`). `origin/master` permanece en `3db3c121`; este snapshot es local y no publicado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S1.12` y `S5.8` son los últimos cierres integrados y verificados en el `master` local `427b14e`; `S5.7` también está cerrada en esa historia. `origin/master` sigue en `3db3c121`, por lo que no hay publicación remota ni claim de shipment.

`S1.13` tiene candidato fuera de esta integración y no cuenta como cierre. `S5.9` queda 🔴 BLOQUEADO: el Main store está aprobado como owner persistente, pero el maintainer todavía debe resolver explícitamente la forma pública/API y la frontera de seguridad antes de cualquier SDD. `S5.10` también queda 🔴 BLOQUEADO por su dependencia de `S5.9` integrada y por sus propias decisiones abiertas de provenance contractual y seguridad. `S5.5` permanece 🔴 BLOQUEADO hasta integrar ambas. El orden serial no cambia: `S5.8` ✅ → `S5.9` 🔴 → `S5.10` 🔴 → `S5.5` 🔴. La próxima acción canónica es la resolución del maintainer sobre el contrato público y de seguridad de `S5.9`, no ejecución.

P10 queda 🔴 BLOQUEADO con `0/2 S`: `S10.1` espera la decisión sobre ejecución antes/sin supervisión y `S10.2` espera la arquitectura visible/de seguridad, la reconciliación del interlock de `remote-control` y un `Área` explícita. `S1.17`, `S5.2`/`S5.3`, `S5.5` y `S8.7` conservan sus bloqueos registrados.

P9 es un candidato de planificación separado, ya autorizado pero todavía sin integrar; no forma parte del denominador Git-canónico. Notion se difiere porque no hubo push ni entrega remota; se reconciliará después de la publicación.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/10 Planes cerrados (20%) · Sesiones cerradas en planes activos: 23/44 (52%). Cálculo auditable: P1 `12/19` + P4 `1/4` + P5 `5/10` + P7 `0/1` + P8 `5/8` + P10 `0/2` = `23/44`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable. P9 es un candidato separado ya autorizado pero no integrado en este Git canónico: no se agrega como fila ni se cuenta en ningún denominador hasta su integración.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 63% (12/19 S) | — | Main | S1.13, S1.14, S1.15, S1.16, S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
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
