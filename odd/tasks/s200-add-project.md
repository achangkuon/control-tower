# S200 — Add a project through an agent prompt

Contract source: `radar sesion S200`; the complete plan was not read. Started on clean `master`. No commit/push or real-HOME mutation is authorized.

## Approved behavior

Home and Projects offer `Sumar un proyecto`. One path-free, plain-text Spanish prompt asks the agent to discuss the target, recommend only missing migration work, adopt via `torre-control project init`, and prepare the plan with the appropriate skill only after approval. `c` requests OSC 52 clipboard copying; `esc` returns to the originating screen. Plan-required projects expose the same prompt without executing adoption.

Backend read-only reconciliation adds `towerState`: healthy adoption plus a regular `openspec/plan.yaml` means `active`; healthy adoption without the file means `needs-plan`; registered unadopted/uninstalled roots mean `skills-only`. Unsafe links/types must not be advertised as active; existing Spanish health errors remain visible. No plan content is read or written.

## Test-first evidence

- RED Go: `cd product/tower/v1/tui && HOME=$(mktemp -d) GOCACHE=$(mktemp -d) GOMODCACHE=/home/emili/go/pkg/mod GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...` — 3 failing top-level tests: Home prompt missing (including clipboard entry); three project states and plan prompt missing. Assertions failed against actual behavior, not compilation.
- RED JS: `HOME=$(mktemp -d) bun test product/tower/v1` — 460 pass / 1 skip / 4 fail, 465 tests across 14 files. Missing `towerState` and symlinked plan/openspec or directory plan incorrectly reported healthy. Existing optional tiny cross-build skipped.
- GREEN Go: the same isolated command passed one package, covering 36 top-level tests / 0 fail (6 new top-level tests). The real Bubble Tea program test captures the exact OSC 52 payload through configured output with the alternate screen enabled, both wide and narrow; an ignoring terminal supplies no response and the interface still exits normally with `Copiado`.
- GREEN JS: final sequential `HOME=$(mktemp -d) bun test product/tower/v1` — 464 pass / 1 skip / 0 fail, 465 tests across 14 files, 7633 assertions. Four new backend tests cover the three states and linked/type refusal; existing strict output assertions now include the additive field.
- TRIANGULATE/REFACTOR: error health wins over a claimed Tower state; needs-plan retains all three lifecycle actions; prompt entry works without loaded status, returns to Home/list/action origins, wraps/scrolls at narrow sizes, keeps copy feedback visible in the footer, and retains manual-selection text after copy failure. Compact Home prioritizes the system summary so the additional menu row does not hide it at 16 lines.
- Intermediate validation evidence was retained: the nil-input clipboard harness hit Bubble Tea's input-restoration panic, so the test now uses an empty reader with the actual alternate-screen renderer. The old 16-line Home test exposed a hidden system summary, corrected in the allowed Home surface. The first JS GREEN attempt also exposed the old CLI exact-equality expectation and an unrelated benchmark proxy test receiving `/` instead of `/v1/messages`; a subsequent attempt had only that benchmark failure plus its asynchronous assertion error. No benchmark file was changed. The final sequential rerun passed that test and the full suite.

All command/test HOME and Go build caches use disposable directories; dependencies are read offline from the existing module cache. Tests preserve unrelated fixture HOME bytes.

## Scope and review

One work unit: prompt routing/copying and read-only project state classification, with associated behavior tests and this record. Requested production surfaces: `product/tower/v1/projects.mjs`, `tui/projects.go`, `tui/home.go`, `tui/model.go`; requested tests: `test/projects.test.mjs`, `tui/projects_test.go`, `tui/model_test.go`. Essential extra surface within pre-approved `product/tower/`: `product/tower/v1/test/cli.test.mjs`, updating exact list-output expectations and verifying needs-plan/skills-only survive CLI JSON projection. No dependency change.

Review clipboard emission under Bubble Tea's alternate screen, narrow layout/scrolling, origin return, and refusal of linked plan paths. OSC 52 acceptance is terminal-dependent; there is no clipboard acknowledgement, external clipboard tool or clipboard read. Read-only status classification does not parse plans, invent a plan, migrate anything or infer adoption authority. The registered `skills-only` label is informational membership, not a scan proving which skill files remain installed. Unsafe plan/openspec links and non-regular types use the existing `unsafe` status instead of claiming an active plan.

Rollback boundary: these prompt/menu/routing/state/test changes and this record, without unrelated lifecycle code. No live-terminal manual smoke, commit, push, release or publication was performed. The intermediate benchmark route failure is a remaining test-stability risk; it was not suppressed or repaired in this task.

## Final validation

```sh
cd product/tower/v1/tui && HOME=$(mktemp -d) GOCACHE=$(mktemp -d) GOMODCACHE=/home/emili/go/pkg/mod GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...
```

One package passed, 36 top-level tests / 0 fail. Isolation prefixes preserve the requested offline `GOWORK=off GOPROXY=off go test ./...` behavior while keeping real HOME unchanged.

```sh
HOME=$(mktemp -d) bun test product/tower/v1
```

464 pass / 1 skip / 0 fail; 465 tests across 14 files, 7633 assertions. Existing optional tiny Go cross-build skipped. `git diff --check` passed. The only extra product file changed is the essential CLI test above; no files outside the approved surfaces were edited.

## Plain-text rendering fixtures

Wide prompt screen (the text is one prompt, not boxed or path-bound):

```text
Sumar un proyecto
Copiá este texto y pegáselo a tu agente (Claude Code, Codex, OpenCode o Pi), abierto en cualquier carpeta.

Quiero usar la Torre de Control en un proyecto. Preguntame en cuál: el que tenés abierto u otro.
Después preguntame si hago una migración completa o solo lo que falta, y recomendame solo lo que falta.
Instalá la Torre en ese proyecto con `torre-control project init` y armá su plan con la skill
chanks-1-adopcion (o chanks-1-project-kickoff si el proyecto está vacío). No guardes nada sin mi aprobación.
c: copiar · esc: volver · ↑↓: desplazar
```

Three-state project list:

```text
Proyectos
> /activo · 🟢 Torre activa
  /sin-plan · 🟡 Falta armar el plan
  /skills · ⚪ Solo skills
  Sumar un proyecto
esc: volver · enter: continuar · ↑↓: desplazar
```
