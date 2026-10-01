---
name: chanks-0-session-context-loader
description: "Trigger: Chanks cargar contexto del plan, retomar contexto de una Sesión, qué sigue según Radar. Resume plan context from Radar and treat memory as hints only."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.0"
---

## Activation Contract

Activa sólo cuando se pide retomar el contexto del plan de una Sesión nombrada, o saber qué sigue según
el plan. Cómo se busca y se lee la memoria persistida es protocolo de Gentle AI; esta skill agrega sólo
la regla propia de Chanks: el estado lo calcula Radar, no la memoria.

## Hard Rules

- Sólo lectura: no edites archivos ni servicios.
- No reemplaces instrucciones del repo ni el plan.
- La memoria no decide qué sigue: el estado de cada Sesión lo calcula sólo `radar status`. Nunca propongas trabajo por un cambio viejo ni por el número siguiente a lo entregado.
- Contrastá cada Sesión que la memoria mencione con `radar status`; si no está `LISTO`, informá su estado y bloqueo en vez de proponerla.
- Mostrá las contradicciones entre memoria y Radar sin resolverlas.
- No selecciones Sesión ni ruta.

## Decision Gates

| Necesidad | Acción |
|---|---|
| Hay Sesión nombrada | Leer `radar sesion <ID>` y sumar sólo las decisiones y riesgos de memoria de ese ID. |
| La memoria apunta a una Sesión | Contrastarla con `radar status`. |
| Se pide qué sigue | Remitir a la cola de `radar status` (sólo Sesiones `LISTO`), según `AGENTS.md`. |
| Contexto insuficiente | Devolver una sola pregunta mínima. |
| Memoria y Radar se contradicen | Citar ambas fuentes y requerir decisión. |

## Execution Steps

1. Identificá la Sesión nombrada.
2. Leé `radar status --json` y `radar sesion <ID>` con el Radar instalado.
3. Sumá sólo la memoria relevante a ese ID y contrastala con Radar.
4. Comprimí hechos, riesgos, contradicciones y próxima inspección.

## Output Contract

Devuelve estado según Radar, contexto de la Sesión, decisiones y riesgos relevantes de memoria con su origen, contradicciones, áreas a inspeccionar y siguiente acción.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-4-puente/SKILL.md`
