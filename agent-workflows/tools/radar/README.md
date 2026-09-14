# `radar` — dato único, estado y hoja de ruta derivados

`openspec/plan.yaml` es la **única fuente editable** de planificación de un producto.
`openspec/ROADMAP.md` es la **única vista humana generada**: contiene el estado actual y
el próximo trabajo. No existen un `STATUS.md` ni un `master-index.md` paralelos.

```sh
radar check                         # usa openspec/plan.yaml y el repo actual
radar status                        # estado, colas por Zona y asientos compatibles
radar status --json                 # el mismo cálculo, legible por máquina (radar.snapshot/v1)
radar sesion S114                   # contrato completo de una sola Sesión; falla cerrado como status
radar zonas                         # cobertura de la partición sobre git ls-files
radar render                        # escribe openspec/ROADMAP.md atómicamente
radar render -f otro.yaml -o salida.md -C /repo
```

El contrato canónico está en
[`skills/_shared/plan-naming-convention.md`](../../skills/_shared/plan-naming-convention.md).

## Avance por Módulo

Cada commit de un Módulo lleva el trailer `Modulo: <ID>` (por ejemplo `Modulo: M125.1`). `radar`
lo lee sólo de commits alcanzables desde HEAD, así que el plan nunca se escribe por Módulo. Una
Sesión abierta con Módulos entregados aparece `a medias N/M Módulos` en `radar status`, y
`radar sesion <ID>` marca cada Módulo y nombra desde dónde retomar. Un trailer que no nombra un
Módulo del plan es un aviso de `radar check`, nunca un error.

## Compilar y verificar

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

sesiones:
  - id: S23
    zona: cocina
    resultado: instalar el horno
    autoridad: PRD cocina §2          # alcance aprobado de la Sesión
    cambio: instalar-horno            # opcional; ledger SDD de gentle-ai
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

## Ledger SDD opcional

`cambio` enlaza una Sesión con el ledger de intentos de Gentle AI. Cuando está declarado,
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

## Frontera honesta

`radar status` ejecuta primero la validación aplicable y falla cerrado: nunca muestra evidencia de
entrega inválida o no verificable como trabajo ejecutable. El pronóstico evita simultaneidad cuando
las primeras Sesiones listas comparten un Cimiento exacto o la misma identidad exacta de `Recurso`.

`radar` valida datos y partición, deriva estado desde Git, pronostica asientos compatibles y
renderiza. **No** adquiere reservas vivas, autentica la identidad del owner/invocante, recupera locks stale
ni congela el candidato runtime de S7.1. MAIN/Tower deberá hacer eso en una fase posterior.
Un pronóstico compatible no es un lock.
