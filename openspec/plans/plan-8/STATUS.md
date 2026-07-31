# Plan 8 — Installable V1 release

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `installable-v1`. Único Plan del lane; es el producto que puede salir primero y solo. |
| Dependencias | `origin/master@8139849df44a81ecac6eaafa0c9a2c847e08c77e`; `S8.1` y `S8.2` están verificadas y mergeadas. |
| Alcance aprobado | Release local-first con lifecycle versionado, inmutable, idempotente y reversible; sin activar autonomía. |
| Próxima Sesión | Sin ID: definir el primer límite restante de un PR a partir de las dependencias de enrollment, resolución de proyecto/Main y Support read-only. |
| Referencias | [Change](../../changes/installable-v1-autonomous-v2-split/), [tasks](../../changes/installable-v1-autonomous-v2-split/tasks.md), [handoff](../../changes/installable-v1-autonomous-v2-split/session-handoff.md). |

## Sesiones

| ID | Resultado | Estado | Evidencia |
|---|---|---|---|
| S8.1 | Provenance surfaces, tareas históricas 1.1–1.3 | ✅ COMPLETO | PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382` |
| S8.2 | Immutable lifecycle foundation | ✅ COMPLETO | issue #75; PR #76; candidato `d7ddd3d6221139ea399df66da1748458c748535d`; merge `a4ca761e0ad1d5f4bd3662ead7a00c30bff77b1b`; `verify-report.md`: PASS WITH WARNINGS, 0 CRITICAL |

## Límites y prioridad

`S8.2` entregó únicamente almacenamiento de versiones, puntero activo, install/diagnose/upgrade/rollback/uninstall, preservación de configuración e historial, y sus pruebas Strict TDD. No modificó `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, DB ni estado de Tower.

P8 conserva trabajo pendiente fuera de las dos Sesiones enumeradas; por eso su porcentaje permanece sin calcular hasta definir el próximo límite de un PR. Telegram será la prioridad de la primera Sesión segura después de satisfacer lifecycle, resolución de proyecto/Main y Support read-only. No recibe shell, workers, Git, merge, delivery ni selección implícita de proyecto; no se asigna un ID hasta demostrar un límite de un PR.
