# S146 — Intervenciones de Cimientos y paralelo por archivos

## Objetivo

Que el método manual coordine dos cosas que hasta ahora vivían separadas: el **paralelo por
archivos** que S145 hizo legible, y las **intervenciones sobre Cimientos** compartidos — con
los controles de S143/S144 gobernando los efectos y la Torre apagada.

## Problema

S145 explica qué combinaciones *podrían* trabajarse a la vez. S143 y S144 hacen que un «no»
impida de verdad. Pero nadie coordina el caso difícil: dos Sesiones de la misma Zona que
necesitan tocar el **mismo archivo** de Cimientos.

Hoy eso se resuelve vetando a las dos, que es exactamente lo que el contrato prohíbe: un
Cimiento compartido es condición de intervención coordinada, no un veto global.

## Por qué

Es la tercera de `metodo-v1-controles-prioritarios` y la que le da uso real a `radar roadmap`.
Depende de S144 y S145, las dos ya entregadas.

## Alcance autorizado

Exactamente los seis archivos declarados en `openspec/plan.yaml`, bloque S146:

- `agent-workflows/chanks/interventions.mjs` *(nuevo)*
- `agent-workflows/chanks/pi-controls.mjs`
- `agent-workflows/tests/chanks/interventions.test.mjs` *(nuevo)*
- `agent-workflows/tests/chanks/pi-controls.test.mjs`
- `agent-workflows/skills/chanks-3-coordinador-manual/SKILL.md`
- `agent-workflows/tests/test_coordinador_manual.py`

## Recurso

El mismo de S144. Emilio confirmó el 2026-09-20 que no hay sesiones de Pi abiertas; esa
confirmación se lleva adelante dentro de la misma tanda de trabajo, sin que nada haya cambiado.

## El protocolo, en una línea

**Todo o nada.** Un worker pide el conjunto **completo** de Cimientos que necesita, ligado a su
trabajo y a su base. Main lo concede entero o no lo concede.

Esa es la pieza que evita el abrazo mortal: si se pudieran acumular concesiones parciales, dos
workers terminarían cada uno con la mitad de lo que el otro necesita, esperándose para siempre.
No hay gestor de locks acá; hay una regla de adquisición que hace imposible la espera circular.

## Restricciones

- **Sesiones de la misma Zona avanzan en archivos propios** sólo con alcance autorizado y
  huellas completas, vigentes y disjuntas. Una huella desconocida **no** habilita paralelo.
- **Un Cimiento compartido exige intervención coordinada** sobre ese archivo, nunca el veto
  global de ambas Sesiones.
- **Sin concesiones parciales acumuladas** ni ampliación silenciosa de un conjunto.
- **Cada intervención usa la base integrada completa vigente.** No se sustituye copiando un
  Cimiento suelto.
- **La liberación ocurre sólo tras integración confirmada**, nunca por terminar la edición
  local ni por silencio del worker.
- **Conflicto, cambio de alcance o base, desconexión o evidencia faltante detienen** la
  intervención afectada y preservan trabajo y evidencia. Cero reintentos, remapeos, permisos,
  liberaciones y reanudaciones automáticos.
- **Main coordina e integra; no juzga técnica.** No inspecciona para emitir otro juicio, no
  corrige código y no repite las pruebas del worker.
- **Se consumen S143 y S144 sin duplicarlos** ni cambiar sus dependencias.
- **No se crea** otro estado de planificación, cola persistente, gestor de locks artificial,
  almacenamiento de continuidad, API de recibos ni ejecutor técnico. La Torre queda apagada.
- **Los casos rechazados demuestran ausencia del efecto.** Mensajes y pruebas de cadenas de
  texto no son esa evidencia.

## Modo TDD

Estricto. `bun test` para los módulos, `unittest` para el test de la skill. Baseline al
admitir: **1386 pass / 0 fail**, HEAD `174a2d1`. RED antes de cada tarea.

## Tareas

- [x] **T1 — Paralelo por archivos.** Consumir la evidencia de S145: completa, vigente y
      disjunta habilita; desconocida no. Compartir Zona no es conflicto.

- [x] **T2 — El conjunto coherente completo.** Todo o nada, sin solapamiento sobre el mismo
      archivo, sin concesiones parciales y sin ampliación silenciosa.

- [x] **T3 — Ligado al trabajo y a la base.** Base desactualizada o cambio de alcance detienen
      sin conceder.

- [x] **T4 — Liberar sólo tras integración confirmada.** Ni por edición terminada ni por
      silencio.

- [x] **T5 — Las detenciones preservan.** Conflicto, desconexión y evidencia faltante paran la
      intervención afectada sin disparar nada automático.

- [x] **T6 — Demostración en entorno Pi aislado.** Reusar el confinamiento de S144 para probar
      ausencia del efecto en los casos rechazados.

- [x] **T7 — La skill del coordinador.** Documentar el protocolo, con su prueba en
      `test_coordinador_manual.py`.

## Progreso

- **2026-09-20** — Sesión admitida. HEAD `174a2d1`, árbol limpio, doble captura de
  `radar status --json` (`931233e5…`) y `radar sesion S146` (`2b2e05d7…`) con digests
  idénticos.
- **2026-09-20 · T1–T7 completas.** RED observado en cada una. 37 tests nuevos del protocolo
  más 3 de regresión del confinamiento, y 9 de la skill. Suite bun **1423 pass / 0 fail**
  contra 1386 de baseline; suites Python **137 OK**.
  Tamaño: 551 líneas nuevas más ~130 modificadas.

## Decisiones tomadas durante la ejecución

- **Un defecto real de S144, encontrado por un test de S146.** El cuarto montaba `--tmpfs /tmp`.
  Eso hacía que una escritura prohibida **bajo `/tmp`** reportara éxito y se perdiera en un
  sistema de archivos descartable: el archivo del host quedaba intacto —el efecto estaba
  ausente— pero el comando salía con 0 y el worker creía haber escrito. Un éxito falso y
  silencioso es peor que un rechazo, porque nada aguas abajo se entera de parar.
  Corregido: `/tmp` queda sólo-lectura como todo lo demás y falla ruidosamente, y el espacio
  temporal real vive en `/var/tmp` con `TMPDIR` apuntado ahí. Tres tests de regresión nuevos
  en `pi-controls.test.mjs`.
- **La detención conserva el conjunto concedido.** Liberar al detener le entregaría al
  siguiente worker un archivo compartido a medio escribir, que es justo el daño que el
  protocolo evita. El precio es que hace falta un humano para resolverlo, y está aceptado.
- **Los motivos de parada son un conjunto cerrado.** Una parada congela un archivo compartido
  hasta que alguien actúe: demasiado caro para dispararlo con «me parece».
- **La negativa es una ausencia, no un mensaje.** `escribiblesPara` sólo incluye los Cimientos
  efectivamente concedidos, nunca los pedidos. Una Sesión rechazada no tiene puerta a ese
  archivo, así que la escritura no ocurre —tampoco desde un proceso derivado— y eso se prueba
  ejecutando el confinamiento, no leyendo un texto.
- **El test de la skill no pretende ser evidencia de comportamiento.** Afirma que las reglas
  están escritas; que funcionan lo prueba `interventions.test.mjs`. El Encargo rechaza
  explícitamente las pruebas de cadenas de texto como evidencia del efecto.

## Próximo paso

Preguntar el corte del lote y entregar.
