# Plan 8 — Installable V1 release

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `installable-v1`, ahora sólo como afinidad de trabajo. Desde la [unificación del 2026-08-01](../release-chain.md) no es una identidad de producto: hay un roadmap único y P8 dejó de ser "el producto que sale primero y solo". |
| Dependencias | `master@a4aa3a6`, que integra `d280214c8de78f90e88982d90642427b55a72f2b` y `6fbd97c3b1f84735db61ccbd1fd510482206e4eb`; `S8.1`–`S8.4` están verificadas y mergeadas; `M8.8.1` está mergeado vía PR #132. |
| Bloqueo operativo | Antes de despachar cualquier Sesión hay que sanear el registro de la Torre: tres de los seis agentes registrados no tienen worktree y uno de ellos retiene un mensaje en cola que nadie va a consumir. Ver [brecha 5](../implementation-state.md). No es un bloqueo de alcance; es que la capacidad reportada no es real. |
| Alcance aprobado | Release local-first con lifecycle versionado, inmutable, idempotente y reversible; sin activar autonomía. |
| Próxima acción | 🔴 **`M8.8.2` REABIERTO el 2026-08-03 — el runtime instalado no carga.** `install/lifecycle.mjs:8` importa `./runtime-payload.mjs`, y ese archivo **no está en la versión instalada**: `bun <version>/install/lifecycle.mjs diagnose` devuelve `Cannot find module './runtime-payload.mjs'`. La causa es que `RUNTIME_PAYLOAD_FILES` declara cinco miembros y **no se incluye a sí mismo**, así que el validador confirma como completo un payload que no arranca. El `healthy:true` con el que se cerró salió del **checkout del repo**, no de la copia instalada. **Ejecutar `M8.8.3` sobre este runtime dejaba la Torre inoperable.** **El contrato quedó cerrado en `fed8fb0`** (rescatado del worktree `v1`): `RUNTIME_PAYLOAD_FILES` ahora incluye `install/runtime-payload.mjs` y son seis miembros. Suite 451/0 con la Torre desarmada. **Pero eso arregla el repositorio, no la instalación:** la versión activa `34f56a6` sigue sin el archivo y sigue sin cargar. Falta el paso 👤 ATENDIDO — republicar e instalar — y **verificar `diagnose` ejecutando la copia instalada, no la del repo**. Recién ahí `M8.8.2` cierra de verdad. Orden restante: reinstalar → verificar desde la copia instalada → `M8.8.6` → `M8.8.3`. Adopción previa: activo `34f56a61c1908c003dc382e661ae87335498fd99` con `previous` `b72e450` para rollback. **La ejecución de `M8.8.3` se partió el 2026-08-03.** El payload sin `core.mjs` desapareció y `diagnose` lo confirma con `missing:[]`, pero el mecanismo del corte no existe: `bin/torre` nunca lee `active.json` y `CORE` defaultea a la ruta legada incluso en la versión instalada (`bin/torre:20`), así que copiar el entrypoint no corta nada y un symlink rompe `LIFECYCLE`. **La mitad implementable es ahora `M8.8.6` — 🟢 LISTO, 🔒 SELLABLE y autónomo**, con cero efectos fuera del repositorio; `M8.8.3` queda acotado al corte al PATH y sigue 👤 ATENDIDO. **`M8.8.6` es la próxima acción y es el primer Módulo sellado que se despacha bajo la §11.** `S8.7` espera `S8.8` y `S5.1`; `S0.3` está ✅ COMPLETO. `S8.5` y `S8.6` quedan 🟡 DIFERIDO. |
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
| S8.7 | Puente Hermes/Telegram | 📋 PLANIFICADO | Optional bounded Hermes bridge (amendado por `S0.3`) | `S8.4` ✅, `S0.3` ✅, `S8.8`, `S5.1` | Alcance ampliado el 2026-08-01: presenta autorizaciones y transporta callback acotado. `S0.3` está completo; quedan `S8.8` y `S5.1` |
| S8.8 | Adopción del instalable en el runtime en uso | 🔵 EN CURSO | Versioned lifecycle | `S8.2` ✅ | `M8.8.1` ✅ COMPLETO (PR #132, merge `d280214c`). `M8.8.2` 🔴 **REABIERTO**: la versión instalada no carga —falta `install/runtime-payload.mjs`— y su `healthy:true` se midió desde el repo, no desde la copia instalada. `M8.8.3` 👤 ATENDIDO, depende de `M8.8.6`: sólo el corte al PATH. `M8.8.4` ✅ COMPLETO en `3d2ef57`, pero su contrato de payload estaba incompleto: omitía `install/runtime-payload.mjs`. `M8.8.5` ✅ COMPLETO en `34f56a6`; cerró un verde falso y dejó otro debajo, porque el contrato que consulta no se incluye a sí mismo. `M8.8.6` 🔴 **BLOQUEADO por `M8.8.2`**: construye la resolución hacia un runtime que hoy no arranca |

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

**Decisiones:**

- `derivable` — qué versión publicar en la adopción de `M8.8.2`. **Criterio:** el `HEAD` de `master` que contenga `3d2ef57`, porque es el commit que cierra el contrato de payload. Falsificable: si el payload publicado no valida contra `RUNTIME_PAYLOAD_FILES`, la elección estaba mal. **Autoridad:** `install/runtime-payload.mjs`.
- `derivable` — si `M8.8.3` puede avanzar. **Criterio:** la versión activa en `~/.local/share/control-tower/versions/<sha>/` contiene los cinco miembros, `core.mjs` incluido. Falsificable por `ls`. **Resuelta ✅ el 2026-08-03**: `34f56a6` los tiene los cinco y `diagnose` devuelve `missing:[]`. El criterio se evaluó dos veces con resultados opuestos —**no** sobre `b72e450`, **sí** sobre `34f56a6`— que es exactamente para lo que un criterio falsificable sirve. **Autoridad:** `install/runtime-payload.mjs`.
- `escala` — ejecutar el `torre install` real. **Clase:** operaciones irreversibles. Muta `~/.local/share/control-tower/`, fuera del repositorio. **Contamina:** `M8.8.3` (no puede cortar hacia un runtime que no existe todavía), `S8.7` (declara `S8.8` como dependencia). **Resuelta y ejecutada el 2026-08-03** por el maintainer: activo `34f56a6`, `previous` `b72e450`, rollback disponible.
- `escala` — repuntar `~/.local/bin/torre` al runtime instalado (`M8.8.3`). **Clase:** operaciones irreversibles. Un fallo deja la Torre inoperable, y el entrypoint del PATH es hoy un script bash del 2026-07-21 sin `install` ni `diagnose`, así que la recuperación no se hace con la propia herramienta. **Contamina:** `S8.7`. **ABIERTA**, y **no basta con autorizarla: falta implementarla.** El 2026-08-03 la parte implementable se separó en `M8.8.6`, autónomo y sellable; esta decisión queda acotada al corte en sí, que sigue siendo atendido. Autorizarla antes de que `M8.8.6` cierre no habilita nada.

> **`M8.8.3` no es un comando atendido, es un Módulo de código.** Verificado el 2026-08-03: `bin/torre` **nunca lee `active.json`** —no hay resolución del runtime instalado en el script—, `CORE` sigue defaulteando a `$HOME/.config/opencode/control-tower/core.mjs` **incluso en la versión instalada** (`bin/torre:20`), y no existe código que instale el shim del PATH en `install/`, `scripts/` ni `bin/torre`.
>
> Consecuencia: copiar el `bin/torre` instalado a `~/.local/bin/` **no corta nada** —seguiría cargando el `core.mjs` legado—, y un symlink rompe la resolución de `LIFECYCLE`, que usa `dirname "${BASH_SOURCE[0]}"` y daría `~/.local/install/lifecycle.mjs`.
>
> El Módulo tiene que **construir el mecanismo** antes de ejecutar el corte: que `CORE` y `LIFECYCLE` se resuelvan desde el puntero activo en vez de rutas fijas, y que exista una ruta de recuperación que no dependa del entrypoint que se está reemplazando. Que `M8.8.2` esté cerrado destrabó el prerrequisito del payload, no el corte.

Absorbe la validación práctica que `S8.6` haría de forma formal: la instalación real en la máquina del maintainer es la evidencia de smoke y rollback.

**Modo de ejecución — la Sesión es una, la ejecución se parte.** No se crea una Sesión nueva: eso inventaría un nivel que la convención no tiene. Lo que cambia es quién puede correr cada Módulo.

| Módulo | Modo | Área | Motivo |
|---|---|---|---|
| `M8.8.1` Cobertura legado → XDG | 🔒 SELLABLE, autónomo | `install/**`, `test/install/**` | PR #132 mergeada; ejecución autónoma verificada sin instalación real |
| `M8.8.2` Diagnóstico y adopción real | 👤 ATENDIDO | `bin/torre`, data-root XDG, `~/.config/opencode/control-tower/` | `torre install` real sobre la máquina del maintainer |
| `M8.8.3` Corte al runtime legado | 👤 ATENDIDO | `~/.local/bin/torre`, PATH del maintainer | Repunta el entrypoint; un fallo deja la Torre inoperable. **Depende de `M8.8.6`** |
| `M8.8.4` Preflight de adopción y payload verificable | 🔒 SELLABLE, autónomo | `install/**`, `scripts/publish-runtime.mjs`, `test/install/**` | Valida el payload cerrado y deja segura la continuación atendida de `M8.8.2` |
| `M8.8.5` `diagnose` detecta payload incompleto | 🔒 SELLABLE, autónomo | `install/lifecycle.mjs`, `test/install/**` | El instrumento que verifica la adopción no detectaba el modo de falla que bloquea `M8.8.3` |
| `M8.8.6` Resolución desde el puntero activo | 🔒 SELLABLE, autónomo | `bin/torre`, `install/active-pointer.mjs`, `test/install/**` | Construye el mecanismo que `M8.8.3` necesita, sin tocar el PATH ni el runtime real |

**`M8.8.6` es posterior en número y previo en ejecución.** El ID es un nombre posicional, no un orden — la misma regla que el `master-index` aplica a los Planes. Se numera al final porque se enumeró al final; `M8.8.3` no se renumera porque el bloque `Decisiones` de esta Sesión ya lo referencia y reescribir un ID vigente rompe punteros.

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

`S8.8` cierra sólo cuando la secuencia atendida de `M8.8.2` y el corte de `M8.8.3` estén completos; `M8.8.4` ✅ COMPLETO es un prerrequisito y no otorga crédito parcial a la Sesión.

#### M8.8.4 — Preflight de adopción y payload verificable

Corrige el cierre del payload publicado antes de reanudar la adopción atendida. El payload canónico queda limitado a cinco archivos, rechaza miembros faltantes, extraños o symlinks, y la validación ocurre antes de crear raíces temporales. El lifecycle conserva limpieza atómica de versiones y puntero fallidos y el rollback de primera adopción restaura el fixture legado completo.

| Campo | Valor |
|---|---|
| Estado | ✅ COMPLETO |
| Modo | 🔒 SELLABLE, autónomo; no autoriza adopción real |
| Depende de | `M8.8.1` ✅ COMPLETO |
| Área | `install/**`, `scripts/publish-runtime.mjs`, `test/install/**` |
| Recurso | data-root descartable; sin runtime real, DB ni token de entrega |

**Tareas** — todas completadas:

- [x] `T8.8.4.1` RED: cubrir el cierre exacto del payload y rechazar miembros faltantes, extraños, traversal y symlinks
- [x] `T8.8.4.2` GREEN: validar el payload canónico desde publicación e instalación antes de cualquier mutación
- [x] `T8.8.4.3` REFACTOR: conservar digest inmutable, limpieza atómica y rollback completo de la primera adopción
- [x] `T8.8.4.4` VERIFY: ejecutar pruebas enfocadas y suite completa en checkout aislado con fixture descartable

**Criterios de aceptación** — todos verificados:

- [x] Payload canónico: `5 pass / 0 fail`
- [x] Instalación y lifecycle enfocados: `27 pass / 0 fail`
- [x] Suite aislada completa: `442 pass / 0 fail`, `2688 expect()` calls en 24 archivos
- [x] La instalación congelada preserva el lock y no produce efectos sobre runtime o DB reales; el fixture descartable se destruye al finalizar
- [x] La implementación queda referenciada por `3d2ef57` y acotada a `install/**`, `scripts/publish-runtime.mjs` y `test/install/**`

**Evidencia de cierre:** implementación `3d2ef57`; payload 5/0, instalación 27/0 y suite aislada completa 442/0. `bun install --frozen-lockfile` pasó, el lock permaneció intacto, no se accedió ni mutó el runtime o la DB reales y todos los recursos del checkout/fixture descartable fueron eliminados. `M8.8.4` deja habilitada la continuación atendida de `M8.8.2`, pero no cambia el estado de `M8.8.2` ni adelanta `M8.8.3`.

#### M8.8.5 — `diagnose` detecta payload incompleto

`M8.8.4` cerró el contrato del payload en la **publicación**. Este Módulo cierra el hueco correspondiente en la **verificación**: `diagnose` era el instrumento con el que se iba a comprobar que la adopción de `M8.8.2` había salido bien, y no detectaba el único modo de falla que hoy bloquea `M8.8.3`.

El chequeo era `existsSync(<version>/.manifest)` — un archivo presente, nada más. El `.manifest` es un digest pelado, no enumera miembros. Por eso `torre diagnose` devolvía `healthy:true` sobre `b72e450`, a la que le falta `core.mjs`. Verificar la adopción con un instrumento ciego al modo de falla no es verificar.

| Campo | Valor |
|---|---|
| Estado | ✅ COMPLETO |
| Modo | 🔒 SELLABLE, autónomo; sólo lectura sobre el runtime real |
| Depende de | `M8.8.4` ✅ COMPLETO |
| Área | `install/lifecycle.mjs`, `test/install/**` |
| Recurso | ninguno; sin migraciones de DB y sin token de entrega |

**Decisiones:**

- `derivable` — dónde vive la validación. **Criterio:** `lifecycle()` es el motor genérico y acepta `files` arbitrarios; el contrato del runtime lo conoce `runCli`. Falsificable: si los tests genéricos de lifecycle tuvieran que declarar los cinco miembros, la capa elegida estaba mal. **Autoridad:** el layering ya existente en `install/lifecycle.mjs:202`.
- `derivable` — comportamiento sin `expectedMembers`. **Criterio:** se preserva la semántica anterior, así que ningún llamador genérico cambia. Falsificable por el test dedicado.

**Tareas** — todas completadas:

- [x] `T8.8.5.1` RED: cubrir que una versión instalada a la que le falta un miembro esperado reporte `healthy:false` y nombre el faltante, y que sin `expectedMembers` se preserve la salud por manifest
- [x] `T8.8.5.2` GREEN: aceptar `expectedMembers` en `diagnose` y pasar `RUNTIME_PAYLOAD_FILES` desde `runCli`
- [x] `T8.8.5.3` VERIFY: suite enfocada y suite completa, más el comando real contra el data-root del maintainer

#### M8.8.6 — Resolución desde el puntero activo

`M8.8.3` no puede ejecutarse porque el mecanismo que necesita no existe. Verificado contra el código el 2026-08-03:

- `bin/torre:20` — `CORE="${CONTROL_TOWER_CORE:-$HOME/.config/opencode/control-tower/core.mjs}"`. El default apunta al checkout legado **incluso en la copia instalada**, y `active.json` no se lee en ninguna parte del script.
- `bin/torre:21` — `LIFECYCLE` se resuelve con `dirname "${BASH_SOURCE[0]}"/..`, relativo al archivo. Bajo symlink, `${BASH_SOURCE[0]}` es el enlace y la ruta cae fuera de la instalación.

Consecuencia doble: **copiar** el entrypoint instalado a `~/.local/bin/` no corta nada —sigue cargando el `core.mjs` legado— y **enlazarlo** rompe `LIFECYCLE`. Las dos formas obvias de hacer `M8.8.3` fallan, y por eso `M8.8.3` es código y no un comando.

Este Módulo construye ese mecanismo y **nada más**: no toca el PATH, no repunta nada y no muta el runtime real. Es la mitad reversible de lo que antes era un solo Módulo irreversible.

> 🔴 **BLOQUEADO el 2026-08-03, el mismo día que se enumeró.** Este Módulo construye la resolución
> hacia la versión activa, y esa versión **no carga**: le falta `install/runtime-payload.mjs`, que
> `lifecycle.mjs:8` importa. Implementarlo ahora produciría un mecanismo correcto apuntando a un
> runtime roto, y sus criterios de aceptación pasarían igual porque miden el repo. Primero hay que
> cerrar el contrato del payload y reinstalar. El diseño de abajo sigue siendo válido; lo que
> cambia es cuándo se despacha.

| Campo | Valor |
|---|---|
| Estado | 🔴 BLOQUEADO |
| Modo | 🔒 SELLABLE, autónomo; cero efectos fuera del repositorio |
| Depende de | `M8.8.5` ✅ COMPLETO y `M8.8.2` 🔴 REABIERTO |
| Área | `bin/torre`, `install/active-pointer.mjs`, `test/install/**` |
| Prohibido | `~/.local/bin/**`, `~/.local/share/control-tower/**`, `~/.config/opencode/control-tower/**`, `core.mjs`, `mcp.mjs` |
| Recurso | ninguno; sin DB, sin migraciones, sin token de entrega |

**Decisiones:**

- `derivable` — de dónde sale el data-root. **Criterio:** el mismo que ya usa `install/lifecycle.mjs` para instalar; si el Módulo tuviera que inventar una segunda convención de ruta, la fuente elegida estaba mal. Falsificable: dos rutas distintas en el árbol para el mismo data-root. **Autoridad:** `install/lifecycle.mjs`.
- `derivable` — cómo resuelve `bin/torre` cuando **no** hay puntero activo. **Criterio:** conserva exactamente el comportamiento de hoy —el default legado— porque un checkout de desarrollo no tiene data-root y debe seguir funcionando. Falsificable por un test que corra `bin/torre` sin `active.json` y espere la ruta actual. **Autoridad:** `bin/torre:20`.
- `derivable` — qué hacer si el puntero existe pero la versión está incompleta. **Criterio:** falla cerrado nombrando el miembro faltante, reusando `RUNTIME_PAYLOAD_FILES`; no cae silenciosamente al legado, porque un fallback silencioso es exactamente el verde falso que `M8.8.5` acaba de eliminar. Falsificable por un fixture al que se le borra `core.mjs`. **Autoridad:** `install/runtime-payload.mjs`.
- `derivable` — cómo sobrevive a un symlink. **Criterio:** la resolución no depende de `${BASH_SOURCE[0]}` cuando hay puntero activo. Falsificable por un test que enlace el entrypoint desde otro directorio y verifique que `LIFECYCLE` sigue resolviendo dentro de la instalación. **Autoridad:** `bin/torre:21`.

**Ninguna decisión escala.** El Módulo no toca nada fuera del repositorio, así que no entra en ninguna de las ocho clases. Ése es el punto: es el trozo de `M8.8.3` que sí se puede sellar.

**Tareas** (RED → GREEN → REFACTOR → VERIFY):

- [ ] `T8.8.6.1` RED: agregar `test/install/entrypoint-resolution.test.mjs` — sin `active.json`, `CORE` y `LIFECYCLE` resuelven exactamente a las rutas de hoy
- [ ] `T8.8.6.2` RED: con `active.json` válido, ambos resuelven dentro de `<dataRoot>/versions/<version>/` y no al checkout legado
- [ ] `T8.8.6.3` RED: con puntero a una versión sin `core.mjs`, falla cerrado nombrando el faltante y **no** cae al legado
- [ ] `T8.8.6.4` RED: invocado a través de un symlink desde otro directorio, `LIFECYCLE` sigue resolviendo dentro de la instalación
- [ ] `T8.8.6.5` GREEN: implementar la resolución en `bin/torre` leyendo el puntero con `readActivePointer`, sin duplicar la convención de data-root
- [ ] `T8.8.6.6` REFACTOR: dejar una ruta de recuperación que no dependa del entrypoint reemplazado —`previous` de `active.json` alcanzable sin el `torre` instalado— y documentarla en el propio script
- [ ] `T8.8.6.7` VERIFY: `bun test test/install` enfocada y `bun test` completa **con la Torre desarmada**, más testigos de bytes de que no se tocó `~/.local/**` ni `~/.config/**`

**Criterios de aceptación** — binarios, todos deben pasar para cerrar:

- [ ] Sin `active.json`, `bin/torre` se comporta exactamente como hoy — verificado por test, no por lectura
- [ ] Con `active.json` válido, `CORE` y `LIFECYCLE` resuelven dentro de la versión activa
- [ ] Un puntero a una versión incompleta falla cerrado y nombra el miembro faltante; **no** hay fallback silencioso al legado
- [ ] La invocación por symlink resuelve `LIFECYCLE` dentro de la instalación
- [ ] Existe una ruta de recuperación documentada que no requiere el entrypoint instalado
- [ ] `bun test test/install` pasa completo y `bun test` da `450 pass / 0 fail` o más, sin fallos nuevos
- [ ] Testigos de bytes confirman cero escrituras en `~/.local/**`, `~/.config/**` y el data-root real
- [ ] El diff no toca ninguna ruta fuera del `Área`

**Criterios de aceptación** — todos verificados:

- [x] Una versión instalada sin un miembro esperado reporta `healthy:false` y lo enumera en `missing`
- [x] Una versión completa reporta `healthy:true` con `missing: []`
- [x] Sin `expectedMembers`, `diagnose` conserva exactamente la semántica anterior
- [x] `lifecycle()` sigue siendo genérico: no importa el contrato del runtime en su firma obligatoria
- [x] `bun test test/install` pasa completo
- [x] `diagnose` es read-only: retorna antes de cualquier escritura, verificado en `install/lifecycle.mjs:149`
- [x] El diff no toca ninguna ruta fuera del `Área`

**Evidencia de cierre:** `test/install` 29/0; suite completa 448/2. Los dos fallos son `test/migration.test.mjs` — *P0 frozen snapshot restore* —, **preexistentes**: verificados en 58/2 sobre `HEAD` con los cambios guardados, así que no son regresión.

Contra el data-root real del maintainer, el mismo comando pasó de `{"healthy":true}` a `{"healthy":false,"missing":["core.mjs"]}` sin mutar nada. Eso convierte el bloqueo de `M8.8.3` en una condición detectable por herramienta en vez de por inspección manual. **No adelanta `M8.8.2` ni `M8.8.3`**: sigue haciendo falta el `torre install` atendido.

> **Nota de entorno:** este worktree no tenía `node_modules`. La primera corrida dio 348/10 con todos los fallos en `Cannot find package 'yaml'` (`package.json:7`), no en código. `bun install --frozen-lockfile` los resolvió dejando el lock intacto. Una medición de suite en un worktree sin dependencias no es un baseline.

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

Con `S8.4` cerrada y `S8.8` enumerada, P8 permanece en `50% (4/8 S)` — `M8.8.1` y `M8.8.4` son Módulos y no otorgan crédito parcial a la Sesión. Todo el alcance aprobado del lane tiene límite de un PR; no queda responsabilidad sin ID.

Cada Sesión es una unidad entregable dirigida a `master`. **Desde el 2026-08-01 (`46edd14`) eso es un commit directo + push, no un PR** — ver [Política de entrega](../../../AGENTS.md). El alcance de la Sesión no cambia: sigue siendo el que entraría en un PR. Las referencias a PRs de las Sesiones ya cerradas son historia y quedan como están.

**El alcance de `S8.7` cambió con la [unificación del 2026-08-01](../release-chain.md).** Ya no es sólo estado más arm/disarm: el puente además **presenta** una autorización creada por Main y **transporta** el callback acotado de aprobación o rechazo. Lo que no cambia es el principio — Hermes presenta; Main crea, valida y consume. El puente sigue sin recibir shell, workers, Git, merge directo, delivery ni selección implícita de proyecto. `S0.3` ya está ✅ COMPLETO y su enmienda permite ese transporte acotado; los bloqueos restantes de `S8.7` son `S8.8` y `S5.1`, donde nace la autorización que el puente presenta.

**Orden de ejecución:** `S8.8` primero — sin adopción, todo lo demás sigue sin correr en la máquina real. `S8.7` va al final de la cadena, después de `S5.1`; `S0.3` ya está ✅ COMPLETO. `S8.5` y `S8.6` quedan fuera del camino por decisión explícita del maintainer del 2026-07-31, que también reemplaza el estado `UNASSIGNED` que traía `S8.5`. La cadena completa y su grafo están en [release-chain](release-chain.md).

Las actualizaciones sobre los archivos de planificación reclamados por `installable-v1-provenance` en [`product-version-map.yaml`](../product-version-map.yaml) deben serializarse.
