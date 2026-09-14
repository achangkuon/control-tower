# Tasks: S127 Radar Session Priorities

Sesión authority: `openspec/plan.yaml` S127 (Zona `metodo`, route `full-sdd`, entry gate `proposal`).
Base: `master@cf3e813`, main checkout `Main`, branch `master`. No dependencies. S122 waits on this Sesión.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500 authored additions + deletions in total (Go code, Go tests, canon text, README, one Python pin); SDD Markdown excluded |
| Largest review lot | M127.1, ~270 |
| Suggested split | Three direct commits, one per Módulo, reviewed separately |
| Delivery strategy | ask-on-risk |
| Chain strategy | none (direct commit to `master`, no PR) |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Medium

The total exceeds 400, but S127 decision 9 (approved by Emilio on 2026-09-14) resolves it: one Sesión whose Módulos each stay under 400 lines per review lot. No `size:exception` is needed.

## Verification commands

- Go: `cd agent-workflows/tools/radar && go test ./...`
- Method: `cd agent-workflows && python3 -m unittest discover -s tests` (baseline 55 tests OK)
- Plan: `agent-workflows/tools/radar/radar check` (baseline 0 errors, 5 warnings)

## M127.1 — Radar declares, validates, and computes priorities

Paths: `agent-workflows/tools/radar/plan.go`, `agent-workflows/tools/radar/state.go`, `agent-workflows/tools/radar/check.go`, `agent-workflows/tools/radar/state_test.go`, `agent-workflows/tools/radar/check_test.go`

- [ ] T127.1.1 RED: add state tests for the active priority (first open entry; manual `diferida` keeps it open; none when all closed), for would-be-LISTO Sesiones of later priorities becoming DIFERIDO while PLANIFICADO, BLOQUEADO, COMPLETO, ARCHIVADO, and active-priority Sesiones keep their state, for automatic advance after an integrated delivery, and for unchanged states in a plan without `prioridades`; add check tests for empty id, duplicate id, empty nombre, `prioridad` without a list, an open Sesión missing or naming an unknown priority, a closed Sesión omitting it, and a dependency toward a later priority. → The tests fail against the current Radar.
- [ ] T127.1.2 GREEN: add `Prioridad`, `Plan.Prioridades`, `Sesion.Prioridad`, and `PrioridadPorID`; add the `aplicarPrioridades` post-pass to `EstadosAt` and `PrioridadActivaAt`; add `checkPrioridades` after `checkGrafo`. → All new and existing Go tests pass.
- [ ] T127.1.3 REFACTOR: keep one index lookup shared by state and check, and keep every pre-existing `EstadosAt` pass untouched. → A single ordering helper exists and `go test ./...` passes.

## M127.2 — Priorities are visible in every Radar surface

Paths: `agent-workflows/tools/radar/snapshot.go`, `agent-workflows/tools/radar/main.go`, `agent-workflows/tools/radar/sesion.go`, `agent-workflows/tools/radar/render.go`, `agent-workflows/tools/radar/snapshot_test.go`, `agent-workflows/tools/radar/sesion_test.go`, `agent-workflows/tools/radar/render_test.go`

- [ ] T127.2.1 RED: require `prioridad_activa`, `prioridades`, and per-Sesión `prioridad` in the snapshot with the same schema string and no new keys when the list is absent; require the priority line in `radar sesion`, `radar status`, and the ROADMAP when declared, and unchanged output when absent. → The tests fail against the current projection.
- [ ] T127.2.2 GREEN: add the `omitempty` snapshot fields and the conditional text lines in `cmdStatus`, `escribirSesionConAvance`, and `RenderAt`. → The new tests pass and `ROADMAP.golden.md` stays byte-identical.
- [ ] T127.2.3 REFACTOR: format the priority label in one helper reused by the three text surfaces. → One formatter exists and `go test ./...` passes.

## M127.3 — Canon and README document priority

Paths: `agent-workflows/skills/_shared/plan-naming-convention.md`, `agent-workflows/tools/radar/README.md`, `agent-workflows/tests/test_builder_flow.py`

- [ ] T127.3.1 RED: assert in `test_builder_flow.py` that the canon names `prioridad` as an optional ordering attribute that is not a level and has no time field, and that the §9 state table still lists exactly seven states. → The test fails against the current canon.
- [ ] T127.3.2 GREEN: add the §9 priority subsection to the canon, document the YAML in the Radar README, and update the canon's pinned SHA-256 in `test_builder_flow.py`. → `python3 -m unittest discover -s agent-workflows/tests` passes.
- [ ] T127.3.3 REFACTOR: make the canon and README point to one definition without restating the rules. → No rule text is duplicated and the Method tests pass.
