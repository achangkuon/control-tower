---
name: chanks-1-brain-dump
description: "Trigger: Chanks etapa 1, brain dump, volcado de una idea suelta pedido explícitamente. Convierte material amorfo en una propuesta de alcance sin decidir por el usuario."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa cuando existe una idea suelta y todavía no está claro qué producto, problema o alcance representa.

Cuando la tarjeta 🧭 de Etapa 1 (foco = idea) trae una idea suelta, esta skill la ordena sin
cerrar por sí sola ninguna duda de producto.

## Hard Rules

- Dejá terminar el volcado antes de ordenar o cuestionar.
- Separá hechos, hipótesis, deseos, restricciones y decisiones.
- No inventes usuarios, métricas, reglas de negocio, Zonas ni soluciones técnicas.
- Toda decisión de producto sin autoridad queda explícita para gate humano.
- Cerrá las dudas abiertas con el humano antes de proponer cualquier escritura en
  `openspec/plan.yaml`. No escribas en `plan.yaml` sin aprobación humana.

## Decision Gates

| Evidencia | Acción |
|---|---|
| Hay material previo | Leelo antes de entrevistar y citá su procedencia. |
| El problema sigue ambiguo | Hacé una sola pregunta de producto por vez. |
| Hay alcance distinguible | Proponé límites y no-objetivos para confirmación. |
| La idea modifica un producto vivo | Entregá el resultado a `chanks-1-feature`. |

## Execution Steps

1. Recibí el volcado completo.
2. Agrupá problema, usuario, situación, resultado, reglas, restricciones y no-objetivos.
3. Señalá contradicciones y huecos de autoridad.
4. Presentá una síntesis falsificable y pedí confirmación humana.
5. Entregá el alcance confirmado a la variante de autoridad que corresponda.

## Output Contract

Devuelve síntesis, hechos y fuentes, hipótesis, alcance/no-alcance propuesto, preguntas pendientes, aprobación humana y siguiente skill nominal.

## References

- `../chanks-1-autoridad/SKILL.md`
