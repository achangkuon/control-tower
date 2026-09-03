---
name: session-doc
description: "Trigger: final session closure, close session, document session. Reúne evidencia después de entrega y envía el delta de cierre a Support."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "4.0"
---

## Activation Contract

Activa después de verificación, revisión y entrega. Reúne evidencia; Support escribe el dato y regenera la vista.

## Hard Rules

- `archive` ocurre después de la entrega y antes de declarar el cierre completo.
- Cierre exige criterios binarios verificados y `entrega.commit` integrado.
- El commit debe resolver y ser ancestro del `HEAD` integrado.
- `entrega.pr` es opcional y sólo se declara cuando existe.
- No escribas plan ni ROADMAP; enviá un delta a Support.
- Notion y Engram son proyecciones opcionales y nunca reemplazan plan, Git o `radar`.
- Para Notion, resolvé destino desde `.session-doc.json`, preservá contenido y nunca borres.

## Decision Gates

| Condición | Acción |
|---|---|
| Verificación o criterio falla | No cerrar; devolver evidencia exacta. |
| Commit no está integrado | No cerrar; conservar delta pendiente. |
| Support o `radar` falla | No afirmar cierre; reportar el fallo. |
| Evidencia válida | Enviar delta, checkear, renderizar y luego reconciliar proyecciones habilitadas. |

## Execution Steps

1. Reuní criterios, commit, `HEAD` integrado y PR si existe.
2. Verificá resolución y ancestro del commit.
3. Confirmá que `chanks-4-puente` ejecutó `archive` después de entregar.
4. Enviá a Support el delta de `entrega.commit` y `entrega.pr` opcional.
5. Exigí evidencia de `radar check` y `radar render`; releé ROADMAP.
6. Actualizá Notion/Engram sólo si la política del proyecto lo habilita.

## Output Contract

Devuelve criterios, commit/HEAD/PR, evidencia de archive, delta, resultados de `radar`, cierre o causa exacta de fallo y proyecciones actualizadas/omitidas.

## References

- `../chanks-4-puente/SKILL.md`
- `../agente-soporte/SKILL.md`
- `references/links.md`
- `assets/session-doc.schema.json`
- `assets/project-notion-map.json`
