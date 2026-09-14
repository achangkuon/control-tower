# Apply Progress: S127 Radar Session Priorities

Sesión authority: `openspec/plan.yaml` S127. Base: `master@89d1633`. Strict TDD active. Delivery strategy: ask-on-risk.

## M127.1 — Radar declares, validates, and computes priorities

Native attempt: `gentle-ai sdd-attempt acquire` request `s127-m127.1-apply-1` → `proceed`.

| Tarea | Evidence |
|-------|----------|
| T127.1.1 RED | Added 6 state tests (`state_test.go`) and 7 check tests (`check_test.go`); `go test ./...` failed to build on undefined `Prioridad`, `Plan.Prioridades`, `Sesion.Prioridad`, `checkPrioridades`. |
| T127.1.2 GREEN | Added `Prioridad`, `Plan.Prioridades`, `Sesion.Prioridad`, `PrioridadPorID` (`plan.go`); `aplicarPrioridades`, `prioridadActiva`, `PrioridadActivaAt` as the last `EstadosAt` pass (`state.go`); `checkPrioridades` wired after `checkGrafo` (`check.go`). `go test ./...` ok. |
| T127.1.3 REFACTOR | `PrioridadPorID` is the single ordering lookup shared by state and check; pre-existing `EstadosAt` passes untouched. `gofmt -l .` and `go vet ./...` clean. |

C1 identity on the live plan (pre-change binary vs new binary): `radar status`, `radar sesion S120`, and `radar render` byte-identical; `radar status --json` identical except `head` (`cf3e813` → `89d1633`, planning commit). `radar check`: 0 errors, 5 warnings (baseline).

Size: 338 authored lines (+338 −0), under the 400 review lot.

Review: RDD on (global). Native consent for target `sha256:68fe0666…e322a` declined by Emilio for this candidate only (`declined_this_candidate`). Off-path `gentle-ai review assess`: `high` (`process_boundary`, `check.go` shell process). Tier high → writer self-verification above plus an independent verifier.

Independent verifier: PASS. It rebuilt the pre-change binary from `HEAD` and confirmed `radar status --json`, `radar check`, and `radar render` byte-identical on the live plan, and traced C2–C7 to tests and code.
- WARNING, corrected once: the unknown-priority rule also fired for COMPLETO/ARCHIVADO Sesiones, so retiring a priority id would force edits to closed history, contradicting design rule 3. RED: `TestSesionCerradaPuedeOmitirPrioridad` gained an archived Sesión with a retired id and failed. GREEN: the rule is scoped to open Sesiones in `checkPrioridades`; `go test ./...` ok.
- SUGGESTION, not applied: a list id with surrounding whitespace is accepted by list validation but unreachable by a trimmed reference. It fails closed with an error, so it is recorded as a follow-up, not changed in this Módulo.

Delivery: commit `4bc0710` (`Modulo: M127.1`), 343 authored lines.

Native attempt settle: first settle counted 456 lines because M127.2 RED tests were already in the worktree, exceeding the 400 budget (`decision_required`). Root cause: the M127.2 work began before the M127.1 attempt was settled. Emilio authorized `gentle-ai sdd-attempt reset` (request `s127-reset-1`). Flow correction: settle each Módulo's attempt before touching the next Módulo's files.

## M127.2 — Priorities are visible in every Radar surface

Native attempt: request `s127-m127.2-apply-1` → `proceed`, acquired with the M127.2 RED tests stashed so they count inside this Módulo.

| Tarea | Evidence |
|-------|----------|
| T127.2.1 RED | Added snapshot, sesion, status, and render tests; `go test ./...` failed to build on undefined `Snapshot.PrioridadActiva`, `Snapshot.Prioridades`, `SesionEstado.Prioridad`. |
| T127.2.2 GREEN | `omitempty` snapshot fields (`snapshot.go`); conditional lines in `cmdStatus` (`main.go`), `escribirSesionConAvance` (`sesion.go`), and `RenderAt` queues, "Punto de retoma", and "Rutas" (`render.go`). `ROADMAP.golden.md` unchanged. |
| T127.2.3 REFACTOR | `prioridadDeclarada` and `Prioridad.Etiqueta` (`sesion.go`) are the single resolver/formatter reused by the three text surfaces; `textoPrioridad` is the ROADMAP suffix. |

Deviation from design, recorded: a DIFERIDO Sesión is not in any Zona queue, so the ROADMAP also shows each Sesión's priority in the "Rutas" section, which lists every Sesión (C8).

C1 identity on the live plan: `radar status`, `radar sesion S120`, and `radar render` byte-identical to the pre-change binary; `radar status --json` identical except `head`.

Size: 195 authored lines (+184 −11). Review: native consent for target `sha256:0fbdc94e…c5d05d` declined by Emilio for this candidate only. Off-path `gentle-ai review assess`: `medium` (`executable_change`, `main.go`) → writer self-verification; parent spot check `go test -count=1 ./...` ok.

Delivery: commit `74cbaa5` (`Modulo: M127.2`). Native attempt settled `passed` with `--remediates-evidence-revision` of the reset chain → `complete`.

## M127.3 — Pending
