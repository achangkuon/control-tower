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
- La memoria no decide qué sigue: el estado de cada Sesión lo calcula sólo `radar status`. Nunca propongas trabajo por un cambio viejo ni por el número siguiente a lo entregado.

## Decision Gates

| Necesidad | Acción |
|---|---|
| Hay Sesión nombrada | Cargar decisiones, progreso y riesgos de ese ID. |
| Hay cambio SDD activo | Cargar sus artefactos canónicos por topic key. |
| La memoria apunta a una Sesión | Contrastarla con `radar status`; si no está `LISTO`, informar su estado y bloqueo en vez de proponerla. |
| Se pide qué sigue | Remitir a la cola de `radar status` (sólo Sesiones `LISTO`), según `AGENTS.md`. |
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

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-4-puente/SKILL.md`
