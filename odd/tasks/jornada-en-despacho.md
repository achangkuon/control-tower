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
- [x] T3 — Close native review findings R3-batch-exclusion-contradicts-atomic-batch,
      R3-ejecutar-mutation-outside-lock, R3-partial-failure-signal-undefined (route: bounded
      writer; 2+ non-trivial files: both SKILL.md and both test files).

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
- T3 done by a bounded writer (strict TDD observed), closing the three S161/59a78c4
  native-review advisory findings:
  - RED: updated 3 existing assertions that pinned the old "excluded ... while other
    seats continue" wording (one gate row each in `chanks-0-jornada` and
    `chanks-3-despacho-herdr`, one execution-step phrase in `chanks-0-jornada`) and
    added 7 new tests (3 in `test_chanks_jornada.py`, 4 in `test_despacho_herdr.py`)
    covering: the concrete `FALLO`/`CONFLICTO`/`ABORTADO` marker definition, the
    "invoked under the dispatch lock, never before it is acquired" wording in both
    skills, the reordered lock→jornada→fetch/confirm execution-step sequence, the
    new whole-batch-stops-and-releases-only-the-lock rule, and absence of every old
    exclusion phrase. Ran both files, observed 5 failures in
    `test_chanks_jornada.py` and 4 in `test_despacho_herdr.py` (RED), all
    pre-existing tests in both files still green.
  - Implementation: edited `agent-workflows/skills/chanks-0-jornada/SKILL.md`
    (Activation Contract addendum, new failure-signal-definition Hard Rule bullet
    naming `FALLO`/`CONFLICTO`/`ABORTADO` from jornada.sh's own `--ejecutar` block,
    stage-3 Hard Rule/Decision-Gate/Execution-step/Output-Contract wording replaced
    with the whole-batch-stops rule and "invoked under the dispatch lock, never
    before it is acquired") and
    `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md` (Activation Contract,
    Hard Rule, both Decision Gates rows, Output Contract addendum updated to the
    same whole-batch-stops rule; Execution Steps reordered so lock acquisition is
    step 2, the `chanks-0-jornada` invocation moves to step 3 under the acquired
    lock, and the fetch/confirm-master step stays step 4).
  - GREEN: `test_chanks_jornada.py` 18/18 pass; `test_despacho_herdr.py` 45/45
    pass (after fixing two self-inflicted RED-phase inconsistencies: a
    capitalization mismatch from joining two step clauses with a period instead of
    a semicolon, and a contradiction between a despacho test requiring the literal
    old "before the dispatch lock is held" substring and a jornada test forbidding
    it — resolved by adopting "invoked under the dispatch lock, never before it is
    acquired" as the one canonical phrase used everywhere).
  - Full suite (`test_*.py`): 209 tests, 3 failures — the same three known
    pre-existing base failures listed above; 1 skipped; unrelated to this patch.
  - `git status --porcelain`: only the two SKILL.md files, the two test files, and
    this task file changed. `git diff --stat` (excluding this task file): 118
    insertions / 40 deletions across the four authorized source/test files — well
    under the ~400-line heuristic.
  - Not done: commit, push, gentle-ai review, and agent orchestration — out of
    scope for this bounded writer by explicit instruction; reserved for the
    inline step (T2) after this report is accepted.
