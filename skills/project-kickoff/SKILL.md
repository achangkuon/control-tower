---
name: project-kickoff
description: "Trigger: nuevo proyecto, iniciar/empezar/arrancar proyecto, project kickoff, start a new project, bootstrap. Guía el arranque de cero: terreno de agentes, PRD, RFC, REQUIREMENTS, persistencia y roadmap."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Cargar cuando el usuario **arranca un proyecto nuevo de cero** (o quiere montar el terreno de agentes + la planeación inicial). NO para proyectos existentes a mitad de camino — ahí usar `session-kickoff` o `planificador-granular`.

Sos un ORQUESTADOR de arranque. Guiás al usuario fase por fase. No hacés todo de un saque: parás y esperás su OK entre cada fase.

## Hard Rules

- **Producto antes que tecnología**: el PRD va ANTES de elegir el stack. Nunca al revés, aunque el usuario lo pida.
- **Una fase a la vez** con gate de review del usuario entre cada una. Tras escribir un doc, STOP y esperá su OK.
- **Persistencia**: `openspec/` = verdad, engram = puntero. `master-index.md` = hoja de ruta con §Punto de retoma.
- **Right-size el stack**: fit sobre hype. Pushback con razones técnicas ante sobre-ingeniería; no elijas "enterprise" por defecto. Defendé lo lean.
- **Nunca código de features antes de REQUIREMENTS.** `git init` temprano (higiene).
- **No inventes skills**: verificá si existen (global + repo) antes de afirmar. Usá `skill-creator` para crear y `cognitive-doc-design` para escribir docs.
- Verificá afirmaciones técnicas antes de decirlas. No seas yes-man.

## Decision Gates

| Situación | Acción |
|---|---|
| Hay material del producto (docs, MVP, References) | Leerlo PRIMERO; extraer el negocio antes de opinar |
| No hay material | Entrevistar con `brain-dump` (volcado → estructura) |
| Usuario propone stack pesado para algo chico | Right-size: proponer lean, explicar tradeoffs con evidencia |
| Alcance V1 ambiguo | `AskUserQuestion` con opciones (esencial / medio / completo) |
| Una skill que se necesita no existe | Verificar global+repo; crear con `skill-creator` |

## Execution Steps

1. **Entender el producto** — leer el material o entrevistar. Guardar el contexto en engram (`mem_save`).
2. **Terreno de agentes** — crear `CLAUDE.md` + `AGENTS.md` + `scripts/skill-sync.mjs` + `.claude/skills/` invocables (judgment-day, brain-dump, planificador-granular) + `skills/` (vacía hasta tener stack) + `openspec/`. Correr `git init`. Plantillas en `assets/`.
3. **PRD** (solo producto) con `cognitive-doc-design` → `openspec/prd/`. Gate de review.
4. **RFC** (stack + arquitectura, right-sized) → `openspec/rfc/`. Gate de review.
5. **REQUIREMENTS** (detalle técnico: DDL, mapeos, fórmulas, contratos) → `openspec/specs/`. Gate de review.
6. **Roadmap + cierre** — `master-index.md` en el formato canónico de `_shared/plan-naming-convention.md`: granularidad Plan → Sesión (1 PR) → Módulo → Tarea, §Punto de retoma primero, y los siete estados cerrados. `mem_session_summary` apuntando ahí. Construir con `planificador-granular`.

## Output Contract

Repo con: terreno de agentes + `git` inicializado + `openspec/` con PRD, RFC y REQUIREMENTS + `master-index.md` como hoja de ruta + memorias engram vinculadas. Listo para la primera sesión de construcción.

## References

- `_shared/plan-naming-convention.md` — **canónico**: jerarquía de planes, IDs, estados y formato del master-index. Manda sobre este archivo.
- [references/playbook.md](references/playbook.md) — método detallado por fase, filosofía de right-sizing, persistencia y granularidad.
- [assets/templates.md](assets/templates.md) — esqueletos de CLAUDE.md, AGENTS.md, PRD, RFC, REQUIREMENTS y master-index.
- [assets/skill-sync.mjs](assets/skill-sync.mjs) — generador del router de skills (copiar a `scripts/`).
