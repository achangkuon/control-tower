---
name: chanks-1-feature
description: "Trigger: Chanks etapa 1, definir el alcance de capacidad nueva en un producto vivo con PRD. Incorpora alcance aprobado sin romper el PRD ni la partición vigente."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa para agregar o cambiar capacidad de producto en un repositorio vivo con autoridad y PRD existentes.

## Hard Rules

- Leé primero la autoridad de producto, PRD vigente, Zonas y evidencia del comportamiento actual.
  Consultá datos del plan con `radar zonas`, `radar status --json` y `radar sesion <ID>` por
  Sesión elegida; nunca leas `openspec/plan.yaml` entero.
- Separá modificación de producto, deuda técnica y diagnóstico.
- No cambies tecnología ni partición territorial por conveniencia de implementación.
- Cargá `chanks-1-prd` de forma independiente; no reinicies el arranque de proyecto.
- Devolvé cambios del dato de planificación como delta al responsible parent; no escribas el plan.

## Decision Gates

| Situación | Acción |
|---|---|
| Cambia contrato visible, dinero, permisos o API | Gate humano obligatorio. |
| El comportamiento actual no está probado | Derivá primero a `chanks-1-descubrimiento`. |
| La feature cruza Zonas | Declarar cruces/Cimientos; no fusionar Zonas automáticamente. |
| El PRD cubre el resultado | Actualizar sólo trazabilidad y criterios afectados. |

## Execution Steps

1. Trazá pedido, autoridad, PRD y comportamiento real.
2. Delimitá resultado, usuario, reglas, no-objetivos e impacto por Zona.
3. Ejecutá `chanks-1-prd` sólo para la actualización afectada.
4. Obtené aprobación humana del delta de producto.
5. Enviá el alcance aprobado a `chanks-2-planificador-granular` y devolvé cualquier delta al responsible parent.

## Output Contract

Devuelve fuentes, diferencia actual→deseada, impacto por Zona, delta de PRD, decisiones humanas, alcance aprobado y handoff de planificación.

## References

- `../chanks-1-prd/SKILL.md`
- `../chanks-1-descubrimiento/SKILL.md`
- `../chanks-2-planificador-granular/SKILL.md`
