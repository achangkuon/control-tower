# Control Tower — reglas del proyecto (todos los agentes)

> Archivo canónico de la política de entrega. Aplica a **cualquier** agente que
> trabaje en este repo: Claude Code, opencode, PI, Codex o un humano.
> `CLAUDE.md` apunta acá; no dupliques la regla, edítala en este archivo.

## Política de entrega: commit directo, sin PR

Este repo es **personal y todavía no sale a producción**. La entrega es un
**commit directo a `master` + push**. No se abren PRs.

Al entregar:

- Commiteá con conventional commits y pusheá a `master`.
- No cargues `branch-pr` ni `chained-pr`.
- No abras PR ni esperes review de nadie.

Esto anula, y solo para este repo, el paso de entrega de `torre-control-entregas`
que carga `branch-pr`. Sigue vigente todo lo demás: conventional commits,
Strict TDD Mode, SDD, engram y las reglas de delegación.

### Por qué

`master` no tiene branch protection ni rulesets, y el repo no tiene `.github/`.
El PR acá no corría **ningún** check automático: era ceremonia, no seguridad.

### Lo que reemplaza al PR

Lo único que el PR sí aportaba era la unidad de revert. A cambio:

- **Un commit = una unidad revertible.** Si una tarea no se puede revertir con un
  solo `git revert`, va en commits separados.
- **El Documentation Close Gate sigue activo.** `.doc-guard.json` declara
  `policy: "solo"`, y por eso `git push` cuenta como entrega. Pushear sin
  actualizar `STATUS.md` + `master-index` bloquea el cierre de sesión igual que
  antes lo hacía un PR.

### Alcance real de la aplicación — leelo antes de asumir

La regla escrita aplica a todos los agentes. **El bloqueo duro no.**

| Agente | Regla escrita | Gate que bloquea |
|---|---|---|
| Claude Code | sí | **sí** — `~/.claude/hooks/doc-guard.sh` vía `settings.json` |
| opencode | sí | no |
| PI | sí | no |
| Otros / humano | sí | no |

El gate es un hook del harness de Claude Code y ningún otro agente lo ejecuta. Si
trabajás desde opencode o PI, **la disciplina de documentar es tuya**: actualizá
`openspec/plans/master-index.md` y el `STATUS.md` del plan en el mismo push, sin
que nadie te frene si no lo hacés.

### Worktrees

`.doc-guard.json` está trackeado a propósito para que cada worktree herede la
política. Una rama que todavía no tenga el archivo resuelve a `strict` — el
default seguro — hasta que rebasee sobre `master`.

### Volver al flujo con PR

Poné `policy: "strict"` en `.doc-guard.json` (o borrá el archivo) y eliminá esta
sección. El default global del hook es `strict`: cualquier repo que no declare
nada exige PR, así que los proyectos delicados no dependen de este archivo.
