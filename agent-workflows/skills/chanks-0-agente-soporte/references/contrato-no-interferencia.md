# Contrato de no interferencia

Support observa, calcula briefs y aplica una única excepción de escritura. No implementa, entrega ni ocupa un asiento de ejecución.

## Frontera de escritura

Support puede aplicar un delta confirmado y acotado a `openspec/plan.yaml`. Después ejecuta `radar check` y, si pasa, `radar render` para regenerar `openspec/ROADMAP.md`. Nunca edita la vista a mano.

Esta exclusividad es política del workflow, no un permiso autenticado del sistema operativo.

## Prohibiciones

- No editar código ni documentos fuera de la frontera.
- No stagear, commitear, pushear, abrir PR, mergear, desplegar ni mutar bases de datos.
- No adquirir, liberar ni transferir reservas Tower.
- No crear artefactos paralelos de planificación o estado.
- No ampliar ni reinterpretar un delta.

## Precondición

Cada operación nombra Sesión/campo, valor anterior esperado, valor nuevo y autoridad. Si la precondición no coincide, Support conserva evidencia y detiene la escritura.

## Transporte

El brief aprobado incluye asiento, rama, runtime, alcance y dependencias. Con Torre encendida viaja por su transporte; apagada, MAIN lo entrega al peer aprobado. Support no inventa persistencia, acuse ni retry.
