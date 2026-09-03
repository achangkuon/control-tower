---
name: session-kickoff
description: "Trigger: start session, continue session, resume session. Recibe brief y asiento, verifica llegada y revalida la ruta sin elegir trabajo."
license: Apache-2.0
metadata:
  author: emili
  version: "4.0"
---

## Activation Contract

Activa dentro del worktree cuando el ejecutor recibe un brief aprobado con asiento, rama, runtime, alcance y dependencias.

## Hard Rules

- Recibí la Sesión; nunca selecciones trabajo ni busques la primera lista.
- Ejecutá exactamente cuatro pasos de llegada y detenete ante una precondición fallida.
- Revalidá sólo abriendo el código real del Área y usando las tres rutas canónicas.
- No escribas el plan ni invoques elaboración técnica adicional.
- El pronóstico de `radar` no adquiere Cimientos; una reserva viva pertenece a MAIN/Tower.

## Decision Gates

| Evidencia al abrir el Área | Resultado |
|---|---|
| Contrato y ejecución determinados | `direct` |
| Falta diseño técnico acotado | `design-tasks` |
| Falta diseño de comportamiento o contrato compartido | `full-sdd` |
| No hay autoridad o la evidencia se contradice | Reportar estado no ejecutable; no inventar ruta. |

## Execution Steps

1. **Verificar terreno:** confirmá repositorio, `HEAD`, rama esperada y árbol limpio contra el brief y el asiento.
2. **Revalidar ruta:** abrí el código real del Área, cargá `../planificador-granular/references/juicio-de-ruta.md` y contrastá la propuesta una vez.
3. **Enviar delta:** construí `ruta.revalidacion` con resultado, base Git, evidencia y razón si cambia; enviá el delta a Support.
4. **Pedir medidor:** si la Sesión reserva Cimientos, pedí a MAIN/Tower adquisición viva antes de editar; si no, declarà que no aplica.

## Output Contract

Devuelve brief recibido, asiento/rama/runtime, `HEAD`, limpieza, ruta propuesta y revalidada, evidencia, delta enviado y estado del medidor.

## References

- `../planificador-granular/references/juicio-de-ruta.md`
- `../agente-soporte/SKILL.md`
- `../chanks-4-puente/SKILL.md`
