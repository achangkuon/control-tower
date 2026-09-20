# S143 — Motor procedural Chanks: los siete controles, sin efectos

## Objetivo

Un núcleo verificable que, dados autoridad y evidencia, **permita o bloquee** cada una de las
siete transiciones del método Chanks — y que no ejecute ninguno de sus efectos. Decide; no
escribe, no toca Git, no lanza workers y no publica.

## Problema

Hoy los siete controles viven como prosa en las skills. Una instrucción que un agente puede
leer mal, saltear o reinterpretar no es un control: es una sugerencia. No hay un solo lugar
donde un caso permitido y un caso rechazado se puedan probar.

## Por qué

Es la primera Sesión de `metodo-v1-controles-prioritarios`, y S144 y S146 dependen de ella.
S144 demuestra el control **efectivo** en Pi, y S146 conecta el paralelo por archivos que
entregó S145. Sin este núcleo, las dos siguientes no tienen qué gobernar.

## Alcance autorizado

Exactamente los dos archivos declarados en `openspec/plan.yaml`, bloque S143:

- `agent-workflows/chanks/controls.mjs` *(nuevo)*
- `agent-workflows/tests/chanks/controls.test.mjs` *(nuevo)*

Ambos son terreno nuevo: `agent-workflows/chanks/` no existe todavía. Este documento vive en
`odd/tasks/`, Zona Método por `openspec/plan.yaml:49`, siguiendo el precedente de S145.
Cualquier otro archivo exige aprobación humana y compatibilidad fresca antes de escribir.

## Los siete controles

| # | Control | Transición que gobierna |
|---|---|---|
| 1 | `alcanceAprobado` | No se planifica sin alcance aprobado |
| 2 | `deltaValidado` | No se registra sin el delta exacto validado |
| 3 | `admisionHumana` | No se arranca sin admisión humana y Radar fresco |
| 4 | `mutacionPermitida` | No se muta fuera de los archivos y recursos permitidos |
| 5 | `resultadoGenuino` | No se consume un resultado técnico que no sea genuino y actual |
| 6 | `entregaAutorizada` | No se entrega sin autorización del candidato exacto |
| 7 | `cierreComprobado` | No se cierra sin publicación comprobada, registro y documentación |

La **ruta** se valida dentro del control 3, en la admisión existente. No hay un octavo control.

## Restricciones

- **El núcleo no tiene efectos.** No escribe archivos, no modifica Git, no lanza workers y no
  publica. Es una condición verificable, no una intención: el módulo no importa `node:fs`,
  `node:child_process` ni nada equivalente, y hay un test que lo comprueba leyendo la fuente.
- **Las pruebas verifican decisiones procedurales.** No se presentan como demostración de que
  Pi impide los efectos — eso es S144, y confundirlo es exactamente lo que la decisión
  estructurada descarta.
- **Autoridad y evidencia quedan ligadas** a repositorio, Sesión y candidato. Una base
  desactualizada o evidencia de otro trabajo se rechaza.
- **Una afirmación del agente no fabrica aprobación humana**, y una huella de archivos tampoco.
- **Radar conserva el cálculo de estados** y `openspec/plan.yaml` la autoridad editable. El
  núcleo no reimplementa el cálculo ni crea otro registro de estados, caché ni almacenamiento.
- **Chanks valida, no ejecuta.** No crea otro ejecutor, almacenamiento, evaluador, API de
  recibos ni revisión por Módulo. Gentle AI conserva implementación, comprobaciones técnicas y
  su registro subordinado de continuidad.
- **Desconocido, indisponible, vacío o declinado nunca es PASS.** Y una declinación de revisión
  respeta el camino alternativo del proveedor, sin inventar un bloqueo incondicional.
- **Permiso de publicación ≠ evidencia de publicación efectiva** del candidato exacto. Una
  publicación lograda con registro fallido impide declarar el cierre, y no dispara otra
  publicación ni una reversión automática.
- El diff queda en la Zona Método, separado del router y del bundle Tower.

## Modo TDD

Estricto. Runner: `bun test` desde la raíz (`package.json` → `scripts.test`). El archivo nuevo
`agent-workflows/tests/chanks/controls.test.mjs` lo levanta `bun test` por convención de nombre.
Baseline al admitir: **1248 pass / 0 fail**, HEAD `0b02b9c`. RED observado antes de cada tarea.

## Tamaño del lote

Estimado por encima de la referencia de 400 líneas. A diferencia de S145, acá **no** hay
excepción concedida, así que la entrega se parte en lotes revisables por tarea. Si el corte
resulta artificial lo digo y pregunto, en vez de partir por partir.

## Tareas

- [x] **T1 — El vínculo compartido.** Repositorio, Sesión, candidato y base. Todo control lo
      exige y lo compara; una base desactualizada o evidencia de otro trabajo se rechaza antes
      de mirar nada más. Incluye el test de pureza del módulo.

- [x] **T2 — Controles 1 y 2.** `alcanceAprobado` y `deltaValidado`. Casos permitidos y
      rechazados, incluida la afirmación del agente que no fabrica aprobación.

- [x] **T3 — Control 3.** `admisionHumana`: admisión humana con Radar fresco, con la ruta
      validada adentro y sin octavo control.

- [x] **T4 — Control 4.** `mutacionPermitida`: archivos exactos y recursos declarados.

- [x] **T5 — Control 5.** `resultadoGenuino`: identidad, procedencia, actualidad y cobertura.
      Desconocido/indisponible/vacío/declinado nunca es PASS; la declinación respeta el camino
      alternativo del proveedor.

- [x] **T6 — Controles 6 y 7.** `entregaAutorizada` y `cierreComprobado`, con la distinción
      entre permiso y evidencia de publicación efectiva, y el caso de publicación lograda con
      registro fallido.

## Progreso

- **2026-09-20** — Sesión admitida. HEAD `0b02b9c`, árbol limpio, doble captura de
  `radar status --json` (`3971894b…`) y `radar sesion S143` (`5bc6c210…`) con digests
  idénticos. Sin Cimientos ni Recurso, así que no hay nada que reservar. Documento creado
  antes de la primera escritura de código.
- **2026-09-20 · T1–T6 completas.** RED observado en cada una antes de implementar. 95 tests
  nuevos en `agent-workflows/tests/chanks/controls.test.mjs`; suite completa **1343 pass /
  0 fail** en 123s, contra un baseline de 1248. `agent-workflows/chanks/` es nuevo.
  Tamaño: 384 líneas de módulo + 695 de test = **1079**, por encima de la referencia de 400.

## Decisiones tomadas durante la ejecución

- **La pureza se comprueba, no se promete.** Hay un test que lee la fuente del módulo y falla
  si aparece `node:fs`, `node:child_process`, `fetch(`, `spawn(`, `Bun.write` y compañía. Un
  motor de decisión que puede llegar al disco está a un refactor de ejecutar el efecto que
  existía para frenar.
- **El vínculo nombra todos los campos que fallan, no el primero.** Arreglarlos de a uno por
  viaje enseña menos que la evidencia que ya estaba sobre la mesa.
- **Una base desactualizada tiene su propio texto**, distinto de «evidencia de otro trabajo».
  Son dos errores distintos y se arreglan distinto.
- **La declinación de revisión devuelve `permitido: true` con `detalle: ["declinado"]`** y un
  motivo que dice explícitamente que no es un PASS. Leerla como fallo inventa un bloqueo
  incondicional que el proveedor nunca pidió; leerla como éxito es justo la fabricación que el
  control 5 existe para frenar.
- **La superficie exportada tiene su propio test.** Es donde la promesa de «no crear otro
  ejecutor, almacenamiento, evaluador ni API de recibos» deja de cumplirse en silencio.
- **Un test mío estaba mal escrito, no el código.** El regex de «no republica ni revierte» se
  olvidó del «se» reflexivo. Corregí el regex; el mensaje ya decía lo que correspondía.

## Próximo paso

Decidir el corte del lote de revisión y entregar.
