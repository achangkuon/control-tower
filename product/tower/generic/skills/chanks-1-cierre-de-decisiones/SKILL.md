---
name: chanks-1-cierre-de-decisiones
description: "Trigger: decisiones abiertas, cerrar decisiones, decision sweep. Presenta resoluciones humanas y envía un delta acotado a Support."
license: Apache-2.0
metadata:
  author: achangkuon
  version: "2.0"
---

## Activation Contract

Activa cuando el maintainer quiere resolver decisiones abiertas de Sesiones enumeradas o distinguir decisiones de dependencias.

## Hard Rules

- Derivá preguntas y conteos desde `openspec/plan.yaml`; Engram sólo corrobora.
- Presentá una pregunta humana por vez, con consecuencias reales y una recomendación.
- No respondas por el maintainer ni amplíes el alcance de una resolución.
- No escribas plan, estado, porcentajes, registro ni vista.
- Convertí resoluciones en un delta con precondición y envialo a Support.
- Una resolución no garantiza ejecución: el estado se recalcula desde todos sus datos.

## Decision Gates

| Situación | Acción |
|---|---|
| No hay política de entrega declarada | Cargar `chanks-6-politica-de-entrega`. |
| La pregunta pertenece a una clase que siempre escala | Exigir respuesta humana. |
| La decisión carece de Sesión dueña | Incluir deuda de enumeración en el delta. |
| El impedimento es una dependencia | Reportarlo aparte; no contarlo como decisión resuelta. |
| La precondición cambió | No enviar un delta stale. |

## Execution Steps

1. Extraé decisiones abiertas, autoridad, evidencia, opciones, checkpoint y contaminación.
2. Auditá el conjunto y declarà el alcance exacto del conteo.
3. Ordená por impacto y presentá una pregunta por vez.
4. Formateá cada respuesta según `assets/resolution-entry.md`.
5. Construí un delta con valor anterior esperado y resolución nueva; envialo a Support.
6. Pedí evidencia de `radar check` y `radar render`; reportá decisiones, dependencias y residuos por separado.

## Output Contract

Devuelve alcance auditado, decisiones presentadas/resueltas, delta enviado, resultados de `radar`, residuos no decisionales y decisiones todavía abiertas.

## References

- `references/decision-extraction.md`
- `assets/resolution-entry.md`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-6-politica-de-entrega/SKILL.md`
