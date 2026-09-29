# Carril: isolated Pi lanes (limpio / candidato / estable)

Subordinate execution continuity only, not a product plan or a new planned Session.
Product planning authority remains `openspec/plan.yaml`.

## Objective

Let the maintainer open Pi in an explicit lane per terminal, always know which lane a terminal is
in, and never touch the stable setup while testing. Step 1 of 3 (see "Later steps").

## Problem and why

Every change to skills, binaries and Pi config lands directly on the setup used daily, so there is
no way to measure whether personal configuration causes friction versus Gentle AI alone, and no
safe place to try a candidate version.

## Scope (authorized 2026-09-28: "Arma carril")

- `carril` launcher command: `carril limpio|estable` opens Pi with the lane's config dir;
  `carril` with no argument reports the current terminal's lane. `candidato` is reserved and
  refused until step 3.
- `limpio` lane: a Pi config dir holding only Gentle AI's shipped pieces, sharing credentials
  safely with the stable dir.
- Visible lane label (terminal title + banner) without adding personal extensions to `limpio`.

## Constraints

- `~/.pi/agent` (estable) is never modified by the launcher or lane setup.
- Plain `pi` keeps behaving exactly as today.
- Lane state is per terminal (environment), never global.
- No personal skills, extensions, packages or APPEND_SYSTEM manual blocks in `limpio`.
- Installing the launcher into `~/.local/bin` is a separate, human-confirmed step.

## Acceptance criteria

- `carril` with no lane in env prints `estable (sin carril)`; inside a lane prints that lane.
- `carril limpio` execs `pi` with `PI_CODING_AGENT_DIR` = the limpio dir and `CARRIL=limpio`.
- Unknown lane → non-zero exit with usage; `candidato` → non-zero exit, "not built yet".
- Lane setup refuses to write inside `~/.pi/agent`.

## Checks

- Strict TDD: on (source `openspec/config.yaml` `strict_tdd: true`).
- Runner for this tool: `python3 -m unittest agent-workflows.tests.test_carril` equivalent,
  run as `python3 -m unittest discover -s agent-workflows/tests -p 'test_carril.py' -v`.

## Tasks

- [ ] C1 — Isolation facts: credentials, skill discovery, packages, Gentle AI content, labels
  (route: delegated exploration — mapping trigger, 4+ files outside repo).
- [x] C2 — `carril` launcher with tests (RED → GREEN → REFACTOR) (route: inline, one new file + test).
  RED observed: 8/9 failed (script missing; the no-write test passed vacuously). GREEN: 9/9 OK.
  Files: `agent-workflows/tools/carril`, `agent-workflows/tests/test_carril.py`.
- [ ] C3 — Limpio lane setup + first launch smoke check (route: inline, human-confirmed install).

## Progress

- C1 in progress.

## Later steps (not authorized yet)

2. A/B friction test: 3–5 real tasks run in `limpio` and `estable`, metrics from Pi session JSONL.
3. `candidato` lane + rewrite of the AGENTS.md delivery rule to add a test stage.
