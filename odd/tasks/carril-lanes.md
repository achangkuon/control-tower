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

- [x] C1 — Isolation facts: credentials, skill discovery, packages, Gentle AI content, labels
  (route: delegated exploration — mapping trigger, 4+ files outside repo). Findings that shaped
  the design:
  - `auth.json` is written in place under a lock; OpenAI Codex rotates refresh tokens, so the lane
    symlinks the stable file instead of copying it.
  - `~/.agents/skills` is discovered whatever `PI_CODING_AGENT_DIR` says, so limpio runs
    `--no-skills --skill <gentle-pi>/skills`.
  - gentle-pi injects its orchestrator prompt itself; the stable `APPEND_SYSTEM.md` has no managed
    blocks, so limpio carries none of it. gentle-pi config lives in `GENTLE_PI_CONFIG_HOME`,
    isolated per lane.
  - Pi owns the terminal title but includes the session name, so the lane label is `--name`.
  - Packages install under `<agent dir>/npm`, fully isolated.
- [x] C2 — `carril` launcher with tests (RED → GREEN → REFACTOR) (route: inline, one new file + test).
  RED observed: 8/9 failed (script missing; the no-write test passed vacuously). GREEN: 9/9 OK.
  Files: `agent-workflows/tools/carril`, `agent-workflows/tests/test_carril.py`.
- [x] C3 — Limpio lane setup + first launch smoke check (route: inline, human-confirmed install).
  Extended tests RED 5/14 → GREEN 14/14 (commit `9f6da94`; C2 was `d44314f`). Installed a copy at
  `~/.local/bin/carril`; `carril preparar limpio` built `~/.pi/agent-limpio` with gentle-pi@3.7.0
  and gentle-engram@0.1.12.

## Verification evidence (2026-09-28)

- Full `agent-workflows` suite: 273 run, 1 failure, 1 skipped. The failure is
  `test_personal_pi_composition.test_fresh_normal_startup_and_policy`; it fails identically on the
  base without these changes (missing local Pi source checkout). It is environmental.
- Smoke run: same prompt, empty cwd, scratch session dir. Both lanes answered.

  | Lane | First-turn input tokens | Cost | System prompt chars | Skills | Chanks skills |
  |---|---|---|---|---|---|
  | limpio | 14 771 | $0.059 | 17 917 | 12 | 0 |
  | estable | 28 741 | $0.115 | 67 949 | 65 | 27 |

- The stable dir changed during the smoke test. Timestamps show the writes came from the estable
  run itself (pi-pretty frecency, gentle-ai managed assets), which happens on every plain `pi`
  launch. The limpio run wrote only inside `~/.pi/agent-limpio`.
- Limpio prints host-peer warnings for gentle-pi/gentle-engram. That is Gentle AI as shipped:
  the stable lane hides them through the personal `pi-npm-host-peers` npm wrapper.

- Native review: assess on `b458174..HEAD` returned risk `high`, `review_due: true`. The returned
  preflight START carries `--base-ref`/`--committed-only`, which the maintainer has banned for new
  reviews. The maintainer chose to skip review for this candidate only (2026-09-28), so it is
  unreviewed. RDD itself was left on.

## Progress

- Step 1 done. Known gap: `~/.local/bin/carril` is a manual copy. Updating it means re-copying
  it; folding it into `tools/install.py` belongs with step 3.

## Later steps (not authorized yet)

2. A/B friction test: 3–5 real tasks run in `limpio` and `estable`, metrics from Pi session JSONL.
3. `candidato` lane + rewrite of the AGENTS.md delivery rule to add a test stage.
