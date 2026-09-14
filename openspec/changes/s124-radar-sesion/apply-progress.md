# Apply Progress: S124 Scoped Plan Reads Through `radar sesion`

Mode: Strict TDD. Route `direct` (entry gate `apply`). Base `master@bbfaa21`, worktree `Worktrees/s124`.
Executor: parent inline. The SDD child dispatch was refused by the Gentle AI hook ("Claude Code hooks
do not expose authenticated caller provenance"), which directs continuing inline.

## M124.1 — Radar prints one Sesión contract

| Task | Evidence |
|---|---|
| T124.1.1 RED | `sesion_test.go` added. `go test ./...` failed to build: `undefined: cmdSesion`, `escribirSesion`, `parsearArgs`. |
| T124.1.2 GREEN | `sesion.go` adds `cmdSesion` (fails closed through the shared `validarAt`, rejects unknown IDs and non-executable references with one line) and `escribirSesion`. `main.go` adds `parsearArgs` (ID before or after flags), the `sesion` case, and the final `status` text line. `gofmt -l .` empty, `go vet ./...` clean, `go test ./...` ok. |
| T124.1.3 REFACTOR | `validarAt` is the one refusal shared by `status` and `sesion`; the `status` message is unchanged. Command documented once in `uso` and `README.md`. Unused test variable removed. `go test -count=1 ./...` ok. |

## M124.2 — Support reads the plan only through Radar

| Task | Evidence |
|---|---|
| T124.2.1 RED | New `test_support_reads_the_plan_only_through_radar`; failed with ``'`radar status`' not found`` in `chanks-0-agente-soporte/SKILL.md`. |
| T124.2.2 GREEN | Skill read rule and brief sources rewritten to `radar status` and `radar sesion <ID>`, with stop-and-report when radar is missing or rejects the plan. `SNAPSHOT_SHA256` untouched (kickoff correction). First run failed on the test's own case-sensitive match of the legitimate "No `openspec/plan.yaml`" gate row; the test was corrected to compare lowercase. 39 tests OK. |
| T124.2.3 REFACTOR | The read rule lives only in Hard Rules; Execution Step 1 still points at the declared sources without restating it. 39 tests OK. |

## Acceptance measurements on the real plan

- `radar sesion S114`: 6748 bytes (< 15 KB), only S114.
- `radar sesion S999`: `✗ la Sesión S999 no existe en el plan`, exit 1.
- `radar sesion S102`: `✗ S102 es una referencia no ejecutable (future_successor): no tiene contrato de Sesión`, exit 1.
- `radar sesion` without ID: usage line, exit 2.
- `radar status` text ends with `Contrato completo de una Sesión: radar sesion <ID>`.
- `radar status --json`: sha256 identical to the installed baseline binary.
- `radar render`: regenerated `openspec/ROADMAP.md` with no Git diff.

## Size

M124.1 = 372, M124.2 = 26, total 398 changed lines (SDD Markdown excluded). Within the 400 reference.

## Pending outside apply

- Installed-binary and four-runtime skill criterion is verified after delivery (install step).
