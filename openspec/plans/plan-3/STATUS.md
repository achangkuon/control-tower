# Plan 3 — Workspace y orquestación

**Estado:** 🟢 LISTO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Changes C/D se conservan. Para Autonomous V2, `S3.1` parte de `origin/master@f110874`, con S2.4/project registry verificada y cerrada; `S3.2` depende de `S3.1`. |
| Outputs | C: `inspect`, `create`, `retire`, receipts y wrapper legacy de `jornada.sh`. D: Main routing, Support briefs, Policy Reports, presets, snapshots, budgets y assignments. |
| Roadmap | Ejecutar `S3.1`, ahora lista por el cierre de S2.4, y después `S3.2` en orden stacked-to-main. El trabajo posterior no enumerado de Change B no es dependencia de `S3.1`; las responsabilidades legacy sin límite de un PR permanecen sin ID. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/). Los proposals `sdd-tower-workspace-manager` y `sdd-tower-main-policy-jornada` fueron eliminados en `613a45d` por ser cáscaras sin avance; su intención vive en este STATUS. |

## Sesión 3.1 — Change C Workspace checkpoint

**Estado:** 🟢 LISTO

**Dependencias:** base `origin/master@f110874`; S2.4 Registry Storage and XDG Path Resolution verificada mediante PR #88 y cerrada mediante PR #90. No tiene predecesora dentro de la cadena aprobada.

Captura canónica de repositorio, base y resultado sin efectos remotos. La definición de `M3.1.1` y `T3.1.1.1`–`T3.1.1.4` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md).

## Sesión 3.2 — Change D Global/project Policy/Jornada

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.1` integrada.

Define floors globales, herencia, snapshots Policy/Jornada, excepciones acotadas y auditoría. La definición de `M3.2.1` y `T3.2.1.1`–`T3.2.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md).

Las responsabilidades legacy de Workspace Manager y Main/Policy que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
