# S234 — Pilot takeoff drops CodeGraph init; retiro tolerates `.codegraph/`; clear emojis

Subordinate execution continuity only, not a product plan.
Product Session: S234 (Torre V2 › v2-piloto). Authority: smoke V2 findings #3/#4
(Engram 13286), maintainer decisions (Engram 13291, 13292).

## Objective

1. `prepararCopia` no longer runs `codegraph init` (bun install stays): the init
   leaves `.codegraph/` with no real index and the agent recreates it on demand,
   so takeoff gains nothing.
2. `trabajoPendiente` ignores only `.codegraph/`; any other untracked file still
   blocks `piloto retirar`.
3. Clear emoji outputs: 🚀 takeoff confirmed, 🛫 per flight, 🛬 flight landed,
   ✅ last approved Session, 🧹 flight withdrawn, 🧭 corrida report.

## Authorized files

`agent-workflows/tools/piloto/worktree.go`, `worktree_test.go`, `main.go`,
`main_test.go`, `aterrizaje.go`.

## Constraints

- Do not write the destination repo's `.gitignore`.
- Keep ✗ on rejections and "no sube" on the landing output.
- TDD with RED observed before each fix.

## Tasks

- [x] RED+GREEN: `prepararCopiaReal` never invokes `codegraph` even when it is on PATH
      (TestPrepararCopiaSinCodegraph; fake bun still runs when package.json exists).
- [x] RED+GREEN: `trabajoPendiente` ignores untracked `.codegraph/` only; other
      untracked files still count; `retirarCopia` succeeds with only `.codegraph/`
      present (TestTrabajoPendiente subtests).
- [x] RED+GREEN: emoji contract — 🚀 Despegue confirmado; 🛫 on per-flight lines;
      🛬 "aterrizó" + ✅ Última Sesión aprobada in landing output; 🧹 on retiro;
      🧭 Informe de la corrida header (TestEmojiContratoSalidas).
- [x] Checks: `go build`, `go vet`, `go test ./...` green (RED observed first for
      every contract).

## Decisions

- Emilio (2026-10-07): the six emojis live inside the piloto binary itself, not
  in the torre-firma signature hook. The firma stays identity-only; a separate
  future Session could add piloto call signatures.

## Evidence

- Work-unit commits on branch s234/codegraph-emojis (recorded below per task).
