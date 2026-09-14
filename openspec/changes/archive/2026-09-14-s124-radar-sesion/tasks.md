# Tasks: S124 Scoped Plan Reads Through `radar sesion`

Sesión authority: `openspec/plan.yaml` S124 (Zona `metodo`, route `direct`, entry gate `apply`).
Base: `master@bbfaa21`, worktree `Worktrees/s124`, branch `work/s124`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 260–340 additions + deletions (production code, tests and skill text; SDD Markdown excluded) |
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
| M124.1 | `agent-workflows/tools/radar/sesion.go`, `sesion_test.go`, `main.go`, `README.md` | 220–290 |
| M124.2 | `agent-workflows/skills/chanks-0-agente-soporte/SKILL.md`, `assets/brief-diario.md`, `agent-workflows/tests/test_builder_flow.py` | 40–50 |

## Apply scope guard

Only the seven paths above may change. Never edit `openspec/plan.yaml`, `openspec/ROADMAP.md`,
`product/tower/generic/**`, or any other skill.

**Kickoff correction (route unchanged):** T124.2.2 in the plan says to update the SHA256 pins in
`test_builder_flow.py`. Those pins (`SNAPSHOT_SHA256`, `test_builder_flow.py:17-43,114-122`) guard
the frozen snapshot under `product/tower/generic/`, not the active skills under
`agent-workflows/skills/`. Editing the active skill does not change them. Do **not** modify
`SNAPSHOT_SHA256`; add the new assertions as a separate test instead.

Verification commands:

```sh
cd agent-workflows/tools/radar && go test ./...
python3 -m unittest discover -s agent-workflows/tests
```

## Acceptance criteria (verbatim from the plan)

- `radar sesion S114` imprime sólo S114: estado calculado, Zona, autoridad, dependencias con su estado, cimientos, recurso, criterios, decisiones, ruta, Módulos y Tareas; ninguna otra Sesión aparece en la salida.
- La salida de `radar sesion S114` sobre el plan real pesa menos de 15 KB.
- Un ID inexistente o una referencia no ejecutable termina con código 1 y un mensaje de una línea.
- Si el plan no valida, `radar sesion` termina con código 1 igual que `radar status` y no imprime ningún estado.
- `radar status` en texto termina con una línea que indica `radar sesion <ID>`; `radar status --json` no cambia.
- `radar render` produce un ROADMAP byte a byte idéntico al anterior.
- chanks-0-agente-soporte y su brief no instruyen leer openspec/plan.yaml ni openspec/ROADMAP.md enteros y nombran `radar status` y `radar sesion <ID>` como la única vía de lectura.
- Si radar falta o rechaza el plan, la skill ordena detenerse y reportar; nunca leer el archivo como respaldo.
- Una prueba del Método falla si la skill vuelve a instruir la lectura completa del plan; `go test ./...` y los tests de agent-workflows pasan.
- Tras la entrega, el binario instalado responde `radar sesion` y la skill instalada en los cuatro runtimes coincide con el repo.
- El diff toca sólo Área.

## M124.1 — Radar prints one Sesión contract

Paths: `agent-workflows/tools/radar/main.go`, `sesion.go`, `sesion_test.go`, `README.md`.

- [x] **T124.1.1 — RED:** require `radar sesion <ID>` to print only that complete Sesión, fail with exit 1 and a one-line message for an unknown ID or a non-executable reference, fail closed like `status` on an invalid plan, and require the text `status` to end with a line naming `radar sesion <ID>`.
- [x] **T124.1.2 — GREEN:** add the subcommand using `Load`, `(*Plan).CheckAt` and `(*Plan).SesionPorID`, plus the final `status` text line. `status --json` and `render` output stay byte-identical.
- [x] **T124.1.3 — REFACTOR:** document the command once in `README.md` and in the `uso` text of `main.go`, without duplicating render helpers.

## M124.2 — Support reads the plan only through Radar

Paths: `agent-workflows/skills/chanks-0-agente-soporte/SKILL.md`, `assets/brief-diario.md`, `agent-workflows/tests/test_builder_flow.py`.

- [x] **T124.2.1 — RED:** require the skill and the brief to name `radar status` and `radar sesion <ID>`, to never instruct reading `openspec/plan.yaml` or `openspec/ROADMAP.md` whole, and to stop and report when radar is missing or rejects the plan.
- [x] **T124.2.2 — GREEN:** rewrite the read rule and the brief sources. Do not touch `SNAPSHOT_SHA256` (see kickoff correction).
- [x] **T124.2.3 — REFACTOR:** keep the existing read-only rules without duplicating them; the read rule lives in one place.
