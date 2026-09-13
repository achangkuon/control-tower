---
name: chanks-1-adopcion
description: "Trigger: migrar repo, adoptar plan.yaml, repo sin plan, adopción, congelar historia, partición existente. Adopta el modelo de plan en un repo existente sin migrar su historia cerrada."
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
- Cargá `references/errores-conocidos.md` antes de ejecutar y no repitas sus errores.

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
   tests, hooks, radiografía, doc-guard) y ramas/worktrees que le escriben; migralos en
   un commit propio antes de congelar.
4. Paso 3: congelá el corpus (ver Hard Rules) y registrá en `AGENTS.md` qué se movió.
5. Paso 4: eliminá cada `depende_de` que apunte a trabajo ya cerrado.
6. Actualizá en la misma entrega los archivos de instrucciones de los cuatro agentes
   (Claude, Codex, opencode, Pi): un bloque viejo con mayor precedencia declarada gana
   sobre el canon correcto aunque también esté instalado.
7. Devolvé el delta al responsible parent para aprobación humana y `radar check`/`render`.

## Output Contract

Devolvé: partición heredada de `chanks-1-heredado`; filas de trabajo vivo propuestas;
consumidores y ramas/worktrees inventariados por vista a retirar; plan de
congelamiento del archivo con su índice; dependencias eliminadas; archivos de agentes
a actualizar; delta de adopción; aprobación humana pendiente o dada; riesgos citando
`references/errores-conocidos.md`.

## References

- `../_shared/plan-naming-convention.md` §18 (adopción) y §19 (inventario de skills)
- `../chanks-1-heredado/SKILL.md`
- `references/errores-conocidos.md`
- `../chanks-0-agente-soporte/SKILL.md`
