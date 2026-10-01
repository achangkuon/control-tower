# `radar` — dato único, estado y hoja de ruta derivados

`openspec/plan.yaml` es la **única fuente editable** de planificación de un producto.
`openspec/ROADMAP.md` es la **única vista humana generada**: contiene el estado actual y
el próximo trabajo. No existen un `STATUS.md` ni un `master-index.md` paralelos.

```sh
radar check                         # usa openspec/plan.yaml y el repo actual
radar status                        # estado, colas por Zona y asientos compatibles
radar status --json                 # el mismo cálculo, legible por máquina (radar.snapshot/v1)
radar sesion S114                   # contrato completo de una sola Sesión; falla cerrado como status
radar faltan                        # todas las Sesiones abiertas agrupadas por meta y subprioridad
radar faltan S114                   # localizador de una línea: meta, subprioridad, Zona, título, estado
radar zonas                         # cobertura de la partición sobre git ls-files
radar roadmap                       # alternativas LISTO, compatibilidad e hipotéticos (previsión)
radar render                        # escribe openspec/ROADMAP.md atómicamente
radar render -f otro.yaml -o salida.md -C /repo
radar marcar S114 --worktree /ruta/absoluta [--worker nombre]   # LISTO -> EN CURSO
radar marcar S114 --listo           # testigo local de "listo para revisión" (etapa 5)
radar desmarcar S114                # quita el marcador (cierre o abandono)
```

El contrato canónico está en
[`skills/_shared/plan-naming-convention.md`](../../skills/_shared/plan-naming-convention.md).

## Sesiones nativas con Encargo

Una Sesión nueva usa `encargo` en lugar de `ruta`, `modulos` y `tareas`. Su presencia es el
discriminante compatible: las Sesiones históricas conservan su jerarquía legacy sin reinterpretarse.
La parte superior conserva identidad, Zona, autoridad, dependencias, Cimientos, recursos y `archivos`
exactos autorizados. El Encargo tiene exactamente cuatro textos: `pedido_contexto`,
`resultado_comportamiento`, `restricciones_decisiones` y `referencias`; el resultado/comportamiento
contiene los requisitos observables de cierre. Una Sesión nativa no declara `criterios` root; ningún
checkbox sustituye `entrega.commit` integrado.

`archivos` no acepta globs, directorios, escapes ni symlinks. Cada archivo debe pertenecer a la Zona
indicada o a un Cimiento exacto reservado. Una Sesión sin archivos sólo es válida con
`solo_lectura: true`; una entrada todavía desconocida sólo se conserva con `encargo.incompleto: true`,
queda BLOQUEADA y no recibe territorio, cola ni asiento. Ausencia de archivos nunca se interpreta como
lectura segura.

ODD es el modo nativo. La única excepción declarable es `solicitud_sdd`, que exige
`solicitud_humana: true` y una `autoridad`; Radar no elige esa excepción ni inicia un proveedor. Las
Sesiones nativas retoman la misma identidad y continuidad ODD, no el primer Módulo pendiente. Una
migración puede conservar `importacion_legacy` y Módulos históricos sólo si cada Módulo tiene un trailer
`Modulo:` alcanzable desde el HEAD fijado; esa evidencia no amplía `archivos` ni crea progreso native.
`radar sesion` muestra dos bloques (coordinación y Encargo) y `radar render` agrega el detalle de
Sesiones sin alterar el bloque histórico de Módulos y Tareas. `radar.snapshot/v1` conserva sus claves y
cálculos existentes.

```yaml
sesiones:
  - id: S23
    zona: cocina
    resultado: instalar el horno
    autoridad: PRD cocina §2
    archivos: [cocina/horno.go, cocina/horno_test.go]
    encargo:
      pedido_contexto: El usuario necesita preparar el horno antes de la apertura.
      resultado_comportamiento: El horno enciende y conserva su protocolo actual.
      restricciones_decisiones: No cambiar la API; las decisiones estructuradas siguen en decisiones.
      referencias: PRD cocina §2; RFC cocina §4
```

## Avance por Módulo

Cada commit de un Módulo lleva el trailer `Modulo: <ID>` (por ejemplo `Modulo: M125.1`). `radar`
lo lee sólo de commits alcanzables desde HEAD, así que el plan nunca se escribe por Módulo. Una
Sesión abierta con Módulos entregados aparece `a medias N/M Módulos` en `radar status`, y
`radar sesion <ID>` marca cada Módulo y nombra desde dónde retomar. Un trailer que no nombra un
Módulo del plan es un aviso de `radar check`, nunca un error.

## Compilar y verificar

La admisión usa el binario instalado `$HOME/.local/bin/radar`; nunca ejecuta código del checkout.

```sh
go build -o radar .
go test ./...

GOOS=darwin GOARCH=arm64 go build -o radar-darwin-arm64 .
GOOS=darwin GOARCH=amd64 go build -o radar-darwin-amd64 .
```

## Esquema v3

La v3 distingue decisiones abiertas de registros cerrados (`tipo: resuelta`). No hay
compatibilidad dual: los planes v2 deben migrarse explícitamente a v3.

```yaml
schema: plan
schema_version: 3
producto: la-casa
raiz: /ruta/al/repo                 # opcional; si falta se deriva con git

zonas:
  - id: cocina
    nombre: Cocina
    rutas: [cocina/, test/cocina/]

cimientos:
  rutas: [package.json, shared/]

prioridades:                        # opcional; orden de trabajo propio del proyecto
  - id: estructura
    nombre: Estructura
  - id: terminaciones
    nombre: Terminaciones

sesiones:
  - id: S23
    zona: cocina
    resultado: instalar el horno
    autoridad: PRD cocina §2          # alcance aprobado de la Sesión
    prioridad: estructura             # obligatoria en Sesiones abiertas si hay prioridades
    depende_de: [S18]
    cimientos: [package.json]       # reservas exactas, no globs
    recurso: [delivery-token]
    reemplaza: []
    criterios:
      - el horno enciende
    decisiones:
      - tipo: escala
        pregunta: ¿qué protocolo expone el horno?
        evidencia: RFC cocina §4
        checkpoint: antes-del-primer-modulo
        opciones:
          - opcion: protocolo actual
            consecuencia: conserva compatibilidad
          - opcion: protocolo nuevo
            consecuencia: requiere migración
        clase: api-publica
        alcanza: primer-modulo
    ruta:
      propuesta: direct
      autoridad: RFC cocina §4
      revalidacion:                 # opcional hasta chanks-3-session-kickoff
        resultado: design-tasks
        base: 0123456789abcdef0123456789abcdef01234567
        evidencia: readiness/S23
        razon: la base agregó un contrato compartido
    modulos:
      - id: M23.1
        resultado: conectar el horno
        rutas: [cocina/horno.go, cocina/horno_test.go]
        tareas:
          - id: T23.1.1
            accion: observar el fallo sin conexión
            resultado: fallo de conexión observado
            criterios: [la prueba falla por ausencia de conexión]
          - id: T23.1.2
            accion: implementar la conexión
            resultado: conexión implementada
            criterios: [la prueba de encendido pasa]
          - id: T23.1.3
            accion: refactorizar sin cambiar conducta
            resultado: implementación aclarada
            criterios: [las pruebas siguen pasando]
```

Los IDs son planos y permanentes: `S23 → M23.1 → T23.1.1`. La ruta propuesta `direct`
o `design-tasks` exige Módulos; `full-sdd` los prohíbe porque su profundidad vive en los
artefactos SDD. Una revalidación posterior no reescribe esa profundidad. Todo Módulo declarado tiene Tareas, archivos concretos y cada Tarea tiene
acción más criterios binarios. El parser rechaza campos desconocidos, documentos YAML
posteriores, la v1 y cualquier intento de escribir `estado`, `Área` o `est` en una Sesión
o un Módulo.

## Rutas: propuesta y revalidación

- `chanks-2-planificador-granular` escribe `ruta.propuesta` y su autoridad.
- `chanks-3-session-kickoff` revalida una vez. Registra la ruta resultante, el `HEAD` exacto actual y
  una referencia de evidencia/autoridad. Si cambia la propuesta, `razon` es obligatoria.
- La revalidación gana para implementar. No existe un segundo dispatcher.
- `radar check` acepta la base revalidada mientras sea un ancestro inmutable completo del
  `HEAD` actual; rechaza commits laterales.

El conjunto cerrado es: `direct`, `design-tasks`, `full-sdd`.

## Prioridades

`prioridades` es opcional y cada proyecto nombra las suyas. Qué significa una prioridad lo
define el canon (`skills/_shared/plan-naming-convention.md` §9); Radar sólo la calcula y la
valida:

- `radar status`, `radar sesion`, `radar.snapshot/v1` y la vista generada muestran la
  prioridad activa y la de cada Sesión sólo cuando el plan declara la lista.
- `radar check` falla ante una lista inválida, una Sesión abierta sin prioridad conocida o una
  dependencia hacia una prioridad posterior.
- Un plan sin `prioridades` produce exactamente la misma salida que antes.

## Ledger SDD opcional

`cambio` enlaza una Sesión `full-sdd` con el ledger de intentos de Gentle AI; es la única ruta
que recorre el SDD nativo (canon §15). Una Sesión `direct` o `design-tasks` que declara `cambio`
hace fallar `radar check` sin consultar a Gentle AI. Cuando está declarado en una `full-sdd`,
`radar` ejecuta únicamente `gentle-ai sdd-attempt status --cwd <raíz> --change <cambio>`.
`decision_required: true` bloquea la Sesión abierta. Si el comando falla o devuelve JSON
inválido/corrupto, `check`, `status` y `render` fallan cerrados. Ausente o vacío significa
que todavía no existe ledger y conserva el estado derivado anterior.

## Entrega derivada desde Git

`entrega` es evidencia, no estado:

```yaml
entrega:
  commit: a1b2c3d4...
  pr: 42                           # opcional; evidencia, no fuente de verdad
```

`radar check` exige el OID hexadecimal completo e inmutable del formato de objetos del repositorio
(40 caracteres para SHA-1, 64 para SHA-256): rechaza `HEAD`, ramas, expresiones como `HEAD~1`,
hashes abreviados y argumentos con aspecto de opción. El OID debe identificar exactamente un
commit local y ser ancestro del `HEAD` integrado fijado al comenzar la operación. Sólo entonces el
estado derivado es `COMPLETO`. Evidencia inexistente, simbólica, lateral o no integrada falla; una
Sesión que la declare queda bloqueada y nunca cae como `LISTO`/`PLANIFICADO`.
Si `pr` aparece debe ser positivo; su ausencia representa políticas de push directo sin
inventar un PR. No hay red ni dependencia de GitHub.

## Render determinista

`radar render` fija un HEAD completo, valida y genera toda la vista contra ese snapshot; vuelve a
comprobar HEAD justo antes de publicar y rehúsa el rename si cambió. La vista empieza con el Punto
de retoma y reporta cierres determinísticamente sin inventar cuál fue el último. Todo scalar del
plan se normaliza a una línea y se neutraliza como dato Markdown: saltos, headings, pipes,
backticks y HTML no pueden inyectar estructura.

La salida se resuelve siempre contra la raíz del repositorio del plan. El default sigue siendo
`openspec/ROADMAP.md`; un `-o` de prueba puede elegir otro destino sólo dentro de esa raíz. Escapes,
componentes symlink, destinos existentes no regulares y archivos regulares que no llevan el aviso
generado por `radar` fallan; así `-o` no puede sobrescribir un archivo arbitrario. La escritura sincroniza el temporal,
hace rename atómico y sincroniza el directorio padre; cada error se propaga. Repetirla sobre los
mismos bytes y evidencia converge byte por byte.

Los defaults canónicos son:

- entrada: `openspec/plan.yaml`
- salida: `openspec/ROADMAP.md`

`-f`, `-o` y `-C` existen para pruebas y migraciones. Este repositorio no incluye esos dos
artefactos como ejemplo; cada producto los crea al adoptar el modelo.

## Qué valida `radar check`

- Partición exhaustiva y disjunta contra los archivos reales de `git ls-files`.
- Zonas definidas por rutas y reservas exactas de Cimientos declarados.
- Dependencias, ciclos, decisiones, contaminación y linaje `reemplaza`.
- Autoridad de alcance de cada Sesión y evidencia, checkpoint y opciones estructuradas de cada decisión.
- Profundidad compatible con la ruta efectiva, IDs únicos/coherentes y resultados no vacíos.
- Rutas de Módulo exactas, normalizadas, relativas al repo, sin symlinks y autorizadas por la Zona
  de la Sesión o por una reserva exacta de Cimiento; los nuevos archivos se clasifican por la misma
  partición determinista.
- Criterios binarios declarados para Sesiones y Tareas abiertas.
- Propuesta/revalidación de ruta y base Git exacta.
- Evidencia de entrega local e integrada; PR opcional positivo.

## Snapshot legible por máquina

`radar status --json` emite `radar.snapshot/v1`: producto, HEAD, avance total, avance y cola
por Zona, estado derivado de cada Sesión, asientos compatibles y cuántas Sesiones quedan sin
Zona. Los estados salen sin emoji: la palabra del vocabulario es el contrato, el emoji es
presentación que Radar posee.

Existe para que ningún consumidor vuelva a derivar el avance por su cuenta. Un lector que
re-parsea un documento renderizado —o que reimplementa la regla— termina discrepando del plan
que dice mostrar, y ambos números parecen correctos. Radar calcula; el consumidor dibuja.

Se niega exactamente donde se niega `radar status`: si la validación da errores no emite nada
y sale distinto de cero. Un consumidor que recibe JSON recibe cifras que Radar firma.

El contrato v1 **crece, no rompe**. Cada Sesión carga además sus `archivos`, `cimientos`,
`recurso` y `depende_de`, y el snapshot agrega `compatibilidad` y `escenarios`. Todos se omiten
cuando no hay nada que declarar: una declaración ausente y una vacía son afirmaciones distintas,
y la ausente significa *desconocido*, que nunca se lee como seguro. `encargo_test.go` protege la
forma con una lista blanca de claves —quitar o renombrar sigue fallando; agregar exige nombrar la
clave nueva ahí— en lugar de un conteo exacto, que también fallaba ante el crecimiento permitido.

## `radar roadmap` — alternativas, compatibilidad e hipotéticos

`radar roadmap` responde tres preguntas que `status` no responde: cuáles son **todas** las
alternativas `LISTO` de hoy, cuáles podrían trabajarse a la vez sin pisarse, y qué se abriría de
verdad si tal Sesión cerrara.

Es una vista humana. La proyección canónica de máquina sigue siendo `radar status --json`, que
carga los mismos hechos en `compatibilidad` y `escenarios`: un agente los lee de ahí y nunca
parsea esta página. Las dos salidas son dos dibujos de un cálculo, no dos fuentes.

**Compatibilidad por archivos.** Cada combinación recibe un veredicto con su evidencia exacta,
por precedencia de más fuerte a más débil:

| Clase | Significado |
|---|---|
| `recurso-excluyente` | Ambas declaran el mismo recurso exclusivo. La combinación queda excluida. |
| `solapa-archivos` | Las dos nombran el mismo archivo fuera de todo Cimiento. Chocan. |
| `indeterminado` | Falta la declaración exacta de alguna. Desconocido, nunca seguro. |
| `cimiento-compartido` | Comparten un Cimiento: exige intervención coordinada sobre ese archivo. |
| `compatible` | Archivos disjuntos, sin Cimiento ni recurso compartido. |

Compartir Zona **no** es conflicto, y un Cimiento compartido es condición, no veto. Ahí está la
diferencia con la línea `Asientos:`, que pronostica por Zona y ofrece una sola por Zona: esto
mira los `archivos` exactos que cada Sesión declaró al prepararse.

**Escenarios hipotéticos.** Separan dos afirmaciones que se confunden todo el tiempo:
`desbloquea` es a quién le quedaría satisfecha la dependencia, y `quedan_listo` es quién
derivaría a `LISTO` de verdad, según todos los criterios y la prioridad activa. El caso que el
plan real produce hoy: cerrar S122 le satisface la dependencia a S123, y S123 **sigue en
DIFERIDO**, porque su prioridad todavía no es la activa. Resolver una dependencia no vuelve
ejecutable una prioridad posterior.

Los escenarios no modifican el plan, Git ni la evidencia de entrega real: la hipótesis entra como
parámetro a la misma derivación de estados, nunca como mutación.

**Lo que no hace.** No autoriza ejecución, no reserva capacidad, no asigna workers, no concede
acceso y no supone que la coordinación esté instalada. La admisión sigue siendo la de siempre, y
la capacidad nueva depende de que sus consumidores se integren, verifiquen y activen en S146.
El reporte lo dice en su propia salida para que nadie lo cite como permiso.

## `radar marcar` / `radar desmarcar` — marcador de despacho sin Herdr

`EN CURSO` sólo se deriva de un marcador vivo `<git-common-dir>/chanks/despachos/<ID>.json`
(esquema `radar.despacho/v1`). Estos dos comandos son los únicos que escriben o quitan ese archivo
(y nada más bajo el directorio común de Git); sirven para despachar sin Herdr, p. ej. con subagentes
de Gentle AI, cada uno en su propio worktree. Los marcadores que escribe Herdr siguen siendo válidos.

- `marcar <ID> --worktree <ruta>` exige: Sesión existente y `LISTO`, ruta absoluta normalizada que sea
  la raíz de un worktree del mismo repositorio, HEAD en una rama con commits, worker sin espacios ni
  barras (por defecto, el nombre del directorio) y ningún marcador previo (nunca se sobrescribe, ni
  siquiera uno huérfano). Escritura atómica: temporal en el mismo directorio y `link`, que falla si el
  nombre existe. Un rechazo no modifica nada.
- `marcar <ID> --listo` agrega al marcador vivo el testigo `transport:"local"`, que la etapa 5 acepta
  igual que `"intercom"`; el resto de requisitos de la etapa 5 (p. ej. la lista `odd/tasks/<id>*.md`
  cerrada) no cambia. No acepta `--worktree` ni `--worker`.
- `desmarcar <ID>` borra exactamente `<despachos>/<ID>.json`, también si está huérfano o es inválido
  (ése es su propósito); rechaza si no existe, si el ID está mal formado o si el nodo no es un archivo
  regular. Nunca toca worktrees, ramas ni el plan.
- Ninguno sigue enlaces simbólicos en `chanks/` ni en `despachos/`.

## `radar faltan` — todo lo que falta, por meta

`radar status` sólo muestra la cola ejecutable por Zona: oculta la mayoría de las Sesiones
abiertas y no distingue lo apartado a propósito de lo que espera el turno de su prioridad.
`radar faltan` responde la pregunta distinta que un dueño de producto hace: qué falta para
terminar cada meta, y por qué una Sesión no aparece en la cola.

Es sólo lectura: no cambia `status`, `status --json`, `sesion`, el cálculo de estados ni el
esquema del plan. Reusa `EstadosAt` y `resumenBloqueo` tal cual existen hoy.

**Metas y subprioridades** se derivan del orden y los nombres de `prioridades`, sin campo
nuevo: el texto antes del primer ` · ` es la meta y el texto después es la subprioridad. Una
prioridad declarada sin ` · ` (por ejemplo `Torre V3`) es una meta sin subprioridad. Una Sesión
abierta cuya `prioridad` no coincide con ninguna declarada cae en la meta de reserva
`Sin meta declarada`, que sólo aparece cuando eso ocurre de verdad.

**Porcentaje.** Cada meta muestra `N% (C/T S)`, igual que `Avance.String()`. El denominador
excluye únicamente las Sesiones con `diferida: true` (Engram 11432). Las Sesiones que Radar
pasa a `DIFERIDO` sólo porque su prioridad todavía no es la activa siguen contando para su
meta, y se listan como `espera turno`.

**Listado.** Bajo cada meta, las Sesiones abiertas se agrupan por subprioridad (`  Subprioridad`
más `    - S23 — resultado (estado)`); las de una meta sin subprioridad declarada van directo
bajo la meta (`  - S23 — ...`). Una Sesión `BLOQUEADO` muestra su bloqueo reusando
`resumenBloqueo`, la misma frase que ya usa `radar render` en `## Bloqueos`. Las Sesiones
`diferida: true` **no** aparecen en el listado — sólo se cuentan en el aviso del pie — para no
repetir la misma información apartada de dos formas distintas.

**Pie.** Cuenta el total de Sesiones que faltan (abiertas y no apartadas), cuántas están
`LISTO` para empezar, y — sólo si hay alguna — un aviso con la cantidad de Sesiones apartadas
(`diferida: true`).

**`radar faltan <ID>`** imprime una sola línea localizadora:

```
<ID> (<meta> › [<subprioridad> ›] <Zona> — <título>, <estado>)
```

La subprioridad se omite cuando la prioridad declarada no tiene una. Es el formato que todo
agente debe usar para nombrar una Sesión en una conversación o un artefacto escrito — nunca el
ID solo — según `skills/_shared/plan-naming-convention.md` §8 y `AGENTS.md`.

## Frontera honesta

`radar status` ejecuta primero la validación aplicable y falla cerrado: nunca muestra evidencia de
entrega inválida o no verificable como trabajo ejecutable. Los asientos compatibles son el veredicto
de paralelo del canon (§13): excluyen las primeras Sesiones listas que comparten un Cimiento exacto o la
misma identidad exacta de `Recurso`, así que las Zonas listadas pueden trabajar en paralelo sin pisarse.

`radar` valida datos y partición, deriva estado desde Git, pronostica asientos compatibles y
renderiza. **No** adquiere reservas vivas, autentica la identidad del owner/invocante, recupera locks stale
ni congela el candidato runtime de S7.1. MAIN/Tower deberá hacer eso en una fase posterior.
Un pronóstico compatible no es un lock.
