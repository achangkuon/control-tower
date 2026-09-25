---
name: chanks-0-jornada
description: "Trigger: empezamos la jornada, cerramos la jornada, open workday, close workday. Open or close the workday through the jornada.sh Tower tool."
license: Apache-2.0
metadata:
  author: emili
  version: "1.1"
---

## Activation Contract

Activate on "empezamos la jornada" (open) or "cerramos la jornada" (close), and their English
equivalents (open workday / close workday). This skill invokes `jornada.sh` as a Tower tool; it
never reimplements or copies jornada.sh's own git logic, selects no work, writes no plan, and
creates no lock. Authority: Engram 9235 (recycling permanent seats with the Tower off, only on
clean worktrees) and decision 62 of the decision register.

It also serves as `chanks-3-despacho-herdr`'s stage-3 dispatch entry mode: that skill invokes it
before selecting or locking workers, to run diagnosis and `jornada.sh --ejecutar` only, never
`--reciclar`, so a clean-but-behind declared seat is current and eligible before the dispatch lock
is held.

## Hard Rules

- Resolve `jornada.sh` at the root of the target repository (`git rev-parse --show-toplevel`) and call it from there for every step below; never assume a fixed relative path from an installed runtime skill copy, and never re-derive its trunk detection, update, or recycle logic inline. If `jornada.sh` is absent at that root, this skill stops and reports it; it never reimplements jornada.sh's own logic to work around a missing script. This skill is a caller, not a reimplementation.
- Open: run `jornada.sh` with no flags first and present its diagnosis, then run
  `jornada.sh --ejecutar`, which brings the trunk current and updates the clean worktrees that
  are only behind, with no work of their own at risk.
- If `jornada.sh` exits non-zero, or its `--ejecutar` output reports a partial failure (a worktree's pull or rebase step did not complete), this skill stops, reports the exact output, and asks the human before continuing; it never retries, retries with different flags, or works around the failure, and whatever invoked this skill does not proceed on unverified state.
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
- Stage-3 dispatch entry mode: when `chanks-3-despacho-herdr` invokes this skill before selecting or locking workers, run only diagnosis and `jornada.sh --ejecutar` — never `--reciclar` — so the dispatch keeps creating each `work/<id>` branch from verified, current master itself. A dirty or OCUPADO seat still surfaces its evidence and exactly one human decision (deliver, save, discard); an unanswered seat is excluded from that dispatch batch while other seats continue, and is never cleaned, stashed, or reset automatically. A missing seat keeps the existing provisioning path.
- Close: run `jornada.sh` with no flags and list what is pending. No mutation happens at close —
  never pass `--ejecutar` or `--reciclar` while closing.

## Decision Gates

| Evidence | Action |
|---|---|
| Worktree clean and only behind | Covered by `--ejecutar` on open; no separate human decision. |
| Worktree clean and human assigns it | Run `--reciclar <path> --nueva-rama <branch>`. |
| Worktree dirty or OCUPADO | Report its evidence; ask exactly one decision — deliver, save, or discard. Do not touch it until answered. |
| Human explicitly asks to delete the old branch | Add `--borrar-rama-vieja` to that one `--reciclar` call only. |
| `jornada.sh` not found at the target repository root (`git rev-parse --show-toplevel`) | Stop; report it is missing; never reimplement its logic to work around it. |
| `jornada.sh` exits non-zero, or its `--ejecutar` output reports a partial failure | Stop; report the exact output; ask the human; never retry or work around it. |
| Invoked by `chanks-3-despacho-herdr` as stage-3 dispatch entry, before it selects or locks workers | Run diagnosis and `--ejecutar` only; never `--reciclar`. A dirty or OCUPADO seat is excluded from that batch until the human answers. |
| Closing | Run diagnosis only; report what is pending; pass no flags. |

## Execution Steps

1. Open: run `jornada.sh` (no flags) from the repo root and present the diagnosis to the human.
2. Open: run `jornada.sh --ejecutar` to update the trunk and the clean, only-behind worktrees.
3. Open: for each clean seat the human assigns, run
   `jornada.sh --reciclar <path> --nueva-rama <branch>`, cut from the fresh trunk.
4. At any point in steps 1-3, if a worktree comes back dirty or OCUPADO: report its evidence and
   ask exactly one decision (deliver, save, or discard); wait for the human before touching it.
5. Close: run `jornada.sh` (no flags) from the repo root and report what remains pending.
6. Stage-3 dispatch entry: when `chanks-3-despacho-herdr` invokes this skill before selecting or locking workers, run step 1 (diagnosis) and step 2 (`--ejecutar`) only; skip step 3 (`--reciclar`) entirely. A clean seat only behind is now current and eligible for that dispatch batch. A dirty or OCUPADO seat still follows step 4 — report its evidence and ask exactly one decision — and stays excluded from that dispatch batch until answered; a missing seat keeps the existing provisioning path.
7. At any point, if `jornada.sh` cannot be found at the target repository root, exits non-zero, or its `--ejecutar` output reports a partial failure: stop, report the exact output, and ask the human. Never retry, work around it, or let the dispatch proceed on unverified state.

## Output Contract

Return the diagnosis, what `--ejecutar` updated, which seats were recycled and their new branch,
any dirty/OCUPADO worktree with its evidence and the human's decision, and — at close — the
pending list. State that this skill selects no work, writes no plan, and creates no lock. When
invoked as stage-3 dispatch entry, state which seats it brought current and which seat, if any,
stayed excluded pending the human's decision or a jornada failure gate.

## References

- `jornada.sh`, resolved at the root of the target repository via `git rev-parse --show-toplevel`
  — never assumed at a fixed relative path from an installed skill copy.
