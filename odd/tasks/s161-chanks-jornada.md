# S161 — chanks-0-jornada: open and close the workday through jornada.sh

## Objective

A new Chanks skill `chanks-0-jornada` answers "empezamos la jornada" and "cerramos la jornada"
by invoking the Tower tool `jornada.sh` instead of the maintainer running it by hand.

## Problem / why

`jornada.sh` already diagnoses (no flags), updates (`--ejecutar`) and recycles
(`--reciclar <path> --nueva-rama <branch>`), but no Chanks skill invokes it, so agents start
without knowing whether their worktree is current. Engram 9235 authorizes recycling permanent
seats with the Tower off, only on clean worktrees.

## Admission binding

- Repo `control-tower/Main`, branch `master`, HEAD `99dca9b2011b21661939a602fd6544d65a0e7954`, clean.
- `radar status --json` sha256 `4b0f3094ac71deebacc6ee3a47d631a4336e1eaaa33847dada1ec45c67703a9f`
- `radar sesion S161` sha256 `73ff87ce079e65b97f1400d10f37dd542d3e5472749ce60a49986aafea36ca17`
- State 🟢 LISTO, Cimientos —, Recurso —, execution ODD native.

## Authorized scope

- `agent-workflows/skills/chanks-0-jornada/SKILL.md`
- `agent-workflows/tools/install.py`
- `agent-workflows/tests/test_chanks_jornada.py`
- `agent-workflows/tests/test_install.py`

`jornada.sh` is NOT modified.

## Constraints

- Never recycle, clean, reset, stash or delete branches without explicit human decision.
- Never pass `--borrar-rama-vieja` on its own; never disable jornada.sh's dirty-worktree refusal.
- A dirty or OCUPADO worktree is reported with evidence and one decision is asked
  (deliver, save, discard) before touching it.
- Delivery: direct commit to `master` + push (AGENTS.md). Reinstall and propagate after delivery.

## TDD

Mode: strict (source `openspec/config.yaml` `strict_tdd: true`).
Runner: `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`.

## Tasks

- [x] T1 — RED tests + skill + installer registration (route: delegated writer; trigger: 2+ non-trivial files).
- [ ] T2 — Delivery: commit, review assess, push, reinstall, propagate.

## Acceptance criteria

- Tests assert triggers, no self-initiated `--borrar-rama-vieja`, no recycling of dirty/busy
  worktrees, and installer inclusion; full suite green.

## Progress / evidence

- T1 done by a bounded writer (delegated: 2+ non-trivial files — `SKILL.md`, `install.py`,
  `test_chanks_jornada.py`, `test_install.py`).
- RED observed: `test_chanks_jornada.py` failed on 2 assertions before the skill/registration
  existed (installer inclusion, and the `--borrar-rama-vieja` prohibition line-wrap bug caught by
  the test itself). Fixed the skill wording, re-ran to GREEN.
- GREEN: `python3 -m unittest discover -s agent-workflows/tests -p 'test_chanks_jornada.py'` →
  11/11 pass. `... -p 'test_install.py'` → 75/77 pass; the 2 failures
  (`test_kickoff_requires_confirmed_exclusive_or_serial_resource_evidence`,
  `test_native_kickoff_reconciles_identity_without_inventing_a_route`) are pre-existing drift in
  `chanks-3-session-kickoff/SKILL.md`, confirmed present on `master` before this change (out of
  S161's authorized scope).
- Full suite: `... -p 'test_*.py'` → 193/196 pass, 1 skipped. The 3 failures are the 2 above plus
  `test_bridge_pi_execution_rebind_schema_is_bounded` (test_puente_sdd_start.py), also confirmed
  pre-existing on `master`.
- `git status --porcelain` shows only the 4 authorized files (plus this task doc), no
  out-of-scope writes.
- New skill: `agent-workflows/skills/chanks-0-jornada/SKILL.md` (66 lines). Diff:
  `install.py` +1, `test_install.py` +14, plus the new `test_chanks_jornada.py` (122 lines).

## Next step

T2 — delivery (commit, review assess, push, reinstall, propagate) is out of this writer's
authorized scope (no commit/push/review here); hand back to the responsible parent.
