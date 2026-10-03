---
name: chanks-1-adopcion
description: "Trigger: Chanks etapa 1, adoptar plan.yaml en un repo existente sin plan, congelar historia, partición existente. Adopta el modelo de plan en un repo existente sin migrar su historia cerrada."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa cuando un repositorio existente ya tiene documentos de planificación y hay que
adoptar `plan.yaml` + Zonas + Radar sin migrar esa historia. No aplica a un proyecto
nuevo: usá `chanks-1-terreno`/`chanks-1-project-kickoff`.

## Hard Rules

- Cargá `../chanks-1-heredado/SKILL.md` para el paso 1 (partición); no repitas sus
  reglas ni las de §18 acá — citá `../_shared/plan-naming-convention.md` §18.
- Migración full-fidelity de historia cerrada NO es una opción: es excepción histórica
  de este mismo repo, no plantilla. Autorá sólo Sesiones abiertas, bloqueadas o
  diferidas; el trabajo cerrado nunca se vuelve fila.
- Congelá el corpus legacy byte a byte bajo `openspec/archive/legacy-planning/` en un
  commit que mueve, no copia: el árbol vivo no conserva ningún archivo que declare
  progreso.
- No escribís `plan.yaml`: devolvé al responsible parent un delta de adopción
  confirmado y esperá aprobación humana del alcance.
- Leé `references/errores-conocidos.md` sólo cuando aparezca uno de sus síntomas (vista retirada con
  consumidores, suite en rojo tras mover el corpus, advertencia de Radar ya aceptada, `radar` que no
  corre como está documentado); no repitas sus errores.
- Leé evidencia de un plan existente mediante `radar status --json`, `radar zonas` y
  `radar sesion <ID>` por Sesión elegida; nunca leas `openspec/plan.yaml` entero.
- No importes gates personales ni reglas de archivos históricos. Registrá aprobaciones y
  advertencias aceptadas con su evidencia; validá las rutas canónicas y cero fallos, no un
  conteo fijo de tests.

## Decision Gates

| Situación | Acción |
|---|---|
| Repo existente sin `plan.yaml` | Aplicar esta skill |
| Proyecto nuevo desde cero | Enrutar a `chanks-1-terreno`/`chanks-1-project-kickoff` |
| Partición ya verificada (Zonas/Cimientos) | Saltar el paso 1, ir a autoría de trabajo vivo |
| Vista legacy con consumidores o ramas activas sin migrar | No retirarla todavía; migrar consumidores primero |
| `depende_de` apunta a trabajo ya cerrado | Eliminar la referencia |

## Execution Steps

Los cuatro pasos son §18 del canon; acá sólo el orden y los gates propios de esta skill.

1. Cargá `../chanks-1-heredado/SKILL.md` y ejecutá su paso 1 (partición desde
   `git ls-files`, validada con `radar zonas`/`radar check`) antes de leer un legacy.
2. Paso 2: autorá sólo Sesiones abiertas/bloqueadas/diferidas como filas de `plan.yaml`.
3. Gate previo al paso 3: inventariá consumidores de cada vista a retirar (parsers,
   tests y automatizaciones del proyecto) y ramas/worktrees que le escriben; migralos en
   un commit propio antes de congelar.
4. Paso 3: congelá el corpus (ver Hard Rules) y registrá en `AGENTS.md` qué se movió.
5. Paso 4: eliminá cada `depende_de` que apunte a trabajo ya cerrado.
6. Actualizá en la misma entrega las instrucciones del proyecto para todos los runtimes
   (`AGENTS.md` y `CLAUDE.md`): ningún bloque viejo debe seguir instruyendo el modelo
   anterior.
7. Devolvé el delta al responsible parent para aprobación humana y `radar check`/`render`.

## Output Contract

Devolvé: partición heredada de `chanks-1-heredado`; filas de trabajo vivo propuestas;
consumidores y ramas/worktrees inventariados por vista a retirar; plan de
congelamiento del archivo con su índice; dependencias eliminadas; archivos de agentes
a actualizar; delta de adopción; aprobación humana pendiente o dada; riesgos con evidencia, citando
`references/errores-conocidos.md` cuando aplique.

## References

- `../_shared/plan-naming-convention.md` §18 (adopción) y §19 (inventario de skills)
- `../chanks-1-heredado/SKILL.md`
- `references/errores-conocidos.md`
- Radar instalado: `radar zonas`, `radar status --json`, `radar sesion <ID>`, `radar check`, `radar render`.
