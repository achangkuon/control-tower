# Plan 5 — Entrega y continuación

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Changes F/G se conservan. `S5.1` depende de `S3.2`, `S5.2` de `S4.1`, `S5.3` de `S5.2` y `S5.4` de `S5.1`. |
| Outputs | F: authorization store, Telegram, validación Git/PR/check/SHA, entrega idempotente y post-check. G: planning horizon, reconciliación, apply/verify, Binding Delta y continuación del siguiente `slice_id`. Más el ruteo de escalamiento de `S5.4`. |
| Roadmap | Ejecutar `S5.1`, esperar `S4.1`, continuar con `S5.2` y cerrar con `S5.3`. `S5.4` se abre apenas cierra `S5.1` y no depende del resto de la cadena. Cada Sesión es una unidad entregable a `master`. |
| Referencias | [`sdd-tower-telegram-delivery`](../../changes/sdd-tower-telegram-delivery/), [`sdd-tower-continuous-slice-loop`](../../changes/sdd-tower-continuous-slice-loop/), [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/). |

## Sesión 5.1 — Change F candidate contracts

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.2` integrada.

Define identidad y freeze de `candidate_revision`, invalidación, sucesores, compatibilidad e idempotencia. La definición de `M5.1.1` y `T5.1.1.1`–`T5.1.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s51-change-f-contracts--m511-candidate).

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

Las responsabilidades legacy de Telegram Delivery y continuación que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
