---
name: chanks-0-jornada
description: "Trigger: empezamos la jornada, cerramos la jornada, open workday, close workday. Open or close the workday through the jornada.sh Tower tool."
license: Apache-2.0
metadata:
  author: emili
  version: "1.0"
---

## Activation Contract

Activate on "empezamos la jornada" (open) or "cerramos la jornada" (close), and their English
equivalents (open workday / close workday). This skill invokes `jornada.sh` as a Tower tool; it
never reimplements or copies jornada.sh's own git logic, selects no work, writes no plan, and
creates no lock. Authority: Engram 9235 (recycling permanent seats with the Tower off, only on
clean worktrees) and decision 62 of the decision register.

## Hard Rules

- Call `jornada.sh` from the repo root for every step below; never re-derive its trunk detection,
  update, or recycle logic inline. This skill is a caller, not a reimplementation.
- Open: run `jornada.sh` with no flags first and present its diagnosis, then run
  `jornada.sh --ejecutar`, which brings the trunk current and updates the clean worktrees that
  are only behind, with no work of their own at risk.
- For each clean seat the human assigns after that diagnosis, run
  `jornada.sh --reciclar <path> --nueva-rama <branch>` to cut it a fresh branch from the updated
  trunk. Recycle only seats the human names; this skill selects no work on its own.
- Never pass `--borrar-rama-vieja` on this skill's own initiative; add it only when the human explicitly asks for the old branch to be deleted.
  jornada.sh keeps the old branch by default so unmerged commits survive.
- Never disable, work around, or second-guess jornada.sh's dirty-worktree refusal. A dirty or
  OCUPADO (busy) worktree is reported with its evidence, and exactly one decision is asked of the
  human — deliver, save, or discard — before that worktree is touched in any way. This skill never
  recycles, cleans, resets, stashes, or saves a dirty or busy worktree on its own.
- Never delete a branch without an explicit human decision.
- Close: run `jornada.sh` with no flags and list what is pending. No mutation happens at close —
  never pass `--ejecutar` or `--reciclar` while closing.

## Decision Gates

| Evidence | Action |
|---|---|
| Worktree clean and only behind | Covered by `--ejecutar` on open; no separate human decision. |
| Worktree clean and human assigns it | Run `--reciclar <path> --nueva-rama <branch>`. |
| Worktree dirty or OCUPADO | Report its evidence; ask exactly one decision — deliver, save, or discard. Do not touch it until answered. |
| Human explicitly asks to delete the old branch | Add `--borrar-rama-vieja` to that one `--reciclar` call only. |
| Closing | Run diagnosis only; report what is pending; pass no flags. |

## Execution Steps

1. Open: run `jornada.sh` (no flags) from the repo root and present the diagnosis to the human.
2. Open: run `jornada.sh --ejecutar` to update the trunk and the clean, only-behind worktrees.
3. Open: for each clean seat the human assigns, run
   `jornada.sh --reciclar <path> --nueva-rama <branch>`, cut from the fresh trunk.
4. At any point in steps 1-3, if a worktree comes back dirty or OCUPADO: report its evidence and
   ask exactly one decision (deliver, save, or discard); wait for the human before touching it.
5. Close: run `jornada.sh` (no flags) from the repo root and report what remains pending.

## Output Contract

Return the diagnosis, what `--ejecutar` updated, which seats were recycled and their new branch,
any dirty/OCUPADO worktree with its evidence and the human's decision, and — at close — the
pending list. State that this skill selects no work, writes no plan, and creates no lock.

## References

- `../../../jornada.sh`
