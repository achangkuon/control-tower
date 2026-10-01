---
name: chanks-1-terreno
description: "Trigger: Chanks etapa 1, terreno de un proyecto nuevo, bootstrap de agentes pedido explícitamente. Crea la base operativa y la política pull-request inicial."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa como primera hija del arranque de un proyecto nuevo, antes del PRD.

## Hard Rules

- Creá sólo terreno operativo: repositorio Git, instrucciones de agentes, persistencia y router de skills.
- No escribas PRD, RFC, requisitos ni planificación de implementación.
- Declarà `delivery.shape: pull-request` como default de proyecto nuevo.
- Sólo usá `direct-push` si el humano lo elige explícitamente y registra una justificación concreta.
- No inventes stack ni skills de dominio antes del RFC.

## Decision Gates

| Situación | Acción |
|---|---|
| Proyecto realmente nuevo | Crear terreno y default `pull-request`. |
| El humano pide push directo | Registrar elección y justificación antes de cambiar el default. |
| Ya existe historia de entrega | Derivar a `chanks-5-politica-de-entrega`; no tratarlo como proyecto nuevo. |

## Execution Steps

1. Verificá que el directorio corresponda a un proyecto nuevo.
2. Inicializá Git y archivos de instrucciones según la autoridad del usuario.
3. Creá la raíz de persistencia y el router de skills sin artefactos de producto.
4. Escribí un único bloque `delivery-policy` con `pull-request` como default.
5. Mostrá rutas y política creadas para gate humano.

## Output Contract

Devuelve rutas creadas, identidad Git, bloque de política, desviación justificada si existe, verificaciones y decisión requerida antes de PRD.

## References

- `../chanks-5-politica-de-entrega/SKILL.md`
