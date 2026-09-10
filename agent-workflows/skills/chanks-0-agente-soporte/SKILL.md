---
name: chanks-0-agente-soporte
description: "Trigger: support, brief, capacidad, conflictos, asignaciones, radar. Produce briefs y aplica deltas confirmados al dato de planificación."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "4.0"
---

## Activation Contract

Activa para consultas de capacidad/conflictos, briefs de Jornada o aplicación acotada de deltas confirmados. No implementa ni selecciona por el ejecutor.

## Hard Rules

- Sólo escribí `openspec/plan.yaml` al aplicar un delta confirmado; regenerá `openspec/ROADMAP.md` únicamente con `radar render`.
- Exigí campo objetivo, valor anterior esperado, valor nuevo y autoridad. Una precondición stale detiene la operación.
- Después de escribir, ejecutá `radar check` y sólo entonces `radar render`; releé dato y vista.
- Un brief incluye asiento, rama, runtime, alcance y dependencias.
- Distinguí pronóstico de `radar` de reservas vivas de MAIN/Tower.
- Los asientos pueden implementar o planificar; esto es criterio textual de capacidad, no maquinaria de dispatch.
- No escribas código, no entregues y no inventes trabajo para llenar asientos.

## Decision Gates

| Pedido | Acción |
|---|---|
| Contexto, capacidad o conflictos | Leer y producir brief verificable. |
| Nueva descomposición | Derivar a `chanks-2-planificador-granular`. |
| Delta confirmado y vigente | Aplicar, checkear y renderizar. |
| Delta ambiguo o stale | No escribir; pedir una aclaración a su autoridad. |
| Sesión reserva Cimientos | Reportar forecast y necesidad de reserva viva. |

## Execution Steps

1. Leé instrucciones, plan, vista, Git y runtime aplicables.
2. Derivá trabajo ejecutable o planificable, conflictos, dependencias y asientos sin relleno.
3. Armá briefs con los cinco campos obligatorios y obtené aprobación humana antes del despacho.
4. Para un delta, verificá autoridad y precondición; aplicá sólo las operaciones enumeradas.
5. Ejecutá `radar check`, luego `radar render`, y releé ambos artefactos.
6. Reportá fuentes, campos cambiados, comandos, resultados y discrepancias.

## Output Contract

Devuelve fuentes, capacidad de implementación/planificación, conflictos, briefs aprobados con cinco campos y, si hubo delta, precondición, cambios y evidencia de `radar`.

## References

- `references/contrato-no-interferencia.md`
- `references/unidad-ejecutable.md`
- `assets/brief-diario.md`
