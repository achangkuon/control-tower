---
name: session-doc
description: "Trigger: final session closure, close session, document session. Reúne evidencia de cierre y la entrega a Support sin editar la verdad de planificación."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.0"
---

## Activation Contract

Carga sólo después de la verificación integral de una Sesión. Consume el resultado de
`session-kickoff` y reúne evidencia exacta; Support es el único autor del plan.

## Hard Rules

- `openspec/plan.yaml` es la única verdad editable de planificación.
  `openspec/ROADMAP.md` es la única vista generada de estado y próximo trabajo.
- No edites manualmente `STATUS.md`, `master-index.md`, `ROADMAP.md` ni el plan. No crees
  proyecciones paralelas con los mismos datos.
- Cierre = criterios binarios verificados + `entrega.commit` integrado localmente. El commit debe
  resolver en el repositorio del plan y ser ancestro del `HEAD` integrado checked out.
- `entrega.pr` es opcional para soportar push directo. Si existe es evidencia positiva, no fuente
  de estado, y debe ser un número mayor que cero.
- Enviá a Support un delta acotado de evidencia. Support actualiza `plan.yaml`, ejecuta
  `plan check` y luego `plan render` para regenerar ROADMAP atómicamente.
- Si el commit no está integrado, `plan check`/render no están disponibles o fallan, el cierre
  falla honestamente. No marques COMPLETO, no ajustes porcentajes y no escribas una excepción.
- Notion y Engram son proyecciones separadas. Sólo se reconcilian cuando las reglas del proyecto
  las habilitan y nunca reemplazan ni contradicen el plan/Git.
- Para Notion, resolvé destino sólo desde `.session-doc.json`, conservá contenido y mantené
  borrado deshabilitado. Cargá `cognitive-doc-design` antes de escribir prosa.

## Decision Gates

| Condición | Acción |
|---|---|
| Verificación integral o criterio falla | No cerrar; devolver criterio exacto. |
| Commit no resuelve o no es ancestro del HEAD integrado | No cerrar; devolver evidencia Git. |
| Support/check/render no disponible o falla | No cerrar; conservar delta pendiente. |
| Evidencia válida y herramientas disponibles | Support aplica entrega, checkea y renderiza. |
| Proyecto deshabilita Notion/Engram | Omitir esa proyección y citar la regla. |
| Fuentes se contradicen | Frenar; no promediar ni escoger silenciosamente. |

## Execution Steps

1. Reuní resultado verificado, lista de criterios, commit exacto, repositorio/base integrada y PR
   sólo si existe.
2. Verificá que el commit resuelva localmente y sea ancestro del `HEAD` integrado actual.
3. Prepará un delta limitado a `sesiones[ID].entrega.commit` y `pr` opcional. Enviáselo a Support.
4. Exigí evidencia observada de `plan check -f openspec/plan.yaml -C <repo>` y
   `plan render -f openspec/plan.yaml -o openspec/ROADMAP.md -C <repo>`.
5. Releé ROADMAP para confirmar aviso generado, Punto de retoma, estado y próximo trabajo. Nunca
   la corrijas a mano; un defecto vuelve al dato o al renderer.
6. Reconciliá Notion/Engram por separado sólo si están habilitados. No copies allí una afirmación
   de COMPLETO antes de que Git/check/render la sostengan.

## Output Contract

Devuelve Sesión, criterios verificados, commit, HEAD integrado, PR presente/ausente, delta para
Support, resultados observados de check/render, ROADMAP regenerado o causa exacta de no cierre,
Notion/Engram actualizados u omitidos y confirmación de que no se editó ninguna vista manualmente.
Termina con `skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../agente-soporte/SKILL.md`
- `references/links.md`
- `assets/session-doc.schema.json`
- `assets/project-notion-map.json`
