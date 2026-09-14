# Apply Progress: S126 Tower-Off Herdr Dispatch and Worktree Retirement

Mode: Strict TDD. Route `direct` (entry gate `apply`). Base `master@5b2b754`, worktree `Worktrees/s126`.
Executor: parent inline (SDD child dispatch is refused by the Gentle AI hook in Claude Code).
Módulos were implemented, reviewed and committed one at a time because all three share
`tests/test_despacho_herdr.py`.

## M126.1 — Dispatch skill (commit `f9f4ac7`, trailer `Modulo: M126.1`)

| Task | Evidence |
|---|---|
| T126.1.1 RED | `test_despacho_herdr.py` with dispatch tests; every test failed with `FileNotFoundError` for the missing `SKILL.md`. |
| T126.1.2 GREEN | `skills/chanks-3-despacho-herdr/SKILL.md` written with fail-closed gates; registered in `CHANKS_SKILLS` and the README "Session workflow" row. 48 tests OK, including installer inventory and four-runtime copy tests. |
| T126.1.3 REFACTOR | The skill references the `herdr` skill, Support and kickoff; no code fences, no copied Herdr procedure. |

## M126.2 — Retire mode (commit `b93619a`, trailer `Modulo: M126.2`)

| Task | Evidence |
|---|---|
| T126.2.1 RED | Retire tests added; five failed with `FileNotFoundError` for `references/retiro.md`. |
| T126.2.2 GREEN | `references/retiro.md` holds the six checks, the no-mutation stop, and the order tab → worktree → branch → readback; linked from a gate, step 7 and References. 54 tests OK. |
| T126.2.3 REFACTOR | The checks live only in `retiro.md`; the skill does not restate them. |

## M126.3 — Parent routing (commit `d2a56ce`, trailer `Modulo: M126.3`)

| Task | Evidence |
|---|---|
| T126.3.1 RED | Installed-block test failed with `ValueError: substring not found` (`human chooses`). |
| T126.3.2 GREEN | Two bullets added after the kickoff rule in `templates/session-routing.md`. 55 tests OK; `radar check` 0 errors. |
| T126.3.3 REFACTOR | No existing routing rule repeated; the words `Tower`, `MAIN` and `Support` stay out of the template. |

## Finding recorded during apply

`git branch -d` refuses a branch whose work reached master only through cherry-pick or rebase, even
when `git cherry` shows only `-` lines. `retiro.md` therefore keeps such a branch and reports it,
never forcing the deletion; the worktree itself is still removed.

## Size and attempt

M126.1 = 137, M126.2 = 68, M126.3 = 28, total 233 changed lines. Attempt settled `complete` before these reports.
