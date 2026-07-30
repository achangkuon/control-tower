# Plan 8 — Installable V1 release

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | `origin/master@c38ff71`; `S8.1` ya está verificada y mergeada. |
| Alcance aprobado | Release local-first con lifecycle versionado, inmutable, idempotente y reversible; sin activar autonomía. |
| Próxima Sesión | `S8.2` — Immutable lifecycle foundation — `🔵 EN CURSO`, verificación independiente aprobada y entrega pendiente. |
| Referencias | [Change](../../changes/installable-v1-autonomous-v2-split/), [tasks](../../changes/installable-v1-autonomous-v2-split/tasks.md), [handoff](../../changes/installable-v1-autonomous-v2-split/session-handoff.md). |

## Sesiones

| ID | Resultado | Estado | Evidencia |
|---|---|---|---|
| S8.1 | Provenance surfaces, tareas históricas 1.1–1.3 | ✅ COMPLETO | PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382` |
| S8.2 | Immutable lifecycle foundation | 🔵 EN CURSO | `verify-report.md`; PASS WITH WARNINGS, 0 CRITICAL |

## Límites y prioridad

`S8.2` cubre únicamente almacenamiento de versiones, puntero activo, install/diagnose/upgrade/rollback/uninstall, preservación de configuración e historial, y sus pruebas Strict TDD. No modifica `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, DB ni estado de Tower.

Telegram será la prioridad de la primera Sesión futura segura por dependencias. No recibe shell, workers, Git, merge, delivery ni selección implícita de proyecto; no se asigna un ID hasta demostrar un límite de un PR.
