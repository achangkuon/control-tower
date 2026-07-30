# Plan 5 — Entrega y continuación

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Changes F/G se conservan. Para Autonomous V2, `S5.1` depende de `S3.2`, `S5.2` de `S4.1` y `S5.3` de `S5.2`. |
| Outputs | F: authorization store, Telegram, validación Git/PR/check/SHA, entrega idempotente y post-check. G: planning horizon, reconciliación, apply/verify, Binding Delta y continuación del siguiente `slice_id`. |
| Roadmap | Ejecutar `S5.1`, esperar `S4.1`, continuar con `S5.2` y cerrar con `S5.3`; cada Sesión es un PR dirigido a `main`. |
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

Las responsabilidades legacy de Telegram Delivery y continuación que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
