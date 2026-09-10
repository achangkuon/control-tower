---
name: chanks-0-session-context-loader
description: "Trigger: session context loader, new session context, Engram startup brief. Resume contexto persistido sin elegir trabajo ni mutar fuentes."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activa cuando el orquestador necesita un brief compacto de memoria al iniciar o retomar una Conversación.

## Hard Rules

- Sólo lectura: no edites archivos ni servicios.
- No reemplaces instrucciones del repo, plan, preflight SDD ni registry de skills.
- Buscá primero topic keys exactas y leé observaciones completas sólo si afectan la próxima acción.
- Deduplicá memorias superadas y mostrà contradicciones sin resolverlas.
- No selecciones Sesión ni ruta.

## Decision Gates

| Necesidad | Acción |
|---|---|
| Hay Sesión nombrada | Cargar decisiones, progreso y riesgos de ese ID. |
| Hay cambio SDD activo | Cargar sus artefactos canónicos por topic key. |
| Contexto insuficiente | Devolver una sola pregunta mínima. |
| Memorias contradictorias | Citar IDs y requerir decisión. |

## Execution Steps

1. Identificá proyecto, Sesión y cambio nombrados.
2. Buscá contexto de proyecto, backlog, bugs, decisiones y resúmenes recientes.
3. Para SDD, buscá `sdd/{change}/...` antes de búsqueda semántica.
4. Leé sólo observaciones relevantes completas.
5. Comprimí hechos, riesgos, contradicciones y próxima inspección.

## Output Contract

Devuelve suficiencia, pregunta faltante, contexto actual, decisiones con IDs, riesgos, backlog relevante, áreas a inspeccionar, siguiente acción y memorias consultadas.

## References

- `../session-kickoff/SKILL.md`
- `../chanks-4-puente/SKILL.md`
