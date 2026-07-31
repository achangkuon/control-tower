# Plan 8 — Installable V1 release

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `installable-v1`. Único Plan del lane; es el producto que puede salir primero y solo. |
| Dependencias | `origin/master@8139849df44a81ecac6eaafa0c9a2c847e08c77e`; `S8.1` y `S8.2` están verificadas y mergeadas. |
| Alcance aprobado | Release local-first con lifecycle versionado, inmutable, idempotente y reversible; sin activar autonomía. |
| Próxima Sesión | `S8.3` y `S8.5` están 🟢 LISTO en paralelo; no comparten archivos ni dependencias. |
| Referencias | [Change](../../changes/installable-v1-autonomous-v2-split/), [tasks](../../changes/installable-v1-autonomous-v2-split/tasks.md), [handoff](../../changes/installable-v1-autonomous-v2-split/session-handoff.md), [spec](../../changes/installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md). |

## Sesiones

| ID | Resultado | Estado | Requisito | Dependencias | Evidencia |
|---|---|---|---|---|---|
| S8.1 | Provenance surfaces, tareas históricas 1.1–1.3 | ✅ COMPLETO | — | — | PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382` |
| S8.2 | Immutable lifecycle foundation | ✅ COMPLETO | Versioned lifecycle | — | issue #75; PR #76; candidato `d7ddd3d6221139ea399df66da1748458c748535d`; merge `a4ca761e0ad1d5f4bd3662ead7a00c30bff77b1b`; `verify-report.md`: PASS WITH WARNINGS, 0 CRITICAL |
| S8.3 | Enrollment explícito de proyectos y validación de layout | 🟢 LISTO | Explicit project enrollment and safe layout | `registry/`, ya integrado | — |
| S8.4 | Autoridad única de Main y briefs read-only de Support | 📋 PLANIFICADO | Sole Main authority and manual worker boundary | `S8.3` | — |
| S8.5 | Detección de hosts e integración opt-in | 🟢 LISTO | Optional host detection and integration | ninguna | — |
| S8.6 | Evidencia de release en máquina limpia | 📋 PLANIFICADO | Versioned lifecycle and release evidence | `S8.3`, `S8.4`, `S8.5` | — |
| S8.7 | Puente Hermes/Telegram acotado | 📋 PLANIFICADO | Optional bounded Hermes bridge | `S8.4` | — |

Las cinco Sesiones nuevas se derivan de los cinco requisitos de la [spec de Installable V1](../../changes/installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md). `S8.2` cubrió el lifecycle versionado; la evidencia de release que exige ese mismo requisito queda en `S8.6`.

## Alcance por Sesión

### S8.3 — Enrollment explícito y layout seguro

Registra proyectos, aísla identidad y estado de Torre, y valida el clon dueño `<project>/Main/` junto a `Worktrees/` antes de mutar. Acepta layouts existentes sólo cuando el directorio común de Git, remote, branch, propiedad y rutas son seguros. **No** reubica, recicla, resetea, limpia, stashea ni reemplaza contenido; un layout inseguro cierra fail-closed.

Se apoya en `registry/` (`resolveProjectRegistryPath`, `createProjectRegistryStore`, `preflightLegacyImport`), construido en el lane `autonomous-v2` y ya integrado.

| Campo | Valor |
|---|---|
| Estado | 🟢 LISTO |
| Depende de | `registry/`, integrado en `origin/master` |
| Área | `enroll/**`, `test/enroll/**` |
| Recurso | ninguno — sin DB, sin migraciones, sin token fuera de la entrega |

**Criterios de aceptación** — todos deben pasar para cerrar:

- [ ] Con dos repositorios registrados explícitamente, identidad, rutas, cola e historial de cada uno resuelven sólo a su propio proyecto
- [ ] Un `Main/Worktrees` sucio, con symlinks, incompatible o con remote equivocado reporta un error preciso y **no** reubica ni repara destructivamente
- [ ] Ninguna ruta fuera de `Área` aparece en el diff
- [ ] `core.mjs`, `mcp.mjs`, `package.json` y `bun.lock` quedan sin modificar
- [ ] `bun test test/enroll` pasa completo, y `bun test` no introduce fallos nuevos respecto de la base

### S8.4 — Autoridad única de Main y frontera de workers

`Main/` es el único orquestador V1 de cada proyecto registrado. Support puede preparar briefs read-only de decomposición, conflicto o capacidad, pero no se registra, no toma locks, no muta repositorios y no entrega. Los workers se preparan a mano: V1 no crea sesiones, worktrees, workers, assignments ni lanzamientos.

La denegación `CT_V2_ONLY` de `bin/torre` ya cubre parte de esta frontera.

### S8.5 — Detección de hosts e integración opt-in

Detecta Bun, Git y las instalaciones disponibles de OpenCode, Pi y Claude, e informa versiones y capacidades. La integración es opt-in y se limita a los hosts presentes; un host opcional ausente es diagnóstico, nunca un fallo de instalación. Una configuración de host insegura cierra fail-closed.

No depende de `S8.3` ni de `S8.4`: es la Sesión paralelizable del lane.

### S8.6 — Evidencia de release

Cubre systemd en Linux y WSL, launchd en macOS, smoke y rollback por host, y una corrida en máquina limpia. Cierra la parte del requisito de lifecycle que `S8.2` dejó abierta.

### S8.7 — Puente Hermes/Telegram acotado

Habilitable de forma explícita para presentar estado y dar instrucciones acotadas de arm/disarm o intención al `Main` del proyecto registrado. **No** expone shell cruda, selección o lanzamiento de workers, entrega Git, merge ni autoridad oculta sobre proyectos. La operación local por CLI y Support debe seguir completa con Hermes ausente.

Va última pese a su prioridad declarada: el propio [tasks.md](../../changes/installable-v1-autonomous-v2-split/tasks.md) la condiciona a la primera Sesión segura por dependencias, y la frontera de autoridad que la hace segura la entrega `S8.4`.

## Límites y prioridad

`S8.2` entregó únicamente almacenamiento de versiones, puntero activo, install/diagnose/upgrade/rollback/uninstall, preservación de configuración e historial, y sus pruebas Strict TDD. No modificó `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, DB ni estado de Tower.

Con `S8.3`–`S8.7` enumeradas, P8 pasa a `29% (2/7 S)`. Todo el alcance aprobado del lane tiene ahora límite de un PR; no queda responsabilidad sin ID.

Cada Sesión es un PR dirigido a `master`. Telegram conserva su prioridad declarada pero se ejecuta en `S8.7`, después de que `S8.4` establezca la frontera de autoridad: no recibe shell, workers, Git, merge, delivery ni selección implícita de proyecto.

`S8.3` y `S8.5` pueden ejecutarse en paralelo con agentes distintos. No comparten dependencias ni archivos de código. Sí comparten los cinco archivos de planificación reclamados por `installable-v1-provenance` en [`product-version-map.yaml`](../product-version-map.yaml), así que sus actualizaciones de estado deben serializarse.
