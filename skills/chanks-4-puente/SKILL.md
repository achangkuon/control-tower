---
name: chanks-4-puente
description: "Trigger: ejecutar Sesión, traducir plan a SDD, actualizar plan desde SDD. Traduce en ambos sentidos sin escribir el plan."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa después de la llegada validada para traducir el contrato de una Sesión a la pipeline SDD y devolver evidencia al plan.

## Hard Rules

- Traducí; no redefinas alcance, autoridad, criterios, Zonas ni decisiones.
- Mostrá el preflight SDD ya precargado y pedí confirmación o cambio antes de entrar.
- Hay una pipeline y tres puertas: `direct`→`apply`, `design-tasks`→`design`, `full-sdd`→`proposal`.
- `verify` y `archive` son comunes y obligatorios para las tres rutas.
- Ejecutá `archive` sólo después de la entrega.
- Construí y enviá deltas a Support; nunca escribas plan ni vista.

## Decision Gates

| Ruta revalidada | Primera fase |
|---|---|
| `direct` | `apply` |
| `design-tasks` | `design` |
| `full-sdd` | `proposal` |
| Sin ruta ejecutable | No entrar a SDD; devolver la causa calculable. |

## Execution Steps

1. Traducí brief, Sesión, criterios, decisiones, Módulos/Tareas y base al preflight SDD.
2. Precargá modo, artifact store, testing/TDD, delivery strategy y runtime; mostralos para confirmación o cambio.
3. Entrá por la fase de la ruta y continuá la única pipeline hasta `apply` y `verify`.
4. Después de revisión y entrega, ejecutá `archive`.
5. Traducí progreso, evidencia y entrega a un delta con valor anterior esperado; enviáselo a Support.

## Output Contract

Devuelve mapa plan↔SDD, preflight mostrado y confirmado/cambiado, puerta de entrada, evidencia de `verify`, entrega, `archive` y delta enviado a Support.

## References

- `../session-kickoff/SKILL.md`
- `../agente-soporte/SKILL.md`
