# main-al-dia — personal session-start freshness check

Owner request (2026-10-05, conversation from ecom-ecuador): every agent, on entering a
session in a Git project, checks whether the project's default branch is up to date with
its remote. Up to date: continue silently. Behind: ask the user once whether to update
first or continue as is. Never update without consent. Approved design: a read-only
script measures; a personal instruction block tells every agent what to do with the
result.

Session: S224 (Método). Branch: `feat/main-al-dia` in `Worktrees/main-al-dia`.

## Decisions

- No Claude Code SessionStart hook in this version: the personal installer never writes
  `~/.claude/settings.json` (`agent-workflows/tests/test_install.py:2052-2059`), and the
  only hook registrar is the Tower product installer. Every runtime receives the same
  personal block instead.
- The script installs to `~/.local/bin/main-al-dia`, following the `carril` precedent
  (`agent-workflows/tools/install.py:767-793`).
- The new block is appended when absent in all four runtime instruction files, so the
  rule actually reaches every agent; the existing blocks keep their current behavior.

## Tasks

- [x] T1 Declare S224 in `openspec/plan.yaml` (Zona `metodo`).
- [x] T2 Script `agent-workflows/tools/main-al-dia` with tests against temporary repos (RED → GREEN).
- [x] T3 Personal block template `main-freshness.md` and installer wiring (script + block), with tests.
- [x] T4 Update the propagation map and README mentions of the personal blocks.
- [x] T5 Full Python suite and `install.py --check --dry-run` against a temporary HOME.

## Evidence

- **T1** — Declared S224 (zona `metodo`, prioridad `v2-piloto`, the one Método
  `PLANIFICADO` sessions use per `radar status`) with the S220 field set and its
  `encargo`. `$HOME/.local/bin/radar check -C .` → `0 error(es), 63 aviso(s)` (the
  warnings are pre-existing), exit 0. Commit `c4ae649`.
- **T2** — RED: `python3 -m unittest tests.test_main_al_dia` before the script existed
  → Ran 9 tests, FAILED (errors=9), every failure `FileNotFoundError` for
  `agent-workflows/tools/main-al-dia`. GREEN: the same command after the script →
  Ran 9 tests, OK. The tests cover not-a-repo, no-origin, unreachable remote
  (`SKIP offline`), up-to-date `OK`, default behind with counts, feature branch
  behind its upstream, dirty flag, default checked out in another worktree, and the
  invariant that local refs never move. Commit `1a4af8c` (index mode 100755).
- **T3** — RED: `python3 -m unittest tests.test_install.InstallerTests` before the
  template and wiring → Ran 57 tests, FAILED (failures=11, errors=4), all naming
  `main-freshness`. GREEN: the same command after → Ran 57 tests, OK. The template
  uses the exact personal block shape (marker, fixed header, closing marker) and the
  installer appends it when absent in all four runtimes without changing the other
  three blocks; the launcher installs to `~/.local/bin/main-al-dia` like `carril` and
  `--check` reports drift. Commit `e4c0f2a`.
- **T4** — The propagation map and `README.md` now enumerate four personal blocks and
  mention the `main-al-dia` launcher installed like `carril`. The frozen
  `product/tower/generic` byte fixture is unaffected. Full suite after the change:
  512 tests, OK. Commit `2fd0665`.
- **T5** — Full suite `cd agent-workflows && python3 -m unittest discover -s tests`
  → `Ran 512 tests`, `OK (skipped=2)`. Dry-run against a temporary HOME seeded with
  the four runtime instruction files: 19 planned changes — 6 skill files, 2 Claude
  links, the 4 manual files (each gains the appended `chanks:main-freshness` block),
  the `carril` and `main-al-dia` launchers, the Pi npm wrapper and settings, and the
  overlay rebuild tool plus its two data files. This ODD record is the T5 work unit;
  its commit id is the one that carries this file.

### Environmental note (proved, not guessed)

This worktree checks executable files out as `775` (umask `002`) while `install.py`
requires `755`; the Git index mode for those paths is `100755`. Before normalizing the
working-tree modes to `755` (a change Git does not see), the same suite failed with
`InstallError: Carril launcher source must be a regular executable 755 file`. The
normalization is what makes the suite green; it is not part of any commit.
