# Regla de ejecución V1 — vigente mientras P8 esté abierto

> Decidida por el maintainer el 2026-07-31. Aplica **sólo** al lane `installable-v1` (P8).
> V2 (`autonomous-v2`) conserva el ciclo SDD completo, y sólo para cambios genuinamente grandes.

## Por qué existe

Medición sobre `origin/master@6fbd97c`: 143 commits en 60 días, de los cuales **42 son `docs`
contra 34 de código** (29 `feat` + 5 `fix`). En los últimos 40 commits sin merge, **32 son
documentación**. El repositorio tiene 16.409 líneas de Markdown contra ~6.580 de código fuente.

El patrón que lo produjo: por cada PR de código salían cuatro de documentación —
`#110` (código) → `#112` (cierre) → `#114` (evidencia apply) → `#116` (evidencia verify) →
`#118` (cierre). El costo no estaba en el código sino en la ceremonia de cierre.

Segundo síntoma, del mismo origen: había **17 changes abiertos y 2 archivados**. El trabajo se
terminaba, el change quedaba abierto, y el siguiente arrancaba encima. El tablero nunca se limpiaba,
así que el avance real nunca se veía.

## Las reglas

1. **De `tasks.md` directo a implementación.** Una Sesión V1 no escribe `exploration.md`,
   `proposal.md` ni `design.md`. Las specs ya existen bajo `openspec/specs/` y en el change
   archivado [`installable-v1-autonomous-v2-split`](../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/).

2. **El `STATUS.md` se actualiza en el mismo commit que el código.** No existe el commit
   `docs(plans): close ...` ni la PR de cierre separada.

3. **La evidencia de verificación es una sección del `STATUS.md`**, no un `verify-report.md`
   ni un `apply-progress.md` en su propia PR. Debe incluir: comandos exactos ejecutados,
   resultado numérico, y el diff-check del `Área`.

4. **Un change se archiva en la misma PR en la que pasa verify.** No después, no en un lote,
   no "cuando limpiemos".

5. **Strict TDD sigue vigente.** Esta regla recorta documentación, no pruebas. El ciclo
   RED → GREEN → REFACTOR y `bun test` no se negocian.

6. **Sin Torre de Control para V1.** P8 se implementa con un solo agente. No se registran
   agentes, no se toman locks, no se crean sesiones ni worktrees automáticas.

## Lo que esta regla NO recorta

- Las specs con Given/When/Then y RFC 2119 que exige `openspec/config.yaml`.
- Las pruebas, ni su cobertura de criterios de aceptación.
- El diff-check contra el `Área` declarada de cada Sesión.
- El fail-closed: si algo no se puede verificar, no se marca completo.

**La diferencia entre proceso y ceremonia es si el artefacto cambia una decisión.**
Una spec que define el contrato cambia decisiones. Un `apply-progress.md` que narra que se hizo
lo que ya dice el commit, no.

## Cuándo se levanta

Cuando P8 cierre. A partir de ahí V2 vuelve al ciclo SDD completo, con un criterio explícito:
**SDD completo sólo para cambios grandes o con incertidumbre arquitectónica real.** Un cambio
acotado y entendido va por el camino corto, también en V2.
