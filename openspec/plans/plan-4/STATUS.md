# Plan 4 — Hosts y línea exclusiva

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Change E se conservan. Para Autonomous V2, `S4.1` depende de `S3.1`, `S3.2` y `S5.1`; su predecesora inmediata es `S5.1`. |
| Outputs | Adapter contract, launcher Pi/OpenCode, health, stop proof, host epoch y fallback exclusivo. |
| Roadmap | Ejecutar `S4.1` después de integrar `S5.1`; el PR se dirige a `main`. Las responsabilidades legacy que aún no tienen límite de un PR permanecen sin ID. |
| Referencias | [`sdd-tower-host-launcher`](../../changes/sdd-tower-host-launcher/), [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). |

## Sesión 4.1 — Change E single-host candidate fence

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.1`, `S3.2` y `S5.1` integradas; predecesora inmediata `S5.1`.

Implementa host epoch, prueba de detención y fencing fail-closed para un único host activo. La definición de `M4.1.1` y `T4.1.1.1`–`T4.1.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s41-change-e--m411-fence).

Las responsabilidades legacy de Host Launcher que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
