# Tasks: S126 Tower-Off Herdr Dispatch and Worktree Retirement

Sesión authority: `openspec/plan.yaml` S126 (Zona `metodo`, route `direct`, entry gate `apply`).
Base: `master@5b2b754`, worktree `Worktrees/s126`, branch `work/s126`. Depends on S125 (✅ COMPLETO).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 190–260 additions + deletions (skill text, installer, template, tests; SDD Markdown excluded) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Three direct commits in order M126.1 → M126.2 → M126.3; each is implemented, reviewed and committed before the next starts, because all three share `tests/test_despacho_herdr.py` |
| Delivery strategy | ask-on-risk |
| Chain strategy | none |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low

| Module | Paths | Forecast |
|---|---|---:|
| M126.1 | `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md`, `agent-workflows/tools/install.py`, `agent-workflows/tests/test_despacho_herdr.py`, `agent-workflows/README.md` | 110–150 |
| M126.2 | `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md`, `agent-workflows/skills/chanks-3-despacho-herdr/references/retiro.md`, `agent-workflows/tests/test_despacho_herdr.py` | 50–70 |
| M126.3 | `agent-workflows/templates/session-routing.md`, `agent-workflows/tests/test_despacho_herdr.py` | 25–40 |

## Apply scope guard

Only the paths above may change. Never edit `openspec/plan.yaml`, `openspec/ROADMAP.md`,
`product/tower/**`, the other skills, or any file outside the repository.

Kickoff design notes (route unchanged):
- The skill names Herdr operations (create a tab, start an agent, wait on its state, close a tab) and
  defers every command, flag and error code to the `herdr` skill that `herdr --skill` emits. No code
  fences in the skill or its reference.
- The template must keep passing `test_builder_flow.py`, which forbids the words `Tower`, `MAIN` and
  `Support` in `templates/session-routing.md`. Use "Torre" for the product name there.
- The retire text must not contain `--force` or `-D` (the plan's falsifier), and must block only on
  `git cherry` lines that start with `+`.
- Out-of-repo follow-ups are not part of this apply: the `~/.pi` copy of the `herdr` skill and the
  post-delivery Pi dispatch check (criterion 14).

Verification commands:

```sh
python3 -m unittest discover -s agent-workflows/tests
radar check
```

## Acceptance criteria

See S126 in `openspec/plan.yaml` (`radar sesion S126`): 16 criteria covering registration and
installation, dispatch gates, one tab/worktree/agent per Sesión, fail-closed Herdr handling, no Torre
coupling, parent-owned integration, the six retire checks and their order, `git cherry` `+`-only
blocking, no copied Herdr procedures, the installed routing block, the post-delivery Pi check, suites,
and Área-only diff.

## M126.1 — The skill opens one tab with worktree and agent per chosen Sesión

- [x] **T126.1.1 — RED:** require the skill in `CHANKS_SKILLS`, dispatch only from the human's list of LISTO Sesiones, refusal of shared Cimientos or Recursos, one tab, one `Worktrees/<id>` worktree and one agent per Sesión, and no Torre coupling.
- [x] **T126.1.2 — GREEN:** write the skill with fail-closed gates and register it in the installer and the README table.
- [x] **T126.1.3 — REFACTOR:** reference the `herdr` skill, Support and kickoff without copying their procedures.

## M126.2 — Retire mode removes only worktrees that pass the six checks

- [x] **T126.2.1 — RED:** require the six checks, the no-mutation stop on any failure, the order tab → worktree → branch, no `--force`/`-D`, and `git cherry` blocking only on `+` lines.
- [x] **T126.2.2 — GREEN:** write the retire mode in its reference and link it from the skill.
- [x] **T126.2.3 — REFACTOR:** each check lives in one place.

## M126.3 — The parent's routing links dispatch and retirement into the flow

- [x] **T126.3.1 — RED:** require the installed block to name the dispatch after the human choice, the retire mode after the closure record, and the Torre-off dispatch as an explicit Herdr request.
- [x] **T126.3.2 — GREEN:** add the lines to the routing block.
- [x] **T126.3.3 — REFACTOR:** the block repeats none of its existing rules.
