# La frontera Torre ↔ gentle-ai

> **Regla de rechazo de alcance.** Toda Sesión de cualquier Plan puede citar este documento
> para rechazar trabajo. Nace de la [decisión 59](decision-register.md) y de la Fase 3 del
> plan de depuración del 2026-08-21; el **segundo eje** lo suma la
> [decisión 71](decision-register.md) del 2026-08-25, y el **tercer eje** la
> [decisión 78](decision-register.md) del 2026-08-26. Autoridad de alcance del producto:
> [`console/vocabulary.mjs`](../../console/vocabulary.mjs) ([decisión 58](decision-register.md)).
> Definición de producto vigente:
> [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173).

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

## El segundo eje — el flujo de trabajo (2026-08-25)

> Nace de la [decisión 71](decision-register.md), sobre una auditoría de los doce Planes.
> **La frontera tiene dos ejes, y hasta hoy sólo uno estaba escrito.**

Las dos tablas de arriba responden *¿el trabajo está bien hecho?*. Ése es el primer eje, y
la Fase 3 lo barrió — **pero sólo sobre P5**. El segundo eje nunca se había escrito, y es
donde quedaron vivas las invasiones: no *quién juzga la calidad*, sino **quién define el
método de trabajo**.

| Pregunta | Quién la gobierna |
|---|---|
| ¿Cuál es el brief y el objetivo del día? | `agente-soporte` |
| ¿Esta Sesión va por SDD completo, medio, o directo a implementar? | `session-kickoff` · `session-plan` |
| ¿Hasta qué fase planifica el que va adelante? | El estándar de planes, vía política del proyecto |
| ¿Cómo se cierran las decisiones pendientes antes de sellar? | `cierre-de-decisiones` |
| ¿Este cambio es muy grande y hay que encadenar los PR? | `chained-pr` |
| ¿Cómo se agrupan los commits? | `work-unit-commits` |
| ¿Cuántas correcciones se permite antes de frenar? | El presupuesto del agente |
| ¿Cómo se sella un contrato de ejecución desatendida? | `unattended-implementation` |

**La Torre puede *transportar* cualquiera de estos valores. No puede *interpretarlos*.**
Un contrato sellado viaja entero por la Torre; los bloques que no son suyos los lleva
opacos, sin abrirlos y sin rechazar un contrato por lo que digan adentro.

### El test de contenido

> **¿La Torre necesita entender el CONTENIDO de la regla para aplicarla?**
>
> **Sí** → es del harness. La Torre sólo puede cargar un recibo opaco y **no lo abre ni gatea por él**.
> **No** → la Torre lo puede hacer, porque no hay regla ajena que copiar.

Corolario que decidió el reparto del recibo de proceso ([decisión 72](decision-register.md)):
**exigir** un recibo como condición de entrega reconstruye RDD adentro de la Torre y le quita
su interruptor; **cargarlo** —opcional tenerlo, obligatorio declararlo— da la misma evidencia
sin ninguna regla duplicada.

## El tercer eje — la cerca no lee (2026-08-26)

> Nace de la [decisión 78](decision-register.md). Los dos ejes anteriores reparten
> **decisiones**. Éste reparte **lecturas**, y aparece porque «la Torre» venía nombrando dos
> cosas distintas.

**La cerca** es el código: `core.mjs`, `main-store/store.mjs`, `delivery/ledger.mjs`, los
locks, los schemas, `console/validate.mjs`. No lee planes, no planifica y no juzga. Verifica,
registra y falla cerrado.

**Main no es la cerca.** Es un **rol con autoridad de despacho** que la cerca verifica —
`policy/jornada.mjs:24` corta con `CT_ROLE_FORBIDDEN` y `main-store/store.mjs:152` con
`CT_AUTH_INVALID`. La cerca **no sabe quién es Main**: comprueba que quien la invoca declare
ese rol y tenga el binding. Main es un caballo más, el que tiene la llave de la tranquera. Si
Main lee un plan, lo lee **como agente, con su harness** — nunca como cerca.

**Los caballos** —AG1/AG2/AG3, Support, Policy— leen, planifican e implementan.

| Lectura | Quién la hace |
|---|---|
| ¿Qué Sesiones hay, en qué estado, y qué depende de qué? | `support/agent.mjs` · `support/manifest.mjs` |
| ¿Qué se puede trabajar ahora, y qué se choca con qué? | `agente-soporte` → `support-proposal-v1` |
| ¿Esa propuesta es fresca, del mismo plan, del mismo ledger y del claim correcto? | **la cerca** — verifica cinco campos y **no abre el resto** |
| ¿Esta propuesta entra en lo autorizado? | `policy-report` · `ALLOW`/`DENY` |
| ¿Quién despacha? | Main, y sólo Main |

**Cómo entran y cómo salen los caballos.** Support define el brief y cuántos entran en
paralelo. Policy coordina que salgan de a uno. La cerca sostiene las dos puertas y el ledger
que dice si el efecto ya ocurrió.

**El reparto de la propuesta es el mismo que el del recibo de proceso** ([decisión 72](decision-register.md)):
obligatorio declararlo, prohibido abrirlo. La cerca verifica `plan_enumeration_digest`,
`ledger_digest`, `worker_claim`, `expires_at` y `caller_role` — y nada más.

**Falsificable:** cualquier línea de producción de la Torre que abra bytes de un documento de
plan, o cualquier ramificación sobre el contenido de `primary`, `alternatives` o `conflicts`.

### El defecto que delata una invasión

Una copia. Cuando la Torre reimplementa una regla ajena, el archivo suele confesarlo solo:
`schemas/execution-contract-v1.schema.json` declara `$id: gentle-ai.local` mientras los otros
veinticinco schemas del directorio declaran `control-tower.local`. **Antes de discutir qué
hace un módulo, mirá de quién dice ser.**

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

**Y hay una segunda pregunta, del eje del flujo de trabajo:** si para aplicar la regla la
Torre tiene que **entender su contenido**, tampoco es de la Torre — por más que el resultado
suene a coordinación. Transportar un valor opaco es coordinación; interpretarlo es invasión.

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
