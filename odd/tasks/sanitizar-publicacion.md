# Sanitizar control-tower para publicación pública

## Objetivo
Eliminar toda referencia a los proyectos personales del mantenedor y a su
entorno local de los archivos actuales del repo, antes de hacerlo público.
El historial de git NO se reescribe (decisión D1: identidad visible, sin
reescritura).

## Decisiones del mantenedor (2026, sesión de publicación)
- D1: mantener identidad de commits (sin acción).
- D2: quitar/anonimizar mapas de Notion (2 archivos).
- D3: reemplazar `/home/emili` → `/home/<usuario>` en archivos rastreados.
- D4: reemplazar menciones a proyectos personales por nombres genéricos.

## Mapping de reemplazo (consistente en fixture + tests + docs)
- `Servi-Task-U`, `servitask`, `servi-task`, `Servi Task`, `Servitask` → `Proyecto-Alpha` / `proyecto-alpha` / `Proyecto Alpha` (según contexto y casing)
- `ecom-ecuador`, `Ecom-Ecuador`, `ECOM-EC`, `torreecom` → `proyecto-beta` / `Proyecto-Beta` / `torrebeta`
- `Finanzas-Personales`, `finanzas-personales`, `torrefp` → `proyecto-gamma` / `Proyecto-Gamma` / `torregamma`
- `torrestk` → `torrealpha`
- Mapas de Notion: URLs/IDs → placeholders `https://notion.example/p/<slug>-<id>` con nota de ejemplo
- `/home/emili` → `/home/<usuario>`

## Tasks
- [ ] T1 — Reemplazo mecánico en archivos rastreados (D3 + D4) según mapping, incluyendo renombrar el directorio `openspec/changes/archive/2026-07-22-servi-task-u-autonomous-continuation-provenance` y actualizar `INDEX.md` y referencias.
  - BLOQUEADO (no iniciado): el mantenedor reportó un agente haciendo release sobre Main. La edición de archivos rastreados ensuciaría el checkout de construcción. Esperar a que termine la release y el mantenedor dé la señal.
  - Nota de reanudación: delegar a `gentle-ai-worker` con `repository_root: /home/emili/projects/control-tower/Main` (el repo git real, no el directorio padre) y la sección `## Allowed edit surfaces` con globs acotados (agent-workflows/**, product/tower/generic/**, test/fixtures/**, docs/**, openspec/**, odd/tasks/**, bin/torre).
- [ ] T2 — Anonimizar los dos `project-notion-map.json` (agent-workflows/skills/chanks-5-session-doc/assets y product/tower/generic/skills/chanks-7-session-doc/assets) con entradas de ejemplo.
- [ ] T3 — Verificación: suites enfocadas (render.test.mjs, test_builder_flow.py, fixtures de schemas) + re-grep de patrones → cero coincidencias en HEAD.
- [ ] T4 — Commit work-unit (requiere autorización explícita del mantenedor; política del repo: no commit sin pedido humano).

## Evidencia
(registrada por tarea al completar)
