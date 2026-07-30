# Plan 2 — Contratos y registro de producto

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Change A depende de los documentos aprobados. Change B depende de A. |
| Outputs | A: schemas V1, canonicalización, validadores, golden fixtures, Plan Catalog y primitives del Main store. B: registro XDG path-neutral, bootstrap/import legacy, resolución read-only y rederivación Main. |
| Roadmap | `S2.1` se integró en PR #67, `S2.2` en PR #72 y `S2.3` en PR #78. Change A está completa; Change B espera límites de PR demostrables. |
| Referencias | [`sdd-tower-contract-schemas`](../../changes/sdd-tower-contract-schemas/), [`sdd-tower-project-registry`](../../changes/sdd-tower-project-registry/). |

## Sesiones Change A

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S2.1 | Foundation de diez schemas y validación duplicate-safe | ✅ COMPLETO | [`tasks.md`](../../changes/sdd-tower-contract-schemas/tasks.md) |
| S2.2 | JCS, ArtifactRef e idempotencia | ✅ COMPLETO | [`tasks.md`](../../changes/sdd-tower-contract-schemas/tasks.md) |
| S2.3 | Main Store and Boundaries | ✅ COMPLETO | issue #77; PR #78; candidato `c96528c08015fd4c0c0bf37de6e04760824262f5`; merge `8139849df44a81ecac6eaafa0c9a2c847e08c77e`; 13/13 focused, 57/57 aggregate y 25/25 probes |

Change B todavía no tiene límites de PR demostrables. Sus responsabilidades se preservan sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

**Evidencia:** `S2.2` cerró el issue #71 y se integró mediante PR #72 en `bbb59af9ca4de9223e0ec06474725f13329993b6` desde el candidato `ec4a05c66f5c295eba9f9cddc3611f24208ad37a`: 10 paths, 449 líneas authored y contracts test 44/44. `S2.3` cerró el issue #77 y se integró mediante PR #78 con la evidencia indicada arriba.

**Próxima acción:** definir el primer límite de un PR de Change B antes de asignarle un ID de Sesión.
