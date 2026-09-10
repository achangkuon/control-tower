---
name: chanks-1-project-kickoff
description: "Trigger: proyecto nuevo, project kickoff, arrancar desde cero. Ordena terreno→PRD→RFC→REQUIREMENTS con gates humanos."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa sólo para un proyecto nuevo. Es mini-parent: ordena hijas nominales y sostiene gates humanos; no escribe documentos.

## Hard Rules

- Ejecutá exactamente `chanks-1-terreno` → `chanks-1-prd` → `chanks-1-rfc` → `chanks-1-requirements`.
- Producto precede tecnología: no abras RFC antes de aprobar PRD.
- Después de cada hija, mostrale el resultado al usuario y detenete hasta aprobación explícita.
- No escribas, edites ni sintetices documentos en esta skill.
- No saltees, fusiones ni ejecutes hijas en paralelo.

## Decision Gates

| Resultado de hija | Acción |
|---|---|
| Incompleto o contradictorio | Mantener el gate y devolverlo a la misma hija. |
| Aprobado por el humano | Invocar la siguiente hija nominal. |
| REQUIREMENTS aprobado | Entregar alcance a `chanks-2-planificador-granular`. |

## Execution Steps

1. Invocá `chanks-1-terreno`; mostrale sus artefactos al humano y esperá aprobación.
2. Invocá `chanks-1-prd`; mostrale el PRD y esperá aprobación.
3. Invocá `chanks-1-rfc`; mostrale el RFC y esperá aprobación.
4. Invocá `chanks-1-requirements`; mostrale los requisitos y esperá aprobación.

## Output Contract

Devuelve estado de cada gate, artefactos escritos por cada hija, decisiones pendientes, aprobaciones observadas y handoff a planificación. No devuelve documentos propios.

## References

- `../chanks-1-terreno/SKILL.md`
- `../chanks-1-prd/SKILL.md`
- `../chanks-1-rfc/SKILL.md`
- `../chanks-1-requirements/SKILL.md`
- `../chanks-2-planificador-granular/SKILL.md`
