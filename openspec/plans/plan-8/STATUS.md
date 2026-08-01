# Plan 8 — Installable V1 release

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `installable-v1`. Único Plan del lane; es el producto que puede salir primero y solo. |
| Dependencias | `master@d280214c8de78f90e88982d90642427b55a72f2b`, que integra `6fbd97c3b1f84735db61ccbd1fd510482206e4eb`; `S8.1`–`S8.4` están verificadas y mergeadas; `M8.8.1` está mergeado vía PR #132. |
| Alcance aprobado | Release local-first con lifecycle versionado, inmutable, idempotente y reversible; sin activar autonomía. |
| Próxima acción | Esperar la próxima instrucción sellada del maintainer; no iniciar ni asignar `M8.8.2`, `M8.8.3` o `S8.7` todavía. `S8.5` y `S8.6` quedan 🟡 DIFERIDO. |
| Flujo | P8 corre bajo la [regla de ejecución V1](../v1-execution-rule.md): de `tasks.md` directo a implementación, sin exploration/proposal/design y sin PR de cierre separada. |
| Referencias | [tasks de V1](../../changes/v1-release/tasks.md); [change archivado](../../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/), [spec](../../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md). |

## Sesiones

| ID | Resultado | Estado | Requisito | Dependencias | Evidencia |
|---|---|---|---|---|---|
| S8.1 | Provenance surfaces, tareas históricas 1.1–1.3 | ✅ COMPLETO | — | — | PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382` |
| S8.2 | Immutable lifecycle foundation | ✅ COMPLETO | Versioned lifecycle | — | issue #75; PR #76; candidato `d7ddd3d6221139ea399df66da1748458c748535d`; merge `a4ca761e0ad1d5f4bd3662ead7a00c30bff77b1b`; `verify-report.md`: PASS WITH WARNINGS, 0 CRITICAL |
| S8.3 | Enrollment explícito de proyectos y validación de layout | ✅ COMPLETO | Explicit project enrollment and safe layout | `registry/`, ya integrado | issue #109; PR #110; merge `9d0842172728780ba089c168c110e2de8538228b`; enrollment 10/10; registry 27/27; diff-check PASS |
| S8.4 | Autoridad única de Main y briefs read-only de Support | ✅ COMPLETO | Sole Main authority and manual worker boundary | `S8.3` | issue #123 cerrado; PR #122 (contrato) y PR #126 (implementación); merge `6fbd97c3b1f84735db61ccbd1fd510482206e4eb`; candidato `9458c78`; enfocada 22/22, acotada 59/59, suite completa 431/431 con Torre desarmada; diff-check PASS sobre exactamente los 4 archivos del Área |
| S8.5 | Detección de hosts e integración opt-in | 🟡 DIFERIDO | Optional host detection and integration | ninguna | Diferida el 2026-07-31: la integración es opt-in y su ausencia es diagnóstico, no fallo de instalación |
| S8.6 | Evidencia de release en máquina limpia | 🟡 DIFERIDO | Versioned lifecycle and release evidence | `S8.3`, `S8.4` | Diferida el 2026-07-31: se cubre con validación manual durante `S8.8` en vez de una Sesión formal |
| S8.7 | Puente Hermes/Telegram acotado | 🟢 LISTO | Optional bounded Hermes bridge | `S8.4` ✅ | Desbloqueada por el cierre de `S8.4` |
| S8.8 | Adopción del instalable en el runtime en uso | 🔵 EN CURSO | Versioned lifecycle | `S8.2` ✅ | `M8.8.1` ✅ COMPLETO; `M8.8.2` y `M8.8.3` pendientes; PR #132, merge `d280214c` |

Las Sesiones se derivan de los cinco requisitos de la [spec de Installable V1](../../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md). `S8.2` construyó el lifecycle versionado; `S8.8` lo pone efectivamente en uso, que es la parte del requisito que quedaba abierta.

**`S8.5` y `S8.6` están diferidas, no descartadas.** `S8.6` sigue siendo el cierre formal del requisito de evidencia de release; mientras esté 🟡 DIFERIDO, P8 puede darse por usable pero no por certificado en máquina limpia.

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
| Estado | ✅ COMPLETO — mergeada en `6fbd97c` (PR #126), verificada el 2026-07-31 |
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

- [x] T8.4.1.1 RED: agregar `test/support/support.test.mjs` para esquema exacto, traversal roadmap→STATUS, SQLite read-only/query-only, resolución aislada, orden determinista y rechazo fail-closed
- [x] T8.4.1.2 GREEN: agregar únicamente `support/manifest.mjs`, `support/snapshot.mjs` y `support/agent.mjs` con los tres exports definidos y sin superficie de escritura
- [x] T8.4.1.3 REFACTOR: mantener consultas y exports fijos, normalizar errores estables y volver a ejecutar la prueba enfocada

**Pruebas exactas:**

- `bun test test/support/support.test.mjs`
- `bun test test/registry test/enroll test/support`
- `bun test`
- `git diff --name-only 88b1c5198c08cefbe886df62c3cb4f97214d1506...9458c78ee8fa00e4edfe0869beb6743308ad7f03` lista únicamente `support/manifest.mjs`, `support/agent.mjs`, `support/snapshot.mjs` y `test/support/support.test.mjs`

El fixture enfocado debe capturar antes y después existencia, bytes, modo, inode, tamaño, `mtimeNs` y `ctimeNs` de `projects.yaml`, `.git/control-tower/tower.db`, sus archivos `-wal`/`-shm` y cada fuente; además debe comparar `git status --porcelain=v1`, la lista de worktrees y el estado de locks. Todos los valores deben permanecer idénticos tanto en éxito como en cada rechazo, y una DB ausente no puede crear DB, WAL ni SHM.

**Criterios de aceptación** — todos deben pasar para cerrar:

- [x] Los tres exports y los tres archivos de Support coinciden exactamente con la superficie definida; `createSupportBrief` acepta sólo el input y los ports exactos, resuelve un proyecto registrado y devuelve exactamente el output versionado y determinista definido arriba
- [x] Los tres `report_type` producen observaciones trazables únicamente a fuentes permitidas, sin otorgar autoridad de orquestación a Support
- [x] El traversal parte de `roadmap_path`, resuelve sólo links `Ref` exactos y falla cerrado para todas las condiciones de ruta, symlink, escape, ausencia, tipo, duplicidad y ambigüedad enumeradas
- [x] La DB se abre read-only sin creación, `PRAGMA query_only` queda verificado en `ON`, sólo corren consultas fijas y ausencia/error no crea ni modifica DB/WAL/SHM
- [x] Identidad, ruta o esquema inválido y toda solicitud V2 fallan cerrado con código estable antes de cualquier capacidad no necesaria
- [x] Support no registra agentes, toma locks, migra DB, crea sesiones/worktrees/workers/assignments/launches, ejecuta entrega Git ni escribe archivos
- [x] Los testigos de bytes, existencia y metadatos de fuentes/DB/WAL/SHM, Git, worktrees y locks son idénticos antes y después en éxito y rechazo
- [x] Las tres pruebas exactas pasan y ninguna ruta fuera de `Área` aparece en el diff de implementación

**Evidencia de cierre:** issue #123 cerrado; PR #126 mergeada; candidato `9458c78ee8fa00e4edfe0869beb6743308ad7f03`; merge `6fbd97c3b1f84735db61ccbd1fd510482206e4eb`; tree compartido `0a2b61d3939fd7c2f4ffa9fcf0ab246411f317a1`; baseline y binding contractual inmutable `f2d1132f51236b66269b55b356f3c7f11a759b14`. El diff exacto contiene cuatro archivos modo `100644` — `support/agent.mjs`, `support/manifest.mjs`, `support/snapshot.mjs` y `test/support/support.test.mjs` — con 372 inserciones y 0 eliminaciones. Pasaron la prueba enfocada 22/22, la prueba acotada 59/59 y la suite completa 431/431; los testigos Strict TDD y de no mutación pasaron. La corrección del prerrequisito de migración se integró antes mediante PR #125 en `88b1c5198c08cefbe886df62c3cb4f97214d1506`; por eso la prueba del alcance de implementación usa ese parent del candidato, no el baseline contractual.

**Re-verificación independiente (2026-07-31):** los siete criterios están cubiertos por las 22 aserciones de `test/support/support.test.mjs`, todas en verde. Las tres pruebas exactas del contrato se volvieron a correr desde un worktree limpio: 22/22, 59/59 y `bun test` **429 pass · 2 fail**. Los 2 fallos son `P0 frozen snapshot restore` y aparecen porque ese worktree tenía la Torre armada — es la diferencia con el `431/431` de arriba, que se midió con la Torre desarmada. No es una regresión. `git show --name-only 9458c78` confirma el diff-check.

**Rollback y frontera de no mutación:** revertir juntos los cuatro archivos entregados — `support/manifest.mjs`, `support/agent.mjs`, `support/snapshot.mjs` y `test/support/support.test.mjs` — preservando la frontera que impide crear, migrar o modificar DB/WAL/SHM y que prohíbe mutar registro, estado de Tower, locks, worktrees o repositorios inspeccionados. El rollback no autoriza cambios en `registry/**`, `enroll/**`, `install/**`, `bin/**`, otros archivos bajo `support/**`, `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock` ni configuración.

### S8.8 — Adopción del instalable en el runtime en uso

**Esta es la Sesión de mayor palanca de todo P8.** `S8.2` construyó y probó el lifecycle versionado (`install/lifecycle.mjs`, `install/active-pointer.mjs`, `install/version-store.mjs`), pero nadie instaló nunca a través de él. Lo que corre a diario es un checkout independiente, sin remote, de 398 líneas en `~/.config/opencode/control-tower/core.mjs`, congelado el 2026-07-21 en `681a0e5`.

La consecuencia es que **nada de lo construido después del 2026-07-21 está en uso**. Cerrar esta Sesión es lo que convierte el trabajo hecho en producto usable.

| Campo | Valor |
|---|---|
| Estado | 🔵 EN CURSO |
| Owner | `installable-v1` |
| Depende de | `S8.2` ✅ COMPLETO |
| Área | `install/**`, `bin/torre`, `test/install/**` |
| Recurso | data-root XDG; **sin** migraciones de DB y sin token de entrega |

Absorbe la validación práctica que `S8.6` haría de forma formal: la instalación real en la máquina del maintainer es la evidencia de smoke y rollback.

**Modo de ejecución — la Sesión es una, la ejecución se parte.** No se crea una Sesión nueva: eso inventaría un nivel que la convención no tiene. Lo que cambia es quién puede correr cada Módulo.

| Módulo | Modo | Área | Motivo |
|---|---|---|---|
| `M8.8.1` Cobertura legado → XDG | 🔒 SELLABLE, autónomo | `install/**`, `test/install/**` | PR #132 mergeada; ejecución autónoma verificada sin instalación real |
| `M8.8.2` Diagnóstico y adopción real | 👤 ATENDIDO | `bin/torre`, data-root XDG, `~/.config/opencode/control-tower/` | `torre install` real sobre la máquina del maintainer |
| `M8.8.3` Corte al runtime legado | 👤 ATENDIDO | ídem | Repunta `bin/torre`; un fallo deja la Torre inoperable |

El motivo es duro: **un contrato sellado no autoriza efectos fuera del repositorio**, y nadie debería despertarse con `torre` roto porque un agente repuntó el runtime sin supervisión. El contrato de `M8.8.1` vive en [`seal-M8.8.1.md`](../../changes/v1-release/seal-M8.8.1.md).

#### M8.8.1 — Cobertura del caso legado → XDG

| Campo | Valor |
|---|---|
| Estado | ✅ COMPLETO |
| Modo | 🔒 SELLABLE, autónomo |
| Depende de | `S8.2` ✅ COMPLETO |
| Área | `install/**`, `test/install/**` |
| Recurso | data-root temporal; sin migraciones de DB y sin token de entrega |

**Tareas** — todas completadas:

- [x] `T8.8.1.1` RED: cobertura de instalación sobre runtime legado sin data-root XDG, preservando configuración e historial
- [x] `T8.8.1.2` RED: idempotencia de instalación y `rollback` sin pérdida de configuración ni historial
- [x] `T8.8.1.3` GREEN: ajuste de `install/**` sólo donde fue necesario
- [x] `T8.8.1.4` REFACTOR: errores estables y nueva ejecución de la prueba enfocada

**Criterios de aceptación** — todos verificados:

- [x] Los casos de legado → XDG, idempotencia y rollback existen y pasan
- [x] Lifecycle enfocado: `13/13`; suite de instalación: `18/18`
- [x] Suite completa: `433 pass / 0 fail`
- [x] Los testigos de filesystem quedan idénticos antes y después
- [x] El diff queda restringido estrictamente a `install/**` y `test/install/**`

**Evidencia de cierre:** issue #131 cerrado por PR #132; implementación `b7715ed34357b6e5ea25d920d558a9137efe2558`; merge en `master` como `d280214c8de78f90e88982d90642427b55a72f2b`. La reconciliación autorizada del baseline reemplaza `429 pass / 2 fail` por `433 pass / 0 fail`: los dos tests históricos P0 ahora pasan y M8.8.1 agrega dos tests.

`S8.8` cierra sólo cuando los tres Módulos pasan. `M8.8.1` sellada no es la Sesión cerrada.

### S8.5 — Detección de hosts e integración opt-in

Detecta Bun, Git y las instalaciones disponibles de OpenCode, Pi y Claude, e informa versiones y capacidades. La integración es opt-in y se limita a los hosts presentes; un host opcional ausente es diagnóstico, nunca un fallo de instalación. Una configuración de host insegura cierra fail-closed.

No depende de `S8.3` ni de `S8.4`: es la Sesión paralelizable del lane.

### S8.6 — Evidencia de release

Cubre systemd en Linux y WSL, launchd en macOS, smoke y rollback por host, y una corrida en máquina limpia. Cierra la parte del requisito de lifecycle que `S8.2` dejó abierta.

### S8.7 — Puente Hermes/Telegram acotado

Habilitable de forma explícita para presentar estado y dar instrucciones acotadas de arm/disarm o intención al `Main` del proyecto registrado. **No** expone shell cruda, selección o lanzamiento de workers, entrega Git, merge ni autoridad oculta sobre proyectos. La operación local por CLI y Support debe seguir completa con Hermes ausente.

Va última pese a su prioridad declarada: el propio [tasks.md](../../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/tasks.md) la condiciona a la primera Sesión segura por dependencias, y la frontera de autoridad que la hace segura la entrega `S8.4`.

## Límites y prioridad

`S8.2` entregó únicamente almacenamiento de versiones, puntero activo, install/diagnose/upgrade/rollback/uninstall, preservación de configuración e historial, y sus pruebas Strict TDD. No modificó `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, DB ni estado de Tower.

Con `S8.4` cerrada y `S8.8` enumerada, P8 permanece en `50% (4/8 S)` — `M8.8.1` es un Módulo y no otorga crédito parcial a la Sesión. Todo el alcance aprobado del lane tiene límite de un PR; no queda responsabilidad sin ID.

Cada Sesión es una unidad entregable dirigida a `master`. **Desde el 2026-08-01 (`46edd14`) eso es un commit directo + push, no un PR** — ver [Política de entrega](../../../CLAUDE.md). El alcance de la Sesión no cambia: sigue siendo el que entraría en un PR. Las referencias a PRs de las Sesiones ya cerradas son historia y quedan como están. Telegram conserva su prioridad declarada y se ejecuta en `S8.7`, ahora desbloqueada porque `S8.4` ya estableció la frontera de autoridad: no recibe shell, workers, Git, merge, delivery ni selección implícita de proyecto.

**Orden de ejecución para llegar a un V1 usable:** `S8.8` primero — sin adopción, todo lo demás sigue sin correr en la máquina real — y `S8.7` después. `S8.5` y `S8.6` quedan fuera de ese camino por decisión explícita del maintainer del 2026-07-31, que también reemplaza el estado `UNASSIGNED` que traía `S8.5`. Autonomous V2 permanece **UNASSIGNED** y fuera de esta unidad documental.

Las actualizaciones sobre los archivos de planificación reclamados por `installable-v1-provenance` en [`product-version-map.yaml`](../product-version-map.yaml) deben serializarse.
