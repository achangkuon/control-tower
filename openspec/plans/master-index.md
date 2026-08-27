# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: **publicación de `S2.6`**. El candidato `c91fddd5c74019de2ef7d691a43d403558c3a92e` entró a `master` **byte-idéntico** —padre/base `99bab46036a1448ff7ebd9e6bbd1147964cda392`, tree `0040cd84b498d5953cd3c9eececbe65e46cf16d2`, verificado con `git merge-base --is-ancestor`—, y `f2d1a81` cerró su documentación. `origin/master` está en `f2d1a81`. Ya no queda ninguna publicación pendiente.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-26 la frontera tiene **tres ejes**: la calidad del trabajo, el flujo de trabajo ([decisión 71](decision-register.md)) y **quién lee el plan** ([decisión 78](decision-register.md) — la cerca no lee). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

**🔴 EL ORDEN DE HOSTS SE INVIRTIÓ. Pi va primero ([decisión 80](decision-register.md), 2026-08-27).** Esta es la primera cosa que hay que leer: la cola de abajo **todavía está escrita para OpenCode** y se reescribe en la próxima sesión. Nada se borra — OpenCode y todo lo suyo quedan 🟡 DIFERIDO con su trabajo intacto y su estado ✅ COMPLETO donde lo tenían.

**⛔ NO ARRANCAR `S4.4`.** Es el `#1` de la cola escrita abajo, es recuperación del host OpenCode, y una decisión abierta puede disolverle la mitad del alcance. Cualquier trabajo sobre ella hoy es trabajo perdido.

**Cinco decisiones del maintainer siguen abiertas y bloquean la reescritura de los planes** (detalle en la [decisión 80](decision-register.md)): alcance de la [decisión 40](decision-register.md) — la Torre conserva recuperación, ¿y qué mitad; Grado 2 o Grado 1 de aislamiento antes de arrancar; si los asientos implementadores conservan `bash`; las 228 líneas de superficie de host sin equivalente enumerado en Pi —**faltan por los dos caminos**—; y qué pasa con el piloto de `S7.1` si el host cambia a mitad de plan, que **nunca se registró**.

**Pregunta de validación pendiente para la próxima sesión, planteada por el maintainer:** verificar que la Torre **no quede dependiendo de Pi ni de Herdr** como quedó dependiendo de OpenCode. La [auditoría B](audits/opencode-coupling-audit-b.md) midió exactamente esa lección: la capa de continuación es agnóstica —1.651 líneas sobreviven a cualquier host— pero la de lanzamiento e identidad no tenía costura y quedó con el idioma de OpenCode grabado en un esquema persistido. La costura de host hay que diseñarla **antes** de escribir el adaptador de Pi, no después.

`S2.6` queda ✅ COMPLETO **y publicada**: `c91fddd5c74019de2ef7d691a43d403558c3a92e` es ancestro de `origin/master`, con 87 tests focalizados y 892 integrales sin fallos. Ya no es candidato ni bloquea a nadie.
`S4.6` ya está publicado: `f9f0bc24c9083f9c41a62f8788f77cf56e157dfd` es ancestro del `master` actual.
Con `S2.6` publicada, **`S5.14` y `S2.8` quedan desbloqueadas por dependencia** y la cola omite `S2.6` por estar cerrada, no por estar pendiente. Ninguna de las dos depende del host, así que **sobreviven al cambio de orden**.
`S4.4` y `S4.8` estaban 🔵 EN CURSO y quedan **congeladas** hasta la reescritura. Este índice no crea ni cambia asignaciones de asiento.
**Tercer eje preservado — la cerca no lee ([decisión 78](decision-register.md)).** Support lee el plan y entrega la propuesta; la Torre verifica lo recibido sin recalcular `primary`, `alternatives` ni `conflicts`. `S5.15` retira el lector, `S5.5` permanece recortada, `S2.7` está 📚 ARCHIVADA y `S2.8` conserva el residuo de `binding-delta-v1`.

## 🎯 Cola de ejecución

> **⚠️ Esta cola está OBSOLETA desde la [decisión 80](decision-register.md).** Se escribió para el orden OpenCode-primero y se reescribe en la próxima sesión, después de cerrar las cinco decisiones abiertas. Se conserva tal cual —sin tocar— para que la reescritura parta de un original fiel. **`S4.4` y `S4.8` están congeladas; no se toman.** `S5.14`, `S2.8`, `S5.5`, `S5.15`, `S9.1` y `S8.12` no dependen del host y sobreviven.

`#1 S4.4` · `#2 S5.14` · `#3 S2.8` · `#4 S4.8` · `#5 S4.9` · `#6 S8.12` · `#7 S5.5` · `#8 S5.15` · `#9 S9.1` · `#10 S7.1` — recalculada tras la publicación de `S2.6`. **Los IDs no se renumeran; las posiciones sí.** La posición es topológica; no vuelve ejecutable una dependencia pendiente.

**Capacidad:** `S4.4` y `S4.8` están en curso. `S4.9` y `S5.5` están listas por grafo, pero este índice no asigna asientos ni declara disponibilidad nueva.

**Orden y bloqueos preservados:** `S5.14` y `S2.8` ya no esperan a `S2.6` —publicada—, así que su posición es de orden, no de bloqueo; `S5.15` va detrás de `S5.5` y `S5.14`. `S9.1` carece de enumeración suficiente. `S8.12` conserva una decisión abierta del maintainer. `S4.9` ya está lista porque `S4.6` y `S4.7` cerraron, pero sigue sin asiento. `S7.1` continúa detrás de `S4.4`, `S4.8`, `S5.5` y `S8.12`; `S4.9` no precede la primera release.

**Fuera de la cola:** `S8.11` 🔴; `S8.5`/`S8.6`, `S1.17`–`S1.19` y `S9.4` 🟡; P6 🟡. Sin enumerar: wiring productivo `policy/delivery-policy.mjs` → `CV_GRANT_DELIVERY` (diferido por autoridad, sin ID ni alcance), lock huérfano de `main-store/store.mjs`, `enroll/**`, umbrales §14.3, macOS, y los Módulos/Tareas de `S2.8` y `S9.1`.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos: 41/59 (69%). Cálculo auditable: P1 `16/19` + P4 `6/9` + P5 `12/15` + P7 `0/1` + P8 `7/11` + P9 `0/4` = `41/59`. P0, P3, P10 y P11 se excluyen porque están cerrados; P2 y P6 no tienen denominador derivable: P2 enumeró `S2.6` el 2026-08-25 y `S2.8` el 2026-08-26, y archivó `S2.7`, pero conserva cuatro responsabilidades de Change B sin ID, así que su denominador sigue sin cerrar.

**El denominador de P5 subió de 14 a 15 sin que se perdiera trabajo**, al enumerar `S5.15` por la [decisión 78](decision-register.md). Es la misma causa de siempre —se enumeró trabajo que ya existía y que nadie contaba— y otra vez el porcentaje se movió en contra. En el mismo movimiento `S2.7` salió del alcance por quedarse sin sujeto, pero eso no toca el cociente: P2 nunca tuvo denominador derivable.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi, segundo host) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | `S2.8` 📋 (nombres SDD fuera del contrato de binding) · `S2.7` 📚 ARCHIVADA por la [decisión 78](decision-register.md) — sin lector copiado no hay deriva que vigilar | [STATUS](plan-2/STATUS.md) |
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
