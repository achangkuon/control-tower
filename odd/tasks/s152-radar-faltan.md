# S152 — `radar faltan`

## Objective

The product owner sees, with `radar faltan`, every open Session grouped by goal and sub-priority with an honest percentage, and locates any Session in one line with `radar faltan <ID>`. Agents name each Session with its goal, Zone, title, and state.

## Problem and why

`radar status` reports global progress but only the executable queue per Zone: it hides most open Sessions and does not distinguish deliberately parked work from work waiting for its priority's turn. A bare Session ID gives the owner no context.

## Admission

- Radar: S152 `🟢 LISTO` at HEAD `51a7981cb2399ecc311c9f1eab755a5a55b92a87` (master, clean).
- Digests: `radar status --json` sha256 `8f91f3fb558115350abe09d34970ffde332a2296c19681a0379089f1c152ad9d`; `radar sesion S152` sha256 `c3c4791f31430447e2e66ad43d0b80875004dc9d79c0c831004c7e5aa1a5d61c`.
- Authority: Engram 11432. Cimiento: `AGENTS.md`. Resource: none.

## Authorized files (exact)

- `agent-workflows/tools/radar/faltan.go` (new)
- `agent-workflows/tools/radar/faltan_test.go` (new)
- `agent-workflows/tools/radar/testdata/faltan.golden.txt` (new)
- `agent-workflows/tools/radar/main.go`
- `agent-workflows/tools/radar/README.md`
- `agent-workflows/skills/_shared/plan-naming-convention.md`
- `AGENTS.md`
- `odd/tasks/s152-radar-faltan.md`

## Constraints

- Read-only view: no change to `radar status`, `status --json`, `radar sesion`, state computation, or plan schema.
- Goals and sub-categories derive from the order and names of `prioridades`; no new field.
- The percentage excludes only Sessions with `diferida: true`; priority-deferred Sessions count and show as "espera turno" (Engram 11432).
- Approved size exception (~500 lines) for one coherent Session; no file expansion, no skipped tests or review.
- On close: reinstall `~/.local/bin/radar` (`agent-workflows/tools/install-radar.sh`) and offer propagation of the convention to the other agents.

## Acceptance criteria

1. `radar faltan` lists every open Session grouped by goal (Método V1, Torre V1, Torre V2, Torre V3) with sub-priorities as sub-categories.
2. Each goal shows its percentage and "N de M"; only `diferida: true` is excluded from the percentage.
3. Priority-deferred Sessions show as "espera turno"; each blocked Session shows what blocks it.
4. Footer: total remaining, how many are ready to start, and a notice with the count of parked Sessions.
5. `radar faltan <ID>` prints one line: goal, sub-priority, Zone, title, state, e.g. `S148 (Torre V2 › cimientos — título, PLANIFICADO)`.
6. The shared convention and `AGENTS.md` require agents to name Sessions in that format, never by bare ID.

## TDD

- Mode: strict (source: global session configuration "Strict TDD Mode: enabled").
- Runner: `go test ./...` in `agent-workflows/tools/radar`.

## Delivery

Direct commit to `master` per `AGENTS.md`. One work-unit commit per task; RDD is on (global), so each commit gets a native assessment. Push, reinstall, and propagation require the human's delivery confirmation.

## Tasks

- [x] T1 — `radar faltan` grouped view with percentages, "espera turno", blockers, footer; golden test. Files: `faltan.go`, `faltan_test.go`, `testdata/faltan.golden.txt`, `main.go`. Route: delegated writer (writer trigger: 2+ non-trivial files; mapping trigger: 4+ files to understand).
- [x] T2 — `radar faltan <ID>` one-line locator; tests. Files: same as T1. Route: same delegated writer.
- [x] T3 — Documentation: README, shared naming convention, `AGENTS.md` naming rule. Route: same delegated writer.
- [ ] T4 — Delivery after human confirmation: push, reinstall Radar, record `entrega.commit`, offer propagation.

## Progress

- 2026-09-24: admitted; document created.
- 2026-09-24: T1+T2 delivered together as one commit (`505a855`). They share every
  function in `faltan.go` (grouping, formatting, `estadoFaltan`) and were designed and
  tested as one coherent unit, so they were not split into two artificial commits.
  TDD: RED observed as a genuine Go compile failure (`faltan_test.go` referencing
  undefined `RenderFaltanAt`/`LineaFaltanUno` with no `faltan.go` yet) —
  `go test ./...` → `undefined: RenderFaltanAt` (×5), `undefined: LineaFaltanUno` (×4),
  `FAIL [build failed]`. GREEN after implementing `faltan.go`: `go test ./...` → `ok`
  (9/9 new tests pass, full suite green, ~9s).
  Bug found and fixed during verification against the real `openspec/plan.yaml` (before
  committing): the first draft reused `markdownText()` (render.go), which HTML-escapes
  backtick/underscore/asterisk/etc. for the generated `ROADMAP.md` Markdown file. That
  produced garbled terminal output (e.g. `&#96;radar faltan&#96;`) for `radar faltan`,
  which is plain text, not Markdown — `cmdStatus`/`escribirSesion` never call
  `markdownText` either. Removed all `markdownText` calls from `faltan.go`; the golden
  fixture was unaffected since it has no special characters.
  Design decision not covered by the Encargo: whether an explicitly parked Sesión
  (`diferida: true`) appears inline in the grouped listing. Resolved: no — it is
  excluded from the listing (only priority-deferred Sesiones show inline as
  "espera turno") and is counted only in the footer's parked-count notice, matching the
  Encargo's own framing of that count as a distinct "aviso". Documented in README.md.
  Locator format for `radar faltan <ID>` (the Encargo explicitly delegates the exact
  format): `<ID> (<meta> › [<subprioridad> ›] <Zona> — <título>, <estado>)`, sub-priority
  segment omitted when the declared priority has none. Verified against real S148
  (`Torre V2 › Handoffs y despacho Tower-owned › cimientos — ..., 📋 PLANIFICADO`) and
  S101, whose Zona happens to be literally `capacidades`
  (`Torre V3 › capacidades — ..., 🔴 BLOQUEADO`) — confirmed against `openspec/plan.yaml`
  line 6093-6096, not a coincidence with the doc's illustrative example.
  Verification: `go test ./...` → ok (8.9s); `go vet ./...` → clean; `git diff --check` →
  clean; `go run . faltan -C ...` and `go run . faltan S148 -C ...` against the real plan
  → correct, readable output (see report).
- 2026-09-24: T3 delivered as commit `9ee49c4` (README.md, `plan-naming-convention.md`
  §8, `AGENTS.md`). `go test ./...` and `go vet ./...` re-verified clean after the doc
  edits (doc-only changes, no source touched).
- 2026-09-24: T4 intentionally not done — delivery requires the human's confirmation per
  this Session's own Delivery section (push, reinstall `~/.local/bin/radar`, offer
  propagation). Nothing was pushed; `install-radar.sh` was not run.
