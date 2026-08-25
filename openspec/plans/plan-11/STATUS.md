# Plan 11 — Interfaz de operador

**Propósito:** que el maintainer pueda darle una orden a la Torre y ver su respuesta, con las garantías que el vocabulario de comandos ya declara.

**Estado:** 🟢 LISTO
**Avance:** 0% (0/1 S)

> **Nace el 2026-08-21 de la [decisión 63](../decision-register.md)**, en la reconciliación de Planes que cerró la Fase 2 del plan de depuración.

## Por qué es un Plan nuevo y no una Sesión dentro de otro

Se aplicó el test de pertenencia por propósito. **Ningún Plan existente lo cubre:**

| Plan | Propósito | ¿Cubre darle una orden a la Torre? |
|---|---|---|
| P4 | Que se pueda abrir una sesión, y de qué depende eso | No — lanza y vigila, no comanda |
| P5 | Tras la Fase 3: parking de decisiones, retoma del loop y coordinación | Parcial — `CV_ANSWER` sí, los otros doce no |
| P8 | Que la Torre se instale como producto | No — empaqueta, no opera |
| P9 | Asientos estables y reciclado seguro | No |

**La decisión 58 nombró a `console/vocabulary.mjs` autoridad de alcance del producto, y ningún Plan reclamaba lo que ese archivo declara.** Ése es exactamente el defecto que las auditorías encontraron: capacidades declaradas sin Plan dueño.

## El hueco que este Plan cierra

Medido por la [decisión 60](../decision-register.md) y corregido por la [61](../decision-register.md):

- **`console/vocabulary.mjs`** declara trece comandos con clase de riesgo, estados legales, argumentos y evidencia exigida.
- **`console/validate.mjs`** los valida por completo: resuelve el agente destino, verifica sus estados legales, deriva el agente desde la escalación abierta para `CV_ANSWER`, y exige evidencia con confirmación y TTL para los dos verbos irreversibles. **16 tests en verde, 168 aserciones.**
- **`core.mjs:4445` `send`** y **`4464` `receive`** son el canal operador→agente, ya se instalan y conservan el invariante de escritor único.
- **Nada traduce un comando validado en una directiva.** Cero de los trece verbos tiene ejecutor, y `bin/torre` expone ocho comandos de los cuales **ninguno pertenece al vocabulario**.

`test/console-executor.test.mjs` mantiene ese hueco visible en cada corrida de la suite: **2 pass · 13 todo · 0 fail**.

---

## Sesión 11.1 — Ejecutor de comandos y superficie tipeable

**Estado:** 🟢 LISTO — puede correr en paralelo con `S4.7` después de reconciliar la línea base.

**Depende de:** nada. El vocabulario, el validador y el canal `send`/`receive` ya existen y ya se instalan. La concurrencia con `S4.7` proviene de `Área` y `Recurso` disjuntos; no se inventa una dependencia semántica.

**Área:** `console/executor.mjs`, `bin/torre`, `test/console-executor.test.mjs`, `test/console/**`.

**Prohibido:** `core.mjs`, `console/vocabulary.mjs`, `console/validate.mjs`, `main-store/**`, `mcp.mjs`, `install/**`, `hosts/**`. El ejecutor **consume** el vocabulario y el validador; no los redefine ni los amplía.

**Recurso:** ninguno — sin DB, sin migraciones, sin token de entrega. No comparte el namespace efímero, backend, root, puerto ni pane reclamados por `S4.7`.

**Ruta:** `design-tasks`.

**Resultado:** un comando validado se traduce en una **directiva `send`** hacia el agente nombrado, y los verbos quedan tipeables en `bin/torre`.

### Por qué el ejecutor y la superficie son una sola Sesión

Por la regla de consumidor real que fija la Fase 4 del plan de depuración: **al cerrar, un módulo tiene que tener al menos un llamador en el producto, fuera de `test/`.** Un ejecutor sin superficie no tiene consumidor y reproduciría exactamente la brecha que este trabajo viene a cerrar. Van juntos o no van.

### Decisiones

- `derivable` — **qué hace el ejecutor con un comando validado.** **Criterio:** emite una directiva por `core.send({ to, text })` hacia el agente que el validador ya resolvió, y nada más. No escribe la fila del agente, no toca locks, no abre una segunda ruta de autoridad. **Autoridad:** [decisión 61](../decision-register.md). **Falsificable:** cualquier ruta en la que el ejecutor mute estado ajeno.
- `derivable` — **qué promete un comando.** **Criterio:** «le pedí que pare», no «garantizo que paró». **Autoridad:** decisión 61, que lo fundamenta en que el agente ya se autolimita bajo gentle-ai. **Falsificable:** un comando que reporte éxito afirmando una detención que no probó.
- `derivable` — **qué verbos expone la superficie.** **Criterio:** exactamente los de `COMMAND_VOCABULARY`, ni uno más. **Autoridad:** [decisión 58](../decision-register.md). **Falsificable:** un verbo tipeable que no esté en el vocabulario, o uno del vocabulario sin superficie al cerrar.
- `derivable` — **qué pasa con los dos verbos `R2`.** **Criterio:** `validateProposal` ya devuelve `CV_CONFIRMATION_REQUIRED` con la lista de evidencia y un TTL; la superficie los presenta y consume la confirmación por `validateConfirmation`. No se inventa un segundo camino de confirmación. **Falsificable:** un `CV_MERGE_MAIN` o `CV_DB_PUSH` ejecutado sin pasar por la confirmación del validador.

### Criterios de aceptación — todos deben pasar para cerrar

- [ ] Cada verbo de `COMMAND_VOCABULARY` tiene ejecutor y superficie tipeable, o queda declarado fuera de alcance con razón registrada
- [ ] El ejecutor sólo emite directivas por `core.send`; el diff no contiene ninguna escritura sobre la fila de otro agente
- [ ] Los dos verbos `R2` no se ejecutan sin la confirmación que `console/validate.mjs` exige, con su evidencia y su TTL
- [ ] Un verbo desconocido, un agente inexistente o un estado ilegal fallan con el código que el validador ya define, sin ruta alternativa
- [ ] `test/console-executor.test.mjs` queda en **cero pendientes** — cada verbo ejecutado sale de la lista y el archivo se borra al llegar a trece
- [ ] `bun test` no introduce fallos nuevos sobre la línea base
- [ ] El diff no toca ninguna ruta del `Prohibido`

**Módulos y Tareas:** pendientes de enumerar. Es trabajo de `planificador-granular`, no una decisión.

**Forecast:** sin medir. La auditoría de P8 no estimó el ejecutor y **no se inventa una cifra**; se mide al elaborar la Sesión.

## Qué queda fuera de este Plan

- **La superficie remota.** No existe ni hace falta: Moshi da la máquina entera en el teléfono ([decisión 57](../decision-register.md)).
- **Cerrar o matar un agente.** `CV_STOP` y `CV_KILL` no están en el vocabulario y no se agregan (decisión 61); se hace a mano.
- **Garantizar la detención.** El agente ya se autolimita bajo gentle-ai; agregar la garantía sería reimplementar el stack ([decisión 59](../decision-register.md)).
