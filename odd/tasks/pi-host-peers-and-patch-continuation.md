# Pi host-peer repair and attended issue-patch continuation

Technical ODD record, not a product plan. No planned Session is closed by this work.

## Objective

1. Version the Pi host-peer repair wrapper in the repository so the installer reproduces it on any machine.
2. Remove the friction that blocks #150: Issue-Patch Mode only admits a first dispatch on a fresh `work/issue-<n>` branch, and attended reactivation explicitly excludes issue patches. After the worker disappears, a human cannot continue the same patch without deleting its branch.

## Problem and why

- Pi built from upstream main (#151 overlay) warns at startup when an extension declares host-provided packages (`@earendil-works/pi-tui`, `typebox`, ...) in `dependencies`. Upstream extensions are outside our control. The local fix lives in `~/.pi/agent` only (script plus `settings.json` `npmCommand`). It is lost on a fresh machine.
- `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md` Issue-Patch Mode step 2 requires a fresh branch and stops on collision. The Attended Reactivation section accepts only Sessions. #150 Unit 2's worker was stopped with zero changes on `work/issue-150` at `2abc16b`. Nothing lets a new Pi take over that same patch.

## Scope and constraints

- Zone: `agent-workflows/` and `odd/tasks/`. There is no overlap with the active S164/S165 files (verified through Radar).
- Delivery: direct commit to `master` plus push (`AGENTS.md`). This is not planned Session work, so the docs gate closes with «nada que registrar».
- Effective TDD: strict (`openspec/config.yaml` `strict_tdd: true`). Runner: `python3 -m unittest` from `agent-workflows/`.
- Do not touch S164/S165, the `work/issue-150` branch, or `Worktrees/issue-resolver`. Do not launch Pi, apply a seal, or change the review switch.
- Skills are installed only while no Pi process is running (the sync crashes live Pi sessions).

## Tasks

- [x] T1 — Versioned host-peer wrapper. Add the wrapper source under `agent-workflows/`, install it into `~/.pi/agent/bin/`, and merge `npmCommand` into `~/.pi/agent/settings.json` without clobbering other settings or a foreign user-set `npmCommand`. Covered by installer tests. Route: delegated writer (2+ non-trivial files).
- [ ] T2 — Attended issue-patch continuation. Add a bounded, human-approved route in `chanks-3-despacho-herdr` to continue an existing issue patch with the same issue, worker, branch, worktree and candidate after its Pi process is gone. Launch a new Pi, verify its actual ID in Herdr and Intercom, and send one distinguishable handoff. No reset, recreate, seal or retry. Align the handoff asset and the policy tests. Route: delegated writer (2+ non-trivial files).

## Acceptance

- T1: a fresh install places an executable wrapper and sets `npmCommand` to `[wrapper, "--", "npm"]`. Re-running is idempotent, and other settings survive. The wrapper repairs manifests after a mutating npm command and passes through everything else.
- T2: the skill names the continuation route, its admission preconditions and its stops. The Session reactivation section still excludes patches as first dispatch but points to the new route. Tests pin the invariants.
- Full `python3 -m unittest discover -s tests` passes. Each task has its own Conventional Commit.

## Progress

T1 (delegated writer): the wrapper source lives at `agent-workflows/tools/pi/pi-npm-host-peers` (mode 755, next to `tools/hooks/`), byte-identical to the manually verified `~/.pi` copy. `install.py` plans and applies `pi-npm-wrapper` and `pi-npm-settings`. A foreign `npmCommand` is kept and a warning is printed. A one-shot `--repair` runs on `~/.pi/agent/npm`, and a failure there only warns.
- RED: 10 errors and 1 failure in the new `PiNpmHostPeersTests`.
- GREEN: `tests/test_install.py`, 98 tests OK.
- Full suite: 250 tests, 2 failures that predate this change on `2abc16b`:
  - `test_issue_patch_flow...test_activation_offers_patch_without_session_batch` is stale text from #150 Unit 1 and is fixed in T2.
  - `test_personal_pi_composition...` needs the Pi and quiet-tools source directories, which are absent on this machine.
- One existing assertion was narrowed to `.claude/settings.json`.
- Parent spot-check: the source had mode 775 and failed the 755 convention; it was fixed to 755, and the focused suite was rerun OK.
