# Session Handoff: Installable V1 release

## Clean Boundary

The planning candidate is at `/home/emili/projects/control-tower/Worktrees/installable-v1-s8-2-planning`, branch `docs/installable-v1-s8-2-planning`, based exactly on clean `master@e4d8ad63437e5c57dbf37edf86aadcc9c9fdab1d`. The candidate itself is not clean: its uncommitted diff is exactly the five approved planning paths listed below. The stale `docs/close-v1-v2-wu1` worktree was cleaned by discarding the four authorized obsolete copies; no content was carried forward.

- `openspec/plans/master-index.md`
- `openspec/plans/plan-8/STATUS.md`
- `openspec/changes/installable-v1-autonomous-v2-split/tasks.md`
- `openspec/changes/installable-v1-autonomous-v2-split/apply-progress.md`
- `openspec/changes/installable-v1-autonomous-v2-split/session-handoff.md`

## Exact Next Action

Ask the Maintainer for interactive approval to apply only `S8.2 Immutable lifecycle foundation`. The Maintainer-approved hard maximum is 800 changed lines; S8.2 remains forecast at 320–400 changed lines. After approval, execute `M8.2.1` then `M8.2.2` as one Strict TDD PR targeting `master`, using `bun test` and a temporary-XDG repository harness. Do not implement during this planning reconciliation.

## Completed Evidence

`S8.1` provenance tasks 1.1–1.3 are ✅ COMPLETO through PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382`. Its historical tests and rollback evidence remain preserved in `apply-progress.md`; the next base is the later clean `master` commit above.

## Ownership Exclusions

S8.2 owns only immutable version storage, active-pointer cutover, lifecycle commands, preservation, and tests. It excludes `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, DB, runtime state, Tower processes, Autonomous V2 contract work, and all delivery actions.

## Telegram Priority

Telegram is the first priority among future work once its dependencies are safe (A, B, and D). Do not assign a Sesión ID until a one-PR boundary is proven. Telegram MUST NOT receive shell, worker selection/launch, Git, merge, delivery, or implicit project-selection authority; local operation remains complete without it.
