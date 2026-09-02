---
name: session-kickoff
description: "Trigger: start session, continue session, resume session. Selecciona una Sesión existente y revalida una vez su ruta antes de implementar."
license: Apache-2.0
metadata:
  author: emili
  version: "3.0"
---

## Activation Contract

Activa para iniciar o continuar trabajo. Lee `../_shared/plan-naming-convention.md`,
`openspec/plan.yaml` y la vista generada. Selecciona una Sesión ya enumerada; no descompone alcance.

## Hard Rules

- `openspec/plan.yaml` es la única fuente editable; `openspec/ROADMAP.md` es una vista. No
  inventes Sesiones, Módulos, Tareas, estados ni criterios.
- Seleccioná una Sesión existente y revalidá su `ruta.propuesta` **una vez** contra autoridad,
  evidencia y base actuales. La revalidación gana para implementar.
- El delta `ruta.revalidacion` registra: `resultado` del conjunto cerrado, `base` igual al `HEAD`
  Git exacto actual, referencia `evidencia` y `razon` obligatoria cuando cambia la propuesta.
- Enviá ese delta exacto a Support, único autor del plan. No edites el YAML ni el ROADMAP.
- No crees un segundo dispatcher. Conservá `direct`, `design-tasks`, `full-sdd`, `blocked`.
- `direct` y `design-tasks` usan un ejecutor general fresco. `full-sdd` corre el pipeline una sola
  vez para toda la Sesión. Nunca SDD por Módulo.
- Leé el pronóstico estático de compatibilidad. `plan status`/`ROADMAP` **no adquieren locks**.
  Cuando MAIN/Tower runtime exista, exigí adquisición viva antes de editar Cimientos exactos o
  recursos exclusivos. Si no existe, reportá la ausencia; jamás finjas owner, lock o recuperación.
- Una decisión que escala bloquea sólo si alcanza criterios/primer Módulo o contaminación externa.
  Si alcanza un Módulo posterior, estacioná ese Módulo y avanzá sólo hasta el checkpoint honesto.

## Decision Gates

| Condición revalidada | Ruta resultante |
|---|---|
| Contrato binario y decisiones derivables | `direct`. |
| Resultado fijo; falta descubrimiento técnico acotado para Tareas existentes | `design-tasks`. |
| Comportamiento/lifecycle/contrato compartido requiere diseño dentro de autoridad | `full-sdd`. |
| Autoridad stale/ausente, evidencia contradictoria o decisión contamina criterios/primer Módulo | `blocked`. |

## Execution Steps

1. Ejecutá/consumí `plan check` y `plan status`; seleccioná una Sesión existente LISTO y anunciá
   `Zona #posición → ID`, explicando por qué las posiciones previas cerraron o no aplican.
2. Capturá el `HEAD` exacto del repositorio y revalidá alcance, autoridad, evidencia, criterios y
   contaminación una vez. No reaudites semánticamente si nada cambia.
3. Construí un delta acotado para `ruta.revalidacion`. Si cambia, incluí razón concreta. Pedí a
   Support aplicarlo y regenerar ROADMAP; no empieces sobre una base que ya cambió.
4. Confirmá Zona, Cimientos exactos, recursos, dependencias y pronóstico. Si Tower runtime existe,
   obtené por MAIN su adquisición viva antes de editar superficies reservadas/exclusivas.
5. Ejecutá la ruta resultante:
   - `direct`: ejecutor fresco con contrato, Módulos/Tareas, criterios, skills y TDD aplicable.
   - `design-tasks`: `session-plan` hace una elaboración técnica acotada y luego el mismo ejecutor.
   - `full-sdd`: propuesta → spec → design → tasks → apply → verify una vez para la Sesión.
   - `blocked`: frená y pedí una decisión.
6. Cada Módulo sigue `apply → tests → focused review → Engram checkpoint`. Al final corré una
   verificación integral y entregá evidencia a `session-doc`.

## Output Contract

Devuelve Sesión/Zona/posición, propuesta, ruta revalidada, base Git exacta, evidencia, razón del
cambio o `sin cambio`, delta enviado a Support, compatibilidad estática, estado de adquisición viva
(`adquirida`, `no disponible` o `requerida`), ruta ejecutada, checkpoint, bloqueos y próxima acción.
Termina con `skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../planificador-granular/SKILL.md`
- `../session-plan/SKILL.md`
- `../session-doc/SKILL.md`
- `../agente-soporte/SKILL.md`
