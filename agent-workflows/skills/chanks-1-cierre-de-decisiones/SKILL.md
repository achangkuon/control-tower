---
name: chanks-1-cierre-de-decisiones
description: "Trigger: Chanks etapa 1, cerrar las decisiones abiertas de una Sesión, decision sweep. Presenta resoluciones humanas y returns a bounded delta to the responsible parent."
license: Apache-2.0
metadata:
  author: achangkuon
  version: "2.0"
---

## Activation Contract

Activa sólo ante un new explicit human request para resolver la decisión nombrada de una Sesión o distinguirla de una dependencia. Una continuación manual rechazada nunca activa este skill.

Es la skill que nombra la tarjeta 🧭 de Etapa 1 (foco = idea) para las dudas abiertas: no hay
propuesta de alcance mientras queden preguntas sin cerrar con el humano.

## Hard Rules

- Nunca leas `openspec/plan.yaml` entero. Consumí evidencia fresca del Radar instalado:
  `radar sesion <ID>` para la Sesión nombrada; `radar status --json` sólo para el resumen.
  La memoria de Gentle AI sólo corrobora, nunca reemplaza Radar.
- El pedido debe nombrar la decisión y ser separado de cualquier intento de start, continue o
  resume; esto nunca permite saltar evidencia que impide el trabajo. V1 no tiene paso de admisión.
- Presentá una pregunta humana por vez, con consecuencias reales y una recomendación.
- No respondas por el maintainer ni amplíes el alcance de una resolución.
- No escribas plan, estado, porcentajes, registro ni vista.
- Cerrá las dudas abiertas con el humano antes de proponer cualquier escritura en
  `openspec/plan.yaml`. No escribas en `plan.yaml` sin aprobación humana.
- Convertí resoluciones en un delta con precondición y devolvelo al responsible parent.
- Una resolución no garantiza ejecución: el estado se recalcula desde todos sus datos.

## Decision Gates

| Situación | Acción |
|---|---|
| No hay política de entrega declarada | Cargar `chanks-5-politica-de-entrega`. |
| La pregunta pertenece a una clase que siempre escala | Exigir respuesta humana. |
| La decisión carece de Sesión dueña | Incluir deuda de enumeración en el delta. |
| El impedimento es una dependencia | Reportarlo aparte; no contarlo como decisión resuelta. |
| La precondición cambió | No enviar un delta stale. |

## Execution Steps

1. Ejecutá `radar sesion <ID>` y extraé decisiones abiertas, autoridad, evidencia, opciones,
   checkpoint y contaminación de esa Sesión.
2. Auditá el conjunto y declarà el alcance exacto del conteo.
3. Ordená por impacto y presentá una pregunta por vez.
4. Formateá cada respuesta según `assets/resolution-entry.md`.
5. Construí un delta con valor anterior esperado y resolución nueva; devolvelo al responsible parent.
6. Pedí evidencia de `radar check` y `radar render` después de que el parent registre la confirmación; reportá decisiones, dependencias y residuos por separado.

## Output Contract

Devuelve alcance auditado, decisiones presentadas/resueltas, delta enviado, resultados de `radar`, residuos no decisionales y decisiones todavía abiertas.

## References

- `assets/resolution-entry.md`
- `../_shared/plan-naming-convention.md`
- `../chanks-5-politica-de-entrega/SKILL.md`
