# Contrato sellado — S8.7

> **QUEUED — NOT DISPATCHABLE**
>
> Este documento es un contrato estático preparado para una ejecución futura. La
> dependencia `S8.8` todavía no está cerrada y el SHA posterior a su cierre está
> deliberadamente sin binding. No autoriza implementación, pruebas, staging,
> commit, push, PR, merge ni despacho mientras el hard gate de binding no esté
> satisfecho.

## Identidad

| Campo | Valor |
|---|---|
| Sesión | `S8.7` — Puente Hermes/Telegram acotado |
| Módulos | `M8.7.1`–`M8.7.4` |
| Repositorio | `control-tower` |
| Planning basis | `master@a356bc5` |
| Rama a crear | `feat/installable-v1/s8-7-hermes-bridge` — sólo después del binding |
| Worktree | nuevo, propio y exclusivo; no reutilizar uno existente |
| Modo | autónomo, sin Torre de Control |
| Runner | `bun` |

La Sesión sigue siendo una única frontera de PR. Los cuatro Módulos son límites
de implementación y de commit dentro de esa Sesión; no crean niveles adicionales.

## Binding de despacho — hard gate

No se puede despachar este contrato hasta que una persona maintainer/planner
reconcilie y reemplace únicamente los campos de binding de esta sección con
evidencia exacta:

- `S8.8` debe figurar `✅ COMPLETO` en `master`.
- `M8.8.1`, `M8.8.2` y `M8.8.3` deben estar completos.
- La adopción debe incluir el runtime realmente instalado y en uso, no sólo una
  prueba en el repositorio.
- El SHA exacto de `master` posterior al cierre de `S8.8` es actualmente
  **INTENCIONALMENTE UNBOUND**.
- La evidencia de cierre de `S8.8` debe identificar ese SHA exacto y demostrar la
  adopción real del runtime.

El agente implementador **no puede elegir, inferir, aproximar ni sustituir** el
base. Si el SHA sigue unbound, si falta evidencia exacta, o si cualquier parte de
`S8.8` no está `✅ COMPLETO`, debe detenerse inmediatamente, informar
`BLOCKED_DEPENDENCY_S8_8` y no mutar nada.

Hasta entonces, `FUTURE_BOUND_SHA` es sólo el nombre del binding pendiente; no es
un SHA, no es un valor por defecto y no otorga permiso para crear rama, worktree o
ejecutar comandos. No se permite interpretar ningún placeholder como autorización.

Los únicos campos que el maintainer/planner podrá reemplazar al habilitar el
contrato son:

1. el SHA exacto posterior a `S8.8`;
2. la referencia de evidencia exacta de `S8.8`;
3. la identidad exacta del nuevo worktree derivado de ese SHA.

No podrá cambiar alcance, tareas, contratos, seguridad, verificación, criterios de
cierre ni política de entrega sin emitir un contrato nuevo.

## Área sellada

El diff de implementación sólo puede contener estas cuatro áreas:

```text
bridge/**
test/bridge/**
core.mjs
bin/torre
```

El implementador tiene prohibido modificar, crear o eliminar cualquier otra ruta,
incluyendo explícitamente:

```text
install/**
test/install/**
package.json
bun.lock
mcp.mjs
support/**
registry/**
openspec/**
```

La prohibición incluye cambios indirectos, archivos auxiliares, snapshots,
fixtures persistentes, configuraciones, lockfiles y artefactos generados fuera de
las cuatro áreas. No se toca `STATUS.md`; la evidencia de cierre pertenece al
maintainer bajo la ownership vigente.

## Frontera de no mutación y seguridad

Hermes es opcional y sólo posee el transporte Telegram y sus tokens. Puede importar
un bridge ESM local en proceso. El bridge debe validar identidad derivada de Hermes,
freshness, replay, enrollment del proyecto y `Main` canónico antes de cualquier
acceso a estado.

Queda prohibido que el bridge tenga o componga autoridad para:

- shell cruda o ejecución de comandos;
- SQL, migraciones, locks o escritura de DB;
- listener HTTP o endpoint remoto;
- workers, sesiones o worktrees, salvo el worktree inicial ya creado para la
  ejecución futura;
- lectura de tokens, secretos, texto de mensajes o valores de configuración como
  autoridad;
- cola, replay persistente, reintentos, procesos residentes o workers;
- selección implícita de proyecto, rutas Telegram crudas, rutas relativas o
  symlinks como contexto de estado;
- Git, commits, rebase, tags, push, PR, merge, release, deploy o autoridad de
  entrega;
- Torre de Control, locks o token de entrega.

Los tests usan únicamente fixtures temporales. Antes y después de éxito, rechazo,
fallo de operación y fallo de auditoría deben quedar byte a byte, modo a modo e
inalterados los testigos de:

- configuración y token reales de Hermes, si existen;
- registro de proyectos;
- runtime instalado;
- `.git/control-tower/**`, incluyendo `tower.db`, `tower.log`, `ACTIVE` y sus
  archivos `-wal`/`-shm`;
- cualquier otra configuración o estado real que el fixture pueda observar.

Ningún test puede escribir en `~/.hermes/.env`, configuración de Hermes, registro
de proyectos, runtime instalado ni `.git/control-tower/**`. La prueba de ausencia
de Hermes ocurre mediante fixtures temporales y no mediante cambios en la máquina
real.

## Contrato técnico cerrado

### Construcción y puertos

La única superficie del bridge es:

```js
createHermesBridge({ allowedUserId, allowedChatId, now, audit,
  createSupportBrief, resolveRegisteredMain, activate, deactivate })
  -> { handle(request) }
```

Hermes suministra exactamente un `allowed_user_id` numérico y exactamente un
`allowed_chat_id` numérico desde configuración local no secreta. La configuración
se cierra en la construcción. Ausente, no numérica, wildcard, username, múltiple o
mismatched falla cerrado. La API de estado inferior no recibe política de allowlist.

`handle` acepta únicamente `status`, `arm` y `disarm`. La solicitud normalizada
contiene exactamente estas claves:

```js
{ request_id, received_at, action, project_id, user_id, chat_id }
```

El orden de rechazo y acceso es fijo:

1. normalizar;
2. validar allowlist, freshness y replay;
3. rechazar acción no soportada;
4. resolver el registro y el `Main` canónico;
5. ejecutar sólo la operación autorizada;
6. auditar únicamente metadata.

La identidad siempre proviene de metadata Telegram derivada de Hermes. El texto del
mensaje nunca autoriza, selecciona proyecto ni modifica la solicitud.

### Freshness, dedup y códigos

La ventana de freshness es exactamente `120` segundos. `request_id` se mantiene en
un conjunto bounded, en memoria, por `120` segundos. No se persiste, encola,
reproduce ni reintenta. Un duplicado se rechaza con `CT_BRIDGE_REPLAY`.

Los códigos estables y completos son exactamente:

```text
CT_BRIDGE_OK
CT_BRIDGE_UNAUTHORIZED
CT_BRIDGE_INVALID_REQUEST
CT_BRIDGE_UNSUPPORTED_ACTION
CT_BRIDGE_STALE
CT_BRIDGE_REPLAY
CT_BRIDGE_PROJECT_NOT_FOUND
CT_BRIDGE_PROJECT_AMBIGUOUS
CT_BRIDGE_MAIN_MISMATCH
CT_BRIDGE_AUDIT_FAILED
CT_BRIDGE_OPERATION_FAILED
```

Cada respuesta tiene exactamente esta forma y estas claves:

```js
{ ok, code, request_id, project_id, action, changed,
  previous_state, current_state }
```

Las rejections tienen campos de estado nullable. Una auditoría posterior fallida
no puede afirmar que la mutación no ocurrió: debe devolver
`CT_BRIDGE_AUDIT_FAILED` con `changed`, `previous_state` y `current_state`
truthful.

### Proyecto y Main canónico

`resolveRegisteredMain` es la única autoridad de proyecto. El bridge no acepta
paths Telegram, selección implícita, selector raw/relative/symlink ni un common-dir
que no coincida con `Main`. Ambiguo, ausente o mismatch falla antes de tocar estado,
con los códigos exactos `CT_BRIDGE_PROJECT_NOT_FOUND`,
`CT_BRIDGE_PROJECT_AMBIGUOUS` o `CT_BRIDGE_MAIN_MISMATCH`, según corresponda.

Las operaciones de estado reciben únicamente el contexto canónico resuelto por el
registro. `status` llama sólo a `createSupportBrief`; `arm` llama a
`core.activate`; `disarm` llama a `core.deactivate`. `activate` y `deactivate` son
operaciones canónicas e idempotentes: repetir una solicitud NEW es seguro y el
resultado conserva el estado anterior y actual verdaderos.

### Auditoría exacta

La auditoría recibe exactamente:

```js
audit({ request_id, project_id, action, user_id, chat_id,
  outcome_code, changed, occurred_at })
```

Nunca recibe texto de mensaje, tokens ni valores de configuración. Una falla de
auditoría pre-action deniega la mutación. Una falla post-action devuelve
`CT_BRIDGE_AUDIT_FAILED` y conserva el estado real.

### CLI y outage de Hermes

`bin/torre` permanece libre de Hermes. La operación local `on` debe pasar por el
`core.activate` canónico; CLI y Support continúan completos aunque Hermes falte,
se detenga o falle. La integración ESM de Hermes es opcional y local.

La ausencia de Hermes es sólo diagnóstica: no habilita retries, colas, replay,
workers, shell, Git o merge. Requests de worker, shell, Git o merge se rechazan.
No se implementa E2E de transporte Telegram dentro del repositorio.

## Tareas — Strict TDD, orden exacto

Las tareas se ejecutan en el orden de dependencias siguiente. No se inventan tareas,
decisiones ni superficie adicional.

### M8.7.1 — Authorization boundary

- [ ] **T8.7.1.1 RED:** in `test/bridge/authorization.test.mjs`, prove exact numeric allowlist closure; missing, non-numeric, wildcard, username, multiple, mismatched, absent, or ambiguous identity fails closed and text cannot authorize.
- [ ] **T8.7.1.2 RED:** prove normalized keys are exactly `{ request_id, received_at, action, project_id, user_id, chat_id }` and order is normalize, allowlist/freshness/replay, reject action, then resolve registry; assert audit exactly `{ request_id, project_id, action, user_id, chat_id, outcome_code, changed, occurred_at }` with no text/tokens/config.
- [ ] **T8.7.1.3 GREEN:** create `bridge/**` normalization/adapter with bounded in-memory 120-second dedup and exact codes `CT_BRIDGE_OK`, `CT_BRIDGE_UNAUTHORIZED`, `CT_BRIDGE_INVALID_REQUEST`, `CT_BRIDGE_UNSUPPORTED_ACTION`, `CT_BRIDGE_STALE`, `CT_BRIDGE_REPLAY`, `CT_BRIDGE_PROJECT_NOT_FOUND`, `CT_BRIDGE_PROJECT_AMBIGUOUS`, `CT_BRIDGE_MAIN_MISMATCH`, `CT_BRIDGE_AUDIT_FAILED`, `CT_BRIDGE_OPERATION_FAILED`.
- [ ] **T8.7.1.4 REFACTOR:** freeze the closed ports/configuration and verify no persistence, queue, replay, shell, SQL, HTTP, or token leakage.

### M8.7.2 — Read-only status

- [ ] **T8.7.2.1 RED:** in `test/bridge/status.test.mjs`, require one `createSupportBrief` call, exact response fields, deterministic state mapping, and byte/existence/mode/time/inode witnesses unchanged on success and rejection.
- [ ] **T8.7.2.2 GREEN:** dispatch `status` through `createSupportBrief` only and emit metadata-only audit with truthful nullable state fields.
- [ ] **T8.7.2.3 REFACTOR:** keep status deterministic and preserve registry, DB, WAL, SHM, and Tower-state bytes.

### M8.7.3 — Arm/disarm intent

- [ ] **T8.7.3.1 RED:** in `test/bridge/intent.test.mjs`, cover registry missing/ambiguous, raw/relative/symlink selector, common-dir/Main mismatch, and canonical-Main validation before state; assert `CT_BRIDGE_PROJECT_NOT_FOUND`, `CT_BRIDGE_PROJECT_AMBIGUOUS`, `CT_BRIDGE_MAIN_MISMATCH`.
- [ ] **T8.7.3.2 RED:** cover `activate`/`deactivate` idempotency, operation failure, exact result shape, and audit pre-failure (no mutation) versus post-failure (`CT_BRIDGE_AUDIT_FAILED`, truthful state).
- [ ] **T8.7.3.3 GREEN:** dispatch canonical context through `resolveRegisteredMain` to `core.activate`/`core.deactivate`; add canonical idempotent `activate` in `core.mjs` and route local `on` in `bin/torre` through it.
- [ ] **T8.7.3.4 REFACTOR:** normalize `CT_BRIDGE_OPERATION_FAILED` and retain no shell/session/worktree/worker/Git/merge authority.

### M8.7.4 — Optional Hermes outage

- [ ] **T8.7.4.1 RED:** in `test/bridge/outage.test.mjs`, prove missing/stopped/failing Hermes removes only Telegram access; CLI and local Support remain complete, and worker/shell/Git/merge requests are rejected.
- [ ] **T8.7.4.2 GREEN:** keep `bin/torre` and `core.mjs` Hermes-free; expose bridge imports only as optional local ESM integration.
- [ ] **T8.7.4.3 REFACTOR:** assert the import boundary and diagnostic-only outage behavior without retries, queues, or replay.

Cada Módulo conserva su focused proof y rollback boundary:

| Módulo | Prueba enfocada | Runtime harness | Rollback |
|---|---|---|---|
| `M8.7.1` | `bun test test/bridge/authorization.test.mjs` | `N/A — in-process adapter` | autorización/normalización de `bridge/**` |
| `M8.7.2` | `bun test test/bridge/status.test.mjs` | `N/A — read-only fixture` | dispatch de status en `bridge/**` |
| `M8.7.3` | `bun test test/bridge/intent.test.mjs` | `N/A — injected Main ports` | intent bridge + `core.mjs` + `bin/torre` on |
| `M8.7.4` | `bun test test/bridge/outage.test.mjs` | `N/A — Hermes optional` | outage/import-boundary behavior |

## Verificación final — exacta y una sola vez

La verificación final se ejecuta una vez, al final, sólo después de completar todas
las tareas y normalizadores mutantes. No se ejecuta ahora porque el contrato está
queued. Un fallo distinto de los dos fallos P0 congelados es terminal.

```sh
bun install
bun test test/bridge
bun test
git diff --name-only FUTURE_BOUND_SHA...HEAD
```

El comando de diff sólo queda habilitado después de reemplazar
`FUTURE_BOUND_SHA` por el SHA exacto del binding posterior a `S8.8`. La salida sólo
puede contener estas cuatro áreas:

```text
bridge/**
test/bridge/**
core.mjs
bin/torre
```

La verificación final también debe capturar antes y después, en fixtures temporales
y contra los testigos reales sin mutarlos, existencia, bytes, modo, inode, tamaño,
`mtimeNs` y `ctimeNs` de:

```text
~/.hermes/.env                         (si existe; sólo lectura)
configuración y token de Hermes       (si existen; sólo lectura)
registro de proyectos                 (sólo lectura)
.git/control-tower/**                 (incluye DB/WAL/SHM/ACTIVE; sólo lectura)
```

Todos los testigos deben ser idénticos antes y después en éxito y cada rechazo. La
ausencia de un testigo se registra como ausencia idéntica; no se crea para medirlo.

La baseline de `bun test` es `429 pass / 2 fail` mientras la Torre está armada. Los
dos fallos permitidos son exclusivamente los fallos preexistentes de
`P0 frozen snapshot restore`. No se arreglan en S8.7. Cualquier cantidad diferente,
cualquier nuevo fallo o cualquier modificación de un testigo es terminal.

## Criterios de cierre binarios

S8.7 sólo puede cerrarse cuando cada condición sea verdadera; no existe cierre
parcial, `PASS WITH WARNINGS` ni follow-up implícito:

- [ ] `S8.8` figura `✅ COMPLETO` en `master` con `M8.8.1`, `M8.8.2`, `M8.8.3` y adopción real del runtime instalada.
- [ ] El binding contiene el SHA exacto posterior a `S8.8` y evidencia exacta; no queda `UNBOUND`.
- [ ] Las cuatro áreas permitidas son las únicas rutas del diff.
- [ ] Todos los tests RED, GREEN y REFACTOR de `M8.7.1`–`M8.7.4` existen y pasan en el orden contractual.
- [ ] Todas las respuestas tienen exactamente `{ ok, code, request_id, project_id, action, changed, previous_state, current_state }`.
- [ ] Los once códigos `CT_BRIDGE_*` del diseño están implementados y cubiertos.
- [ ] Allowlist, orden de autorización, freshness/dedup de `120s`, validación canónica de registry/Main y rechazo previo a state pasan sin acceso prematuro.
- [ ] `status` reutiliza `createSupportBrief`, es read-only y conserva todos los testigos de bytes, existencia y metadata.
- [ ] `arm`/`disarm` usan `core.activate`/`core.deactivate` canónicos e idempotentes, y `bin/torre on` reutiliza `core.activate`.
- [ ] La auditoría recibe exactamente metadata; fallo pre-action evita mutación y fallo post-action devuelve `CT_BRIDGE_AUDIT_FAILED` con estado truthful.
- [ ] Hermes ausente, detenido o fallido sólo es diagnóstico; CLI y Support siguen completos.
- [ ] No existen shell, SQL, HTTP, queue/replay, token reads, workers, sesiones/worktrees adicionales, Git/delivery authority ni selección implícita de proyecto.
- [ ] Los fixtures son temporales y los testigos reales de Hermes, registry, runtime instalado y `.git/control-tower/**` son idénticos antes y después.
- [ ] `bun install` pasa.
- [ ] `bun test test/bridge` pasa completo.
- [ ] `bun test` conserva exactamente `429 pass / 2 fail` con sólo los dos P0 preexistentes permitidos y ningún fallo nuevo.
- [ ] El diff-check contra el SHA bound pasa y sólo permite las cuatro áreas declaradas.
- [ ] El candidato se entrega únicamente con commit y push de la rama `feat/installable-v1/s8-7-hermes-bridge`; no se abre PR ni se hace merge sin autorización separada.
- [ ] El maintainer actualiza la evidencia y el cierre en el camino vigente, sin que el implementador toque `STATUS.md` ni `openspec/**`.

## Preguntas y decisiones

No preguntar y no adivinar. Si aparece una pregunta, una ambigüedad, una ruta no
enumerada, una discrepancia de contrato o cualquier decisión no resuelta:

1. detener la ejecución;
2. informar `BLOCKED` y el identificador exacto de la decisión pendiente;
3. no mutar archivos, estado real, registro, runtime, Tower ni Git;
4. continuar sólo con una tarea independiente que no dependa de la decisión, si
   existe y está explícitamente enumerada;
5. si no existe, terminar reportando el bloqueo.

## Entrega futura

Después de satisfacer el binding y todos los criterios, la única entrega autorizada
por este contrato es commit y push de la rama indicada. No se autoriza PR, merge,
release, deploy, token de entrega ni actualización de `STATUS.md`. Cualquier cambio
de política requiere autorización separada y un contrato nuevo.

## Prompt de lanzamiento — deshabilitado mientras esté queued

El siguiente prompt es sólo una plantilla futura. Está **DISABLED** hasta que el
binding de `S8.8` esté completo y el SHA exacto/evidencia hayan sido reemplazados:

```text
opencode: lee completo openspec/changes/v1-release/seal-S8.7.md antes de actuar.
Este contrato debe permanecer QUEUED — NOT DISPATCHABLE si S8.8 no está ✅ COMPLETO
o si el SHA posterior a S8.8 sigue UNBOUND. En cualquiera de esos casos, detente,
reporta BLOCKED_DEPENDENCY_S8_8 y no mutés nada. Si el binding ya fue completado
por el maintainer/planner, ejecuta sólo S8.7, respeta exactamente las cuatro áreas,
las tareas y la verificación final del contrato, y reporta cualquier decisión sin
adivinar.
```
