# Patch — run chanks-0-jornada at stage 3 dispatch

## Objective

Stage-3 dispatch (`chanks-3-despacho-herdr`) invokes `chanks-0-jornada` before selecting workers,
so behind-but-clean seats are brought current instead of rejected, and dirty/busy seats reach the
human as one decision. Also closes the three advisory findings left by S161's review.

## Authority

Explicit maintainer request on 2026-09-25 in this Conversation: implement as a patch, without a
plan Session. Closes no planned work («nada que registrar» at delivery).

## Scope (exact files)

- `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md`
- `agent-workflows/skills/chanks-0-jornada/SKILL.md`
- `agent-workflows/tests/test_despacho_herdr.py`
- `agent-workflows/tests/test_chanks_jornada.py`

`jornada.sh` is not modified.

## Constraints

- At stage 3, jornada runs diagnosis + `--ejecutar` only; it does not `--reciclar`. The dispatch
  keeps creating `work/<id>` from verified master as today.
- Dirty or OCUPADO seat: evidence + one human decision (deliver, save, discard); unanswered seat
  is excluded from the batch; others continue. Never cleaned/stashed/reset automatically.
- Missing seat keeps the existing provisioning path.
- jornada runs before the dispatch lock/readback so the lock-held readback observes updated state.
- Delivery: direct commit to `master` + push (AGENTS.md).

## S161 advisory findings to close

- Installed-copy path: `../../../jornada.sh` does not resolve from runtime skill copies.
- No gate when `jornada.sh` itself fails (non-zero exit / partial `--ejecutar`).
- Dirty-worktree tests are textual and partly vacuous.

## TDD

Strict (`openspec/config.yaml`). Runner: `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`.
Known pre-existing failures on base: `test_kickoff_requires_confirmed_exclusive_or_serial_resource_evidence`,
`test_native_kickoff_reconciles_identity_without_inventing_a_route`, `test_bridge_pi_execution_rebind_schema_is_bounded`.

## Tasks

- [x] T1 — RED tests, dispatch hook, jornada fixes (route: delegated writer; 2+ non-trivial files).
- [ ] T2 — Review, commit, push, reinstall, propagate (route: inline).

## Progress / evidence

- T1 done by a bounded writer (strict TDD observed):
  - RED: added 4 new tests to `test_chanks_jornada.py` and 5 new tests to
    `test_despacho_herdr.py`; ran both files, observed 4 and 5 new failures
    respectively (one `ValueError`/`AssertionError` per new assertion), all
    pre-existing tests still green.
  - Implementation: edited `agent-workflows/skills/chanks-0-jornada/SKILL.md`
    (stage-3 dispatch entry mode; `jornada.sh` resolved via
    `git rev-parse --show-toplevel`, no `../../../jornada.sh`; failure gate for
    non-zero exit / partial `--ejecutar`) and
    `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md` (new Execution
    Step 2 invoking `chanks-0-jornada`'s stage-3 mode before the lock, new
    Hard Rule, two new Decision Gates rows, Output Contract addendum).
  - GREEN: `test_chanks_jornada.py` 15/15 pass; `test_despacho_herdr.py`
    44/44 pass (one test phrase corrected after first run — a wording
    mismatch in the test, not in the skill).
  - Full suite (`test_*.py`): 205 tests, 3 failures — all three are the
    known pre-existing base failures listed in this document
    (`test_kickoff_requires_confirmed_exclusive_or_serial_resource_evidence`,
    `test_native_kickoff_reconciles_identity_without_inventing_a_route`,
    `test_bridge_pi_execution_rebind_schema_is_bounded`); unrelated to this
    patch.
  - `git status --porcelain`: only the four authorized files plus this task
    file changed. `git diff --stat`: 159 insertions / 17 deletions across the
    two SKILL.md and two test files — well under the ~400-line heuristic.
- T2 (review/commit/push/reinstall/propagate) not yet done — reserved for the
  inline step after this writer's report is accepted.
