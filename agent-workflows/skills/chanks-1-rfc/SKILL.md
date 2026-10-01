---
name: chanks-1-rfc
description: "Trigger: Chanks etapa 1, escribir el RFC de un proyecto con PRD aprobado. Decide una solución técnica right-sized a partir de un PRD aprobado."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa después de un PRD aprobado para decidir stack, arquitectura y operación técnica.

## Hard Rules

- No empieces sin PRD aprobado y restricciones verificadas.
- Elegí por ajuste al problema, no por moda ni máxima capacidad.
- Separá hechos, supuestos, alternativas y decisiones con autoridad.
- Cubrí datos, seguridad, despliegue, observabilidad y testing cuando apliquen.
- Requerí gate humano antes de REQUIREMENTS.

## Decision Gates

| Situación | Acción |
|---|---|
| Una solución simple satisface el PRD | Preferirla y explicar límites. |
| Una alternativa agrega costo sin requisito | Descartarla con razón verificable. |
| Seguridad, API pública o costo monetario cambia | Gate humano obligatorio. |
| Falta una decisión de producto | Volver a `chanks-1-prd`; no decidirla técnicamente. |

## Execution Steps

1. Leé PRD aprobado, restricciones y evidencia del entorno.
2. Compará alternativas con trade-offs y descartes explícitos.
3. Definí stack, límites, arquitectura, datos, seguridad, entrega y pruebas.
4. Registrá decisiones abiertas y sus consecuencias.
5. Escribí el RFC y presentalo para aprobación humana.

## Output Contract

Devuelve ruta del RFC, decisiones técnicas, alternativas descartadas, riesgos, decisiones humanas y aprobación pendiente u observada.

## References

- `../chanks-1-prd/SKILL.md`
- `../chanks-1-requirements/SKILL.md`
