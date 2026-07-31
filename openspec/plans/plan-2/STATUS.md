# Plan 2 — Contratos y registro de producto

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Change A depende de los documentos aprobados. Change B depende de A. |
| Outputs | A: schemas V1, canonicalización, validadores, golden fixtures, Plan Catalog y primitives del Main store. B: registro XDG path-neutral, bootstrap/import legacy, resolución read-only y rederivación Main. |
| Roadmap | `S2.1` se integró en PR #67, `S2.2` en PR #72, `S2.3` en PR #78 y `S2.4` mediante PRs #82, #84, #86 y #88. `S2.5` está en curso: planificación PR #94 e implementación con tests PR #96 integradas; evidencia apply y verify pendiente de entrega. |
| Referencias | [`sdd-tower-contract-schemas`](../../changes/sdd-tower-contract-schemas/), [`sdd-tower-project-registry`](../../changes/sdd-tower-project-registry/). |

## Sesiones Change A

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S2.1 | Foundation de diez schemas y validación duplicate-safe | ✅ COMPLETO | [`tasks.md`](../../changes/sdd-tower-contract-schemas/tasks.md) |
| S2.2 | JCS, ArtifactRef e idempotencia | ✅ COMPLETO | [`tasks.md`](../../changes/sdd-tower-contract-schemas/tasks.md) |
| S2.3 | Main Store and Boundaries | ✅ COMPLETO | issue #77; PR #78; candidato `c96528c08015fd4c0c0bf37de6e04760824262f5`; merge `8139849df44a81ecac6eaafa0c9a2c847e08c77e`; 13/13 focused, 57/57 aggregate y 25/25 probes |

## Sesiones Change B

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S2.4 | Registry Storage and XDG Path Resolution | ✅ COMPLETO | PR #82 `2903445c201ef2eb83faff147dfd1ed7b5ef50b7`; PR #84 `6d08df069274a2ee9ba29ef624aa93010b998381`; PR #86 `a574d45bd77c851265e7cd08fa1de91f457d9794`; PR #88 `888aca135931389bbddf6bb4500841accca0bcff`; PASS, 0 CRITICAL; 14/14 storage, 57/57 combined, umask 1/1, build y OpenSpec strict PASS |
| S2.5 | Legacy Import Preflight | 🔵 EN CURSO | PR #94 `8bcf090ef5a7a9b9c292bad51481a77a7d605b63` (planificación) y PR #96 `691aac05a3a3f155c7cc25dd08c03225763e829f` (implementación + tests) integradas; PR3 apply evidence y PR4 verify evidence pendientes; verificación técnica final PASS: 0 CRITICAL, 5/5 requisitos, 9/9 escenarios, 12/12 tareas, focused 13/13 y combined 70/70 |

Change B conserva responsabilidades posteriores a `S2.5` sin Sesiones enumeradas. Sus responsabilidades se preservan sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

**Evidencia:** `S2.2` cerró el issue #71 y se integró mediante PR #72 en `bbb59af9ca4de9223e0ec06474725f13329993b6` desde el candidato `ec4a05c66f5c295eba9f9cddc3611f24208ad37a`: 10 paths, 449 líneas authored y contracts test 44/44. `S2.3` cerró el issue #77 y se integró mediante PR #78 con la evidencia indicada arriba.

**Próxima acción:** entregar PR3 con la evidencia apply de `S2.5`; PR4 con la evidencia verify permanece pendiente y local.

### Contrato de ejecución — S2.5

| Campo | Valor |
|---|---|
| Estado | 🔵 EN CURSO |
| Depende de | `S2.4`, cerrada mediante PR #90 |
| Área | `openspec/changes/sdd-tower-legacy-import-preflight/**` — sólo documentos de evidencia |
| Recurso | ninguno — sin DB, sin migraciones; el token de entrega lo serializa la Torre |

Lo que resta de `S2.5` es **entrega de evidencia, no implementación**. El código se integró en PR #96; `apply-progress.md` y `verify-report.md` existen sin versionar en el worktree `Worktrees/autonomous-v2`, sobre la rama `docs/checkpoint-s2.5` en `43b9a58`. El agente debe partir de ese worktree: los archivos no están en `Main`.

**Criterios de aceptación** — todos deben pasar para cerrar:

- [ ] `apply-progress.md` versionado y entregado como PR3, trazando las 12/12 tareas al commit que las implementó
- [ ] `verify-report.md` versionado y entregado como PR4, con 5/5 requisitos, 9/9 escenarios y 0 CRITICAL
- [ ] Ninguna ruta fuera de `Área` aparece en ninguno de los dos diffs — cero cambios de código
- [ ] `plan-2/STATUS.md` y `master-index` quedan reconciliados con `S2.5` en ✅ COMPLETO y P2 recalculado
- [ ] Las responsabilidades restantes de Change B quedan explícitamente sin ID, con su razón registrada
