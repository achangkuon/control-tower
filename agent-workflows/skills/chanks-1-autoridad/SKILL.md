---
name: chanks-1-autoridad
description: "Trigger: Chanks etapa 1 Definir, trabajo de autoridad del plan (alcance aprobado y Zonas), pedido explícitamente. Enruta el trabajo de autoridad a una variante nominal."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa cuando hay que convertir una intención en alcance aprobado, Zonas y autoridad verificable antes de planificar.

## Hard Rules

- Enrutá; no fusiones variantes ni produzcas sus artefactos.
- Conservá decisiones humanas, evidencia y límites de alcance.
- Devolvé todo cambio del dato de planificación como delta confirmado al responsible parent; no escribas el plan.
- No avances a planificación sin aprobación humana del alcance.
- Anunciá el paso a `chanks-2-planificador-granular` sólo con alcance aprobado y evidencia
  de autoridad; el responsible parent conserva toda escritura de `openspec/plan.yaml`.

## Decision Gates

| Entrada | Skill nominal |
|---|---|
| Idea todavía amorfa | `chanks-1-brain-dump` |
| Alcance nuevo sobre producto vivo | `chanks-1-feature` |
| Diagnóstico de producto vivo | `chanks-1-descubrimiento` |
| Partición de producto heredado | `chanks-1-heredado` |
| Repositorio existente sin plan.yaml | `chanks-1-adopcion` |
| Proyecto nuevo desde cero | `chanks-1-project-kickoff` |

## Execution Steps

1. Identificá cuál entrada nominal describe el pedido sin reinterpretarlo.
2. Cargá sólo la skill correspondiente.
3. Conservá su resultado y presentá el alcance para aprobación humana.
4. Con aprobación y evidencia, devolvé el delta aplicable al responsible parent y anunciá
   `chanks-2-planificador-granular` como siguiente etapa, sin reclamar ejecución.

## Output Contract

Devuelve variante elegida, autoridad consultada, alcance aprobado o pendiente, artefactos producidos por la variante, decisiones abiertas y próxima acción.

## References

- `../chanks-2-planificador-granular/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
