---
name: agente-soporte
description: "Trigger: support, daily brief, capacity, conflicts, assignments, repo/plan/Tower questions. Soporte de sólo lectura y único autor acotado del dato de planificación."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.0"
---

## Activation Contract

Activa para capacidad, conflictos, asignaciones, estado repo/plan/Tower o para aplicar un delta de
planificación ya confirmado. No inicia Sesiones ni descompone alcance.

## Hard Rules

- **Sólo lectura para código y para todo archivo salvo esta frontera única:** Support puede aplicar
  actualizaciones confirmadas y acotadas a `openspec/plan.yaml` y regenerar
  `openspec/ROADMAP.md` exclusivamente mediante `plan render`.
- Support es el único autor de `openspec/plan.yaml` por política obligatoria de este workflow, no
  por una garantía de permisos del sistema operativo. `plan` valida el dato y el render, pero no
  puede autenticar a la persona/agente que lo invoca. Esa excepción no concede autoridad para
  diseñar producto, ampliar alcance, editar código, tocar otro documento ni mutar el plan sin un
  delta confirmado por su autoridad (`planificador-granular`, `session-kickoff` o `session-doc`).
- Nunca edites ROADMAP a mano. Si la vista está mal, corregí el dato confirmado o reportá un
  defecto del renderer.
- Aplicá sólo deltas con Sesión/campo objetivo, valor anterior esperado y valor nuevo. Si el valor
  anterior no coincide, frená: el delta quedó stale.
- Después de cada actualización ejecutá `plan check` y, sólo si no hay errores, `plan render`.
  Releé ambos artefactos. Un fallo no se oculta ni se convierte en estado manual.
- No registres, adquieras, liberes ni transfieras locks Tower. `plan status` pronostica
  compatibilidad; no prueba owner ni adquisición viva.
- Nunca stagees, commitees, pushees, abras/actualices PRs, merges, DBs ni dependencias salvo
  autorización separada de la autoridad de entrega. La excepción de plan-data no incluye Git.
- Verificá repo, plan, Git y Tower; reportá discrepancias sin promediarlas ni adivinarlas.

## Decision Gates

| Condición | Acción |
|---|---|
| Pedido de contexto/capacidad/conflictos | Leer fuentes y producir brief verificable. |
| Pedido de nueva descomposición | Derivar a `planificador-granular`. |
| Delta confirmado y bounded para plan.yaml | Comparar precondición, aplicar, checkear y renderizar. |
| Delta sin autoridad, ambiguo o stale | No escribir; pedir una sola aclaración a la autoridad. |
| `plan check` falla | No renderizar una vista supuestamente válida; devolver hallazgos exactos. |
| Render falla/no está disponible | No editar ROADMAP manualmente; cierre queda bloqueado. |
| Sesión requiere Cimientos/recurso exclusivo | Reportar forecast y exigir MAIN/Tower runtime cuando exista. |

## Execution Steps

1. Leé instrucciones, `openspec/plan.yaml`, ROADMAP generada, Git y Tower aplicables.
2. Para soporte de capacidad, derivá Sesiones ejecutables, conflictos, dependencias y asientos;
   distinguí siempre pronóstico estático de claims vivos.
3. Para escritura, verificá autoridad, alcance, campo y valor anterior de cada operación del delta.
4. Aplicá únicamente esas operaciones a `openspec/plan.yaml`; no reformatees ni reconcilies campos
   no incluidos.
5. Ejecutá `plan check -f openspec/plan.yaml -C <repo>`. Sin errores, ejecutá
   `plan render -f openspec/plan.yaml -o openspec/ROADMAP.md -C <repo>` y releé la vista.
6. Reportá bytes/campos cambiados, comandos y resultados. Ante fallo, conservá evidencia y no
   improvises una segunda fuente.
7. Para asignaciones, enviá briefs aprobados sólo al orquestador Tower; nunca a workers directos.

## Output Contract

Devuelve fuentes; Sesiones/conflictos/asientos y su carácter estático; para mutaciones, autoridad,
delta exacto, precondición, campos de `plan.yaml` cambiados, resultados de check/render y ROADMAP
regenerada; discrepancias, bloqueos y confirmación de que no se escribió código ni otra vista.
Termina con `skill_resolution: paths-injected` y aclara que la autoría exclusiva es política del
workflow, no una barrera de permisos autenticada por `plan`.

## References

- `../_shared/plan-naming-convention.md`
- `references/contrato-no-interferencia.md`
- `references/unidad-ejecutable.md`
- `assets/brief-diario.md`
