# Plan 8 — Installable V1 release

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `installable-v1`. Único Plan del lane; es el producto que puede salir primero y solo. |
| Dependencias | `origin/master@9d0842172728780ba089c168c110e2de8538228b`; `S8.1`, `S8.2` y `S8.3` están verificadas y mergeadas. |
| Alcance aprobado | Release local-first con lifecycle versionado, inmutable, idempotente y reversible; sin activar autonomía. |
| Próxima Sesión | `S8.5` está 🟢 LISTO. `S8.4` tiene contrato ejecutable pero queda 🔴 BLOQUEADO hasta la validación de Main y la aprobación issue-first. |
| Referencias | [Change](../../changes/installable-v1-autonomous-v2-split/), [tasks](../../changes/installable-v1-autonomous-v2-split/tasks.md), [handoff](../../changes/installable-v1-autonomous-v2-split/session-handoff.md), [spec](../../changes/installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md). |

## Sesiones

| ID | Resultado | Estado | Requisito | Dependencias | Evidencia |
|---|---|---|---|---|---|
| S8.1 | Provenance surfaces, tareas históricas 1.1–1.3 | ✅ COMPLETO | — | — | PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382` |
| S8.2 | Immutable lifecycle foundation | ✅ COMPLETO | Versioned lifecycle | — | issue #75; PR #76; candidato `d7ddd3d6221139ea399df66da1748458c748535d`; merge `a4ca761e0ad1d5f4bd3662ead7a00c30bff77b1b`; `verify-report.md`: PASS WITH WARNINGS, 0 CRITICAL |
| S8.3 | Enrollment explícito de proyectos y validación de layout | ✅ COMPLETO | Explicit project enrollment and safe layout | `registry/`, ya integrado | issue #109; PR #110; merge `9d0842172728780ba089c168c110e2de8538228b`; enrollment 10/10; registry 27/27; diff-check PASS |
| S8.4 | Autoridad única de Main y briefs read-only de Support | 🔴 BLOQUEADO | Sole Main authority and manual worker boundary | `S8.3` | Contrato versionado; falta validación de Main y aprobación issue-first |
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
| Estado | ✅ COMPLETO |
| Depende de | `registry/`, integrado en `origin/master` |
| Área | `enroll/**`, `test/enroll/**` |
| Recurso | ninguno — sin DB, sin migraciones, sin token fuera de la entrega |

**Criterios de aceptación** — todos deben pasar para cerrar:

- [x] Con dos repositorios registrados explícitamente, identidad, rutas, cola e historial de cada uno resuelven sólo a su propio proyecto
- [x] Un `Main/Worktrees` sucio, con symlinks, incompatible o con remote equivocado reporta un error preciso y **no** reubica ni repara destructivamente
- [x] Ninguna ruta fuera de `Área` aparece en el diff
- [x] `core.mjs`, `mcp.mjs`, `package.json` y `bun.lock` quedan sin modificar
- [x] `bun test test/enroll` pasa completo, y `bun test` no introduce fallos nuevos respecto de la base

**Evidencia verificada:** PR #110 mergeada el 2026-07-31 en `9d0842172728780ba089c168c110e2de8538228b`; issue #109 cerrado; enrollment 10/10, registry 27/27 y diff-check PASS sobre exactamente `enroll/index.mjs` y `test/enroll/enroll.test.mjs`.

### S8.4 — Autoridad única de Main y frontera de workers

`Main/` es el único orquestador V1 de cada proyecto registrado. Support puede preparar briefs read-only de decomposición, conflicto o capacidad, pero no se registra, no toma locks, no muta repositorios y no entrega. Los workers se preparan a mano: V1 no crea sesiones, worktrees, workers, assignments ni lanzamientos.

La denegación `CT_V2_ONLY` de `bin/torre` ya cubre parte de esta frontera.

| Campo | Valor |
|---|---|
| Estado | 🔴 BLOQUEADO — implementación pendiente de validación de Main y aprobación issue-first |
| Owner | `installable-v1` |
| Depende de | `S8.3` ✅ COMPLETO |
| Área | `support/manifest.mjs`, `support/agent.mjs`, `support/snapshot.mjs`, `test/support/**` |
| Recurso | `db_mode=read-only`; SQLite `{ readonly: true, create: false }` con `PRAGMA query_only=ON`; sin migraciones, locks ni token de entrega |

**Superficie de invocación:** `createSupportBrief(input, ports)` se exporta desde `support/agent.mjs`; `resolveSupportManifest(entry, ports)` desde `support/manifest.mjs` y `captureSupportSnapshot(manifest, ports)` desde `support/snapshot.mjs` son sus únicas dependencias de Support. No se agrega comando a `bin/torre`, proceso residente, registro de agente ni escritura de archivos. `ports` contiene exactamente `loadRegistry()`, `readText(path)`, `inspectGit(path)` y `openDatabase(path, options)`; la implementación rechaza claves adicionales. `openDatabase` se invoca exactamente con `{ readonly: true, create: false }`, ejecuta y verifica `PRAGMA query_only=ON` antes de cualquier consulta fija, no expone SQL del caller y siempre cierra la conexión.

**Input mínimo** — objeto JSON exacto, sin claves adicionales:

```json
{
  "schema": "support-request",
  "schema_version": 1,
  "project_id": "<registered project_id>",
  "report_type": "decomposition | conflict | capacity"
}
```

**Output mínimo** — objeto JSON exacto, sin claves adicionales y ordenado de forma determinista por `sources.path`, `observations.code` y `observations.subject`:

```json
{
  "schema": "support-brief",
  "schema_version": 1,
  "project_id": "<registered project_id>",
  "registry_entry_revision": 1,
  "report_type": "decomposition | conflict | capacity",
  "sources": [{ "path": "<absolute canonical path>", "sha256": "<lowercase hex digest>" }],
  "observations": [{ "code": "<stable code>", "subject": "<plan or Sesión ID>", "detail": "<read-only finding>" }]
}
```

`project_id` debe resolver una única entrada del registro. `resolveSupportManifest` parte exclusivamente de `canonical_root/roadmap_path`: ambos se normalizan y resuelven sin seguir symlinks; el resultado debe permanecer bajo `canonical_root`, ser un archivo regular único y llamarse `master-index.md`, y su directorio padre debe existir, ser directorio y no ser symlink. Del cuerpo del roadmap se toman únicamente los links Markdown de la columna `Ref` de filas `P<entero>` cuyo texto sea exactamente `STATUS`; cada target se resuelve relativo al directorio del roadmap, debe permanecer bajo `canonical_root`, coincidir con `plan-<mismo entero>/STATUS.md`, existir una sola vez y ser archivo regular sin ningún componente symlink. Los STATUS válidos se ordenan por ID numérico de Plan. Cierra fail-closed ante `roadmap_path` ausente, absoluto, vacío, no regular o ambiguo; padre ausente/no directorio; symlink; escape; roadmap ilegible o tabla inválida; ID/target discordante; link STATUS ausente, duplicado, ambiguo, no regular o fuera del proyecto.

Las fuentes quedan limitadas al `manifest_path`, al roadmap validado, a esos STATUS resueltos, a metadatos Git obtenidos por `inspectGit` y a `<git_common_dir>/control-tower/tower.db`. La DB ausente falla sin crearla; la DB presente se abre sólo con `{ readonly: true, create: false }`, activa y verifica `PRAGMA query_only=ON`, ejecuta consultas fijas dentro de una transacción diferida y cierra. Cualquier identidad ambigua, esquema desconocido, clave adicional, fallo de `query_only` o intento de operación no read-only falla cerrado. Un pedido de crear sesiones, worktrees, workers, assignments, lanzamientos, locks, commits, entregas o mutaciones devuelve `CT_V2_ONLY` antes de abrir DB o invocar otro puerto.

#### M8.4.1 — Contrato read-only de Support

- [ ] T8.4.1.1 RED: agregar `test/support/support.test.mjs` para esquema exacto, traversal roadmap→STATUS, SQLite read-only/query-only, resolución aislada, orden determinista y rechazo fail-closed
- [ ] T8.4.1.2 GREEN: agregar únicamente `support/manifest.mjs`, `support/snapshot.mjs` y `support/agent.mjs` con los tres exports definidos y sin superficie de escritura
- [ ] T8.4.1.3 REFACTOR: mantener consultas y exports fijos, normalizar errores estables y volver a ejecutar la prueba enfocada

**Pruebas exactas:**

- `bun test test/support/support.test.mjs`
- `bun test test/registry test/enroll test/support`
- `bun test`
- `git diff --name-only <S8.4_CONTRACT_COMMIT_SHA>...HEAD` debe listar únicamente `support/manifest.mjs`, `support/agent.mjs`, `support/snapshot.mjs` y rutas bajo `test/support/**`; `<S8.4_CONTRACT_COMMIT_SHA>` se reemplaza en el issue de implementación por el SHA inmutable del commit que versiona este contrato, antes de autorizar apply

El fixture enfocado debe capturar antes y después existencia, bytes, modo, inode, tamaño, `mtimeNs` y `ctimeNs` de `projects.yaml`, `.git/control-tower/tower.db`, sus archivos `-wal`/`-shm` y cada fuente; además debe comparar `git status --porcelain=v1`, la lista de worktrees y el estado de locks. Todos los valores deben permanecer idénticos tanto en éxito como en cada rechazo, y una DB ausente no puede crear DB, WAL ni SHM.

**Criterios de aceptación** — todos deben pasar para cerrar:

- [ ] Los tres exports y los tres archivos de Support coinciden exactamente con la superficie definida; `createSupportBrief` acepta sólo el input y los ports exactos, resuelve un proyecto registrado y devuelve exactamente el output versionado y determinista definido arriba
- [ ] Los tres `report_type` producen observaciones trazables únicamente a fuentes permitidas, sin otorgar autoridad de orquestación a Support
- [ ] El traversal parte de `roadmap_path`, resuelve sólo links `Ref` exactos y falla cerrado para todas las condiciones de ruta, symlink, escape, ausencia, tipo, duplicidad y ambigüedad enumeradas
- [ ] La DB se abre read-only sin creación, `PRAGMA query_only` queda verificado en `ON`, sólo corren consultas fijas y ausencia/error no crea ni modifica DB/WAL/SHM
- [ ] Identidad, ruta o esquema inválido y toda solicitud V2 fallan cerrado con código estable antes de cualquier capacidad no necesaria
- [ ] Support no registra agentes, toma locks, migra DB, crea sesiones/worktrees/workers/assignments/launches, ejecuta entrega Git ni escribe archivos
- [ ] Los testigos de bytes, existencia y metadatos de fuentes/DB/WAL/SHM, Git, worktrees y locks son idénticos antes y después en éxito y rechazo
- [ ] Las tres pruebas exactas pasan y ninguna ruta fuera de `Área` aparece en el diff de implementación

**Rollback y frontera de no mutación:** revertir únicamente futuros cambios en `support/manifest.mjs`, `support/agent.mjs`, `support/snapshot.mjs` y `test/support/**`. S8.4 puede leer la DB sólo mediante el modo exacto definido; no puede crearla, migrarla ni modificar DB/WAL/SHM. Tampoco puede modificar `registry/**`, `enroll/**`, `install/**`, `bin/**`, otros archivos bajo `support/**`, `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, configuración, registro, estado de Tower ni repositorios inspeccionados. Este contrato no autoriza implementación: el apply sigue bloqueado hasta validación de Main, binding de `<S8.4_CONTRACT_COMMIT_SHA>` y aprobación issue-first.

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

Con `S8.3` cerrada, P8 queda en `43% (3/7 S)`. Todo el alcance aprobado del lane tiene límite de un PR; no queda responsabilidad sin ID.

Cada Sesión es un PR dirigido a `master`. Telegram conserva su prioridad declarada pero se ejecuta en `S8.7`, después de que `S8.4` establezca la frontera de autoridad: no recibe shell, workers, Git, merge, delivery ni selección implícita de proyecto.

Cuando Main valide el contrato y exista aprobación issue-first, `S8.4` podrá ejecutarse en paralelo con `S8.5`: sus dependencias, `Área` y `Recurso` son disjuntos. Sus actualizaciones sobre los archivos de planificación reclamados por `installable-v1-provenance` en [`product-version-map.yaml`](../product-version-map.yaml) deben serializarse.
