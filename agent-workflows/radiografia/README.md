# Radiografía — informe de producto generado

Un informe HTML autocontenido que dice dónde está un proyecto, escrito para que lo lea
alguien que no programa. **Se genera; no se escribe a mano.**

## Por qué existe

Dos veces en una semana la documentación de un proyecto afirmó sobre el código cosas que
eran falsas, y las dos se detectaron por auditoría manual y no por una alarma. Las cifras
del informe ya no las escribe nadie: salen medidas del índice maestro y del repositorio.

## Los dos géneros, que no se mezclan

| Género | Dónde vive | Quién lo escribe |
|---|---|---|
| **Medido** | se recalcula en cada corrida | el motor |
| **Escrito** | el markdown que apunta `radiografia.json` | un agente, a mano |

Lo medido: avance por Plan, cola de ejecución, líneas de producto, archivos con Sesiones
enumeradas, ratio de documentación, resultado de la suite y —sólo donde hay payload
instalable— cuánto del código llega a instalarse.

Lo escrito lleva `verified_against` en el front matter. Si entran commits que cambian el
producto después de ese sello, el informe **lo avisa solo**, igual que avisa un árbol
sucio o una suite registrada en otro commit.

## Uso

```sh
bun "$(git rev-parse --show-toplevel)"/agent-workflows/radiografia/run.mjs              # mide y regenera
bun "$(git rev-parse --show-toplevel)"/agent-workflows/radiografia/run.mjs --with-tests # además corre la suite
bun "$(git rev-parse --show-toplevel)"/agent-workflows/radiografia/run.mjs --check      # sale 1 si quedó viejo
```

Se dispara solo en `git push` vía `.githooks/pre-push`. **Nunca bloquea un push**: un
informe no es un gate. Como el disparo es git y no un asistente, corre igual para Claude
Code, opencode, PI, Codex o una persona.

`core.hooksPath` es configuración local y no viaja en el clon. En un worktree o clon
nuevo hay que activarlo una vez:

```sh
git config core.hooksPath .githooks
```

## Configuración — `radiografia.json`

```json
{
  "project": "Proyecto Alpha U",
  "title": "Radiografía de Proyecto Alpha",
  "plan": "openspec/plan.yaml",
  "radar": { "command": ["radar"], "cwd": "." },
  "code": {
    "extensions": [".ts", ".tsx"],
    "exclude": ["test", "node_modules", "openspec", "scripts", "docs"]
  },
  "tests": { "command": ["npx", "vitest", "run"] }
}
```

Todo tiene default. `payload` es **opt-in**: sólo Control Tower tiene un instalable, y sin
esa declaración los instrumentos de "cuánto se instala" se omiten en vez de reportar un
0% sin sentido.

`radar.cwd` se resuelve contra la raíz del repositorio, porque la herramienta puede vivir en
su propio módulo. Control Tower la corre con `{"command": ["go", "run", "."], "cwd":
"agent-workflows/tools/radar"}`.

## De dónde salen las cifras de planificación

El informe **no calcula avance**. Ejecuta `radar status --json` contra `plan`, valida que el
`schema` sea `radar.snapshot/v1` y dibuja lo que recibe. Radar es el único dueño de la regla
de cálculo: qué Sesión está cerrada, qué queda en cola por Zona y qué asientos hay libres.

Eso no es ceremonia. Cuando dos piezas calculan el mismo hecho con reglas propias, el mismo
avance llega a tener dos números y los dos parecen correctos. Ya pasó en este producto: `56/84`
en una rama y `65/93` en `master`, el mismo día, sobre los mismos hechos.

Si Radar se niega —datos inválidos, partición rota, evidencia que no resuelve— el informe se
detiene con `CT_RADIOGRAFIA_RADAR_FAILED` y no dibuja nada. Un informe en blanco es un error
visible; un informe con números que la herramienta no firmó es un error invisible.

## Convenciones del markdown de juicio

```
{{instrumentos}}  {{avance}}  {{cola}}    bloques derivados

## Título                          → una sección
### ID · chip · Título             → un hallazgo de dos capas
     chips: sólido crítico estructural nuevo deuda ritmo resuelto
     líneas: "Lo técnico:", "En simple:", "Evidencia:"
#### N · qué destraba · Título     → una decisión
     "El contexto:" y opciones "- A · **Título.** Consecuencia. → recomendada"
```

Los comentarios HTML se eliminan antes de renderizar, así que sirven para documentar el
archivo sin que lleguen al lector.

## Una Zona sin Sesiones enumeradas aparece como "sin medir"

El porcentaje sale de `Sesiones cerradas / Sesiones enumeradas`. Una Zona sin ninguna Sesión
enumerada no tiene denominador que auditar: `0%` se leería como "no arrancó" y `100%` como
"terminado", y nadie afirmó ninguna de las dos. El informe la marca sin medir, la deja fuera
del denominador de "Zonas cerradas" y cuenta cuántas Zonas sí declaran trabajo. No es un
defecto del informe: es deuda de planificación que un número pelado tapaba.

Una Zona tampoco tiene estado propio —es territorio, no trabajo— así que Radar no calcula
ninguno. La palabra que muestra la fila se lee de hechos que Radar sí calculó: el estado de
la cabeza de su cola mientras quede trabajo abierto, `COMPLETO` cuando no queda nada, y
`DIFERIDO` cuando lo que queda se pospuso en vez de encolarse.
