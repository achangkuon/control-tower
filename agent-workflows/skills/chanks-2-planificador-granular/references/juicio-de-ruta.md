# Juicio de ruta

Juzgá la profundidad necesaria, no el tamaño, riesgo o número de archivos por sí solos.

| Evidencia actual | Ruta propuesta |
|---|---|
| El contrato binario, decisiones, archivos y acciones ya están determinados | `direct` → implementación no-SDD de Gentle AI |
| El resultado está fijo, pero falta resolver una pregunta técnica acotada | `design-tasks` → design acotado registrado en el plan y luego implementación no-SDD |
| El comportamiento, lifecycle o contrato compartido todavía necesita diseño dentro de autoridad | `full-sdd` → pipeline SDD nativa, entra por `proposal` |
| Falta autoridad, la evidencia se contradice o una decisión humana contamina el resultado | No hay ruta ejecutable; reportá el estado calculable y la decisión necesaria |

## Reglas

- Sólo existen tres rutas: `direct`, `design-tasks`, `full-sdd`.
- La propuesta del planificador no reemplaza la revalidación al llegar al worktree.
- Sólo `full-sdd` entra en la pipeline SDD nativa (canon §15); `direct` y `design-tasks` no crean `openspec/changes/` ni declaran `cambio`.
- `verify` es obligatorio para las tres rutas; `archive` sólo corre en `full-sdd`, después de la entrega.
- Si cambia la ruta, citá evidencia concreta y conservá propuesta y revalidación como datos distintos.
