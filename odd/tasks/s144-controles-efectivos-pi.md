# S144 — Controles efectivos en Pi: el «no» que de verdad impide

## Objetivo

Demostrar, en el runtime real de Pi y con la Torre apagada, que cuando un control de S143
rechaza una operación **el efecto no ocurre** — incluidas las escrituras de procesos derivados.
No un aviso, no un cartel: el archivo queda intacto.

## Problema

S143 entregó controles que **deciden** bien. Decidir no es impedir. Un control que sólo informa
se saltea con cualquier vía alternativa, y ahí el método vuelve a ser una sugerencia.

Pi puede frenar una herramienta antes de que actúe (`ToolCallEventResult.block`, en
`@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:820`), pero su propia
documentación es explícita: *«Pi does not include a built-in sandbox… Real isolation needs to
come from the operating system or a virtualization/container boundary»*
(`docs/security.md`). Con `block` solo, un comando permitido puede lanzar un proceso que
escriba donde quiera.

## Por qué

Es la segunda de `metodo-v1-controles-prioritarios` y S146 depende de ella. La decisión
estructurada `seguridad-y-permisos` del Encargo lo fija: *«Se debe impedir el efecto indebido,
también cuando procede de órdenes o procesos derivados. Si no se puede controlar una operación,
se rechaza; no se rebaja la garantía a instrucciones o avisos.»*

## Alcance autorizado

Exactamente los cuatro archivos declarados en `openspec/plan.yaml`, bloque S144:

- `agent-workflows/chanks/pi-controls.mjs` *(nuevo)*
- `agent-workflows/tests/chanks/pi-controls.test.mjs` *(nuevo)*
- `agent-workflows/tools/install.py`
- `agent-workflows/tests/test_install.py`

El adaptador queda dentro de `agent-workflows/`, separado de `extensions/pi/**` y
`adapters/pi/**`, que pertenecen a S8.12. Verificado: ninguno de los dos usa hoy `tool_call`
ni `block`, así que no hay duplicación.

## Recurso

`runtime Pi aislado de ensayos Chanks Método V1; uso exclusivo a confirmar antes de ejecutar,
sin configuración global activa`.

**Confirmado por Emilio el 2026-09-20**: no hay sesiones de Pi abiertas. La confirmación
precede a cualquier efecto, porque declarar el Recurso no equivale a adquirirlo.

## Diseño aprobado antes de apply

El Encargo exige aprobación humana del diseño y sus permisos antes de implementar. Emilio
aprobó lo siguiente el 2026-09-20.

**Dos capas, cada una en lo suyo:**

1. **`tool_call` decide.** El adaptador consulta el núcleo de S143 y devuelve `block: true`
   cuando un control rechaza. Para escribir o editar un archivo esto alcanza solo: el adaptador
   ve la ruta exacta antes de que pase nada.
2. **El confinamiento impide.** Todo comando de shell se reescribe para correr dentro de un
   confinamiento del sistema operativo donde sólo los `archivos` autorizados de la Sesión son
   escribibles. El adaptador **no ejecuta nada**: muta el comando en el evento, que es lo que
   la API de Pi habilita (*«To modify arguments, mutate `event.input` in place instead»*).

**«Cuarto chico» — la decisión de permisos que Emilio eligió:**

| | |
|---|---|
| Escribible | exactamente los `archivos` declarados, más un directorio temporal de salidas |
| Sólo lectura | todo lo demás, incluido el historial de Git |
| Red | apagada |

**Límites declarados, no tapados:**

- Dentro del confinamiento no corren `git commit`, `git push` ni `bun install`. Los controles 6
  y 7 gobiernan la decisión, pero **la entrega real queda fuera del ensayo**. Afirmar cobertura
  de entrega sería inventarla.
- Pi auto-descubre extensiones sólo como `~/.pi/agent/extensions/*.ts` o `*/index.ts`. Por eso
  `pi-controls.mjs` no puede ser el archivo de extensión. `install.py` —que sí está
  autorizado— genera un shim `.ts` de pocas líneas que importa la lógica, para no ampliar
  alcance por un detalle de descubrimiento.

**Evidencia del mecanismo en el runtime real**, tomada el 2026-09-20 antes de diseñar:
`bwrap` 0.11.1 en `/usr/bin/bwrap`. Con `--ro-bind / /` más un `--bind` del directorio
permitido, la escritura directa fuera del alcance falla con `Read-only file system` y la
escritura desde un proceso derivado (`bash` → `python3`) falla con `OSError: [Errno 30]`. El
archivo testigo quedó intacto en ambos casos; dentro del alcance la escritura funciona.

## Restricciones

- **Una operación cuyos efectos no puedan controlarse se rechaza**, sin salida permisiva.
- **Los casos rechazados demuestran ausencia del efecto**, no un aviso. Un bloqueo del editor
  por sí solo no es esa prueba.
- **Las activaciones muestran exactamente `💪 Chanks`**, la acción real, el resultado permitido
  o bloqueado por separado, y contexto suficiente. Corresponden a transiciones significativas y
  no se duplican por cada llamada de herramienta.
- **Main manual no se etiqueta como `🗼 Torre`.** Implementación, pruebas y revisión de
  Gentle AI conservan su identidad nativa.
- **Una autorización no afirma ejecución, publicación ni cierre.** La marca visible no
  sustituye la comprobación de efectos.
- No se agrega otro ejecutor, almacenamiento, evaluador, API de recibos ni revisión por Módulo.
- No se adelantan dependencias de Torre V1 o V2 ni se reabre la recuperación aplazada.

## Modo TDD

Estricto. Runner: `bun test` desde la raíz para el adaptador; los tests de `install.py` son
Python. Baseline al admitir: **1343 pass / 0 fail**, HEAD `99d29a3`. RED antes de cada tarea.

## Tamaño del lote

747 líneas (617 nuevas + 130 modificadas), otra vez por encima de la referencia de 400.
Preguntado a Emilio antes de entregar: eligió **un solo commit con excepción de tamaño**, por
tercera vez, aunque acá había un corte natural y gratuito (adaptador / instalador). Queda
registrado como decisión suya.

## Tareas

- [x] **T1 — De un evento de Pi a una decisión.** Mapear la herramienta que se va a ejecutar al
      control que la gobierna, consultar el núcleo de S143 y traducir el resultado a
      `block` + `reason`.

- [x] **T2 — El mensaje visible.** Exactamente `💪 Chanks`, la acción real, permitido o
      bloqueado por separado, contexto suficiente; sólo en transiciones significativas y sin
      duplicarse por llamada de herramienta. Nunca `🗼 Torre`.

- [x] **T3 — Construir el cuarto chico.** Desde los `archivos` autorizados, el comando
      confinado. Sin ejecutar nada: el adaptador devuelve el comando reescrito.

- [x] **T4 — Lo no confinable se rechaza.** Sin salida permisiva alternativa.

- [x] **T5 — Demostración en el runtime real.** Ejecutar el comando confinado y probar la
      ausencia del efecto, incluido el proceso derivado. Es la tarea que distingue S144 de S143.

- [x] **T6 — `install.py` instala el shim.** Con su prueba en `test_install.py`.

## Progreso

- **2026-09-20** — Sesión admitida. HEAD `99d29a3`, árbol limpio, doble captura de
  `radar status --json` (`5c745f3d…`) y `radar sesion S144` (`58ed83dd…`) con digests
  idénticos. Recurso confirmado por Emilio. Diseño y permisos aprobados antes de apply.
- **2026-09-20 · T1–T6 completas.** RED observado en cada una. 43 tests nuevos del adaptador y
  6 de `install.py`. Suite completa **1386 pass / 0 fail** en 168s, contra 1343 de baseline;
  los de `install.py` corren aparte con `unittest`: **41/41**.
  Tamaño: 617 líneas nuevas más 130 modificadas = **747**, por encima de la referencia de 400.

## Lo que quedó demostrado, y lo que no

**Demostrado en el runtime real**, con `bwrap` ejecutándose de verdad dentro de la suite:
la escritura directa fuera del cuarto no ocurre, la escritura desde un **proceso derivado**
(`bash` → `python3`) tampoco, la escritura dentro del cuarto sí funciona, y la red está
apagada. El archivo testigo se comprueba después de cada intento; no alcanza con el código de
salida.

**No demostrado, y por eso se declara:**

- Que Pi **carga** el shim. Verifiqué que el shim se genera, que su import resuelve y que
  `gobernar` es una función — pero no levanté una sesión de Pi para verlo registrarse. Afirmar
  cobertura de eso sería inventarla.
- La **entrega** de punta a punta. Por diseño del cuarto chico no corren `git commit`,
  `git push` ni `bun install` adentro. Los controles 6 y 7 gobiernan la decisión; el efecto de
  publicar queda fuera del ensayo.

## Decisiones tomadas durante la ejecución

- **El adaptador no vuelve a decidir nada.** Cada veredicto y cada texto sale de
  `controls.mjs`. Una segunda implementación de una regla es una segunda respuesta, y las dos
  se separan mientras las dos parecen correctas.
- **Una herramienta desconocida se rechaza.** La rama por defecto niega. Es justo el caso que
  el Encargo nombra, y permitir por defecto es cómo una compuerta deja de serlo en silencio.
- **`aPi` devuelve `{}` cuando permite, no `block: false`.** Pi lee la ausencia de `block` como
  «adelante», y un objeto vacío no lo puede malinterpretar una versión futura que sólo mire si
  el campo está presente.
- **Una ruta autorizada que no existe hace el comando NO confinable.** Montar su directorio
  padre en su lugar volvería escribible a todos sus hermanos: un cuarto más grande que el
  aprobado. Se rechaza, sin salida permisiva.
- **El motivo del bloqueo lleva la evidencia exacta.** Llega al modelo; un bloqueo del que no
  puede aprender se convierte en un loop de reintentos.
- **Las activaciones guardan memoria en el closure, no en el módulo.** Dos sesiones compartiendo
  el registro se silenciarían mutuamente el primer aviso, que es el que más importa.
- **El shim lo genera `install.py`.** S144 no autoriza ningún `.ts`, y gastar una aprobación
  humana en un detalle de descubrimiento no compra nada. La ruta absoluta lo fija a este
  checkout: un import relativo resolvería contra el directorio del runtime y podría cargar otra
  copia del adaptador.
- **`_atomic_write` se parametrizó en vez de duplicarse.** Un archivo de instrucciones manual
  debe existir de antes —escribirlo donde nunca estuvo sería instalar una instrucción que nadie
  pidió—; un archivo generado es lo contrario. El llamador dice qué regla aplica.

## Próximo paso

Decidir el corte del lote y entregar. Después queda S146, que conecta el paralelo por archivos
de S145 con estos controles.
