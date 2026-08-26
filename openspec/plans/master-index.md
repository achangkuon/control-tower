# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: `S4.7` cerrada y entregada en `origin/master@3b981efdcf3f68c2dc295ae056f10c04914cfc56` (tree `2da94e239033d108f957bfe16f53fb70008f7d27`), con siete criterios y suite integral en PASS. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con vista autenticada siempre `DEGRADED` hasta prueba real de attach.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-25 la frontera tiene **dos ejes**: la calidad del trabajo y el flujo de trabajo ([decisión 71](decision-register.md)). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

Último cierre integral publicado: `S4.7` ✅ COMPLETO, entregada en `origin/master@3b981efdcf3f68c2dc295ae056f10c04914cfc56` (tree `2da94e239033d108f957bfe16f53fb70008f7d27`) mediante `13e3ec7`, `429f2ea` y `3b981ef`.
**Evidencia final:** siete criterios PASS; focused S4.7 **64 pass / 0 fail / 464 expectations**; suite integral **891 pass / 0 fail / 5.095 expectations / 69 archivos**; candidato `M4.7.3` de **5 paths / 104 líneas authored**.
`#1 de 11 → S4.4`: queda habilitada al cerrar `S4.7`. La vista conserva el contrato siempre `DEGRADED`; decisiones 76–77 permanecen resueltas y `ATTACHED` sigue reservado a prueba real.
Hay cinco Sesiones graph-independent lanzables: `S4.4`, `S2.6`, `S4.6`, `S4.8` y `S5.5`. `S5.14` permanece serial después de `S2.6`; no se asigna ningún asiento desde este documento.
Notion fue omitido por opt-out explícito del maintainer; no se llamó ni actualizó Notion y `.session-doc.json` quedó intacto.

## 🎯 Cola de ejecución

`#1 S4.4` · `#2 S2.6` · `#3 S5.14` · `#4 S2.7` · `#5 S4.6` · `#6 S4.8` · `#7 S4.9` · `#8 S8.12` · `#9 S5.5` · `#10 S9.1` · `#11 S7.1` — reconciliada 2026-08-26 tras el cierre de `S4.7`. **Los IDs no se renumeran; las posiciones sí.** La posición es topológica; no vuelve ejecutable una dependencia pendiente.

**Capacidad:** el grafo ofrece cinco lanzables independientes (`S4.4`, `S2.6`, `S4.6`, `S4.8`, `S5.5`). La capacidad recomendada es 3 sólo después de aprobación de asignaciones exactas y reciclado guardado. Antes de esa aprobación, el máximo seguro inmediato es 1 porque únicamente `implementer-1` está limpio y actualizado. `implementer-2` y `implementer-3` están limpios pero detached en `f6bde11`; quedan excluidos hasta aprobación exacta y reciclado guardado. Este índice no asigna asientos a Sesiones.

**Orden y bloqueos preservados:** `S5.14` corre serialmente después de `S2.6`. `S2.7` y `S9.1` carecen de enumeración suficiente. `S8.12` conserva una decisión abierta del maintainer. `S4.9` espera `S4.6`. `S7.1` sigue bloqueada por `S4.4`, `S4.6`, `S4.8`, `S5.3`, `S5.5` y `S8.12`; `S4.9` no precede la primera release.

**Fuera de la cola:** `S8.11` 🔴; `S8.5`/`S8.6`, `S1.17`–`S1.19` y `S9.4` 🟡; P6 🟡. Sin enumerar: wiring productivo `policy/delivery-policy.mjs` → `CV_GRANT_DELIVERY` (diferido por autoridad, sin ID ni alcance), lock huérfano de `main-store/store.mjs`, `enroll/**`, umbrales §14.3, macOS, y los Módulos/Tareas de `S2.7`.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos: 40/58 (69%). Cálculo auditable: P1 `16/19` + P4 `5/9` + P5 `12/14` + P7 `0/1` + P8 `7/11` + P9 `0/4` = `40/58`. P0, P3, P10 y P11 se excluyen porque están cerrados; P2 y P6 no tienen denominador derivable: P2 enumeró `S2.6` y `S2.7` el 2026-08-25, pero conserva cuatro responsabilidades de Change B sin ID, así que su denominador sigue sin cerrar.

**El denominador subió de 57 a 58 sin que se perdiera trabajo.** Es la tercera vez que pasa: al cerrar la Fase 2, con la Fase 3, y ahora con el segundo eje. Las tres veces por la misma causa —se enumeró trabajo que ya existía y que nadie contaba—, y las tres veces el porcentaje se movió en contra. Un porcentaje que subiera al aparecer trabajo nuevo sería el que está mintiendo.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi, segundo host) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | `S2.6` 🟢 (adopción del contrato de ejecución) · `S2.7` 📋 (alarma de deriva del vocabulario) | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 56% (5/9 S) | — | Main | `S4.4`, `S4.6`, `S4.8`, `S4.9` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 86% (12/14 S) | — | Main | `S5.14` 🟢 (dependencia satisfecha; después de `S2.6`) · `S5.5` 🟢 destrabada | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — condicionado a probar la Torre en uso real | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 64% (7/11 S) | — | Maintainer | `S8.12` 📋 (canal único) · `S8.11` 🔴 (costo, no producto) · `S8.5`, `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | `S9.1` 📋 (falta enumerar), `S9.2`, `S9.3` · `S9.4` 🟡 DIFERIDO (Pi) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
