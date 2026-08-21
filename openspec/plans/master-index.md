# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-21 contra el ejecutable local `388109f1e79f50ce05582d2b0a7b3ff8a9685f72` (tree `489d042d3cba3939dedfdfd64fd20d74c9c8a638`). `S8.11` queda 🔴 BLOQUEADO: el generador fue `unchanged`, pero el primer focused final terminó 78/11 por fixtures incompatibles con el árbol owner-read-only; harness y full no se ejecutaron por regla terminal. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S8.11` está 🔴 BLOQUEADO por el primer focused final del contrato nocturno.** WU1 `812703d` y WU2 `388109f` quedan congelados localmente, sin push. La retoma exige autoridad atendida para adaptar los fixtures de `test/install/lifecycle.test.mjs` y `test/install/launch-worker-cli.test.mjs` a árboles owner-read-only y sellar una nueva verificación; el intento actual no admite retry. `S8.10` sigue 🔴 BLOQUEADO y parqueado antes del commit de comportamiento y la verificación final; su candidato permanece en `feat/s8.10-runtime-payload-model@0891cc7`, Engram 9176. La puerta semántica mantiene `S4.4` bloqueada hasta integrar y cerrar `S8.10`.

El bloqueo no altera cierres ni denominadores: P4 permanece en 80% (4/5 S), P5 en 92% (11/12 S), P8 en 64% (7/11 S) y las Sesiones activas en 73% (38/52). `S8.11` 🔴 BLOQUEADO suma cero.

El cableado del producto no instalado, el lock huérfano de `main-store/store.mjs:104-124`, la Sesión `enroll/**`, los umbrales de liveness de §14.3, el tamaño del pool de `S9.4` y macOS siguen fuera de esta corrección.

## 🎯 Cola de ejecución

`#1 S5.5` · `#2 S7.1` — reconciliada 2026-08-21 tras bloquear el intento final de `S8.11`. **La cola incluye sólo Sesiones 🟢 LISTO y 📋 PLANIFICADO en orden topológico; la posición no vuelve ejecutable una dependencia pendiente.**

`S8.11` queda fuera de la cola mientras está 🔴 BLOQUEADO. `S4.4` queda fuera por la puerta semántica de `S8.10`; `S8.10` también permanece 🔴 BLOQUEADO hasta integrar y cerrar `S8.11`. `S5.5` conserva la primera posición elegible y `S7.1` queda después porque espera `S5.5` y `S4.4`.

**Fuera de la cola:** P9 no gana readiness por esta reconciliación: `S9.1` requiere rediseñar `M9.1.1` bajo la decisión 52 y `S9.2`–`S9.4` esperan detrás. Pi/Intercom y `S8.7` tampoco integran esta cola.

**Trabajo sin enumerar, que ninguna posición de esta cola cubre:** el cableado del producto no instalado (brecha 6), el dueño del lock huérfano de `main-store/store.mjs:104-124`, la Sesión `enroll/**`, los umbrales de liveness de §14.3, el tamaño del pool de `S9.4` y el soporte de macOS.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 38/52 (73%). Cálculo auditable: P1 `16/19` + P4 `4/5` + P5 `11/12` + P7 `0/1` + P8 `7/11` + P9 `0/4` = `38/52`; `S8.11` 🔴 BLOQUEADO suma cero. P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi/Intercom) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 80% (4/5 S) | — | Main | `S4.4` 🔴 — espera integración de `S8.10` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 92% (11/12 S) | — | Main | `S5.5` 🟢 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔴 BLOQUEADO | 64% (7/11 S) | — | Maintainer | `S8.11` 🔴 (focused final 78/11; fixtures read-only), `S8.10` 🔴 · `S8.5`, `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada, caché externa de Bun y pool de asientos | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | S9.1 (🔵, decision-clean, `0/9 M`), S9.2, S9.3 (falta enumerar Área/Recurso/Módulos), S9.4 (nueva, falta enumerar y decidir tamaño del pool) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` sí conserva las Sesiones diferidas en el denominador, porque están enumeradas; por eso P1 y P8 no llegan al 100% aunque no les quede trabajo activo.

## 🗂️ Planes archivados

Ninguno.
