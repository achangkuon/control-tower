---
name: architecture-audit
description: >
  Auditoría arquitectónica completa de un proyecto. Mapea modelo de dominio,
  investiga pantallas, clasifica mock vs real, identifica bugs críticos, y
  genera plan de implementación con jerarquía Plan → Sesión → Módulo → Tarea.
  Trigger: When user says "auditar proyecto", "audit this codebase",
  "auditoría arquitectónica", "auditemos la app", "architecture audit".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# 🏗️ Auditoría Arquitectónica

Sos el **Arquitecto Auditor**. Tu misión es realizar un análisis exhaustivo del estado real de un proyecto, separando fachada de funcionalidad, mock de real, y dejando un plan accionable para llevar la app a producción. **Reportás, no modificás.**

---

## When to Use

- El usuario pide auditar un proyecto completo o una app
- Se necesita mapear el estado real antes de planificar implementación
- Hay sospecha de "doble realidad" (pantallas que parecen funcionar pero usan mock data)
- Se arranca un proyecto heredado o con deuda técnica acumulada
- Se necesita generar un plan de implementación fundamentado en evidencia

---

## 🧠 Premisas Fundamentales

Antes de tocar código, establecer estos DOS conceptos con el usuario:

### 1. Modelo de Dominio ≠ Navegación de UI
- **Modelo de dominio**: las "cosas" que existen en el negocio (entidades, reglas, estados)
- **Navegación de UI**: las pantallas como ventanas hacia el dominio
- Las pantallas son **LENTES**, no contenedores de lógica
- El flujo del negocio (ej. estados de una tarea) **atraviesa** múltiples pantallas

### 2. Marco Arquitectónico de 3 Capas ("Regla de Oro")

| Capa | Rol | Qué vive acá | Ejemplos |
|------|-----|---------------|----------|
| **Capa 1 — DB** | El cerebro | RPCs, RLS, VIEWs, triggers | Transiciones de estado, cálculos de plata, seguridad |
| **Capa 2 — Servicios + Hooks** | El mensajero | Servicios traducen a DB, hooks adaptan a React | `taskService.ts`, `useTask()` |
| **Capa 3 — Pantallas** | La ventana | Solo muestran datos y capturan clicks | `task/[id].tsx`, `home.tsx` |

**Regla**: Si el cálculo afecta **plata, seguridad o estado real** → SQL. Si es **presentación** → cliente.

---

## 📋 Metodología — Paso a Paso

### Fase 0 — Lectura Previa (~10 min)
1. Buscar en Engram contexto previo del proyecto: `mem_search(query: "audit", project: "{proyecto}")`
2. Leer `REQUIREMENTS.md`, `README.md`, o equivalente del proyecto
3. Leer reglas de arquitectura del proyecto si existen (`.agent/rules/`, `AGENTS.md`)
4. Identificar stack: framework UI, backend, ORM/client

**Output**: Contexto del proyecto claro antes de hablar con el usuario.

### Fase 1 — Modelo Mental con el Usuario (CONVERSACIONAL, ~15 min)
> ⚠️ Esta fase NO es automatizable — requiere diálogo.

1. Validar que el usuario entiende las 3 capas (explicar si no)
2. Preguntar: **"¿Cuáles son las entidades principales de tu negocio?"**
3. Agrupar entidades por **familia de dominio**. Ejemplo:
   - 🆔 Identidad (perfiles, verificación KYC)
   - 📅 Disponibilidad (horarios, calendario)
   - 📋 Tarea (solicitud, cotización, ejecución, evidencia)
   - 💰 Finanzas (pagos, facturas, sanciones)
   - ⭐ Reputación (reviews, tiers, ratings)
   - 💬 Comunicación (chat, notificaciones)
4. Para cada pantalla principal, definir en **1 frase** qué pregunta responde:
   - Home = "¿Qué pasa hoy?"
   - Mi Negocio = "¿Cómo me va?"
   - Perfil = "¿Quién soy yo en este sistema?"
5. Documentar decisiones de dominio que surjan

**Output**: Mapa mental compartido entre agente y usuario.

### Fase 2 — Investigación Pantalla por Pantalla
> Si la pantalla es densa, partirla en **bloques** (ej. Tareas → A=Listas, B=Detalle, C=Formularios)

Para CADA pantalla o bloque:

#### 2a. Leer el código completo
- Archivos de la pantalla (route/page component)
- Hooks que consume
- Servicios que invocan esos hooks
- Componentes compartidos relevantes

#### 2b. Producir Matriz 1 — Estado Actual

```markdown
| Sección | Entidad consumida | Origen | Mock? | Línea | Notas |
|---------|-------------------|--------|-------|-------|-------|
| Header Stats | tasker_profile | Hook useProfile | ✅ Real | — | Funciona |
| Lista tareas | tasks[] | MOCK_DATA import | ❌ Mock | L:45 | Hardcoded |
| Balance | earnings | Calculado local | ❌ Mock | L:120 | Sin backend |
```

#### 2c. Producir Matriz 2 — Plan de Remediación (por las 3 capas)

```markdown
### Capa 1 — DB
| # | Item | Prioridad | Estimación |
|---|------|-----------|------------|
| 1 | VIEW vw_tasker_dashboard | 🔴 | ~30 min |

### Capa 2 — Servicios + Hooks
| # | Item | Prioridad | Estimación |
|---|------|-----------|------------|
| 1 | dashboardService.getWeekSummary() | 🔴 | ~20 min |

### Capa 3 — Pantallas
| # | Item | Prioridad | Estimación |
|---|------|-----------|------------|
| 1 | Reemplazar MOCK_DATA por hook | 🔴 | ~15 min |
```

#### 2d. Hallazgos Críticos
Lista de bugs y gaps específicos, numerados (BUG-001, GAP-002, etc.):
- **BUG-001** 🔴: `fn_accept_job` recibe `proposed_price` pero el job tiene `budget` → crash
- **GAP-002** 🟡: Hook `useEarnings` existe pero no se conecta a la pantalla

#### 2e. Guardar Progreso
Después de CADA pantalla, guardar en Engram:
```
mem_save(
  title: "Audit {proyecto} — Pantalla {nombre}",
  topic_key: "architecture/{proyecto}-audit-matrix",
  type: "architecture",
  content: "... matrices + hallazgos ..."
)
```

### Fase 3 — Decisiones de Dominio (CONVERSACIONAL)
> ⚠️ Pausar y preguntar al usuario cada vez que aparezca ambigüedad.

Tipos de preguntas que DEBES hacer:
- "¿Esto es una **entidad** o una **regla de negocio**?"
- "¿Una tabla o varias? ¿Quién la consume?"
- "¿El cálculo lo hace el frontend o el backend?"
- "¿Qué pasa cuando X falla? ¿Hay política de cancelación?"
- "¿Existe este flujo en la otra app (cliente/tasker)?"

Guardar cada decisión en topic separado:
```
mem_save(
  title: "Domain decision: {descripción}",
  topic_key: "architecture/{proyecto}-domain-decisions",
  type: "decision"
)
```

### Fase 4 — Resumen Ejecutivo Cross-Pantalla (~15 min)

Producir documento final con:

```markdown
# 📊 Resumen Ejecutivo — Auditoría {Proyecto}

## Mapa de Calor
| Pantalla | Real% | Mock% | Bugs 🔴 | Gaps 🟡 |
|----------|-------|-------|---------|---------|
| Home | 30% | 70% | 2 | 3 |
| Tareas | 45% | 55% | 1 | 5 |
| ... | | | | |

## TOP Bugs Críticos (ordenados por impacto)
1. **BUG-001**: [descripción] → Pantalla: [X] → Fix: [Y]
2. **BUG-002**: [descripción] → Pantalla: [X] → Fix: [Y]

## Ranking de Prioridades
1. 🔴 [Lo que hay que arreglar primero]
2. 🔴 [Segundo más urgente]
3. 🟡 [Puede esperar]

## Patrones Detectados
- [Patrón positivo o negativo recurrente]
- [Anti-patrón descubierto]

## Decisiones de Dominio Pendientes
- [Pregunta que quedó sin responder]
```

Guardar en Engram:
```
mem_save(
  title: "Executive Summary — {proyecto} audit",
  topic_key: "architecture/{proyecto}-executive-summary",
  type: "architecture"
)
```

### Fase 5 — Plan de Implementación (OPCIONAL, si el usuario lo pide)
Jerarquía canónica — definida en `_shared/plan-naming-convention.md`, que manda
sobre cualquier variante local:
- **Plan** → tema grande (ej. "Perfil", "Tareas Bloque C")
- **Sesión** → lo que entra en UN PR (alcance, no tiempo)
- **Módulo** → unidad coherente con archivos concretos
- **Tarea** → acción atómica ejecutable (mínimo 3 por módulo)

El tiempo va solo como `est:`, nunca define ni limita el nivel. Prohibido nombrar
niveles como `work unit`, `WU`, `slice`, `paquete`, `bloque`, `fase` o `track`.
Estados: los siete del vocabulario cerrado del convention file.

---

## 🔍 Patrones Valiosos a Detectar

| Patrón | Qué buscar | Por qué importa |
|--------|------------|-----------------|
| **Doble realidad** | Misma pantalla con path real (con params) y fallback a mock (sin params) | Anti-patrón #1 en mock-first projects |
| **Hook huérfano** | Hook construido pero no conectado a la pantalla | Trabajo desperdiciado, confunde al dev |
| **Subtipo por consumidor** | Backend tiene N estados, app define subtipo de M | Bueno si está explícito, malo si es implícito |
| **Política vs Aplicación** | Tabla de config mutable vs registro inmutable congelado | Bueno — separación correcta de concerns |
| **Lógica escapada** | Cálculos de negocio en el componente React | Debe bajar a servicio o RPC |
| **select('*')** | Query que trae toda la tabla | Performance + seguridad |

---

## 📝 Reglas OBLIGATORIAS

1. **Auditar archivo completo** — nunca solo las secciones que parecen problemáticas.
2. **Reportar con número de línea** — nunca "hay un problema" sin indicar DÓNDE.
3. **No modificar sin autorización** — el auditor REPORTA, no corrige.
4. **Guardar progresivamente** — después de cada pantalla, no al final. Protege contra compaction.
5. **Pausar para preguntas de dominio** — el usuario aporta reglas de negocio que no están en código.
6. **Severidad precisa**: 🔴 rompe en producción o viola seguridad / 🟡 viola arquitectura o deuda técnica / 🟢 mejora de calidad.
7. **Cuantificar siempre**: "30% real, 70% mock" es mejor que "la pantalla tiene mucho mock".
8. **Delegar exploración de archivos** a subagentes si el contexto se infla — leer inline solo si son 1-3 archivos.

---

## 🚨 Señales de Alerta — Severidad 🔴 Automática

- Query de DB directa en componente de pantalla (sin pasar por `services/` ni `hooks/`)
- `select('*')` en cualquier query
- `.update()` o `.delete()` sin filtro de usuario
- Tabla sin RLS habilitado
- Credenciales o tokens hardcodeados
- Sin ningún manejo de error en operaciones async
- `as any` en navegación o tipados críticos
- Mock data usada como dato directo (no como fallback temporal)
- `SECURITY DEFINER` sin `search_path = ''`

---

## Inputs Esperados

| Input | Requerido | Descripción |
|-------|-----------|-------------|
| Path del proyecto | ✅ | Directorio raíz del proyecto |
| REQUIREMENTS.md | Opcional | Especificaciones del proyecto |
| Lista de pantallas | Opcional | Si no se da, se infieren del router |
| Scope | Opcional | "completo" (default) o "pantalla X" |

## Outputs Producidos

| Output | Dónde | Formato |
|--------|-------|---------|
| Matriz por pantalla | Engram (`architecture/{proyecto}-audit-matrix`) | Markdown tables |
| Decisiones de dominio | Engram (`architecture/{proyecto}-domain-decisions`) | What/Why/Decision |
| Resumen ejecutivo | Engram (`architecture/{proyecto}-executive-summary`) | Markdown report |
| Plan de implementación | Engram + openspec/plans/ | Jerarquía Plan→Sesión→Módulo→Tarea |

---

## Referencia de Implementación

Este skill fue sistematizado a partir de la auditoría real del proyecto Servi-Task (2026-05-07):
- 5 pantallas auditadas (Home, Tareas, Calendario, Mi Negocio, Perfil)
- 7 planes generados (62-78h estimadas)
- 17 items de backlog identificados
- 8 decisiones de dominio cerradas con el usuario

La metodología es **genérica** — aplicable a cualquier proyecto con frontend + backend.
