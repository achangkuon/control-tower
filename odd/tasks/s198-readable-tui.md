# S198 — Readable versions and aligned TUI

Home and Diagnóstico now prefer the release tag over the package digest. Status values share a label column, Gentle AI is visible, and menu hints disappear before narrow terminals truncate labels.

## Contract and boundaries

Source: `radar sesion S198`; the complete plan was not read.

- Read tags only from already verified provenance; release identity, verification, and activation are unchanged.
- Display active/previous tags independently, falling back to seven SHA characters when unknown.
- Keep Spanish labels, selection styling, keyboard navigation, and S191 layout bounds.
- Show Gentle AI's doctor component version, or warning-styled `falta`.
- Hint only with available current data: previous version and project count. No `al día` claim is invented without update-availability data.
- No commit, push, real-HOME configuration change, dependency change, or extra production module.

## Implementation and review path

1. `product/tower/v1/global.mjs`: doctor adds `activeTag` and `previousTag` from the verified version map (null when unknown).
2. `product/tower/v1/tui/model.go`: decode tags and `components.gentleAi`; Diagnóstico shares Home's readable engine rows.
3. `product/tower/v1/tui/home.go` and `styles.go`: common aligned rows; independently styled selection and dim hints; hide the entire hint column when it cannot fit. Compact layouts retain the system summary ahead of optional detailed requirements/agent rows; the menu and footer retain priority.
4. Tests protect tag/legacy/null/mixed display, actual doctor decoding, shared column widths, Gentle AI missing/available states, warning and dim styles, stale/unknown hint data, terminal-control sanitization, and cell-width bounds.

Essential extra surface under the pre-approved `product/tower/` allowance: `product/tower/v1/test/cli.test.mjs`, one exact-shape status assertion updated for the two additive tag fields. The initial full JS run exposed this assertion (388 pass, 1 skip, 1 fail); its focused rerun passed after the fixture update.

Rollback boundary: these additive doctor fields, their TUI display helpers, associated tests, and this record can be removed together without changing release storage or lifecycle semantics.

## Test-first evidence

- RED Go: the new readable-version, aligned-status/Gentle AI, and menu-hint tests failed against the unchanged renderer (old digest labels, unaligned rows, missing component and hints).
- RED JS: `HOME=$(mktemp -d) bun test product/tower/v1/test/global.test.mjs -t S198` — 0 pass / 1 fail; doctor lacked both tag fields.
- GREEN: Go suite passed after implementation; focused S198 JS test passed (1 pass / 0 fail, 5 assertions). It covers absent/install/update/rollback pointers and read-only snapshot equality.
- TRIANGULATE: added colored warning/dim selection checks, sanitized tags, unavailable/stale hint data, and widths down to one cell; all pass.

## Final validation

Go commands isolate HOME and build cache, read existing module-cache dependencies offline, and disable Go environment-file loading:

```sh
cd product/tower/v1/tui && HOME=$(mktemp -d) GOCACHE=$(mktemp -d) GOMODCACHE=/home/<usuario>/go/pkg/mod GOPROXY=off GOENV=off GOWORK=off go test ./...
```

Result: **29 top-level tests pass / 0 fail**. An additional `go test -v ./...` with the same environment passed and emitted the fixture below.

```sh
HOME=$(mktemp -d) bun test product/tower/v1/test/cli.test.mjs -t 'status live-reconciles'
HOME=$(mktemp -d) bun test product/tower/v1
```

Results: focused CLI **1 pass / 0 fail**; final complete JS suite **389 pass / 1 skip / 0 fail**, 390 tests across 14 files, 7157 assertions. The existing optional tiny Go cross-build remains skipped. The final full-suite command used `set -o pipefail` and `2>&1 | tail -n 12` only to bound displayed output.

`git diff --check`: clean. No manual installed-release/interactive terminal run; the sample is the deterministic no-color test fixture, not a real-HOME probe.

## Home fixture

From `TestHomeRenderingSample` at 100 columns × 40 rows:

```text
        ╷
     ╭──┴──╮
  ╭──┴─────┴──╮
  │ ▚▚▚▚▚▚▚▚▚ │
  ╰──┬─────┬──╯
     │     │
     │     │
   ╭─┴─────┴─╮
 ╭─┴─────────┴─╮
─────────────────
Torre de Control V1
Versión: v1.1.0
Activa: v1.1.0 · Anterior: v1.0.2
Estado
  Motor        instalado · sano
  Versión      v1.1.0 · anterior v1.0.2
  Gentle AI    4.0.0
  Proyectos    1
  /proyecto: sano
Requisitos
  gh           2.90.0 · con sesión
  Bun          1.3.0
  Git          2.50.0
  Go           1.26.4
Agentes
  Claude Code  listo
  Pi           sólo configuración
  Codex        no detectado
  OpenCode     no detectado
  Sistema      linux/x64 · bash

> Instalar o actualizar
  Volver a la versión anterior  (v1.0.2)
  Proyectos                     (1)
  Diagnóstico
  Ayuda
  Salir

↑↓ o j/k mover · enter elegir · r refrescar · q salir
```

Implementation and automated checks are complete; review and any terminal Git actions remain with the maintainer.
