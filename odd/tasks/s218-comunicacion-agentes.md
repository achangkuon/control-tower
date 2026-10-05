# S218 — chanks-0-comunicacion-agentes

Session: S218 (Método V1 › metodo). Product authority: `radar sesion S218`. This document is the
subordinate technical record; it is not a second product plan.

## Objective

Ship an own, intent-triggered parent skill that lets any agent running inside Herdr message another
running agent, observe it, stop it, or open a pane / start an agent when the user asks in their own
words, without naming Herdr.

## Problem and why

On 2026-10-04 the maintainer asked an agent to "communicate with the agent" sharing its checkout and
the request stalled: `AGENTS.md` ("Uso manual de Herdr (por ahora)") and the native `herdr` skill
both require the user to name Herdr, and the block's examples only cover opening panes. The native
skill is upstream-owned, overwritten on every Herdr upgrade, and installed only for Pi on this
machine, so the product rule cannot live there.

## Scope

Authorized files (exact, from the Session):

- `agent-workflows/skills/chanks-0-comunicacion-agentes/SKILL.md`
- `agent-workflows/skills/chanks-0-comunicacion-agentes/references/casos-herdr.md`
- `agent-workflows/tests/test_comunicacion_agentes.py`
- `agent-workflows/tests/test_builder_flow.py`
- `agent-workflows/README.md`
- `agent-workflows/skills/_shared/plan-naming-convention.md`
- `agent-workflows/tools/install.py`
- `AGENTS.md`
- this record, `odd/tasks/s218-comunicacion-agentes.md`

Out of scope: the V1 package roster and installed templates (S219), the native `herdr` skill,
automatic Session dispatch, the worker pool and Tower topology (V3).

## Constraints

- Never answer another agent's approval or question UI on its behalf.
- Cite the native `herdr` skill as the command reference; do not copy its procedure. Where it is
  not installed, the installed CLI (`herdr --help`) is the syntax authority.
- Message a busy agent anyway, without waiting, worded so it does not interrupt; stop an agent only
  on the user's explicit request; send nothing to an agent blocked on an approval.
- Outside Herdr (`HERDR_ENV` unset) the skill says so and stops.
- `AGENTS.md` must not contain the strings forbidden by
  `test/extensions/pi/builder-instructions.test.mjs`.
- S137 stands: Intercom remains the transport between Pi workers.
- Any file outside the list above needs human approval first.

## Tasks

- [x] T1 — Contract test `test_comunicacion_agentes.py` written first and observed RED.
      Route: delegated (writer). Trigger: 2+ non-trivial files.
- [x] T2 — Skill `SKILL.md` + `references/casos-herdr.md`; T1 observed GREEN.
      Route: delegated (writer).
- [x] T3 — Method mentions updated where the roster of skills is enumerated: `README.md`,
      `_shared/plan-naming-convention.md`, `tools/install.py`, `tests/test_builder_flow.py`, only
      as far as each file actually requires. Route: delegated (writer).
- [x] T4 — `AGENTS.md`: replace the "Uso manual de Herdr (por ahora)" block; V3 is only automatic
      Session dispatch, manual use is governed by the new skill. Route: delegated (writer).
- [ ] T5 — Full applicable checks and one work-unit commit on `s218/comunicacion-agentes`.
      Checks observed (see evidence); the commit hash is reported by the writer, not recorded here.

## Acceptance criteria

- The skill activates on intent and routes to four cases: message, observe, stop, open/start.
- The four behavioural constraints above are stated in the skill and pinned by the contract test.
- The skill cites the native `herdr` skill and contains no copied Herdr procedure.
- `AGENTS.md` no longer requires naming Herdr for manual use and still defers automatic dispatch.

## Checks

- `python3 -m unittest discover -s tests -q` from `agent-workflows/`
- `bun test test/extensions/pi/builder-instructions.test.mjs`
- `bun test agent-workflows`
- `$HOME/.local/bin/radar check -C <worktree>`

## Delivery

Forecast: about 250 authored lines, under the 400-line planning heuristic. Strategy: `single-pr`
equivalent for this repo, one work-unit commit; delivery is a direct push to `master`, decided by
the maintainer. Release classification per `AGENTS.md`: S218 alone does not ship; S219 does.

## Progress and evidence

- 2026-10-04 — Worktree `Worktrees/s218-comunicacion-agentes`, branch
  `s218/comunicacion-agentes`, based on `6b57ff3`. No source written yet.
- 2026-10-04 — Base, before any edit. `python3 -m unittest discover -s tests -q` as checked out:
  489 tests, 14 failures, 129 errors. Cause is environmental: the worktree was created under umask
  002, so tracked executables are 775 and `install.py` demands 755 (`Carril launcher source must be
  a regular executable 755 file`). After a local `chmod 755` of the tracked 100755 files (no Git
  diff) the base is 489 tests, 1 failure:
  `test_personal_config.PersonalConfigMigrationTests.test_installer_then_hermes_archives_deferred_skills_and_keeps_active_central_roster`
  (`test_personal_config.py:230`). That is the only pre-existing failure.
- 2026-10-04 — T1 RED: `python3 -m unittest tests.test_comunicacion_agentes -v` →
  `Ran 12 tests`, `FAILED (errors=12)`, every one a `FileNotFoundError` on the missing `SKILL.md`.
- 2026-10-04 — T2 GREEN: same command → `Ran 12 tests`, `OK`. `SKILL.md` is 527 words and holds no
  code fence and no Herdr command; the per-case detail is in `references/casos-herdr.md`.
- 2026-10-04 — T3, what each file required:
  - `tools/install.py`: required. `test_install` demands that every `chanks-*` source directory be
    in `CHANKS_SKILLS`. But `TOWER_V1_SKILLS` derives from it and is compared against the product
    export, and `PERSONAL_SKILLS` is pinned to an exact tuple; both belong to S219 or sit outside
    this Session's files. Added `V1_PENDING_SKILLS` so the skill is in the source inventory and in
    neither shipping roster. S219 removes the entry when the package adds the skill.
  - `tests/test_builder_flow.py`: added to the stage-skill scan with the approved activation prefix
    `comunicate con el agente,`, plus a negative case showing the word Herdr alone does not activate.
  - `README.md`: one catalog row and one paragraph; `_shared/plan-naming-convention.md`: named in §19.
- 2026-10-04 — T4: `AGENTS.md` paragraph replaced; the V3 dispatch paragraph above it is untouched.
- 2026-10-04 — Checks after the change:
  - `python3 -m unittest discover -s tests -q`: 501 tests, 1 failure, the same base one at the
    same line; no new failure.
  - `bun test test/extensions/pi/builder-instructions.test.mjs`: 2 pass, 0 fail.
  - `bun test agent-workflows`: 366 pass, 0 fail.
  - `radar check`: 0 errors, 63 warnings.
  - Extra: `bun test product/tower/v1/test/bundle.test.mjs product/tower/v1/test/install.test.mjs`:
    35 pass, 0 fail. The whole `bun test` cannot be judged in this worktree: it has no
    `node_modules`, so suites importing `yaml` or `ajv` fail to load.
- Pending outside this Session's files, for human approval:
  `agent-workflows/tests/test_personal_config.py:231` asserts `len(install.OWN_SKILLS) == 25`; it is
  now 26. The assertion is unreachable today because line 230 already fails on the base, and it
  will surface when that base failure is fixed.

## Next step

Parent: spot-check, decide the `test_personal_config.py:231` count, then deliver. S219 adds the
skill to the Tower V1 package and removes it from `V1_PENDING_SKILLS`.
