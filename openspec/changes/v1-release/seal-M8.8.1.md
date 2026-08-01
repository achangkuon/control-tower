# Contrato sellado — M8.8.1

> Entregable para el **agente implementador**. Cero decisiones: si algo acá no está resuelto,
> el agente **para y reporta**, no elige.

## Identidad

| Campo | Valor |
|---|---|
| Sesión | `S8.8` — Adopción del instalable |
| Módulo | `M8.8.1` — Cobertura del caso legado → XDG |
| Repositorio | `control-tower` |
| Base | `master@5d81c88` |
| Rama a crear | `feat/installable-v1/m8-8-1-legacy-xdg-coverage` |
| Worktree | propio y exclusivo — no reutilizar uno existente |
| Modo | autónomo, sin Torre |

## Área — el diff no puede salir de acá

```
install/lifecycle.mjs
install/active-pointer.mjs
install/version-store.mjs
test/install/**
```

Prohibido tocar: `bin/torre`, `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`,
`openspec/**`, `support/**`, `registry/**`, `enroll/**`, `contracts/**`.

## Frontera de no mutación — la regla que más importa

El Módulo **no instala nada de verdad**. Todo corre contra un data-root temporal.

Deben quedar **idénticos byte a byte** antes y después, en éxito y en fallo:

- `~/.config/opencode/control-tower/` completo
- el data-root XDG real, si existiera
- `.git/control-tower/` — `tower.db`, `tower.log`, `ACTIVE`, y sus `-wal`/`-shm`

Un test que escriba fuera de su directorio temporal es un fallo del Módulo, no un detalle.

## Tareas — Strict TDD, en orden

1. **T8.8.1.1 RED** — `test/install/lifecycle.test.mjs`: instalar sobre una máquina con runtime
   legado y sin data-root XDG, preservando configuración e historial.
2. **T8.8.1.2 RED** — idempotencia (instalar dos veces = mismo estado) y `rollback` sin pérdida
   de configuración ni historial.
3. **T8.8.1.3 GREEN** — ajustar `install/**` **sólo si algún caso falla**. Si pasan sin cambios,
   escribir en el reporte que la cobertura ya existía. **No inventar código para justificar el turno.**
4. **T8.8.1.4 REFACTOR** — normalizar errores estables y volver a correr la prueba enfocada.

## Verificación — exacta, se corre una vez al final

```sh
bun install                                   # un worktree nuevo no tiene node_modules
bun test test/install                         # debe pasar completo
bun test                                      # base: 429 pass / 2 fail preexistentes
git diff --name-only 5d81c88...HEAD           # sólo install/** y test/install/**
```

Los 2 fallos preexistentes son `P0 frozen snapshot restore` y aparecen porque la Torre está
armada en el checkout. **No son regresión y no se arreglan acá.** Cualquier fallo distinto a
esos dos es terminal.

El runner es `bun`, no `node`.

## Criterios de cierre

- [ ] Los tres casos nuevos existen y pasan
- [ ] `bun test test/install` pasa completo
- [ ] `bun test` no suma fallos nuevos sobre la base
- [ ] El diff no sale del Área
- [ ] Los testigos de no mutación son idénticos antes y después

## Qué hacer ante una pregunta

**No preguntar. No adivinar.** Escribir el bloque de decisión, marcarlo como bloqueante y
continuar con la siguiente tarea que no dependa de esa respuesta. Si no queda ninguna
independiente, cerrar el Módulo como parcial y reportar.

## Entrega

Commit y push a la rama. **Nada de merge.** El candidato queda congelado hasta que el
maintainer lo apruebe. El `STATUS.md` de P8 lo actualiza el maintainer al cerrar `S8.8`
completa — este Módulo no lo toca.
