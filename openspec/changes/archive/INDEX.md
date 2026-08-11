# Changes archivados

Un change se archiva **en la misma PR en la que pasa verify** — no después, no en lote.
Ver la [regla de ejecución V1](../../plans/v1-execution-rule.md).

| Fecha | Change | Evidencia |
|---|---|---|
| 2026-08-11 | `s5-6-canonical-session-snapshot` | tasks 10/10; scenarios 31/31; acceptance 10/10; `verify-report.md`: PASS |
| 2026-07-31 | `installable-v1-autonomous-v2-split` | tasks 7/7; `verify-report.md`: PASS WITH WARNINGS, 0 CRITICAL |
| 2026-07-31 | `sdd-tower-legacy-import-preflight` | tasks 12/12; `verify-report.md`: pass |
| 2026-07-31 | `sdd-tower-project-registry` | tasks 14/14; `verify-report.md`: pass |
| 2026-07-24 | `vps-observation-dashboard-skeleton` | `archive-report.md`, `sync-report.md` |
| 2026-07-22 | `servi-task-u-autonomous-continuation-provenance` | `judgment-day-round2-result.md`, `SHA256SUMS` |

## Limpieza del 2026-07-31

Había **17 changes abiertos contra 2 archivados**: el trabajo se terminaba, el change quedaba
abierto, y el siguiente arrancaba encima. El tablero nunca se limpiaba, así que el avance real
nunca se veía.

**Archivados (3)** — los de arriba con fecha 2026-07-31: tareas 100% completas y verify en verde.

**Eliminados (6)** — cáscaras con sólo un `proposal.md` de ~55 líneas y cero avance:
`sdd-tower-continuous-slice-loop`, `sdd-tower-host-launcher`, `sdd-tower-main-policy-jornada`,
`sdd-tower-multi-repo-campaigns`, `sdd-tower-v1-conformance-pilot`, `sdd-tower-workspace-manager`.
Su intención ya está capturada en los `STATUS.md` de sus Planes; el proposal no agregaba nada.

**NO archivados** pese a tener `apply-progress.md` — siguen abiertos con trabajo pendiente:

| Change | Tasks |
|---|---|
| `autonomous-continuation-control-tower` | 30/50 — 20 pendientes |
| `p7-p8-integrated-reconciliation` | 6/16 — 10 pendientes |
| `sdd-tower-contract-schemas` | 9/9 pero **sin `verify-report.md`** — verificar antes de archivar |

Tener `apply-progress.md` no significa estar cerrado. El criterio es tareas completas **más**
verify en verde.
