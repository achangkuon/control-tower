# Control Tower — reglas del proyecto

> **La política de entrega de este repo vive en [`AGENTS.md`](AGENTS.md).**
> Ese es el archivo canónico y aplica a todos los agentes. Leelo antes de entregar.

Resumen: la entrega es un **commit directo a `master` + push**, sin PR. No cargues
`branch-pr` ni `chained-pr`.

## Específico de Claude Code

Claude Code es el **único** agente donde esto está enforced por un gate duro:
`~/.claude/hooks/doc-guard.sh`, cableado en `~/.claude/settings.json` como hooks
`PostToolUse` y `Stop`.

Consecuencias prácticas:

- Un `git push` en este repo marca la sesión como entregada, y el cierre queda
  bloqueado hasta actualizar la documentación.
- **Pushear primero, documentar después.** Si actualizás los docs y después
  pusheás, el marcador `shipped` queda adelante de `docs` y el gate se re-arma.
- El `doc-check` solo reconoce rutas que matcheen `STATUS.md`. Actualizar
  `master-index.md` no libera el gate por sí solo, aunque sea el índice de verdad.

En opencode, PI o cualquier otro agente el gate **no existe** — ver la tabla de
alcance en [`AGENTS.md`](AGENTS.md).
