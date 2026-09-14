# Verify Report: S126 Tower-Off Herdr Dispatch and Worktree Retirement

Verdict: **PASS with two post-delivery criteria pending** (installation into the real runtimes and the
Pi dispatch check), plus one recorded finding. Executor: parent inline. Base `master@5b2b754`.

## Commands (observed)

- `python3 -m unittest discover -s agent-workflows/tests`: `Ran 55 tests ... OK`.
- `radar check`: `control-tower: 0 error(es), 5 aviso(s)` (unchanged).

## Criteria

| # | Criterion (short) | Evidence | Result |
|---|---|---|---|
| 1 | Skill exists, is in `CHANKS_SKILLS`, installs identical in four runtime roots | `test_skill_is_registered_listed_and_well_formed`; `test_all_runtime_skill_paths_match_canonical_source` in a temporary home | PASS in tests; real install PENDING |
| 2 | Acts only on an explicit human list of `LISTO` Sesiones, else creates nothing | `test_dispatch_acts_only_on_the_human_list_of_ready_sesiones` | PASS |
| 3 | Shared Cimiento or Recurso is never dispatched in parallel | `test_shared_cimientos_or_recursos_are_never_dispatched_in_parallel` | PASS |
| 4 | One `Worktrees/<id>` on `work/<id>`, one tab, one named agent, IDs from Herdr JSON | `test_one_tab_worktree_and_agent_per_sesion` | PASS |
| 5 | No `HERDR_ENV=1` stops and offers subagents; ambiguous Herdr closes only what it opened | `test_herdr_failures_fail_closed` | PASS |
| 6 | Never loads `torre-control`, never touches Tower state, never answers for the human | `test_no_torre_coupling_and_no_answer_for_the_human` | PASS |
| 7 | Agent commits only on its branch; parent integrates serially | `test_the_parent_owns_integration` | PASS |
| 8 | Retire runs after the plan record, only when six checks pass | `test_retire_requires_the_six_checks` | PASS |
| 9 | Any failed check changes nothing | `test_any_failed_check_changes_nothing` | PASS |
| 10 | Order tab → worktree → branch → readback; no `--force` or `-D` | `test_retire_order_is_tab_then_worktree_then_branch`, `test_retire_never_forces` | PASS |
| 11 | Cherry-picked or rebased branch is retirable; only `+` lines block | `test_only_plus_lines_of_git_cherry_block` | PASS, see finding |
| 12 | No copied Herdr procedure | `test_skill_copies_no_herdr_procedure` (no code fences) | PASS |
| 13 | Installed routing block names dispatch after the choice and retire after the record | `test_installed_routing_links_dispatch_and_retirement`; existing routing tests green | PASS |
| 14 | A Pi session with the Torre off dispatches without refusing | Requires installing the routing block and a live Pi check | PENDING (post-delivery) |
| 15 | Suites pass and `radar check` adds no errors | Commands above | PASS |
| 16 | Diff touches only Área | All implementation paths under `agent-workflows/`; SDD artifacts committed separately | PASS |

## Finding

`git branch -d` refuses a branch integrated only by cherry-pick or rebase even when check 4 passes.
The worktree is still retired, but the branch stays and is reported; forcing is forbidden by the plan.
Criterion 11 is met for the worktree and only partially for the branch ref.
