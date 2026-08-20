# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-20 contra el candidato local `fix/radiografia-skip-tests@0b8e4aebbe26aef37fd712edfefd99465e72b156` (tree `f3d50d3eb4c4a79dc6451289fd17b838a47c611a`, parent y entrega de `S8.9` `11c2728b944eaa00798cdaaeef612fa4b1489218`). La corrección operativa del hook no es una Sesión y no altera denominadores ni porcentajes. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S8.9` fue entregada en `11c2728`** con el payload derivado verificado. Su pre-push obligatorio volvió a ejecutar la suite completa durante la radiografía y causó el incidente operativo; el candidato local `0b8e4ae` lo corrige eliminando sólo `--with-tests`, sin quitar la regeneración del informe ni trasladar la verificación fuera del agente.

La corrección **no es una Sesión** y no altera el denominador ni los porcentajes: P8 permanece en 78% (7/9 S) y el avance de Sesiones activas en 74% (37/50). La reconciliación de `S5.3` es lo próximo.

El cableado del producto no instalado, el lock huérfano de `main-store/store.mjs:104-124`, la Sesión `enroll/**`, los umbrales de liveness de §14.3, el tamaño del pool de `S9.4` y macOS siguen fuera de esta corrección.

## 🎯 Cola de ejecución

`#1 S5.3` · `#2 S4.4` · `#3 S5.5` · `#4 S7.1` — recalculada 2026-08-20 al cerrar `S8.9`. **Una Sesión entra en esta cola sólo si toda su cadena de dependencias está satisfecha.**

`S8.9` salió de la cola al cerrar. `S5.3`, `S4.4` y `S5.5` siguen 🟢 LISTO; `S7.1` cierra la cola porque espera `S4.4`, `S5.3` y `S5.5`.

**Fuera de la cola, por dependencia y no por decisión:** las cuatro Sesiones de P9 —`S9.1` es la única ejecutable del Plan, y `S9.2`, `S9.3` y `S9.4` esperan detrás de ella—. `S9.1` no entra todavía porque su próximo paso es rediseñar `M9.1.1` bajo la decisión 52, no implementar. Pi/Intercom y `S8.7` no integran esta cola.

**Trabajo sin enumerar, que ninguna posición de esta cola cubre:** el cableado del producto no instalado (brecha 6), el dueño del lock huérfano de `main-store/store.mjs:104-124`, la Sesión `enroll/**`, los umbrales de liveness de §14.3, el tamaño del pool de `S9.4` y el soporte de macOS.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 37/50 (74%). Cálculo auditable: P1 `16/19` + P4 `4/5` + P5 `10/12` + P7 `0/1` + P8 `7/9` + P9 `0/4` = `37/50`; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi/Intercom) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 80% (4/5 S) | — | Main | `S4.4` 🟢 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 83% (10/12 S) | — | Main | `S5.3` 🟢 · `S5.5` 🟢 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 78% (7/9 S) | — | Maintainer | `S8.5`, `S8.6` | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada, caché externa de Bun y pool de asientos | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | S9.1 (🔵, decision-clean, `0/9 M`), S9.2, S9.3 (falta enumerar Área/Recurso/Módulos), S9.4 (nueva, falta enumerar y decidir tamaño del pool) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` sí conserva las Sesiones diferidas en el denominador, porque están enumeradas; por eso P1 y P8 no llegan al 100% aunque no les quede trabajo activo.

## 🗂️ Planes archivados

Ninguno.
