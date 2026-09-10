# Juicio de ruta

Juzgá la profundidad necesaria, no el tamaño, riesgo o número de archivos por sí solos.

| Evidencia actual | Ruta propuesta |
|---|---|
| El contrato binario, decisiones, archivos y acciones ya están determinados | `direct` → entra en SDD por `apply` |
| El resultado está fijo, pero falta resolver una pregunta técnica acotada | `design-tasks` → entra por `design` |
| El comportamiento, lifecycle o contrato compartido todavía necesita diseño dentro de autoridad | `full-sdd` → entra por `proposal` |
| Falta autoridad, la evidencia se contradice o una decisión humana contamina el resultado | No hay ruta ejecutable; reportá el estado calculable y la decisión necesaria |

## Reglas

- Sólo existen tres rutas: `direct`, `design-tasks`, `full-sdd`.
- La propuesta del planificador no reemplaza la revalidación al llegar al worktree.
- Una ruta define la puerta de entrada a la misma pipeline; `verify` es común y obligatorio.
- `archive` también es común y obligatorio, siempre después de la entrega.
- Si cambia la ruta, citá evidencia concreta y conservá propuesta y revalidación como datos distintos.
