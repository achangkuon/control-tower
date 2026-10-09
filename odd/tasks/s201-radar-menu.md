# S201 — Read-only Radar commands inside active projects

An active, healthy project now offers **Comandos de Radar** alongside its existing lifecycle actions. The Spanish guide explains exactly seven read-only commands, prompts for Session IDs where needed, and returns from scrollable output to the same command selection. No plan mutation, adoption, installation, dependency change, commit or push is part of this work.

Contract source: `radar sesion S201`, executed on initially clean `master`. The complete `openspec/plan.yaml` was never read. CodeGraph's scoped explore attempt rejected an unsupported `--file` option; inspection continued through the exact relevant files.

## Behavior and boundaries

- Menu: `etapa`, `faltan`, `status`, `sesion`, `check`, `zonas`, `roadmap`, each with a Spanish explanation. Only healthy projects with `towerState=active` offer the entry; existing error states and lifecycle actions are preserved.
- `sesion` requires an ID; `etapa` opens an optional, initially empty ID prompt. Empty Enter runs `etapa` without an ID. Validation follows Radar's current/legacy Session syntax: `^S[1-9][0-9]*(\.[1-9][0-9]*)*$`; whitespace, zero/leading-zero components, flags and shell fragments are rejected.
- Execution: absolute `$HOME/.local/bin/radar`, positional argv only, no shell, cwd set to the selected project root. Both the screen and runner enforce the closed command/argument whitelist. `archivar`, `marcar`, `desmarcar` and `render` are not listed and cannot cross the executor boundary.
- Resources: 30-second context deadline; a one-second `WaitDelay` also bounds inherited-pipe waiting. Stdout and stderr share a combined 64 KiB cap. Missing/non-file Radar gives Spanish guidance to use **Instalar o actualizar**. Failures retain the nonzero exit code, available output and error.
- Display: output is sanitized as text, wrapped and scrollable with arrows and PgUp/PgDn. Escape returns to the same command list; the selected command and its explanation remain visible when the terminal permits. ID prompts support backspace and Escape. Successful empty output gets an explicit Spanish message.
- Process lifetime: navigation and quit wait for bounded execution to finish, rather than detach a child. Running Radar participates in the existing Bubble Tea quit filter, including external quit messages. Stale/duplicate results cannot overwrite a newer output or the returned list.

## Test-first evidence

The offline Go command below was run with disposable HOME/build cache and the existing module cache; no real HOME was mutated.

```sh
cd product/tower/v1/tui && HOME=$(mktemp -d) GOCACHE=$(mktemp -d) GOMODCACHE=/home/<usuario>/go/pkg/mod GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...
```

- **RED:** one top-level failure, `TestRadarActionOnlyForActiveProjects/healthy-active`: the actual project menu lacked **Comandos de Radar**. The other project-state cases and existing tests remained green. The runner/screen tests were authored before their implementation.
- **GREEN:** the first implementation passed the Go package.
- **TRIANGULATE RED:** stronger tests exposed two real gaps: a narrow menu kept the selected command visible but hid its explanation, and running Radar did not participate in the existing program quit filter. Both were fixed in the approved surfaces.
- **Intermediate evidence:** the subsequent run exposed an obsolete test assumption that Escape must reset offset to zero even when that hides the selected command in a short viewport. The assertion now requires the same selected command to remain visible.
- **Final GREEN:** the package passes, 43 top-level behavior tests / 0 failures, including nine new tests. Coverage includes 30 Session-ID/optional-stage cases, the eight accepted argv shapes, forbidden and malformed argv, active lifecycle routing, missing Radar, deadline/cap enforcement, output sanitization/scroll/return, stale results, and 28×9, 10×3 and 1×1 rendering bounds.
- The actual test executable doubles as an installed fake Radar under `t.TempDir()`, not a shell script. Native execution verifies installed binary selection, exact argv, cwd with no shell, stderr and exit code; another mode exceeds the shared stdout/stderr cap, and a sleeping mode is killed by a short injected context deadline. Normal runner tests inject the executor and verify its 30-second deadline. No real installed Radar is executed by tests.

```sh
HOME=$(mktemp -d) bun test product/tower/v1
```

464 pass / 1 skip / 0 fail; 465 tests across 14 files, 7633 assertions. The existing optional tiny Go cross-build is skipped. Isolation prefixes preserve the requested `GOWORK=off GOPROXY=off go test ./...` behavior while leaving real HOME untouched.

## Scope and review

One work unit, six approved files: `tui/radar.go`, `tui/radar_test.go`, `tui/projects.go`, `tui/projects_test.go`, `tui/model.go`, and this record. No essential extra product surfaces were needed. No unrelated tracked or untracked files were edited. No staging, commit, push or publication was performed.

Review the closed process boundary first, then the active-project gate/lifecycle indices, quit protection and narrow selection/explanation visibility. The test-heavy change exceeds the usual 400-line review budget; the parent owns review and any eventual delivery slicing. No interactive live-terminal smoke was performed; model behavior and the native fake-process boundary are tested. Rollback consists of these six files' Radar menu/runner/test/record changes without changing unrelated workflows.

## Plain-text rendering fixtures

Both renderings are exact `model.View()` assertions in `TestRadarCommandGuideAndLifecycleRouting`, not illustrative approximations.

```text
Comandos de Radar
/proyecto con espacios
Solo lectura.
> etapa [ID]
  Qué etapa permite la evidencia antes de actuar
  faltan
  Qué Sesiones faltan y el avance por área
  status
  Sesiones LISTO, en curso y compatibilidad
  sesion <ID>
  Contrato completo de una Sesión
  check
  Valida el plan
  zonas
  Qué archivos pertenecen a cada zona
  roadmap
  Alternativas LISTO y qué destrabarían
enter: ejecutar · esc: proyecto · ↑↓: elegir
```

```text
Radar · check
/proyecto con espacios
Salida: código 1

Plan revisado.
Falta una zona.
esc: comandos · ↑↓/PgUp/PgDn: desplazar
```
