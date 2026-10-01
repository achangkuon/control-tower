---
name: chanks-1-prd
description: "Trigger: Chanks etapa 1, escribir o actualizar el PRD de Chanks. Define problema, usuario, alcance y resultados de producto sin decidir tecnología."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa para crear el PRD de un proyecto nuevo o actualizar sólo la parte afectada de un producto vivo.

## Hard Rules

- Escribí exclusivamente decisiones de producto: problema, usuario, situación, reglas, alcance y resultados.
- No elijas stack, arquitectura, tablas, endpoints ni detalles de implementación.
- Conservá autoridad y trazabilidad de cada decisión firme.
- Marcá no-objetivos y decisiones abiertas; no rellenes huecos para completar secciones.
- Requerí gate humano antes de que un proyecto nuevo pase al RFC.

## Decision Gates

| Entrada | Acción |
|---|---|
| Proyecto nuevo | Crear PRD completo y pedir aprobación. |
| Feature de producto vivo | Editar sólo alcance, reglas y criterios afectados. |
| Contrato visible o expansión de alcance | Gate humano obligatorio. |

## Execution Steps

1. Leé autoridad y material de producto disponible.
2. Definí problema, usuario, resultado, alcance, no-alcance, reglas y métricas observables.
3. Particioná el PRD por Zona cuando exista una partición validada.
4. Señalá contradicciones y decisiones abiertas.
5. Escribí el artefacto y presentalo para aprobación humana.

## Output Contract

Devuelve ruta del PRD, secciones creadas o modificadas, autoridad, decisiones abiertas, impacto por Zona y aprobación pendiente u observada.

## References

- `../chanks-1-autoridad/SKILL.md`
