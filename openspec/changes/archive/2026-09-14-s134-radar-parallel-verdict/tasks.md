# Tasks: S134 Radar Parallel Verdict

Sesión authority: `openspec/plan.yaml` S134 (Zona `metodo`, route `direct`, entry gate `apply`).
Base: `master`, main checkout `Main`. No dependencies.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~120 authored additions + deletions (Go code, Go tests, skill and template text, canon, README); SDD Markdown and the regenerated golden excluded |
| Largest review lot | M134.1, ~70 |
| Suggested split | Two direct commits, one per Módulo, reviewed separately |
| Delivery strategy | ask-on-risk |
| Chain strategy | none (direct commit to `master`, no PR) |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low

## Verification commands

- Go: `cd agent-workflows/tools/radar && go test -count=1 ./...`
- Method: `cd agent-workflows && python3 -m unittest discover -s tests`
- Plan: `radar check` (baseline 0 errors, 8 warnings)

## M134.1 — Radar presents the parallel verdict and cimientos territory

Paths: `agent-workflows/tools/radar/sesion.go`, `agent-workflows/tools/radar/main.go`, `agent-workflows/tools/radar/render.go`, `agent-workflows/tools/radar/sesion_test.go`, `agent-workflows/tools/radar/render_test.go`, `agent-workflows/tools/radar/testdata/ROADMAP.golden.md`

- [x] T134.1.1 RED: require `radar sesion` to show a cimientos Sesión's exact reservations as its Área, `radar status` to say compatible Zonas can work in parallel without reserving the seat, and the generated view to say the same. → Tests fail against the current wording.
- [x] T134.1.2 GREEN: change the Área line for cimientos, the Asientos line in `cmdStatus`, and the capacity section in `RenderAt`; regenerate the golden. → `go test` passes.
- [x] T134.1.3 REFACTOR: write the parallel-verdict sentence once, reused by status and the view. → One sentence source; `go test` passes.

## M134.2 — The Method reads compatibility as a verdict and loads dispatch

Paths: `agent-workflows/templates/session-routing.md`, `agent-workflows/skills/chanks-0-agente-soporte/SKILL.md`, `agent-workflows/skills/_shared/plan-naming-convention.md`, `agent-workflows/tools/radar/README.md`, `agent-workflows/tests/test_builder_flow.py`, `agent-workflows/tests/test_despacho_herdr.py`

- [x] T134.2.1 RED: require the routing to load `chanks-3-despacho-herdr` when the human chooses parallel work, and the support skill and canon to declare compatibility as the parallel verdict with no live reservation. → Method tests fail against the current text.
- [x] T134.2.2 GREEN: replace "may load" with "loads" and add the parallel verdict to the template, support skill, canon §13, and Radar README. → Method suite passes.
- [x] T134.2.3 REFACTOR: make the support skill, template, and README point to canon §13 without restating the full rule. → The rule lives in the canon; Method suite passes.
