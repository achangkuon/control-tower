# S145 — `radar roadmap`, la vista humana de las alternativas

## Objetivo

Dar a Radar un comando `roadmap` que explique, en prosa determinista, qué Sesiones `LISTO`
existen hoy, qué combinaciones de ellas son potencialmente compatibles por archivos, bajo
qué condiciones, y qué pasaría en escenarios hipotéticos — sin que ese reporte autorice
ejecución, reserve capacidad ni se convierta en una segunda fuente de verdad.

## Problema

`radar status` responde «qué sigue» pero no «por qué estas y no otras», ni «cuáles de estas
podrían correr juntas». Hoy la única pista de paralelo es la línea `Asientos:`, que reporta
Zonas y no Sesiones, y que por diseño reserva la primera `LISTO` de cada Zona sin mirar los
archivos exactos que esa Sesión declara. Una persona que quiere decidir qué despachar tiene
que leer el YAML a mano.

## Por qué

El Encargo de S145 lo fija: la vista existe para que la evidencia canónica sea legible por
una persona, no para crear una autoridad nueva. Es la primera prioridad de Método V1
(`metodo-v1-radar-prioritario`) y habilita a S146, que es quien integra y activa las reglas
de paralelo de verdad.

## Alcance autorizado

Exactamente los archivos declarados en `openspec/plan.yaml`, bloque S145:

- `agent-workflows/tools/radar/main.go`
- `agent-workflows/tools/radar/snapshot.go`
- `agent-workflows/tools/radar/state.go`
- `agent-workflows/tools/radar/roadmap.go` *(nuevo)*
- `agent-workflows/tools/radar/main_test.go`
- `agent-workflows/tools/radar/snapshot_test.go`
- `agent-workflows/tools/radar/state_test.go`
- `agent-workflows/tools/radar/roadmap_test.go` *(nuevo)*
- `agent-workflows/tools/radar/README.md`

Este documento de continuidad ODD vive en `odd/tasks/`, que pertenece a la Zona Método como
evidencia técnica subordinada (`openspec/plan.yaml:49`). Ninguna Sesión hermana lo declara
en `archivos:`; se sigue ese precedente. Cualquier otro archivo exige aprobación humana y
recalcular compatibilidad antes de escribir.

## Restricciones

- **Una sola proyección máquina.** `radar status --json` sigue siendo la única fuente JSON.
  `radar roadmap` emite texto para personas y no imprime JSON.
- **Ningún cálculo de estados nuevo.** La vista consume `EstadosAt`, `ColaPorZonaAt`,
  `AvanceAt`, `AsientosAt` y `PrioridadActivaAt`. No reimplementa ninguna.
- **Los siete estados, los asientos y la admisión no cambian de significado.** En
  particular, `AsientosAt` conserva su semántica de Zona; la compatibilidad por archivos es
  una *previsión* separada, no una redefinición del asiento.
- **Romper `radar.snapshot/v1` exige decisión humana antes de apply.** Agregar campos es
  crecimiento permitido y así está documentado en `snapshot.go` (`PrioridadJSON`); quitar o
  cambiar el significado de un campo existente, no.
- **El reporte no adquiere nada.** No reserva, no asigna workers, no concede acceso y no
  supone que la coordinación futura ya esté instalada.
- **Una declaración incompleta nunca se lee como vacía o segura.** Una Sesión sin `archivos`
  declarados se reporta como indeterminada, jamás como compatible.
- Determinismo: misma entrada, mismos bytes de salida. Orden estable por Zona y por ID.

## Modo TDD

Estricto — declarado en las instrucciones globales. Runner: `go test ./...` desde
`agent-workflows/tools/radar`. Baseline al admitir la Sesión: **verde**, 5.19s, HEAD `8c5abfb`.
Cada tarea exige RED observado antes de implementar.

## Criterios de aceptación

Derivados del `resultado_comportamiento` del Encargo:

1. La vista enumera **todas** las alternativas `LISTO` actuales en orden de Zona.
2. Muestra conjuntos explícitos de Sesiones, sus exclusiones y las condiciones de
   compatibilidad potencial por archivos.
3. Distingue la previsión del permiso de ejecución vigente.
4. Una Zona o un Cimiento compartido **no** vetan trabajo propio disjunto.
5. Cada conclusión por archivos usa los `archivos` exactos de la Sesión, más Cimientos,
   recursos, dependencias y base vigentes.
6. Un Cimiento compartido aparece con la condición explícita de intervención coordinada.
7. Un recurso exclusivo incompatible excluye la combinación.
8. Los hipotéticos distinguen «dependencia satisfecha» de «realmente `LISTO`» según todos
   los criterios y la prioridad aplicable.
9. Existe el caso demostrativo: resolver la dependencia de S123 en S122 **no** vuelve
   ejecutable V2 mientras V2 no sea la prioridad activa.
10. S122 conserva resultado, criterios, umbral de horizonte y orden relativo.
11. `Main` no necesita parsear texto humano: los hechos que consume salen del snapshot.

## Tareas

- [x] **T1 — Motor de alternativas y compatibilidad por archivos.**
      En `roadmap.go`, una función pura sobre el plan y los estados ya calculados que
      devuelva, por Zona, las Sesiones `LISTO` y, para cada par, un veredicto:
      compatible / solapa archivos / Cimiento compartido con condición / Recurso exclusivo
      incompatible / indeterminado por declaración faltante.
      Cubre criterios 1, 2, 4, 5, 6, 7. Tests en `roadmap_test.go`.

- [x] **T2 — Escenarios hipotéticos.**
      Misma función pura, extendida: dada una dependencia que se diera por satisfecha, qué
      Sesiones pasarían a `LISTO` de verdad según todos los criterios y la prioridad activa.
      Incluye el caso S123/S122 como test nombrado. Cubre criterios 8, 9, 10.

- [x] **T3 — Comando `radar roadmap` y su renderizado humano.**
      Wiring en `main.go`, texto de `uso`, y la salida en prosa determinista, con la
      distinción explícita entre previsión y permiso. Cubre criterio 3. Tests en
      `main_test.go` y `roadmap_test.go`.

- [x] **T4 — Exposición aditiva en `radar.snapshot/v1`.** (desbloqueada por Emilio el 2026-09-20)
      Los mismos hechos estructurados, agregados al snapshot sin quitar ni resignificar
      ningún campo existente. Cubre criterio 11. Tests en `snapshot_test.go`.

- [x] **T5 — README.**
      Documentar el comando, qué garantiza y qué explícitamente no autoriza.

- [x] **T6 — Mapeo a la skill `chanks-0-agente-soporte`.** (agregada por decisión de Emilio)
      El agente aprende de dónde salen los hechos de paralelo cuando alguien retoma trabajo.

## Progreso

- **2026-09-20** — Sesión admitida. HEAD `8c5abfb`, árbol limpio, digests de admisión
  dobles e idénticos, baseline de pruebas verde. Documento creado antes de la primera
  escritura de código. Ninguna tarea iniciada.
- **2026-09-20 · T1 completa.** RED observado: `go test ./...` falló a compilar con
  `undefined: Roadmap / Par / RoadmapAt / Compatible / SolapaArchivos / CimientoCompartido`.
  GREEN: `roadmap.go` implementa `RoadmapAt`, las cinco clases de compatibilidad y la
  precedencia. 10/10 tests nuevos pasan; suite completa `ok` en 7.4s; `gofmt -l` sin salida
  y `go vet ./...` limpio.
  Precedencia implementada, de más fuerte a más débil: recurso exclusivo → solape de
  archivos fuera de Cimientos → declaración faltante → Cimiento compartido → compatible.
  El recurso manda sobre lo indeterminado porque un conflicto probado no se reporta como
  duda. El Cimiento queda último entre las no-compatibles porque es condición, no choque.

- **2026-09-20 · T2 completa.** RED observado: `undefined: Escenario / Retenida /
  Roadmap.Escenarios`. GREEN: 6/6 tests nuevos, suite completa `ok` en 7.3s, `gofmt` y
  `go vet` limpios.
  Para no duplicar el cálculo de estados, `EstadosAt` se refactorizó a un cuerpo compartido
  `estadosAsumiendo(root, head, cerradas)`; el hipotético entra como parámetro, nunca como
  mutación, así que no puede filtrarse a lo que reportan los demás comandos. Hay un test
  explícito de que el plan y los estados reales quedan intactos.
  Sólo reciben escenario las Sesiones que efectivamente frenan a otra.

- **2026-09-20 · T3 completa.** RED observado: `undefined: cmdRoadmap`, y luego el gate de
  validación rechazando planes de prueba mínimos. GREEN: `cmdRoadmap` + `escribirRoadmap`
  (render puro, sin Git ni gate, para poder probar determinismo), comando cableado en
  `main.go` y documentado en `uso`. 7/7 tests nuevos; suite completa `ok` en 7.0s.
  REFACTOR: el render envuelve prosa a ancho fijo —fijo, no detectado, porque una vista
  cuyos bytes dependen de la ventana no es determinista— y lista los archivos uno por línea.
  Verificado contra el plan real: 1 alternativa (S145), 11 escenarios, y el caso
  demostrativo S122→S123 sale solo, con `S123 sigue en DIFERIDO`.

- **2026-09-20 · T4 BLOQUEADA.** RED observado y GREEN alcanzado en `snapshot.go` +
  `snapshot_test.go`, pero rompe `TestEncargoMantieneSnapshotV1YSmokeCLIMixto`
  (`agent-workflows/tools/radar/encargo_test.go:665`), que afirma `len(snapshot) != 8` y
  `len(fields) != 4` por Sesión: congela la forma exacta del snapshot y trata **cualquier**
  agregado como cambio de contrato. Eso contradice el comentario de `snapshot.go`
  (`PrioridadJSON`: «the v1 wire contract only grows»).
  `encargo_test.go` **no** está entre los archivos autorizados de S145, y el Encargo reserva
  a decisión humana «cualquier ruptura del contrato público de `radar.snapshot/v1`».
  Trabajo preservado como parche en el scratchpad de la sesión (`t4-snapshot.patch`, 241
  líneas); el árbol quedó verde y sin T4 aplicada.

- **2026-09-20 · Emilio desbloquea T4 y amplía el alcance.** Su razón cambia la lente: «estos
  comandos son para agentes. El usuario casi que no debería de usarlos». Con eso, el JSON es el
  camino primario y `radar roadmap` es el dibujo para cuando una persona necesita leerlo.
  Aprobó además mapearlo a la skill, y una excepción de tamaño para el lote de revisión.
  Registrado en `openspec/plan.yaml` S145: `archivos` suma `encargo_test.go` y
  `agent-workflows/skills/chanks-0-agente-soporte/SKILL.md`, con autoridad Engram 11353.

- **2026-09-20 · T4, T5 y T6 completas.** El snapshot suma `compatibilidad`, `escenarios` y, por
  Sesión, `archivos`/`cimientos`/`recurso`/`depende_de`, todos con `omitempty`.
  `encargo_test.go:665` pasó de contar claves (`len == 8`) a una lista blanca: quitar o renombrar
  sigue fallando, y agregar exige nombrar la clave nueva ahí. Eso conserva la protección real y
  deja de prohibir el crecimiento que `snapshot.go` documenta como permitido.
  La skill no necesitó aflojar su regla dura: ya autorizaba `radar status --json`, que es
  justamente por donde llegan los hechos nuevos.
  Verificado sobre el plan real: 11 escenarios en el JSON, S145 con sus 9 archivos, y el caso
  S122→S123 con `estado: DIFERIDO`. `radar check`: 0 errores, 28 avisos (27 de base + 1 por la
  cita Engram 11353 que agregué, de la misma clase preexistente «autoridad no verificable»).

## Decisiones tomadas durante la ejecución

- **`roadmap` lee el plan directo, no el snapshot.** Es el mismo binario y el mismo
  `*Plan`; consumir el JSON de sí mismo sería un rodeo. Lo que no hace es recalcular
  estados. Esto respeta «no otra fuente JSON ni otro cálculo de estados» sin forzar a que
  la vista dependa de campos que el snapshot todavía no expone.
- **El snapshot crece, no se rompe.** T4 agrega campos; si en algún momento hiciera falta
  cambiar el significado de uno existente, eso para y se pregunta.

## Próximo paso

Las seis tareas están completas y verificadas. Falta la entrega: commit directo a `master` y
push, según `AGENTS.md`. Pendiente de que Emilio la autorice. Después de entregar hay que
reinstalar `~/.local/bin/radar`, o el hook de pre-push rechaza.
