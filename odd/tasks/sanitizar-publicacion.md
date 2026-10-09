# Sanitizar control-tower para publicación pública

## Objetivo
Eliminar toda referencia a los proyectos personales del mantenedor y a su
entorno local de los archivos actuales del repo, antes de hacerlo público.
El historial de git NO se reescribe (decisión D1: identidad visible, sin
reescritura).

## Decisiones del mantenedor (2026, sesión de publicación)
- D1: mantener identidad de commits (sin acción).
- D2: quitar/anonimizar mapas de Notion (2 archivos).
- D3: reemplazar la ruta local del mantenedor por `/home/<usuario>` en archivos rastreados.
- D4: reemplazar menciones a proyectos personales por nombres genéricos.

## Mapping de reemplazo (consistente en fixture + tests + docs)
- Los tres nombres de los proyectos personales del mantenedor, con sus variantes de casing, slugs y
  atajos `torre*`, se reemplazan por los nombres genéricos `Proyecto-Alpha`/`proyecto-alpha`,
  `Proyecto-Beta`/`proyecto-beta` y `Proyecto-Gamma`/`proyecto-gamma`; los atajos pasan a
  `torrealpha`, `torrebeta` y `torregamma` respectivamente.
- Mapas de Notion: los `notion_page_id` y `notion_url` reales se reemplazan por placeholders de
  ejemplo `https://notion.example/p/<slug>-0000000000000000000000000000aaNN`.
- Ruta local del mantenedor → `/home/<usuario>`.

## Tasks
- [ ] T1 — Reemplazo mecánico en archivos rastreados (D3 + D4) según mapping, incluyendo renombrar el directorio `openspec/changes/archive/2026-07-22-proyecto-alpha-autonomous-continuation-provenance` y actualizar `INDEX.md` y referencias.
  - BLOQUEADO (no iniciado): el mantenedor reportó un agente haciendo release sobre Main. La edición de archivos rastreados ensuciaría el checkout de construcción. Esperar a que termine la release y el mantenedor dé la señal.
  - Nota de reanudación: delegar a `gentle-ai-worker` con `repository_root: /home/<usuario>/projects/control-tower/Main` (el repo git real, no el directorio padre) y la sección `## Allowed edit surfaces` con globs acotados (agent-workflows/**, product/tower/generic/**, test/fixtures/**, docs/**, openspec/**, odd/tasks/**, bin/torre).
- [x] T2 — Anonimizar los dos `project-notion-map.json` (agent-workflows/skills/chanks-5-session-doc/assets y product/tower/generic/skills/chanks-7-session-doc/assets) con entradas de ejemplo.
- [x] T3 — Verificación: suites enfocadas (render.test.mjs, test_builder_flow.py, fixtures de schemas) + re-grep de patrones → cero coincidencias en HEAD.
- [x] T4 — Commit work-unit con autorización explícita del mantenedor (dada el 2026-10-08, opción 1: commit de sanitización primero, integración de S243 encima).
  - Verificación T3 aplicada antes del commit: re-grep de patrones → 0 coincidencias (excluyendo este documento), render.test.mjs 19/19, contratos 164/164; los 2 fallos conocidos de test_builder_flow.py son fallout de S242 resuelto en la rama s243-review-base que integra encima.

## Evidencia
(registrada por tarea al completar)
