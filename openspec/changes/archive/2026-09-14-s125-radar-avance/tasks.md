# Tasks: S125 Resumable Sesiones Through Módulo Trailers

Sesión authority: `openspec/plan.yaml` S125 (Zona `metodo`, route `direct`, entry gate `apply`).
Base: `master@ef792c1`, worktree `Worktrees/s125`, branch `work/s125`. Depends on S124 (✅ COMPLETO).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 230–300 additions + deletions (code, tests, skill text; SDD Markdown excluded) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Two direct commits, one per Módulo, with disjoint paths |
| Delivery strategy | ask-on-risk |
| Chain strategy | none |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Medium

| Module | Paths | Forecast |
|---|---|---:|
| M125.1 | `agent-workflows/tools/radar/avance.go`, `avance_test.go`, `main.go`, `sesion.go`, `README.md` | 200–270 |
| M125.2 | `agent-workflows/skills/chanks-3-session-kickoff/SKILL.md`, `agent-workflows/skills/chanks-4-puente/SKILL.md`, `agent-workflows/tests/test_builder_flow.py` | 25–35 |

## Apply scope guard

Only the eight paths above may change. Do not edit `check.go`, `plan.go`, `snapshot.go`, `render.go`,
`sesion_test.go`, `openspec/plan.yaml`, `openspec/ROADMAP.md`, or `product/tower/generic/**`.

Kickoff design notes (route unchanged):
- Trailer reading lives only in `avance.go`: one `git log HEAD` pass that reads `Modulo:` trailers.
  Only commits reachable from HEAD count.
- `radar check` gets the unknown-Módulo warning from `cmdCheck` in `main.go`, so `check.go` stays untouched.
- `escribirSesion` keeps its signature. `cmdSesion` passes delivered Módulos through a variant in
  `sesion.go`, so the S124 test file stays untouched.
- `status --json`, `render` and the generated ROADMAP must not change.
- The plan's T125.2.2 asks to update SHA256 pins. They guard `product/tower/generic/`, so leave
  `SNAPSHOT_SHA256` untouched and add a separate test instead (same correction as S124).
- Keep the phrases existing tests assert in kickoff ("current repository and branch", "Git contamination",
  "human choice", "scoped code in the Área", "three canonical routes", "compare the proposal once",
  "Recurso", "confirmed exclusive or serial execution evidence", "release only actual resources") and in
  puente ("return evidence"). Neither skill may contain "Support", "Tower", "MAIN" or "fictitious".

Verification commands:

```sh
cd agent-workflows/tools/radar && gofmt -l . && go vet ./... && go test -count=1 ./...
python3 -m unittest discover -s agent-workflows/tests
```

## Acceptance criteria (verbatim from the plan)

- Un commit alcanzable desde HEAD con el trailer `Modulo: M<id>` de un Módulo del plan cuenta ese Módulo como entregado; un commit fuera de HEAD no cuenta.
- Una Sesión no cerrada con al menos un Módulo entregado conserva su estado calculado y `radar status` en texto le agrega `a medias N/M Módulos`.
- `radar sesion <ID>` marca cada Módulo como entregado con su commit o pendiente, y nombra el primer Módulo pendiente.
- `radar status --json`, `radar render` y el ROADMAP generado no cambian.
- Un trailer que nombra un Módulo inexistente produce un aviso en `radar check`, nunca un error.
- chanks-3-session-kickoff ordena retomar desde el primer Módulo pendiente y nunca rehacer uno entregado.
- chanks-4-puente exige el trailer `Modulo: <ID>` en cada commit de Módulo.
- Una prueba del Método falla si cualquiera de las dos skills pierde su regla; `go test ./...` y los tests de agent-workflows pasan.
- El diff toca sólo Área.

## M125.1 — Radar derives delivered Módulos from Git and shows them

- [x] **T125.1.1 — RED:** require Módulos delivered by a trailer reachable from HEAD (not from an unmerged branch), the `a medias N/M Módulos` mark in `status`, the per-Módulo detail and first pending Módulo in `radar sesion`, and a warning for an unknown Módulo.
- [x] **T125.1.2 — GREEN:** read trailers from Git, cross them with the plan's Módulos, and show them in `status` and `sesion`.
- [x] **T125.1.3 — REFACTOR:** keep Git trailer reading in one place and document the trailer in `README.md`.

## M125.2 — Skills leave the mark and resume from it

- [x] **T125.2.1 — RED:** require the resume rule in kickoff and the trailer rule in puente.
- [x] **T125.2.2 — GREEN:** add both rules. Do not touch `SNAPSHOT_SHA256`.
- [x] **T125.2.3 — REFACTOR:** place each rule next to its existing step without duplicating the canon.
