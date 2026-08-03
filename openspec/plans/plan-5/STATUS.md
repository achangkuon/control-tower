# Plan 5 — Entrega y continuación

**Estado:** 📋 PLANIFICADO

> **Enmienda de contrato del 2026-08-03 (`d232fdf`) — ninguna Sesión cambió de estado.**
> Los gates se partieron en pisos de seguridad (no configurables) y política declarada
> por proyecto. Para este Plan eso significa: la **forma de entrega** y la **autorización
> de merge** dejan de estar fijas y se resuelven del bloque `delivery-policy` de
> [`AGENTS.md`](../../../AGENTS.md), con default fail-closed a humano; el **techo de
> planificación** de `S5.3` se resuelve igual, con default 2. `S5.1` suma dos Módulos
> nuevos —`M5.1.2` derivación del siguiente Módulo y comparación del claim del worker,
> `M5.1.3` frontera del subagente Support— y su forecast pasó a 380–500 líneas, en el
> borde de encadenado de 400: se decide en apply.
> Contrato completo en [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/).

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Changes F/G se conservan. `S5.1` depende de `S3.2` y `S3.3`, `S5.2` de `S4.1` y `S3.3`, `S5.3` de `S5.2`, `S5.4` de `S5.1` y `S5.5` de `S5.4`. |
| Outputs | F: authorization store, Telegram, validación Git/PR/check/SHA, entrega idempotente y post-check. G: planning horizon, reconciliación, apply/verify, Binding Delta y continuación del siguiente `slice_id`. Más el ruteo de escalamiento de `S5.4` y la planificación diferible de `S5.5`. |
| Roadmap | Ejecutar `S5.1`, esperar `S4.1`, continuar con `S5.2` y cerrar con `S5.3`. `S5.4` se abre apenas cierra `S5.1` y no depende del resto de la cadena; `S5.5` sigue a `S5.4` por la misma hebra. Cada Sesión es una unidad entregable a `master`. |
| Referencias | [`sdd-tower-telegram-delivery`](../../changes/sdd-tower-telegram-delivery/), [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/). El proposal `sdd-tower-continuous-slice-loop` fue eliminado en `613a45d` por ser cáscara sin avance; su mecanismo quedó superseded por la continuación role-routed y su intención vive en este STATUS. |

## Sesión 5.1 — Change F candidate contracts

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.2` integrada.

Define identidad y freeze de `candidate_revision`, invalidación, sucesores, compatibilidad e idempotencia. La definición de `M5.1.1` y `T5.1.1.1`–`T5.1.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s51-change-f-contracts--m511-candidate).

> **Prerrequisito ✅ RESUELTO el 2026-08-03 (`6d37642`).** `S5.1` toma posesión del authorization
> store, y ese store arrancaba con un contrato roto: `schemas/authorization-v1.schema.json` y
> `main-store/store.mjs` divergían en **seis** puntos, no en los dos que registraba
> [release-chain](../release-chain.md). El peor: el store persistía `APPROVED`, un valor que el
> enum canónico rechaza. Se reconcilió fuera del freno de ejecución por ser contrato, no trabajo
> nuevo. `action` pasó a `MERGE`, el binding `pr` a `delivery` con `shape`, y los estados a
> `PENDING|APPROVED|REJECTED|EXPIRED|REVOKED`. De paso se sumó `REJECTED` —el store no podía
> registrar un rechazo— y `createAuthorization` ahora valida contra el schema en vez de contra un
> array escrito a mano, que era la causa raíz del drift.
>
> **Evidencia completa — verificada el 2026-08-03 con la Torre desarmada: `bun test` → 450 pass / 0
> fail.** Durante la implementación la suite quedó en 446/2 porque `migration.test.mjs` → *P0 frozen
> snapshot restore* se niega a correr mientras exista `.git/control-tower/ACTIVE`. Esos dos tests son
> los que verifican **restore aislado sobre bytes trackeados**, así que hasta correrlos la
> reconciliación estaba verificada a nivel contrato y unidad pero no a nivel restore. Ya corrieron y
> pasan: el cambio no afecta el runtime. El total subió a 450 porque `M8.8.5` sumó dos tests de
> `diagnose`.

## Sesión 5.2 — Change F delivery adapters/reconciliation

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S4.1` integrada.

Implementa commit, push y PR idempotentes, checks, revisión, autorización exacta y reconciliación de resultados desconocidos. La definición de `M5.2.1` y `T5.2.1.1`–`T5.2.1.4` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s52-change-f-delivery--m521-adaptersreconciliation).

## Sesión 5.3 — Change G integrated-base continuation

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S5.2` integrada.

Aplica el horizonte de dos Sesiones, reconcilia la base integrada y habilita sucesores sólo desde evidencia fresca. La definición de `M5.3.1` y `T5.3.1.1`–`T5.3.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s53-change-g--m531-integrated-base).

## Sesión 5.4 — Ruteo de escalamiento fuera/en casa

**Estado:** 📋 PLANIFICADO
**Depende de:** `S5.1`
**Área:** `escalation/**`, `test/escalation/**`
**Recurso:** estado de ruteo persistido. Sin migraciones de DB, sin token de entrega.

Hoy, cuando un agente llega a una decisión que requiere autoridad del maintainer, **se frena y espera**: no emite nada y nadie se entera. Un canal a Telegram sin esto es un tubo vacío. `S5.4` es la mitad que faltaba — que Main **emita** la solicitud de decisión y sepa **a dónde mandarla**.

El modo es explícito y de dos valores: `local` cuando el maintainer está frente a la máquina, `remoto` cuando no. Ante estado ausente, ilegible o ambiguo el modo resuelve a `local`: no escalar es un inconveniente, escalar por un canal que no debía estar abierto es una fuga.

`S5.4` produce y rutea la solicitud. **No la autoriza** — el sobre, el nonce y el consumo son de `S5.1`, y el transporte a Telegram es de `S8.7`.

### Módulo 5.4.1 — Emisión de solicitud de decisión

- [ ] Tarea 5.4.1.1 — RED: agregar `test/escalation/request.test.mjs` para que un punto de decisión produzca una solicitud con objetivo exacto, origen y expiración, y para que una solicitud sin objetivo exacto falle cerrado.
- [ ] Tarea 5.4.1.2 — GREEN: implementar la emisión reutilizando el authorization store de `S5.1`, sin abrir una segunda ruta de escritura.
- [ ] Tarea 5.4.1.3 — REFACTOR: normalizar códigos de error estables y volver a correr `bun test test/escalation`.

### Módulo 5.4.2 — Modo de ruteo

- [ ] Tarea 5.4.2.1 — RED: agregar `test/escalation/routing.test.mjs` para el conmutador `local` ↔ `remoto`, su idempotencia y su persistencia entre procesos.
- [ ] Tarea 5.4.2.2 — RED: agregar el caso fail-closed — estado ausente, corrupto o ambiguo resuelve a `local` y no emite hacia ningún transporte remoto.
- [ ] Tarea 5.4.2.3 — GREEN: implementar la resolución de modo y el despacho de la solicitud al transporte correspondiente.

### Módulo 5.4.3 — Degradación y no mutación

- [ ] Tarea 5.4.3.1 — RED: agregar el caso de transporte remoto ausente o caído estando en modo `remoto`.
- [ ] Tarea 5.4.3.2 — GREEN: confirmar que la solicitud queda pendiente y recuperable localmente, y que el fallo de transporte nunca la consume ni la descarta.
- [ ] Tarea 5.4.3.3 — Verificar con testigos de bytes que consultar el modo de ruteo no muta registro, DB, WAL, SHM ni estado de Torre.

**Criterios de aceptación de S5.4** — todos deben pasar para cerrar:

- [ ] Un punto de decisión que requiere autoridad del maintainer emite una solicitud con objetivo exacto; una sin objetivo exacto falla cerrado
- [ ] El modo de ruteo persiste entre procesos y conmutar es idempotente
- [ ] Estado de modo ausente, corrupto o ambiguo resuelve a `local` y no emite hacia ningún transporte remoto
- [ ] Un fallo del transporte remoto deja la solicitud pendiente y recuperable, nunca consumida ni descartada
- [ ] Consultar el modo es read-only, verificado por testigos de bytes en éxito y en rechazo
- [ ] `S5.4` no crea, valida ni consume autoridad: esa ruta sigue siendo exclusiva de `S5.1`
- [ ] `bun test test/escalation` pasa completo y `bun test` no introduce fallos nuevos
- [ ] El diff no toca ninguna ruta fuera del `Área`

## Sesión 5.5 — Decisión estacionada y continuación independiente

**Estado:** 📋 PLANIFICADO
**Depende de:** `S5.4` integrada
**Área:** `escalation/{parked,contamination,resume}.mjs`, `schemas/parked-decision-v1.schema.json`, `test/escalation/**`
**Prohibido:** `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`
**Recurso:** ledger append-only de decisiones estacionadas. Sin token de entrega.

`S5.4` hace que la pregunta **salga**. `S5.5` es lo que hace que la Torre **no se quede
esperando la respuesta**: es la Sesión que convierte la planificación en diferible.

Hoy el formato de plan ya declara por adelantado dependencias, `Área`, `Recurso` y
criterios binarios. Eso es el dato. Nadie lo **consume** todavía para decidir qué se
estaciona y qué puede seguir. Sin esta Sesión, una sola decisión pendiente frena la
corrida entera, que es exactamente el costo que el formato existía para evitar.

`S5.5` **no crea, valida ni consume autoridad** —eso sigue siendo exclusivo de `S5.1`— y no
duplica la emisión ni el ruteo de `S5.4`. Comparte prefijo de `Área` con `S5.4`, así que
por diseño **nunca corren en paralelo**: `S5.5` sólo abre con `S5.4` integrada.

### Las ocho clases que siempre escalan

No son heurística: una decisión que cae en cualquiera de estas **nunca** se deriva sola,
aunque exista autoridad aprobada y criterios falsificables.

Contrato visible del producto · operaciones irreversibles · migraciones o pérdida de datos ·
API pública · seguridad y permisos · dinero, precios o cuotas · expansión de alcance ·
dependencias o evidencia contradictorias.

### Módulo 5.5.1 — Registro de la decisión estacionada

- [ ] Tarea 5.5.1.1 — RED: agregar `test/escalation/parked.test.mjs` para que una decisión no derivable produzca un registro inmutable con la pregunta exacta, la evidencia que la disparó, las opciones enumeradas con su consecuencia, la Sesión/Módulo de origen, el checkpoint y la clase de escalamiento.
- [ ] Tarea 5.5.1.2 — RED: agregar el caso fail-closed — un registro sin opciones enumeradas, sin evidencia o sin checkpoint se rechaza; no se estaciona una pregunta que nadie puede contestar.
- [ ] Tarea 5.5.1.3 — GREEN: implementar `escalation/parked.mjs` y `schemas/parked-decision-v1.schema.json` sobre el ledger append-only, reutilizando la solicitud de `S5.4` sin abrir una segunda ruta de escritura.
- [ ] Tarea 5.5.1.4 — REFACTOR: normalizar códigos de error estables y volver a correr `bun test test/escalation`.

### Módulo 5.5.2 — Scope de contaminación

- [ ] Tarea 5.5.2.1 — RED: agregar `test/escalation/contamination.test.mjs` para que el scope se derive de la **enumeración del plan por digest** más el ledger inmutable, y falle si intenta leer engram.
- [ ] Tarea 5.5.2.2 — RED: agregar los tres criterios de contaminación — dependencia en el grafo, `Área` o `Recurso` compartido, y criterio de aceptación que referencia la misma decisión — más el caso ambiguo, que resuelve a **contaminada**.
- [ ] Tarea 5.5.2.3 — GREEN: implementar `escalation/contamination.mjs` y congelar el scope dentro del registro de la decisión, no fuera.
- [ ] Tarea 5.5.2.4 — REFACTOR: verificar con testigos de bytes que calcular el scope es read-only sobre plan, registro, DB, WAL y SHM.

### Módulo 5.5.3 — Selección de trabajo independiente

- [ ] Tarea 5.5.3.1 — RED: agregar `test/escalation/independent.test.mjs` para que una Sesión sólo sea elegible si es 🟢 LISTO, no está en el scope congelado, no depende de la bloqueada en el grafo y tiene `Área` **y** `Recurso` disjuntos.
- [ ] Tarea 5.5.3.2 — RED: agregar el caso de cero candidatos — la Torre se detiene y lo reporta; nunca inventa trabajo ni relaja un criterio para encontrar algo que hacer.
- [ ] Tarea 5.5.3.3 — GREEN: implementar la selección como lectura, ejercida por Main. El worker no se autoasigna.

### Módulo 5.5.4 — Retoma desde el checkpoint

- [ ] Tarea 5.5.4.1 — RED: agregar `test/escalation/resume.test.mjs` para que una respuesta validada por `S5.1` cierre la decisión y levante el bloqueo **sólo** sobre las Sesiones del scope congelado, nunca sobre otras.
- [ ] Tarea 5.5.4.2 — RED: agregar el caso de checkpoint rancio — si la base se movió desde que se estacionó, la retoma **no** es automática: exige reconciliación nueva.
- [ ] Tarea 5.5.4.3 — RED: agregar el caso de respuesta no validada, vencida o de origen equivocado — no levanta nada y no muta el registro.
- [ ] Tarea 5.5.4.4 — GREEN: implementar `escalation/resume.mjs` retomando desde el checkpoint exacto registrado.

**Criterios de aceptación de S5.5** — todos deben pasar para cerrar:

- [ ] Una decisión no derivable produce un registro inmutable con pregunta exacta, evidencia, opciones con consecuencia, origen, checkpoint y clase
- [ ] Un registro sin opciones, sin evidencia o sin checkpoint falla cerrado
- [ ] Una decisión de cualquiera de las ocho clases nunca se deriva, aunque haya autoridad y criterios disponibles
- [ ] El scope de contaminación se deriva del plan por digest más el ledger, y **nunca** de engram
- [ ] Un caso ambiguo resuelve a contaminada: sobre-incluir es un costo, sub-incluir es el incidente
- [ ] El scope queda congelado dentro del registro y no se recalcula al retomar
- [ ] Sólo continúan Sesiones 🟢 LISTO, fuera del scope, sin dependencia en el grafo y con `Área` y `Recurso` disjuntos
- [ ] Con cero candidatos la Torre se detiene y lo reporta, sin relajar criterios
- [ ] La selección la ejerce Main; el worker no se autoasigna
- [ ] Una respuesta validada levanta el bloqueo sólo sobre el scope congelado y retoma desde el checkpoint exacto
- [ ] Un checkpoint rancio exige reconciliación y no retoma solo
- [ ] Una respuesta no validada, vencida o de origen equivocado no levanta nada ni muta el registro
- [ ] `S5.5` no crea, valida ni consume autoridad, y no duplica la emisión ni el ruteo de `S5.4`
- [ ] Calcular scope y elegibilidad es read-only, verificado por testigos de bytes en éxito y en rechazo
- [ ] `bun test test/escalation` pasa completo y `bun test` no introduce fallos nuevos
- [ ] El diff no toca `continuation/**`, `core.mjs`, `mcp.mjs` ni `delivery/**`

**Forecast:** 300–400 líneas, contra el techo de encadenado de 400. Si en apply se pasa, se
encadenan los Módulos bajo la misma Sesión — no se crea un nivel nuevo ni se parte en dos
Sesiones sin decisión explícita.

Las responsabilidades legacy de Telegram Delivery y continuación que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
