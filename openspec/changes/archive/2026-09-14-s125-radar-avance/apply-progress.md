# Apply Progress: S125 Resumable Sesiones Through Módulo Trailers

Mode: Strict TDD. Route `direct` (entry gate `apply`). Base `master@ef792c1`, worktree `Worktrees/s125`.
Executor: parent inline (SDD child dispatch is refused by the Gentle AI hook in Claude Code).

## M125.1 — Radar derives delivered Módulos from Git and shows them

| Task | Evidence |
|---|---|
| T125.1.1 RED | `avance_test.go` added (reachable trailer, trailer outside HEAD, `a medias` in status, per-Módulo marks and resume point in `sesion`, unknown-trailer warning). `go test ./...` failed to build: `p.AvanceModulosAt undefined`. |
| T125.1.2 GREEN | `avance.go` adds `AvanceModulosAt` (one `git log <head>` pass over `Modulo:` trailers), `modulosEntregados` and `avisosDeTrailers`. `main.go`: `cmdCheck` appends the warnings; `cmdStatus` appends `a medias N/M Módulos` to open queue lines. `sesion.go`: `cmdSesion` marks each Módulo `entregado <commit>` or `pendiente` and prints `Retomar desde:`; `escribirSesion` keeps its signature. `gofmt -l .` empty, `go vet` clean, `go test -count=1 ./...` ok. |
| T125.1.3 REFACTOR | Trailer reading lives only in `avance.go`. README gains "Avance por Módulo". `check.go`, `plan.go`, `snapshot.go`, `render.go` and `sesion_test.go` untouched. |

## M125.2 — Skills leave the mark and resume from it

| Task | Evidence |
|---|---|
| T125.2.1 RED | `test_kickoff_resumes_and_bridge_requires_module_trailer` failed: `'first pending Módulo' not found` in kickoff. |
| T125.2.2 GREEN | Kickoff step 1 runs `radar sesion <ID>`, resumes from the first pending Módulo and never redoes a delivered one. Puente step 3 requires the `Modulo: <ID>` trailer on every Módulo commit. `SNAPSHOT_SHA256` untouched. 40 tests OK. |
| T125.2.3 REFACTOR | Each rule sits in the step it belongs to; the four arrival steps stay four; asserted phrases preserved. |

## Real-plan measurements

- `radar check`: 0 errors, 5 warnings (unchanged; existing `Modulo: M124.1`/`M124.2` trailers name real Módulos).
- `radar sesion S125`: both Módulos `pendiente`, `Retomar desde: M125.1`.
- `radar status --json`: sha256 identical to the installed binary. `radar render`: no diff.

## Size and attempt

M125.1 = 266, M125.2 = 13, total 279 changed lines. Attempt settled `complete` before these reports were written.
