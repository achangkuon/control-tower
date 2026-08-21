# La frontera Torre ↔ gentle-ai

> **Regla de rechazo de alcance.** Toda Sesión de cualquier Plan puede citar este documento
> para rechazar trabajo. Nace de la [decisión 59](decision-register.md) y de la Fase 3 del
> plan de depuración del 2026-08-21. Autoridad de alcance del producto:
> [`console/vocabulary.mjs`](../../console/vocabulary.mjs) ([decisión 58](decision-register.md)).

## La línea, en una frase

**La Torre decide *quién* trabaja, *sobre qué*, *cuándo* y *si el efecto ya ocurrió*.
gentle-ai decide *si el trabajo está bien hecho*.**

Ninguna de las dos opina sobre la mitad de la otra. Cada vez que la Torre opinó sobre
calidad de trabajo, creó una segunda fuente de verdad que nunca coincidió con la primera.

## Qué decide la Torre

| Pregunta | Dónde vive |
|---|---|
| ¿Qué agente es el sujeto de este comando, y su estado lo permite? | `console/validate.mjs` |
| ¿Este agente puede reclamar este worktree, o ya está ocupado? | `core.mjs`, P9 |
| ¿Estos bytes exactos son el candidato que se autorizó? | `contracts/candidate-revision.mjs` |
| ¿La entrega ya ocurrió, o hay que intentarla de nuevo? | `delivery/ledger.mjs`, `delivery/reconciliation.mjs` |
| ¿Cómo aterriza la entrega — push directo o PR — y a qué rama? | `policy/delivery-policy.mjs` |
| ¿Quién emite la autorización de merge? | `policy/delivery-policy.mjs` |
| ¿Hasta dónde alcanza una autorización heredada? | `planning.horizon_ceiling` — decisión 2 del 2026-08-03 |
| ¿Esta propuesta entra en el alcance autorizado? | `policy-report` · `ALLOW`/`DENY`, `policy/jornada.mjs:31` |
| ¿Esta decisión la puede tomar el agente, o hay que estacionarla? | `escalation/**`, `S5.5` |
| ¿Desde qué checkpoint exacto se retoma? | `workspace/checkpoint.mjs`, `S5.5` |
| ¿Se puede violar un piso de seguridad de la coordinación? | `assertFloorProtected` — nunca |

Los cinco pisos son invariantes de la Torre sobre sí misma, no juicios sobre trabajo ajeno:
mutación remota antes de `DELIVERY_READY`, reescritura de candidato congelado, borrado del
ledger append-only, auto-asignación de un worker, y dispatch fuera de Main.

## Qué decide gentle-ai

| Pregunta | Quién la gobierna |
|---|---|
| ¿Los tests pasan, y existen antes que el código? | Strict TDD |
| ¿El cambio corresponde a un spec, un design y unas tareas? | SDD |
| ¿El cambio tiene defectos de riesgo, fiabilidad, resiliencia o legibilidad? | Las 4 R |
| ¿Dos revisores ciegos coinciden en que hay que arreglar algo? | judgment day |
| ¿A qué profundidad conviene planificar por delante? | El estándar de planes |
| ¿Con qué profundidad se documenta al cerrar un Módulo o una Sesión? | `doc-guard.sh` |
| ¿El agente se detuvo tras N iteraciones sin avance? | El perfil del agente ([decisión 61](decision-register.md)) |

## Qué pasa cuando no coinciden

**No hay empate que resolver, porque no se pisan.** Un choque es un síntoma, no un caso
de uso: significa que una de las dos invadió a la otra, y lo que se corrige es la invasión.

1. **Si la Torre bloquea por calidad de trabajo** — tests, cobertura, forma del commit,
   profundidad documental, revisión — la Torre está equivocada. Se le saca esa
   condición. Precedente ejecutado: el hook de pre-push que corría la suite entera
   perdió su `--with-tests` y *«la verificación vuelve a ser propiedad del agente bajo
   Gentle»*.
2. **Si gentle-ai intenta decidir quién trabaja o si un efecto ya ocurrió**, gentle-ai
   está equivocado. La Torre no delega el ledger ni la asignación.
3. **Si el agente incumple su propio proceso**, la Torre **no lo detiene: lo registra y
   sigue**. Esa consecuencia es del stack del agente, no de la coordinación.

## El test, para rechazar alcance en una Sesión

Una Sesión pertenece a la Torre sólo si responde **sí** a esta pregunta:

> ¿El resultado cambia **quién** actúa, **sobre qué bytes**, **cuándo**, o **si el efecto
> ya ocurrió**?

Si en cambio responde *«evita que se entregue trabajo mal hecho»*, **no es de la Torre**,
por bien intencionada que sea. Se cita este documento y se rechaza.

**Cuidado con el falso positivo.** «Suena a proceso» no alcanza: hay que leer qué hace el
campo. El techo de planificación *parece* disciplina de proceso y en realidad acota el
alcance de una autorización aprobada; el informe de política *parece* cumplimiento y en
realidad dictamina alcance. La Fase 3 se equivocó con los dos hasta que los midió. **Se
clasifica por lo que el código hace, nunca por cómo se llama el campo.**

**Falsificable:** cualquier Sesión que entregue una condición de bloqueo cuyo criterio sea
la calidad, completitud o disciplina de proceso del trabajo de un agente; o cualquier
capacidad que una herramienta ya instalada del stack provea, sin una razón registrada de
por qué la de la herramienta no sirve.

## Por qué se cruzó la frontera sin que nadie lo notara

Ningún Plan declaraba su propósito, así que un Plan se definía por lo que *contenía* y
nunca por lo que *era*. Sin propósito no hay criterio de pertenencia, y sin criterio de
pertenencia nada rechaza una Sesión razonable pero ajena. Esa es la causa raíz, y su
arreglo permanente es la tarea 4.4 de la Fase 4 —propósito declarado por Plan—, no este
documento. Este documento es la frontera concreta entre dos dueños; aquella regla es la
que impide que vuelva a haber una frontera sin escribir.
