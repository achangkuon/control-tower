# Plan 7 — Conformidad de release

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `autonomous-v2`. Este Plan NO pertenece al lane `installable-v1` y no bloquea su release. |
| Dependencias | Las dependencias de conformidad V1 se conservan. Para Autonomous V2, `S7.1` depende de `S5.3`. |
| Outputs | Evidencia end-to-end contra Gates A–G de REQUIREMENTS mediante seis pilotos obligatorios. |
| Roadmap | Ejecutar `S7.1` después de integrar `S5.3`; el PR se dirige a `main`. Los pilotos V1 restantes sólo reciben ID cuando demuestren un límite de un PR. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-v1-conformance-pilot` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

## Sesión 7.1 — Conformance pilot

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S5.3` integrada.

Produce evidencia atribuible a `candidate_revision` para cero efectos remotos tempranos o duplicados, rechazo de candidatos stale, recovery y denegación desde una base no integrada. La definición de `M7.1.1` y `T7.1.1.1`–`T7.1.1.4` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s71-pilot--m711-safety).

Los seis pilotos V1 son escenarios de aceptación, no niveles de planificación. Los que aún no demuestran un límite de un PR permanecen sin ID en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

El "V1" que aparece en REQUIREMENTS, en los pilotos y en `sdd-tower-v1-conformance-pilot` es la etiqueta amplia anterior al split de productos, no el lane `installable-v1`. El manifest de Autonomous V2 registra esa migración como `migrates: broad-v1-label-to-autonomous-v2`. Por eso este Plan se renombró de "Conformidad V1" a "Conformidad de release": el nombre viejo sugería que bloqueaba la release Installable V1, y no la bloquea.
