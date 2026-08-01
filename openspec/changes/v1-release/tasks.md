# V1 release — tasks

> Bajo la [regla de ejecución V1](../../plans/v1-execution-rule.md): sin `exploration.md` ni
> `proposal.md`. S8.7 es la excepción aprobada con `design.md` como contrato autoritativo; las
> specs V1 viven en el change archivado
> [`installable-v1-autonomous-v2-split`](../archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md).
>
> Baseline de implementación de M8.8.4: `origin/master@b72e450021fc34315e2392758f1b29aa9426f686`. Estado de P8: `50% (4/8 S)`.
> Ejecutor: **un solo agente, sin Torre de Control.**

## Qué queda para un V1 usable

| Sesión | Resultado | Estado | Por qué |
|---|---|---|---|
| `S8.8` | Adopción del instalable | 🟢 LISTO | Sin esto nada de lo construido desde 2026-07-21 corre en la máquina real |
| `S8.7` | Puente Hermes/Telegram acotado | 🟢 LISTO | Es lo que el socio va a usar |

`S8.5` y `S8.6` están 🟡 DIFERIDO. `S8.1`–`S8.4` están ✅ COMPLETO.

**Orden obligatorio: `S8.8` antes que `S8.7`.** Verificar el puente contra un runtime que no
es el que corre no prueba nada.

---

## S8.8 — Adopción del instalable en el runtime en uso

**Área sellada (`M8.8.1`):** `install/**`, `test/install/**` — nada más.
**Área atendida (`M8.8.2`, `M8.8.3`):** `bin/torre`, data-root XDG, `~/.config/opencode/control-tower/`.
**Recurso:** data-root XDG. Sin migraciones de DB, sin token de entrega.
**Depende de:** `S8.2` ✅

El lifecycle versionado existe y está probado desde `S8.2`, pero nunca se instaló nada a través
de él. `bin/torre:20` resuelve el runtime como
`CONTROL_TOWER_CORE:-$HOME/.config/opencode/control-tower/core.mjs`: un checkout independiente,
sin remote, de 398 líneas, congelado en `681a0e5` el 2026-07-21.

> **S8.8 sigue siendo UNA Sesión.** Lo que se parte no es la Sesión sino la **forma de ejecución**:
> `M8.8.1` es sellable y un agente la corre solo; `M8.8.2` y `M8.8.3` mutan la máquina real del
> maintainer y **son atendidas**. Un contrato sellado no autoriza efectos fuera del repositorio,
> y nadie debería despertarse con `torre` roto porque un agente repuntó el runtime a las 3am.

### M8.8.1 — Cobertura del caso legado → XDG · 🔒 SELLABLE, autónomo

Único Módulo que un implementador puede ejecutar sin supervisión. Todo ocurre dentro del
repositorio: sin `torre install` real, sin tocar `~/.config/`, sin mover el runtime en uso.

- [ ] T8.8.1.1 RED: extender `test/install/lifecycle.test.mjs` con el caso de instalar sobre una máquina que ya tiene un runtime legado sin data-root XDG, preservando configuración e historial. El fixture usa un data-root temporal, **nunca** `$HOME`
- [ ] T8.8.1.2 RED: agregar el caso de idempotencia — instalar dos veces seguidas produce exactamente el mismo estado — y el de `rollback` sin pérdida de configuración ni historial
- [ ] T8.8.1.3 GREEN: ajustar `install/lifecycle.mjs`, `install/active-pointer.mjs` o `install/version-store.mjs` sólo si algún caso falla. Si pasan sin cambios, dejar constancia escrita de que la cobertura ya existía en lugar de inventar código
- [ ] T8.8.1.4 REFACTOR: normalizar errores estables y volver a correr `bun test test/install`

**Criterios de aceptación de M8.8.1** — cierran el sello:

- [ ] Los tres casos nuevos —legado→XDG, idempotencia y rollback— existen y pasan
- [ ] `bun test test/install` pasa completo
- [ ] `bun test` no introduce fallos nuevos respecto de la base de 429 pass / 2 fail preexistentes
- [ ] Ninguna ruta fuera de `install/**` y `test/install/**` aparece en el diff
- [ ] Ningún test escribe fuera de su directorio temporal: `~/.config/opencode/control-tower/`, el data-root XDG real y `.git/control-tower/` quedan idénticos byte a byte

### M8.8.2 — Diagnóstico y adopción real · 👤 ATENDIDO

**No sellar. No ejecutar de forma autónoma.** Requiere al maintainer presente.

- [ ] T8.8.2.1 Ejecutar `torre diagnose` y registrar textualmente qué reporta sobre data-root, puntero activo y versión resuelta
- [ ] T8.8.2.2 Capturar el estado del runtime en uso: ruta, SHA del checkout, tamaño, fecha y ausencia de remote
- [ ] T8.8.2.3 Respaldar `~/.config/opencode/control-tower/` completo antes de tocar nada
- [ ] T8.8.2.4 Ejecutar `torre install` real y verificar que el data-root XDG queda creado con la versión y el puntero activo correctos
- [ ] T8.8.2.5 Confirmar que la configuración y el historial previos siguen íntegros después de instalar

La adopción atendida queda como evidencia de estado, no se marca silenciosamente como
`✅ COMPLETO` en este artefacto; el payload instalado de `b72e450` es incompleto.

### M8.8.4 — Complete executable runtime payload · 🟢 LISTO

**Área exacta:** `install/**`, `test/install/**`, `bin/torre`, `scripts/publish-runtime.mjs`.
**Depende de:** `M8.8.1`; completa antes de reanudar `M8.8.3`. M8.8.2 permanece atendido.
El payload incompleto de `b72e450` es evidencia histórica inmutable y no puede activarse ni
usarse para rollback.

#### Review Workload Forecast — M8.8.4

Estimated changed lines: 260–390 authored lines; one PR, six TDD tasks, no chained PR.
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

- [ ] **T8.8.4.1 RED:** en `test/install/runtime-payload.test.mjs`, exigir el payload publicado exacto de cinco archivos (`bin/torre`, `core.mjs`, `install/lifecycle.mjs`, `install/active-pointer.mjs`, `install/version-store.mjs`) y rechazar miembros faltantes, symlinks, traversal, checkout copy, `node_modules` y secretos.
- [ ] **T8.8.4.2 GREEN:** crear un único allowlist/validator canónico y explícito bajo `install/**`, consumido tanto por `scripts/publish-runtime.mjs` como por la validación del lifecycle.
- [ ] **T8.8.4.3 REFACTOR:** preservar versiones inmutables, puntero atómico y errores estables para payload incompleto; ningún repair in-place del `b72e450` histórico.
- [ ] **T8.8.4.4 RED:** en el harness instalado con `HOME`, XDG, Git y data-root temporales, cubrir `on`, `off`, `status`, `log`, `unlock` y `reset` sin leer el runtime legado.
- [ ] **T8.8.4.5 GREEN:** hacer que `bin/torre` resuelva `core.mjs` relativo a la versión instalada por defecto, preservando el override explícito `CONTROL_TOWER_CORE`.
- [ ] **T8.8.4.6 REFACTOR:** eliminar lecturas legacy implícitas y conservar la resolución relativa del lifecycle; verificar reemplazo completo y rechazo atómico de payload parcial.

**Criterios de aceptación de M8.8.4** — todos deben pasar:

- [ ] La publicación y validación aceptan exactamente los cinco archivos, rechazan faltantes, symlinks, traversal y miembros extra, y no incluyen checkout copy, `node_modules` ni secretos.
- [ ] El harness de seis comandos es aislado y no toca runtime, configuración, backup, data-root, `.git/control-tower/**` ni Hermes reales.
- [ ] La versión incompleta de `b72e450` permanece byte-identical, es unhealthy y no puede activarse ni usarse para rollback; no se repara in-place.
- [ ] Symlink, traversal y partial payload fallan atómicamente; un replacement completo activa y conserva inmutabilidad y puntero atómico.
- [ ] `bin/torre` usa el core instalado relativo por defecto y sólo `CONTROL_TOWER_CORE` puede seleccionar otro core explícitamente; no hay lectura legacy implícita.
- [ ] `core.mjs`, `mcp.mjs`, `package.json` y `bun.lock` no cambian.
- [ ] Pasan las pruebas enfocadas, `bun test test/install`, el baseline completo esperado y el diff-check del Área.

### M8.8.3 — Corte al runtime legado · 👤 ATENDIDO · 🔴 BLOQUEADO HASTA M8.8.4

**No reanudar hasta completar M8.8.4.** El corte quedó bloqueado sin diff porque el payload
activo de `b72e450` carece de `core.mjs`.

- [ ] T8.8.3.1 Repuntar `bin/torre` al runtime instalado y dejar el checkout legado intacto como respaldo, sin borrarlo
- [ ] T8.8.3.2 Verificar `on`, `off`, `status`, `log`, `unlock` y `reset` contra el runtime instalado, uno por uno
- [ ] T8.8.3.3 Ejecutar `torre rollback` y confirmar que vuelve a la versión anterior sin pérdida de configuración
- [ ] T8.8.3.4 Reinstalar hacia adelante y confirmar idempotencia en la máquina real

### Criterios de aceptación S8.8 — la Sesión cierra cuando todos pasan

- [ ] `M8.8.1` cerrada con su sello verificado
- [ ] `M8.8.4` cerrada antes de reanudar el corte de `M8.8.3`, con el closure ejecutable exacto de cinco archivos
- [ ] `torre diagnose` reporta un data-root XDG existente con puntero activo válido
- [ ] El runtime resuelto por `bin/torre` es el instalado, no el checkout de `~/.config/opencode/control-tower/`
- [ ] Las seis operaciones diarias corren contra el runtime instalado
- [ ] `rollback` y la reinstalación hacia adelante funcionan sin pérdida de configuración ni de historial
- [ ] El checkout legado sigue existiendo como respaldo

---

## S8.7 — Bounded Hermes/Telegram Bridge

**Area:** `bridge/**`, `test/bridge/**`, `core.mjs`, `bin/torre`
**Resource:** registry and Tower-state reads only; no migrations, locks, or delivery token.
**Depends on:** `S8.4` ✅, `S8.8`

Hermes is optional and supplies one exact numeric user/chat allowlist plus Telegram metadata. The
in-process bridge normalizes, authorizes, freshness-checks, deduplicates, resolves the registered
canonical `Main`, then calls `createSupportBrief` or canonical `activate`/`deactivate`. It never
receives text as authority and never executes shell, SQL, HTTP, workers, Git, merge, queue, or replay.

### Review Workload Forecast

Estimated changed lines: 620–760 authored lines (approved reviewer budget: 800)
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium
Delivery strategy: single-pr

The single S8.7 PR remains the Sesión boundary; M8.7.1–M8.7.4 are review/commit boundaries.

| Boundary | Focused proof | Runtime harness | Rollback |
|---|---|---|---|
| M8.7.1 | `bun test test/bridge/authorization.test.mjs` | `N/A — in-process adapter` | `bridge/**` authorization/normalization |
| M8.7.2 | `bun test test/bridge/status.test.mjs` | `N/A — read-only fixture` | `bridge/**` status dispatch |
| M8.7.3 | `bun test test/bridge/intent.test.mjs` | `N/A — injected Main ports` | intent bridge + `core.mjs` + `bin/torre` on |
| M8.7.4 | `bun test test/bridge/outage.test.mjs` | `N/A — Hermes optional` | outage/import-boundary behavior |

### M8.7.1 — Authorization boundary

- [ ] T8.7.1.1 RED: in `test/bridge/authorization.test.mjs`, prove exact numeric allowlist closure; missing, non-numeric, wildcard, username, multiple, mismatched, absent, or ambiguous identity fails closed and text cannot authorize.
- [ ] T8.7.1.2 RED: prove normalized keys are exactly `{ request_id, received_at, action, project_id, user_id, chat_id }` and order is normalize, allowlist/freshness/replay, reject action, then resolve registry; assert audit exactly `{ request_id, project_id, action, user_id, chat_id, outcome_code, changed, occurred_at }` with no text/tokens/config.
- [ ] T8.7.1.3 GREEN: create `bridge/**` normalization/adapter with bounded in-memory 120-second dedup and exact codes `CT_BRIDGE_OK`, `CT_BRIDGE_UNAUTHORIZED`, `CT_BRIDGE_INVALID_REQUEST`, `CT_BRIDGE_UNSUPPORTED_ACTION`, `CT_BRIDGE_STALE`, `CT_BRIDGE_REPLAY`, `CT_BRIDGE_PROJECT_NOT_FOUND`, `CT_BRIDGE_PROJECT_AMBIGUOUS`, `CT_BRIDGE_MAIN_MISMATCH`, `CT_BRIDGE_AUDIT_FAILED`, `CT_BRIDGE_OPERATION_FAILED`.
- [ ] T8.7.1.4 REFACTOR: freeze the closed ports/configuration and verify no persistence, queue, replay, shell, SQL, HTTP, or token leakage.

### M8.7.2 — Read-only status

- [ ] T8.7.2.1 RED: in `test/bridge/status.test.mjs`, require one `createSupportBrief` call, exact response fields, deterministic state mapping, and byte/existence/mode/time/inode witnesses unchanged on success and rejection.
- [ ] T8.7.2.2 GREEN: dispatch `status` through `createSupportBrief` only and emit metadata-only audit with truthful nullable state fields.
- [ ] T8.7.2.3 REFACTOR: keep status deterministic and preserve registry, DB, WAL, SHM, and Tower-state bytes.

### M8.7.3 — Arm/disarm intent

- [ ] T8.7.3.1 RED: in `test/bridge/intent.test.mjs`, cover registry missing/ambiguous, raw/relative/symlink selector, common-dir/Main mismatch, and canonical-Main validation before state; assert `CT_BRIDGE_PROJECT_NOT_FOUND`, `CT_BRIDGE_PROJECT_AMBIGUOUS`, `CT_BRIDGE_MAIN_MISMATCH`.
- [ ] T8.7.3.2 RED: cover `activate`/`deactivate` idempotency, operation failure, exact result shape, and audit pre-failure (no mutation) versus post-failure (`CT_BRIDGE_AUDIT_FAILED`, truthful state).
- [ ] T8.7.3.3 GREEN: dispatch canonical context through `resolveRegisteredMain` to `core.activate`/`core.deactivate`; add canonical idempotent `activate` in `core.mjs` and route local `on` in `bin/torre` through it.
- [ ] T8.7.3.4 REFACTOR: normalize `CT_BRIDGE_OPERATION_FAILED` and retain no shell/session/worktree/worker/Git/merge authority.

### M8.7.4 — Optional Hermes outage

- [ ] T8.7.4.1 RED: in `test/bridge/outage.test.mjs`, prove missing/stopped/failing Hermes removes only Telegram access; CLI and local Support remain complete, and worker/shell/Git/merge requests are rejected.
- [ ] T8.7.4.2 GREEN: keep `bin/torre` and `core.mjs` Hermes-free; expose bridge imports only as optional local ESM integration.
- [ ] T8.7.4.3 REFACTOR: assert the import boundary and diagnostic-only outage behavior without retries, queues, or replay.

### S8.7 Acceptance Criteria

- [ ] All responses have exactly `{ ok, code, request_id, project_id, action, changed, previous_state, current_state }`; state fields are nullable on rejection and codes include every design-listed `CT_BRIDGE_*` value.
- [ ] Allowlist, authorization order, `120s` freshness/dedup, canonical registry/Main validation, and all four RED suites pass with no pre-state access on rejection.
- [ ] `status` reuses `createSupportBrief` and byte witnesses remain unchanged; arm/disarm use canonical idempotent core operations and `bin/torre on` reuses `core.activate`.
- [ ] Audit receives exactly the design metadata; pre-action failure prevents mutation and post-action failure reports truthful state with `CT_BRIDGE_AUDIT_FAILED`.
- [ ] Hermes absence is diagnostic only; no forbidden authority exists and CLI/Support remain complete.
- [ ] `bun test test/bridge`, `bun test`, and `git diff --name-only -- bridge test/bridge core.mjs bin/torre` pass; full baseline remains `429 pass / 2 fail` only for the pre-existing P0 frozen snapshot restore while Tower is armed, with no new failures.

---

## Cierre de V1

Con `S8.8` y `S8.7` cerradas, P8 queda en `75% (6/8 S)` con `S8.5` y `S8.6` explícitamente
diferidas. **Ahí V1 es usable por el socio.**

Cada Sesión actualiza `plan-8/STATUS.md` **en el mismo commit que su código**, con la evidencia
como sección: comandos exactos, resultado numérico y diff-check del `Área`. Sin PR de cierre.
