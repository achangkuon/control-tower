---
name: chanks-1-requirements
description: "Trigger: requisitos técnicos, REQUIREMENTS, contratos de implementación. Traduce PRD y RFC aprobados a criterios técnicos binarios."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa después de PRD y RFC aprobados para fijar detalle suficiente antes de planificar implementación.

## Hard Rules

- Trazá cada requisito al PRD y a una decisión del RFC.
- Escribí contratos, reglas, datos, errores y criterios binarios observables.
- No agregues alcance de producto ni cambies arquitectura en silencio.
- Toda contradicción vuelve al artefacto y autoridad correspondientes.
- Requerí aprobación humana antes del handoff a planificación.

## Decision Gates

| Hallazgo | Acción |
|---|---|
| Falta regla de producto | Volver a `chanks-1-prd`. |
| Falta decisión técnica | Volver a `chanks-1-rfc`. |
| Hay fórmula o contrato verificable | Especificar entradas, salida y falsificador. |
| Hay decisión irreversible o de seguridad | Gate humano obligatorio. |

## Execution Steps

1. Leé PRD y RFC aprobados.
2. Enumerá datos, reglas, fórmulas, contratos, errores y límites.
3. Definí criterios técnicos binarios y evidencia de verificación.
4. Señalá trazabilidad y cualquier contradicción.
5. Escribí REQUIREMENTS, pedí aprobación y entregá a `chanks-2-planificador-granular`.

## Output Contract

Devuelve ruta del artefacto, requisitos y trazabilidad, criterios binarios, decisiones pendientes, aprobación y handoff de planificación.

## References

- `../chanks-1-prd/SKILL.md`
- `../chanks-1-rfc/SKILL.md`
- `../chanks-2-planificador-granular/SKILL.md`
