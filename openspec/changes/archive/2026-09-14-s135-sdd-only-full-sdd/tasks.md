# Tasks: S135 Native SDD Only for full-sdd

Sesión authority: `openspec/plan.yaml` S135 (Zona `metodo`, route `direct`, entry gate `apply`). Replaces S120.
Base: `master`, main checkout `Main`. No dependencies. S130 and S133 wait on this Sesión.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 authored additions + deletions (Go code and tests, canon, skills, template, Method tests); SDD Markdown excluded |
| Largest review lot | M135.2, ~130 |
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

## M135.1 — Radar limits `cambio` and the SDD gate to full-sdd

Paths: `agent-workflows/tools/radar/check.go`, `agent-workflows/tools/radar/ledger.go`, `agent-workflows/tools/radar/gate_test.go`, `agent-workflows/tools/radar/README.md`

- [x] T135.1.1 RED: require `radar check` to fail, without calling gentle-ai, when a `direct` or `design-tasks` Sesión declares `cambio`, and to keep reading native status only for `full-sdd`. → Tests fail against the three-door gate.
- [x] T135.1.2 GREEN: reject `cambio` outside effective route `full-sdd` before any ledger or status call; keep the full-sdd status validation. → `go test` passes.
- [x] T135.1.3 REFACTOR: remove the three-route door map in favor of one full-sdd rule and update the Radar README. → No route-to-phase map remains; `go test` passes.

## M135.2 — The Method routes only full-sdd through native SDD

Paths: `agent-workflows/skills/_shared/plan-naming-convention.md`, `agent-workflows/skills/chanks-4-puente/SKILL.md`, `agent-workflows/templates/session-routing.md`, `agent-workflows/skills/chanks-2-planificador-granular/references/juicio-de-ruta.md`, `agent-workflows/skills/chanks-7-session-doc/SKILL.md`, `agent-workflows/skills/chanks-7-session-doc/references/links.md`, `agent-workflows/skills/chanks-0-agente-soporte/assets/assignment-implementation.md`, `agent-workflows/tests/test_install.py`, `agent-workflows/tests/test_builder_flow.py`

- [x] T135.2.1 RED: require the canon, bridge, routing, route judgment, closure, and handoff to state that only `full-sdd` uses native SDD and archive, that `direct` and `design-tasks` verify against plan criteria with evidence in the delivery-record commit, and that `design-tasks` records its design in the plan. → Method tests fail against the current text.
- [x] T135.2.2 GREEN: rewrite the route rule in each surface. → Method suite passes.
- [x] T135.2.3 REFACTOR: keep the full rule only in canon §15 and make the other surfaces point to it. → The rule lives once; Method suite passes.
