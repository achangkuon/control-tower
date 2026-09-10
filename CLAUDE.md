# Control Tower — reglas del proyecto

> **La política de entrega de este repo vive en [`AGENTS.md`](AGENTS.md).**
> Ese es el archivo canónico y aplica a todos los agentes. Leelo antes de entregar.

Resumen: la entrega es un **commit directo a `master` + push**, sin PR. No cargues
`branch-pr` ni `chained-pr`.

Desde el 2026-09-10 el único origen editable del plan es **`openspec/plan.yaml`**, y
`openspec/ROADMAP.md` es su vista generada. Los índices de estado paralelos —`STATUS.md`,
`master-index.md`— están prohibidos, y el corpus viejo quedó archivado en
`openspec/archive/legacy-planning/`. La regla completa, con qué sobrevivió y cómo resolver
un conflicto de rebase contra las vistas retiradas, está en
[`AGENTS.md`](AGENTS.md#la-autoridad-de-planificación--desde-el-2026-09-10).

## Específico de Claude Code

Claude Code es el **único** agente donde esto está enforced por un gate duro:
`~/.claude/hooks/doc-guard.sh`, cableado en `~/.claude/settings.json` como hooks
`PostToolUse` y `Stop`.

Consecuencias prácticas:

- Un `git push` en este repo marca la sesión como entregada, y el cierre queda
  bloqueado hasta actualizar la documentación.
- **Pushear primero, documentar después.** Si actualizás los docs y después
  pusheás, el marcador `shipped` queda adelante de `docs` y el gate se re-arma.
- **El gate cambió de modo con la migración.** El hook mira si existe
  `openspec/plan.yaml`; desde que existe, lo único que libera el cierre es editar
  **ese** archivo. `STATUS.md`, `master-index.md`, Notion y `mem_session_summary` ya
  no cuentan, y un registro previo hecho en modo legacy queda descartado.
- Editá con la herramienta `Edit` o `Write`. El `doc-check` corre en `PostToolUse` de
  esas dos: un archivo correcto en disco escrito con `python3` o `sed` deja el gate
  armado igual.
- Si la entrega **no** cierra una Sesión enumerada en `plan.yaml`, la salida es una
  línea independiente que diga exactamente «nada que registrar». Inventar una Sesión
  para liberar la compuerta está prohibido.

En opencode, PI o cualquier otro agente el gate **no existe** — ver la tabla de
alcance en [`AGENTS.md`](AGENTS.md).
