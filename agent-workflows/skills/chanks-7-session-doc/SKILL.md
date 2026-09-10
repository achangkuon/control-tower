---
name: chanks-7-session-doc
description: "Trigger: final session closure, close session, document session. Reúne evidencia después de entrega y envía el delta de cierre a Support."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "4.1"
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
- Si `.session-doc.json` existe, validá el archivo completo contra `assets/session-doc.schema.json` antes de evaluar Notion; una configuración inválida o mixta bloquea el cierre.
- Notion conserva el comportamiento vigente por defecto; sólo un archivo válido con `notion.enabled: false` exacto deshabilita esa proyección para el proyecto.
- Con ese opt-out válido, no resuelvas mapas, no autentiques, no leas ni actualices Notion; registrá la proyección como omitida por política.
- Sin ese opt-out, resolvé el destino de Notion desde `.session-doc.json`, preservá contenido y nunca borres.

## Decision Gates

| Condición | Acción |
|---|---|
| Verificación o criterio falla | No cerrar; devolver evidencia exacta. |
| Commit no está integrado | No cerrar; conservar delta pendiente. |
| Support o `radar` falla | No afirmar cierre; reportar el fallo. |
| `.session-doc.json` existe pero no valida | Bloquear el cierre; no inferir política ni usar el mapa de bootstrap. |
| Archivo válido y `notion.enabled` es exactamente `false` | Omitir Notion sin intentar autenticación, bootstrap ni actualización. |
| Evidencia válida | Enviar delta, checkear, renderizar y luego reconciliar proyecciones habilitadas. |

## Execution Steps

1. Reuní criterios, commit, `HEAD` integrado y PR si existe.
2. Verificá resolución y ancestro del commit.
3. Confirmá que `chanks-4-puente` ejecutó `archive` después de entregar.
4. Enviá a Support el delta de `entrega.commit` y `entrega.pr` opcional.
5. Exigí evidencia de `radar check` y `radar render`; releé ROADMAP.
6. Actualizá Engram si la política del proyecto lo habilita; actualizá Notion sólo cuando no exista el opt-out exacto `notion.enabled: false`.

## Output Contract

Devuelve criterios, commit/HEAD/PR, evidencia de archive, delta, resultados de `radar`, cierre o causa exacta de fallo y proyecciones actualizadas/omitidas.

## References

- `../chanks-4-puente/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
- `references/links.md`
- `assets/session-doc.schema.json`
- `assets/project-notion-map.json`
