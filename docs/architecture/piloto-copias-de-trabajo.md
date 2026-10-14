# Copias de trabajo por vuelo — diagnóstico (S220)

> **Estado:** informe de diagnóstico pedido por el maintainer el 2026-10-04 (Sesión S220). Decisiones D1–D4 resueltas por el maintainer el 2026-10-06. Nada está implementado.
>
> **Propósito:** responder, con evidencia y costo medido, qué falta decidir sobre cómo se crean, cómo quedan listas para trabajar y cómo se retiran las copias de trabajo que el piloto creará por vuelo.
>
> **Evidencia:** lectura de código y mediciones propias sobre `control-tower@4520543` en `master` (2026-10-06). Las mediciones se corrieron en una copia temporal bajo `/tmp`, creada y retirada sólo para medir.
>
> **Límite:** diagnóstico, no implementación. No modifica el diseño aprobado (P1–P14); si una decisión aprobada resulta insuficiente, se reporta como pendiente. No decide por el mantenedor: la sección 6 lista las decisiones con opciones, consecuencia y recomendación. La decisión sobre `chanks-0-jornada` sigue atada a V3 y sólo se cita.

## 1. Lo que ya está decidido

El diseño aprobado fija lo siguiente (`docs/architecture/piloto-automatico.md`):

- **Vuelo** = cadena de Sesiones que dependen una de otra, con su propia rama y copia de trabajo (tabla de términos; §6: «Cada vuelo tiene su rama y su copia de trabajo, por ejemplo `piloto/<fecha>/vuelo-S1`. Nunca escribe en la rama principal»).
- **P1**: `piloto` es herramienta determinista; los límites y reglas son de código (un agente no se los salta).
- **P4**: Radar propone vuelos y el usuario aprueba antes del despegue.
- **P8**: revisión en cascada base-arriba y subida única por vuelo.
- **P12**: V2 corre con una conversación orquestadora por corrida y un subagente por Sesión.
- **P14**: la conexión Radar/piloto/TUI; la TUI convoca, no mantiene estado.
- NOVEDAD · interrumpida conserva el trabajo «en la copia de trabajo de su vuelo» (§7); POR REVISAR se deduce de que el commit de la Sesión está en la rama del vuelo y no se subió.

Lo que **no** está definido en ningún lado: la preparación de la copia (dependencias, modos, índice), su ubicación, y su retiro. Eso es lo que este informe mide y propone decidir.

## 2. Cómo se crea hoy una copia y qué le falta para quedar lista

Creación: `git worktree add` (0,07 s medidos). Lo que falta después, medido sobre `master@4520543`:

| Necesidad | Costo medido | Evidencia |
|---|---|---|
| Dependencias Bun (`bun install`) | 1,52 s con caché de bun tibia | `package.json` raíz (deps `@opencode-ai/plugin`, `@opencode-ai/sdk`, `ajv`, `yaml`); `node_modules/` está gitignored (`.gitignore:1`) → por copia |
| Compilar Radar (`go build ./...`) | 0,94 s con GOCACHE compartido y tibio | `agent-workflows/tools/radar/go.mod`; `test:go` en `package.json`; GOCACHE es por usuario, compartido entre copias |
| Python | 0 s de preparación (stdlib `unittest`, sin requirements ni venv) | `package.json` (`test:python`); `find` sin `requirements*.txt` |
| **Modos de archivo** | **sin corrección: 14 fallos + 133 errores = 147 fallos falsos**; con umask 022 al crear la copia: 0 | ver sección 3 |
| Índice CodeGraph | propio de cada copia, untracked (`.gitignore:2` = `/.codegraph/`); no se inicializa solo | `.gitignore:2` |
| Suite Bun completa | corre tras `bun install` (los suites que importan `yaml`/`ajv` no cargan sin `node_modules`) | `odd/tasks/s218-comunicacion-agentes.md` |

**Costo total de una copia nueva lista** (cachés tibios): ~2,5 s más el índice CodeGraph si se pide.

## 3. Los modos de archivo: el costo real de ignorar el umask

Este repositorio exige modo 755 en sus ejecutables instalables: `agent-workflows/tools/install.py:798-799,827-828,1565-1566,1651-1652` rechazan cualquier otro modo; `install-radar.sh:114` instala con `install -m 0755`.

Git sólo guarda el bit de ejecutable: los archivos `100755` quedan, tras un checkout con umask 002, en modo **775** — y `install.py` exige exactamente 755. Eso reprodujo el incidente del 2026-10-04 (S218): la suite Python completa dio **14 fallos + 133 errores** en la copia fresca; tras `chmod 755` de los archivos `100755`, quedó 1 solo error (ver sección 4). Con `umask 022` en el momento del checkout, los modos salen correctos (755/644) **sin ningún chmod**: medido.

Consecuencia para el piloto: crear cada copia con `umask 022` es obligatorio; no hay que cambiar `install.py` ni el instalador.

## 4. Dónde puede vivir la copia (restricción descubierta)

`agent-workflows/tests/test_personal_pi_composition.py:16` busca el checkout hermano `pi-v2` recorriendo `ROOT.parents[1]` y `ROOT.parents[2]`. En `/tmp/s220-fresh-wt` eso es `IndexError` (el módulo no carga → el único error del post-fix). En la ubicación actual de copias del proyecto (`/home/<usuario>/projects/control-tower/Worktrees/<id>`, profundidad equivalente a `Main`), el test encuentra `pi-v2` y pasa.

Conclusión: las copias del piloto deben vivir **al mismo nivel que el checkout principal** (el convenio `Worktrees/<id>` vigente lo cumple); una copia en `/tmp` rompe la suite sin razón de fondo.

## 5. Gate de push, revisión y Radar desde una copia enlazada

- **Gate de push** (`.githooks/pre-push`): sólo actúa al subir `master` y exige HEAD limpio del checkout que empuja (sin diff, sin staged, sin untracked, ~L45-51). Desde la copia de un vuelo es irrelevante durante la corrida: el diseño ya decide que la corrida nunca pushea. En el aterrizaje, la subida ocurre por la política ordinaria del repo, normalmente desde el checkout principal. La fricción #152 (git exporta `GIT_DIR` al hook y Radar se arraiga mal en el chequeo del plan) sigue abierta y es independiente de las copias del piloto: no se corrige acá.
- **Radar desde copia** (`agent-workflows/tools/radar/`): lee el plan del filesystem de la copia (`main.go:208-221`, `plan.go:435`) y las marcas de despacho del **directorio común de Git**, compartidas entre copias (`etapa.go:95,205-210,267-275`, `state.go:29`). `radar check` hay que apuntarlo a la copia (`-C`), como ya hace el gate (`pre-push`, sección radar). Sin ajustes, Radar funciona por copia con visión del plan de esa copia y marcas compartidas — exactamente lo que el piloto necesita.
- **Aviso de revisión (Pi)**: no depende de la copia (vive en la sesión del agente); sin obstáculo detectado.

## 6. Decisiones que le corresponden al mantenedor *(todas resueltas el 2026-10-06)*

Cada una con opciones, consecuencia y recomendación. El delta exacto que estas decisiones le harían a S215 está en la sección 7.

### D1 — ¿Copia nueva por vuelo o pool reciclado? *(resuelta)*

- **Opción A — copia nueva por vuelo** (lo que el diseño actual implica): `piloto` crea la copia al despegar el vuelo y la retira al cerrar. Costo medido: ~2,5 s por vuelo más el índice CodeGraph si se pide. Consecuencia: aislamiento total entre vuelos, cero estado heredado, código más simple; el costo es despreciable frente a la duración de una Sesión.
- **Opción B — pool fijo reciclado** (el modelo que #139 describe para el despacho manual): unas pocas copias viven con dependencias instaladas y se les cambia de rama por vuelo. Costo medido del reciclado: checkout 0,05 s + `bun install` idempotente 0,009 s. Consecuencia: ahorra ~2,4 s por vuelo (irrelevante); a cambio arrastra estado (node_modules desalineado tras cambios de dependencias, `.codegraph` viejo, rama anterior presente) y añade al código la administración del pool. La fricción #139 nació de un coordinador que borró copias de un pool por seguir la regla contraria: el pool y las copias por vuelo son dos modelos de ownership, y mezclarlos es lo que produjo el accidente.
- **Recomendación: A.** El costo medido mata la razón económica del pool; la razón del pool (#139) era el costo de instalación de ese momento, y la aislación por vuelo es la que el diseño P8/P12 ya asume.

### D2 — ¿Dónde viven las copias? *(resuelta)*

- **Opción A — junto al checkout principal, bajo el directorio `Worktrees/` existente** (p. ej. `<proyecto>/Worktrees/piloto-<fecha>/vuelo-<id>`). Cumple la restricción de la sección 4 y el convenio vigente. Consecuencia: ninguna nueva.
- **Opción B — fuera del árbol del proyecto** (p. ej. `/tmp`): rompe `test_personal_pi_composition` y saca las copias de la vista del maintainer. Descartable.
- **Recomendación: A**, con nombre por corrida para poder retirar una corrida completa de un movimiento.

### D3 — ¿Quién retira la copia y la rama, cuándo, y qué se conserva? *(resuelta)*

- **Opción A — retiro determinista tras la revisión, NOVEDAD conserva todo**: `piloto` expone el retiro como comando (copia + rama) que el orquestador ejecuta por vuelo **sólo después** de que la revisión humana integró la porción aprobada; los vuelos con NOVEDAD · interrumpida conservan copia y rama intactas hasta que su revisión decida (el trabajo ya está en la rama del vuelo, pero la copia es la evidencia viva). Consecuencia: nada se borra antes de tiempo; el retiro es auditable porque es un comando del modelo determinista, no una acción de un agente.
- **Opción B — retiro automático al aterrizar**: ahorra disco pero pisa el requisito aprobado de que NOVEDAD conserve su trabajo en la copia.
- **Recomendación: A.** Encaja con P1 (reglas en código) y con la regla P9 de que apagar no borra estados.
- **Enmienda (2026-10-13, control-tower#169):** `git worktree remove` borra sin aviso los archivos ignorados por Git, y `git status --porcelain` no los muestra; así se perdió media generada en un vuelo. `piloto retirar` ahora lista los archivos ignorados de la copia que no son artefactos regenerables (`node_modules`, `.codegraph`, `__pycache__`, `.pytest_cache`) y se niega; sólo los descarta con `--descartar-ignorados`. Retirar el último vuelo de la corrida apaga el interruptor.

### D4 — Preparación de la copia: ¿qué incluye el despegue? *(resuelta)*

- **Opción A — mínimo medido**: `umask 022` + `git worktree add` + `bun install`. Go no necesita acción (GOCACHE compartido; `go build` al vuelo cuando una prueba lo pida). Python no necesita nada. Consecuencia: ~1,6 s por vuelo; la suite Python pasa sin chmod.
- **Opción B — mínimo + CodeGraph**: además `codegraph init` en la copia. Consecuencia: índice fresco para el subagente, pero costo por vuelo y riesgo de índice viejo si se recicla; los agentes tienen grep y el índice no es requisito de ninguna suite.
- **Recomendación: A. Decisión del mantenedor: B (2026-10-06)** — el despegue incluye `codegraph init` en cada copia; el riesgo de índice viejo desaparece con copias nuevas por vuelo (D1).

**Resoluciones del mantenedor (2026-10-06, esta conversación):** D1 = copia nueva por vuelo; D2 = `Worktrees/` junto al checkout; D3 = retiro tras revisión aprobada; D4 = mínimo + índice CodeGraph.

## 7. Delta para S215

Con las recomendaciones (si el mantenedor las confirma tal cual), S215 gana estos puntos concretos en su encargo:

1. Crear la copia del vuelo con `umask 022` y ubicarla en `<proyecto>/Worktrees/piloto-<fecha>/vuelo-<id>` (mismo nivel que el checkout principal).
2. Después de crear la copia: `bun install` en la raíz de la copia y `codegraph init` (decisión D4 del mantenedor). Nada más (Go comparte GOCACHE; Python es stdlib).
3. El retiro de copia y rama es un comando determinista de `piloto`, invocado por el orquestador sólo tras la integración aprobada del vuelo; NOVEDAD · interrumpida conserva copia y rama.
4. Sin cambios respecto del diseño aprobado en: nunca escribir en la rama principal, nunca pushear durante la corrida, marcas en el directorio común de Git (Radar ya las comparte entre copias).

Pendientes fuera de esta Sesión: fricción #152 (GIT_DIR y el arraigo de Radar en el gate) sigue abierta como su propia corrección; `chanks-0-jornada` sigue atada a la planificación de V3 (podría servir a Flota, que usa copias por vuelo).
