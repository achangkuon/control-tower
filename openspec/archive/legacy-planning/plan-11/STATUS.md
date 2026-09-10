# Plan 11 — Interfaz de operador

**Propósito:** que el maintainer pueda darle una orden a la Torre y ver su respuesta, con las garantías que el vocabulario de comandos ya declara.

**Estado:** ✅ COMPLETO
**Avance:** 100% (1/1 S)

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

## El hueco técnico que S11.1 cerró

La brecha medida por la [decisión 60](../decision-register.md) y corregida por la [61](../decision-register.md) quedó cerrada así:

- **`console/vocabulary.mjs`** conserva los trece comandos, sus riesgos, estados legales, argumentos y evidencia exigida.
- **`console/validate.mjs`** valida el destino inmutable sólo para verbos dirigidos a agentes; `CV_STATUS` permanece como lectura local de toda la Torre.
- **`console/executor.mjs`** traduce cada comando dirigido validado en una sola directiva por el canal existente, sin re-resolver el agente ni escribir su fila.
- **`bin/torre`** expone exactamente el vocabulario, incluidos los dos verbos `R2` con la confirmación ya contratada por el validador.

`test/console-executor.test.mjs` queda como cobertura ejecutable con **cero pendientes**. La verificación integral terminó en **884 pass · 0 fail · 5.068 aserciones · 69 archivos**.

---

## Sesión 11.1 — Ejecutor de comandos y superficie tipeable

**Estado:** ✅ COMPLETO

**Depende de:** nada. El vocabulario, el validador y el canal `send`/`receive` ya existen y ya se instalan.

**Área:** `console/executor.mjs`, `console/validate.mjs`, `bin/torre`, `scripts/payload-closure.mjs`, `install/runtime-payload.mjs` generado, `test/console-executor.test.mjs`, `test/console/**`, `test/install/payload-closure.test.mjs`, `test/install/runtime-payload.test.mjs`.

**Prohibido:** `core.mjs`, `console/vocabulary.mjs`, `main-store/**`, `mcp.mjs`, `hosts/**` y todo `install/**` salvo la excepción exacta `install/runtime-payload.mjs` generado. El ejecutor **consume** el vocabulario y el validador; no los redefine ni amplía el vocabulario.

**Recurso:** ninguno — sin DB, sin migraciones, sin token de entrega. No comparte el namespace efímero, backend, root, puerto ni pane reclamados por `S4.7`.

**Ruta:** `design-tasks`.

**Resultado:** cada comando dirigido a un agente y validado emite una sola **directiva `send`** hacia el `target_agent` inmutable; `CV_STATUS` es la única lectura local de toda la Torre y no requiere destino ni llama `core.send`. Los trece verbos quedan tipeables en `bin/torre`.

### Por qué el ejecutor y la superficie son una sola Sesión

Por la regla de consumidor real que fija la Fase 4 del plan de depuración: **al cerrar, un módulo tiene que tener al menos un llamador en el producto, fuera de `test/`.** Un ejecutor sin superficie no tiene consumidor y reproduciría exactamente la brecha que este trabajo viene a cerrar. Van juntos o no van.

### Decisiones

- `escala` resuelta — **semántica de destino del ejecutor.** `CV_STATUS` es local a la Torre: no llama `core.send` ni requiere agente destino. Sólo los verbos dirigidos a agentes consumen el `target_agent` inmutable validado, sin que el ejecutor lo re-resuelva ni lo infiera. **Autoridad:** [decisión 69](../decision-register.md), Engram 9489/9490. **Clase:** contrato visible del producto. **Contaminaba:** `M11.1.1`.
- `escala` resuelta — **expansión mínima del payload instalable.** Se autorizan exactamente `scripts/payload-closure.mjs`, `install/runtime-payload.mjs`, `test/install/payload-closure.test.mjs` y `test/install/runtime-payload.test.mjs`; las raíces agregadas son sólo ejecutor y validador, y el vocabulario llega transitivamente. **Autoridad:** [decisión 70](../decision-register.md), Engram 9497/9498. **Clase:** expansión de alcance; contrato visible del producto. **Contaminaba:** `M11.1.2`.
- `derivable` — **qué promete un comando.** **Criterio:** «le pedí que pare», no «garantizo que paró». **Autoridad:** [decisión 61](../decision-register.md). **Falsificable:** un comando que reporte éxito afirmando una detención que no probó.
- `derivable` — **qué verbos expone la superficie.** **Criterio:** exactamente los de `COMMAND_VOCABULARY`, ni uno más. **Autoridad:** [decisión 58](../decision-register.md). **Falsificable:** un verbo tipeable que no esté en el vocabulario, o uno del vocabulario sin superficie al cerrar.
- `derivable` — **qué pasa con los dos verbos `R2`.** **Criterio:** `validateProposal` devuelve `CV_CONFIRMATION_REQUIRED` con la lista de evidencia y un TTL; la superficie presenta y consume la confirmación por `validateConfirmation`. **Falsificable:** un `CV_MERGE_MAIN` o `CV_DB_PUSH` ejecutado sin pasar por la confirmación del validador.

### Criterios de aceptación — verificados en el candidato integral

- [x] Cada verbo de `COMMAND_VOCABULARY` tiene ejecutor y superficie tipeable, o queda declarado fuera de alcance con razón registrada
- [x] Los verbos dirigidos sólo emiten una directiva por `core.send`; `CV_STATUS` permanece local y el diff no escribe la fila de otro agente
- [x] Los dos verbos `R2` no se ejecutan sin la confirmación que `console/validate.mjs` exige, con su evidencia y su TTL
- [x] Un verbo desconocido, un agente inexistente o un estado ilegal fallan con el código que el validador ya define, sin ruta alternativa
- [x] `test/console-executor.test.mjs` queda en cero pendientes y se conserva como cobertura ejecutable de regresión
- [x] La suite completa verifica **884 pass / 0 fail / 5.068 aserciones / 69 archivos**
- [x] El diff respeta `Área`, `Prohibido` y las excepciones exactas autorizadas por las decisiones 69–70

### Módulo M11.1.1 — Ejecutor de directivas validadas · ✅ COMPLETO

- **Tarea T11.1.1.1** — Traducir un comando de agente validado en exactamente una llamada a `core.send`. · ✅ COMPLETO
- **Tarea T11.1.1.2** — Mantener `CV_STATUS` local y consumir `target_agent` confiable sólo para verbos dirigidos a agentes. · ✅ COMPLETO
- **Tarea T11.1.1.3** — Cerrar las regresiones del vocabulario entre ejecutor y validador. · ✅ COMPLETO

### Módulo M11.1.2 — Superficie tipeable y payload instalable · ✅ COMPLETO

- **Tarea T11.1.2.1** — Exponer el vocabulario por `bin/torre`, incluidos los verbos `R2`. · ✅ COMPLETO
- **Tarea T11.1.2.2** — Aplicar la expansión serializada mínima del payload instalado. · ✅ COMPLETO
- **Tarea T11.1.2.3** — Cerrar las regresiones de CLI/payload y ejecutar la verificación completa. · ✅ COMPLETO

**Evidencia de implementación:** commits `8d86bf6` y `2dbb714`; suite final **884 pass / 0 fail / 5.068 aserciones / 69 archivos**. Autoridades de implementación y alcance: decisiones 69–70 y Engram 9489/9490/9497/9498.

**Cierre documental atómico:** esta reconciliación OpenSpec integra el candidato local posterior a `2dbb714`; la actualización no destructiva de Notion se ejecuta después de verificar la publicación directa de la misma cadena. El estado ✅ COMPLETO describe ese candidato conjunto y no afirma que el paso remoto ya haya ocurrido.

## Qué queda fuera de este Plan

- **La superficie remota.** No existe ni hace falta: Moshi da la máquina entera en el teléfono ([decisión 57](../decision-register.md)).
- **Cerrar o matar un agente.** `CV_STOP` y `CV_KILL` no están en el vocabulario y no se agregan (decisión 61); se hace a mano.
- **Garantizar la detención.** El agente ya se autolimita bajo gentle-ai; agregar la garantía sería reimplementar el stack ([decisión 59](../decision-register.md)).
