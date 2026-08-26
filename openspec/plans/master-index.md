# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: candidato documental local de cierre de `S4.6` contra `3857a81ac96645e4c1b8dde91c7e5f864ba055e4` (tree `bc850845ddf3639b2349c39ec05ef21b67cfc6a6`). No está pusheado, publicado ni integrado a `master` por esta preparación.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-26 la frontera tiene **tres ejes**: la calidad del trabajo, el flujo de trabajo ([decisión 71](decision-register.md)) y **quién lee el plan** ([decisión 78](decision-register.md) — la cerca no lee). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

Último cierre técnico: `S4.6` ✅ COMPLETO en el commit local `3857a81`; esta preparación documental no afirma push, publicación ni integración a `master`.
`S4.4` está 🔵 EN CURSO y serializada detrás de este cierre documental por paths compartidos.
`S2.6` tiene candidato verificado pendiente de entrega; `S5.14` permanece serial detrás de `S2.6`.
`implementer-3` queda disponible sólo después de publicar este cierre documental; este índice no asigna asientos.

**Los tres asientos quedaron parqueados el 2026-08-26, con su trabajo commiteado y sin publicar.** `S4.4` en `feat/plan-4/s4-4-same-host-recovery@75c378d` (dos commits de comportamiento); `S2.6` en `feat/plan-2/s2-6-execution-contract-adoption@00b24a2`, **candidato verificado** cuya integración con `master` se probó en merge limpio y **892 pass / 0 fail**; `S4.8` en `feat/plan-4/s4-8-opencode-runtime-matrix@40060b7`, WIP y no candidato. Los tres asientos quedaron en detached HEAD sobre `master@c9604b6` con los planes al día y **sin un solo cambio suelto**. **Ninguna rama recibió merge de `master` a propósito:** hacerlo cambiaría el árbol de un candidato ya verificado, y esa es una decisión del maintainer. Al retomar, cada uno hace `git fetch` y trae `master` antes de seguir.
**Tercer eje de la frontera — la cerca no lee (2026-08-26, [decisión 78](decision-register.md)).** Al medir cómo cierra el loop autónomo se encontró que `S5.5` elige una **Sesión** mientras `continuation/derivation.mjs:5` elige un **Módulo** por orden de documento, sin recibir la Sesión ni leer `Depende de`. **El maintainer corrigió el planteo:** la Torre no debe parsear planes en absoluto. Leer el plan es del agente Support, que ya lo hace en `support/agent.mjs:15` y `support/manifest.mjs:68` y ya entrega `support-proposal-v1` con `primary`, `alternatives`, `conflicts` y `state`. La decisión fija además el vocabulario: **la cerca** es el código; **Main** es un rol con autoridad de despacho que la cerca verifica, no la cerca misma. Resultado: `S5.15` nueva —retira el lector—, `S5.5` recortada, `S2.7` 📚 ARCHIVADA y `S2.8` nueva por el residuo de `binding-delta-v1`. **Ninguna Sesión perdió trabajo.**

## 🎯 Cola de ejecución

`#1 S4.4` · `#2 S2.6` · `#3 S5.14` · `#4 S2.8` · `#5 S4.8` · `#6 S4.9` · `#7 S8.12` · `#8 S5.5` · `#9 S5.15` · `#10 S9.1` · `#11 S7.1` — recalculada 2026-08-26 por la [decisión 78](decision-register.md): `S2.7` sale 📚 ARCHIVADA y entran `S2.8` y `S5.15`. **Los IDs no se renumeran; las posiciones sí.** La posición es topológica; no vuelve ejecutable una dependencia pendiente.

**Capacidad:** `S4.4` ya está en curso y permanece serializada detrás de la publicación de este cierre documental. `S2.6` tiene candidato verificado pendiente de entrega; `S4.8`, `S4.9` y `S5.5` están listas por grafo, pero este índice no asigna asientos. `implementer-3` no se considera disponible hasta publicar la documentación de cierre.

**Orden y bloqueos preservados:** `S5.14` corre serialmente después de `S2.6`, y `S2.8` también —comparte `test/contracts/schema.test.mjs` y sus fixturas con `S2.6`—. `S5.15` va detrás de `S5.5` y `S5.14`. `S9.1` carece de enumeración suficiente. `S8.12` conserva una decisión abierta del maintainer. `S4.9` ya está lista porque `S4.6` y `S4.7` cerraron, pero sigue sin asiento. `S7.1` continúa detrás de `S4.4`, `S4.8`, `S5.5` y `S8.12` — `S5.3` figuraba acá por error y está ✅ COMPLETO desde su reconciliación sobre `master@88d1de4`; `S4.9` no precede la primera release.

**Fuera de la cola:** `S8.11` 🔴; `S8.5`/`S8.6`, `S1.17`–`S1.19` y `S9.4` 🟡; P6 🟡. Sin enumerar: wiring productivo `policy/delivery-policy.mjs` → `CV_GRANT_DELIVERY` (diferido por autoridad, sin ID ni alcance), lock huérfano de `main-store/store.mjs`, `enroll/**`, umbrales §14.3, macOS, y los Módulos/Tareas de `S2.8` y `S9.1`.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos: 41/59 (69%). Cálculo auditable: P1 `16/19` + P4 `6/9` + P5 `12/15` + P7 `0/1` + P8 `7/11` + P9 `0/4` = `41/59`. P0, P3, P10 y P11 se excluyen porque están cerrados; P2 y P6 no tienen denominador derivable: P2 enumeró `S2.6` el 2026-08-25 y `S2.8` el 2026-08-26, y archivó `S2.7`, pero conserva cuatro responsabilidades de Change B sin ID, así que su denominador sigue sin cerrar.

**El denominador de P5 subió de 14 a 15 sin que se perdiera trabajo**, al enumerar `S5.15` por la [decisión 78](decision-register.md). Es la misma causa de siempre —se enumeró trabajo que ya existía y que nadie contaba— y otra vez el porcentaje se movió en contra. En el mismo movimiento `S2.7` salió del alcance por quedarse sin sujeto, pero eso no toca el cociente: P2 nunca tuvo denominador derivable.

**El denominador subió de 57 a 58 sin que se perdiera trabajo.** Es la tercera vez que pasa: al cerrar la Fase 2, con la Fase 3, y ahora con el segundo eje. Las tres veces por la misma causa —se enumeró trabajo que ya existía y que nadie contaba—, y las tres veces el porcentaje se movió en contra. Un porcentaje que subiera al aparecer trabajo nuevo sería el que está mintiendo.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi, segundo host) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | `S2.6` 🟢 (adopción del contrato de ejecución) · `S2.8` 📋 (nombres de fase fuera del contrato de binding) · `S2.7` 📚 ARCHIVADA por la [decisión 78](decision-register.md) — sin lector copiado no hay deriva que vigilar | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 67% (6/9 S) | — | Main | `S4.4`, `S4.8`, `S4.9` · `S4.9` 🟢 LISTO sin asignación | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 80% (12/15 S) | — | Main | `S5.14` 🟢 (dependencia satisfecha; después de `S2.6`) · `S5.5` 🟢 destrabada y recortada · `S5.15` 📋 (la Torre deja de enumerar el plan) | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — condicionado a probar la Torre en uso real | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 64% (7/11 S) | — | Maintainer | `S8.12` 📋 (canal único) · `S8.11` 🔴 (costo, no producto) · `S8.5`, `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | `S9.1` 📋 (falta enumerar), `S9.2`, `S9.3` · `S9.4` 🟡 DIFERIDO (Pi) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
