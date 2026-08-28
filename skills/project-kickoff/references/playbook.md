# Playbook — Arranque de Proyecto (detalle por fase)

Método completo que orquesta `project-kickoff`. Cada fase tiene un gate de review: escribís, parás, esperás el OK del usuario.

## Filosofía rectora

- **Producto antes que tecnología.** No se elige stack sin saber QUÉ se construye. El PRD manda.
- **Right-sizing (fit sobre hype).** La herramienta correcta es la que encaja con el PROBLEMA, no la más potente/enterprise. Sobre-arquitecturar es deuda, no robustez. Ejemplos de pushback: NoSQL para datos relacionales/financieros; backend de alta concurrencia para un volumen chico; framework enterprise para un solo dev iterando sobre un producto aún no definido; VPS+Docker cuando un PaaS elimina la carga operativa.
- **Conceptos > código.** Entender antes de construir. No empezar a codear features hasta tener REQUIREMENTS.
- **No yes-man.** Verificar antes de afirmar. Si el usuario se equivoca en algo importante, explicar el PORQUÉ con evidencia.

## Fase 0 — Entender el producto

- Si hay material (docs, un MVP, una carpeta `References/`): leerlo PRIMERO y extraer el negocio (qué es, para quién, dolor, datos, métricas).
- Si no hay material: entrevistar con `brain-dump` — dejar que el usuario haga su volcado sin interrumpir.
- Un MVP existente es ORO: su lógica suele ser la fuente de verdad de cálculo. No tirarlo — ascenderlo a referencia/spec.
- Guardar el contexto del negocio en engram (`type: discovery`).

## Fase 1 — Terreno de agentes

Crear (plantillas en `assets/`):
- `CLAUDE.md` — contexto + reglas críticas (commits/ramas, DoD <400 LOC, no placeholders, review por riesgo) + sección Auto-invoke generada.
- `AGENTS.md` — coding standards (capas, empty states, lógica de negocio en la capa de datos) + Auto-invoke generada.
- `scripts/skill-sync.mjs` — generador del router (lee `skills/*/SKILL.md` → regenera tablas).
- `.claude/skills/` invocables: `judgment-day` (dual review), `brain-dump`, `planificador-granular`.
- `skills/` auto-load: VACÍA hasta decidir el stack (las skills de dominio dependen del stack).
- `openspec/` con `README.md` (constitución de persistencia) + `plans/master-index.md`.
- `git init` + `.gitignore` + commit inicial (convención: `tipo(usuario): desc en español`, sin atribución a IA).

Portar de un repo existente SOLO lo agnóstico (convenciones, router, judgment-day). Las skills de dominio se reescriben para el stack nuevo — no se copian las de otro stack.

## Fase 2 — PRD (producto)

- Usar `cognitive-doc-design`. Enfocar 100% en producto: qué, para quién, por qué, alcance V1 vs futuro, fuentes de datos, funcionalidades, métricas de éxito, criterios de aceptación. CERO tecnología.
- Si el alcance V1 es ambiguo, `AskUserQuestion` con opciones (esencial / medio / completo) — recomendar lo más chico que entrega valor.
- Guardar en `openspec/prd/`. Gate de review.

## Fase 3 — RFC (tecnología)

- Recién acá se decide el stack, INFORMADO por el PRD. Right-sized.
- Si el usuario ya tiene un stack en mente, evaluarlo con honestidad: qué encaja, qué no, alternativas con tradeoffs. Separar "calidad de la herramienta" de "fit con el problema".
- Cubrir: stack, forma del repo (single app vs monorepo — YAGNI por defecto), modelo de datos, dónde corre la lógica, auth/seguridad, deploy, testing. Listar alternativas descartadas con su razón.
- Una segunda opinión externa (otra IA) se usa para FORTALECER, no para copiar: el prompt debe llevar el contexto y las restricciones propias para que la respuesta encaje. Reconciliar lo bueno, descartar lo que no aplica, completar lo que le faltó.
- Guardar en `openspec/rfc/`. Gate de review.

## Fase 4 — REQUIREMENTS (detalle técnico)

- El detalle que la IA necesita para construir sin ambigüedad: DDL de tablas, mapeos de datos (origen → campo), fórmulas exactas, contratos de funciones/endpoints, criterios de aceptación técnicos.
- Si hay un MVP, derivar de ahí y poner un gate de tests: "los números deben coincidir con el MVP".
- Guardar en `openspec/specs/`. Gate de review.

## Fase 5 — Roadmap + cierre

- `master-index.md` = hoja de ruta (fuente de verdad). Formato y vocabulario los fija `_shared/plan-naming-convention.md` — es canónico y manda sobre este playbook. Resumen: granularidad Plan → Sesión (1 PR) → Módulo → Tarea con el tiempo solo como `est:`, **§Punto de retoma primero** (se reescribe entero al cerrar cada Sesión, no acumula historial), tabla "Estado de un vistazo" con los siete estados cerrados, y una fila por Plan (el detalle de Sesiones vive en el `STATUS.md` del plan).
- Vincular con engram: cada `mem_session_summary` lleva un bloque `## Archivo de referencia` apuntando a `master-index.md` → §Punto de retoma. Así la próxima sesión no arranca a ciegas.
- Construir: invocar `planificador-granular` para el plan detallado de la primera sesión. Arrancar por los CIMIENTOS (modelo de datos + ingesta/ETL), no por la UI.

## Composición con otras skills

- `cognitive-doc-design` → escribir los docs claros.
- `skill-creator` → crear cualquier skill que falte.
- `brain-dump` / `planificador-granular` → entrevistar y planificar sesiones.
- `judgment-day` → review adversarial cuando se construye lógica delicada.
- `session-kickoff` → orquestar una sesión de build individual (más abajo que esta skill).
