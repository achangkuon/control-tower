# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-13 contra la implementación `da4e3914830f87d028113dfe451fdbe101b7847a` y su cierre documental; ambos forman la entrega directa de `S1.16` a `master`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S1.16` cerró en `da4e391`; su consumer OpenCode está verificado, pero el provider/injection productivo sigue perteneciendo a `S4.2/M4.2.3`. La entrega directa incluye la implementación y este cierre documental.

`S4.2` y `S5.9` siguen 🟢 LISTO. En P10, `S10.3` queda 🟢 LISTO para la copia pasiva exacta; `S10.1` pasa a 📋 PLANIFICADO hasta cerrar ese prerrequisito.

`S9.1` permanece planning-only y en cuarentena antes de tasks/apply: transporte `#1b` y rollback floor siguen sin resolver; `S9.2` continúa 🔴 BLOQUEADO. P9 no reabre P3 ni altera el orden de hosts.

Control Tower sigue siendo un producto, un roadmap y un release. OpenCode va primero; Pi sigue como segundo host/fallback obligatorio. P10 encadena `S3.4 → S10.3 → S10.1 → S10.2 → S7.1`; `S10.1` es effect-incapable y `S10.2` conserva sus decisiones abiertas.

Permanecen bloqueadas `S1.17`, `S4.3`/`S4.4`, `S5.2`/`S5.3`, `S5.10`/`S5.5`, `S8.7` y `S10.2`; con la Torre apagada, la capacidad se reevalúa por grafo, `Área`, `Recurso` y contaminación.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/11 Planes cerrados (18%) · Sesiones cerradas en planes activos: 29/49 (59%). Cálculo auditable: P1 `16/19` + P4 `1/4` + P5 `7/12` + P7 `0/1` + P8 `5/8` + P9 `0/2` + P10 `0/3` = `29/49`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 58% (7/12 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🟢 LISTO | 0% (0/2 S) | — | Maintainer | S9.1, S9.2 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | 🟢 LISTO | 0% (0/3 S) | — | Maintainer | S10.3, S10.1, S10.2 | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
