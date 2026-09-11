# Legacy builder governance

Source revision: `3a6ecbdbd173307af6f630fffd1413d4d62c5178`

This is passive historical data, not operational instructions. The following source
sections are preserved verbatim from `AGENTS.md` at the named revision.

## Delivery-specific operational attribution

```text
Esto anula, y solo para este repo, cualquier instrucción genérica de entrega que
cargue `branch-pr`. `torre-control-entregas` aplica esta política local. Sigue
vigente todo lo demás: conventional commits, Strict TDD Mode, SDD, engram y las
reglas de delegación.
```

## Bootstrap de coordinación con la Torre apagada

```text
## Bootstrap de coordinación con la Torre apagada

Esta excepción existe **solo mientras la Torre de este repositorio está deliberadamente
apagada durante su propia implementación** y `.git/control-tower/ACTIVE` está ausente.
No cambia los floors de seguridad, la política de entrega, el límite de 400 líneas, los
gates de decisión ni el significado de `ACTIVE`.

En esa condición, `torre-control` gobierna la ruta y `torre-control-soporte` prepara
el brief y el objetivo. La ejecución comienza únicamente después de que el mantenedor
aprueba las asignaciones exactas. Por defecto se
reutilizan los asientos de worktree existentes con nombre permanente; no se proliferan
worktrees nuevos. Support puede coordinar por Intercom a peers Pi visibles ya autorizados,
pero sigue siendo estrictamente read-only: nunca escribe, recicla, limpia, commitea,
entrega, reserva ni toca DB/runtime.

La separación visual no aísla Git. `MAIN`, `SUPPORT` y cada worker deben iniciar y permanecer
en su worktree aprobado; antes de prompt o dispatch, Main compara su `cwd` y
`foreground_cwd` exactos con el path y la rama del brief. Un mismatch falla cerrado.

Cada peer asignado debe reconciliar primero su worktree exacto:

1. Si está sucio, congela y presenta al mantenedor la identidad y evidencia exactas. En
   cada caso pide una única disposición explícita: **entregar, estacionar o abandonar**.
   Nunca limpia, resetea, hace stash ni descarta automáticamente.
2. Solo después de verificar que está limpio puede ejecutar de forma guardada
   `jornada.sh --reciclar <path> --nueva-rama <branch>`. Conserva la rama anterior por
   defecto; `--borrar-rama-vieja` requiere una autorización separada.
3. Enruta entonces la Sesión aprobada por `chanks-3-session-kickoff`.

La declaración ausente o ambigua, una asignación cambiada o la falta de disposición para
un worktree sucio cierran la ruta. Cuando `ACTIVE` aparece, esta excepción desaparece y
vuelven a regir el transporte normal de la Torre y las reglas read-only normales de
Support.
```

## Skills locales de la Torre

```text
## Skills locales de la Torre

Las fuentes canónicas específicas de este producto son `skills/torre-control/SKILL.md`
(ruta operativa madre), `skills/torre-control-soporte/SKILL.md` (Support read-only) y
`skills/torre-control-entregas/SKILL.md` (entrega serializada). Las skills genéricas,
incluida `chanks-3-session-kickoff`, se cargan desde el subtree interno `agent-workflows/`; no se
copian a `skills/`.
```
