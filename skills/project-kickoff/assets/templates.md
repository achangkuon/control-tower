# Plantillas de arranque

Esqueletos para copiar y rellenar. El detalle de cómo llenarlos está en `references/playbook.md`. Reemplazá `{...}`.

---

## CLAUDE.md

```markdown
# {Proyecto} — Contexto del Proyecto

## Qué es esto
{Una frase: qué es, para quién, qué problema resuelve. Decisiones firmes del dueño.}
Contexto completo: {dónde vive (References/, MVP, engram)}.

## Stack
⏳ Sin definir hasta el RFC. Producto antes que tecnología. Reglas de abajo = agnósticas del stack.

## Secuencia de arranque
1. Esqueleto de agentes  2. PRD  3. RFC (stack)  4. REQUIREMENTS  5. Construir

## Reglas Críticas (no negociables)
- Ramas: `feat/usuario/`, `fix/usuario/`, `chore/usuario/`. Nunca commits directos a `main`.
- Commits: `tipo(usuario): descripción en español`. Conventional, SIN atribución a IA.
- No placeholders: Empty State con CTA, nunca mock como dato real.
- DoD: ningún archivo de código > 400 LOC (orquestador < 200); responsabilidad única;
  cero acceso a datos en la vista/rutas; cero tipos laxos; cero mock como real.
- 1 PR por sesión completa de un plan.

## Review por riesgo
| Cambio | Review |
| Lógica de negocio, seguridad, datos | judgment-day |
| Refactor medio, componente nuevo | fresh review |
| Docs, rename, trivial | gate de tipado/lint |

## Persistencia (openspec ↔ engram)
openspec/ = verdad. Engram = puntero (resumen + ruta, no contenido). master-index.md = estado.

## Skills
- Invocables (.claude/skills/): judgment-day, brain-dump, planificador-granular.
- Auto-load (skills/): vacía hasta el stack. Router generado: `node scripts/skill-sync.mjs`.

### Auto-invoke (generado)
<!-- BEGIN AUTO-INVOKE (generado por scripts/skill-sync.mjs — no editar a mano) -->
<!-- END AUTO-INVOKE -->
```

---

## AGENTS.md

```markdown
# {Proyecto} — Coding Standards for AI Review

> Reglas para todos los agentes. Stack/estructura en `openspec/rfc/`.

## 1. Tipado estricto (si el stack es tipado)
Sin tipos laxos. Parámetros/retornos explícitos. DTOs en su capa.

## 2. Capas de arquitectura
Acceso a datos SOLO en la capa de datos — nunca en vistas/rutas/componentes.
Lógica compartida en su capa, consume datos. UI recibe por props. Cliente de datos centralizado.

## 3. Empty states — sin datos hardcodeados
Empty State con CTA. Loading y error manejados. Nada de mock como real.

## 4. Tamaño/responsabilidad
Ningún archivo > 400 LOC. Una responsabilidad. Aplica a archivos nuevos.

## 5. Lógica de negocio
Fórmulas/cálculos en la capa de datos, con tests. Referencia canónica: {MVP si existe}.

## 6. Migraciones / commits / ramas / workflow
{Reglas de DB, commits `tipo(usuario):`, ramas, 1 PR por sesión.}

<!-- BEGIN AUTO-INVOKE (generado por scripts/skill-sync.mjs — no editar a mano) -->
<!-- END AUTO-INVOKE -->
```

---

## openspec/README.md (constitución de persistencia)

```markdown
# openspec/ — Persistencia
openspec/ = único hogar de los .md de trabajo (plans/, prd/, rfc/, specs/, changes/).
Engram = puntero: resumen corto + RUTA del archivo, nunca el contenido completo.
Cierre de sesión: mem_session_summary con bloque `## Archivo de referencia`.
Estado del proyecto: plans/master-index.md.
```

---

## PRD — openspec/prd/prd-v1.md

```markdown
# PRD — {Proyecto} V1: {Título}
**Qué es / Para quién / Por qué importa.** (Solo producto, cero tecnología.)

## 1. El problema
## 2. Objetivo de V1 (tabla: objetivo, resultado esperado, decisiones firmes)
## 3. Alcance: qué ES y qué NO ES V1 (✅ incluye / ❌ diferido)
## 4. Usuario (persona)
## 5. Métricas de éxito (checklist)
## 6. Fuentes de datos / entradas
## 7. Funcionalidades (F1, F2... cada una: qué responde + qué decisión habilita)
## 8. Diferido (futuro, con razón)
## 9. Restricciones y supuestos
## 10. Riesgos
## 11. Criterios de aceptación (checklist)
## 12. Siguiente paso → RFC
```

---

## RFC — openspec/rfc/rfc-v1.md

```markdown
# RFC — {Proyecto} V1: Decisiones Técnicas
**Qué decide / Principio rector (right-sizing).**

## 1. Resumen de decisiones (tabla: Área | Decisión | Por qué en 1 línea)
## 2. Stack en detalle
## 3. Forma del repo + estructura LOCKEADA (árbol de carpetas)
## 4. Modelo de datos
## 5. Dónde corre la lógica (ETL/servicios)
## 6. Cálculo de negocio (dónde vive)
## 7. Auth y seguridad
## 8. Deploy y CI
## 9. Testing (gate vs MVP si existe)
## 10. Alternativas consideradas y descartadas (con razón)
## 11. Riesgos técnicos
## 12. Decisiones abiertas
## 13. Siguiente paso → REQUIREMENTS
```

---

## REQUIREMENTS — openspec/specs/requirements-v1.md

```markdown
# REQUIREMENTS — {Proyecto} V1
**Fuente de verdad de la lógica: {MVP/pipeline si existe}.**

## 1. Modelo de datos (DDL por tabla: tipos, índices, seguridad)
## 2. Mapeo de fuentes (origen → campo) por cada entrada
## 3. Reglas de parseo/transformación
## 4. Fórmulas (tabla: métrica | fórmula)
## 5. Vistas/funciones a crear
## 6. Contratos de funciones/endpoints (input, validación, output)
## 7. Rutas → qué consume cada vista
## 8. Criterios de aceptación técnicos (gate: coincide con el MVP)
## 9. Notas / decisiones abiertas
## 10. Siguiente paso → construir
```

---

## master-index.md — openspec/plans/master-index.md

Formato canónico: `_shared/plan-naming-convention.md`. Secciones fijas, en este orden.

```markdown
# Índice Maestro — {Proyecto}

> Fuente técnica de verdad. Los planes, STATUS.md y artefactos enlazados
> tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: {fecha} contra {rama} {sha}

## 📍 Punto de retoma
{3 a 6 líneas: qué se cerró último, qué sigue, qué decisión está pendiente.
Se reescribe entero al cerrar cada Sesión. NO acumula historial.}

## Granularidad
Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

| ID | Plan | Estado | Est. | Dueño | Qué falta | Ref |
|----|------|--------|------|-------|-----------|-----|
| P2 | {tema} | 🔵 EN CURSO | 12h | {dueño} | S2.3, S2.4 | [plan-2.md](...) |

Estados (cerrados, no se inventan): 📋 PLANIFICADO · 🟢 LISTO · 🔵 EN CURSO ·
🔴 BLOQUEADO · 🟡 DIFERIDO · ✅ COMPLETO · 📚 ARCHIVADO

## 🗂️ Planes archivados
{solo ID, nombre y link. Sin detalle.}

## 🔗 Vínculo con Engram (tabla: topic/título → apunta a)
Cada mem_session_summary lleva `## Archivo de referencia` → este índice (§Punto de retoma).
```
