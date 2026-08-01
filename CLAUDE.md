# Control Tower — reglas del proyecto

## Política de entrega: commit directo, sin PR

Este repo es **personal y todavía no sale a producción**. La entrega es un
**commit directo a `master` + push**. No se abren PRs.

Esto anula, y solo para este repo, el paso de entrega de `torre-control-entregas`
que carga `branch-pr`. Al entregar:

- Commiteá con conventional commits y pusheá a `master`.
- No cargues `branch-pr` ni `chained-pr`.
- No abras PR ni esperes review de nadie.

Sigue vigente todo lo demás: conventional commits, Strict TDD Mode, SDD, engram y
las reglas de delegación.

### Lo que reemplaza al PR

El PR acá no corría ningún check: `master` no tiene branch protection ni rulesets,
y el repo no tiene `.github/`. Lo único que aportaba era la unidad de revert, así
que a cambio:

- **Un commit = una unidad revertible.** Si una tarea no se puede revertir con un
  solo `git revert`, va en commits separados.
- **El Documentation Close Gate sigue activo.** `.doc-guard.json` declara
  `policy: "solo"`, y por eso `git push` cuenta como entrega para
  `~/.claude/hooks/doc-guard.sh`. Pushear sin actualizar `STATUS.md` +
  `master-index` bloquea el cierre de sesión igual que antes lo hacía un PR.

### Volver al flujo con PR

Poné `policy: "strict"` en `.doc-guard.json` (o borrá el archivo) y eliminá esta
sección. El default global es `strict`: cualquier repo que no declare nada exige
PR, así que los proyectos delicados no dependen de este archivo.
