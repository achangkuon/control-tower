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
bun ~/projects/agent-workflows/radiografia/run.mjs              # mide y regenera
bun ~/projects/agent-workflows/radiografia/run.mjs --with-tests # además corre la suite
bun ~/projects/agent-workflows/radiografia/run.mjs --check      # sale 1 si quedó viejo
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
  "project": "Servi Task U",
  "title": "Radiografía de Servi Task",
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

## Un Plan sin fracción aparece como "sin medir"

El estándar deriva el porcentaje de `Sesiones cerradas / Sesiones enumeradas`. Un `100%`
pelado no tiene denominador que auditar, así que el informe lo marca sin medir y cuenta
cuántos Planes sí lo declaran. No es un defecto del informe: es deuda de planificación
que un número pelado tapaba.
