# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-13 contra el candidato de `S10.3` basado en `cdd0d09bcdd4d2104e54a7265d1dc3742ceea2e7`; la entrega directa aún requiere autorización explícita.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S10.3` cerró como candidato: `schemas/execution-contract-v1.schema.json` es byte-idéntico al origen aprobado (17.297 bytes, 407 líneas, SHA-256 `2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc`). No hay commit ni push autorizados todavía.

`S10.1` pasa a 🟢 LISTO para su ruta `design-tasks`; sigue effect-incapable y no comienza en este candidato. `S10.2` conserva sus decisiones abiertas y permanece 🔴 BLOQUEADO.

`S4.2` y `S5.9` siguen 🟢 LISTO. `S9.1` permanece planning-only y en cuarentena; P9 no se modifica ni reabre P3.

La próxima acción es revisar y autorizar por separado la entrega directa de `S10.3`; después se vuelve a derivar capacidad por grafo, `Área`, `Recurso` y contaminación.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/11 Planes cerrados (18%) · Sesiones cerradas en planes activos: 30/49 (61%). Cálculo auditable: P1 `16/19` + P4 `1/4` + P5 `7/12` + P7 `0/1` + P8 `5/8` + P9 `0/2` + P10 `1/3` = `30/49`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

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
| P10 | Ejecución y supervisión autónoma de Jornada | 🔵 EN CURSO | 33% (1/3 S) | — | Maintainer | S10.1, S10.2 | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
