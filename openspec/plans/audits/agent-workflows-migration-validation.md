# Audit F — Validation that the `agent-workflows` migration is complete

> **Scope.** Read-only proof that deleting `~/projects/agent-workflows` and
> `~/projects/agent-workflows-worktrees` loses nothing. Requested by the maintainer before
> authorising the deletion.
> **Method.** Set comparison of tracked paths, byte comparison of every tracked file, reachability
> of every branch tip inside Control Tower, and classification of everything Git does not carry.
> **Date.** 2026-09-04. **Bases.** `agent-workflows@588f0282` · `control-tower/Main@43130ad`.

---

## Verdict

**Complete.** Every tracked file, every branch, and the full 58-commit history are inside Control
Tower. The only content that does not travel is one 4 MB compiled Go binary whose source is present
and which rebuilds with `go build`. Nothing else exists outside Git.

---

## A. Tracked paths — identical sets

| | Count |
|---|---|
| Tracked in `agent-workflows@588f0282` | 86 |
| Tracked under `control-tower:agent-workflows/` | 86 |
| Present only in `agent-workflows` | **0** |
| Present only in Control Tower | 0 |

## B. File contents — 85 of 86 byte-identical

One file differs: `MIGRACION-ZONAS.md` (kept since 2026-10-01 at `agent-workflows/historico/MIGRACION-ZONAS.md`). **Control Tower's copy is the newer one.** The standalone
copy still reads *"la rama sigue sin push"*; Control Tower's records Fase A as closed and delivered,
naming the review lineages, the subtree merge, and the post-delivery radiografía at 1167 PASS / 0
FAIL. The standalone is behind, not ahead.

## C. History — fully reachable

`588f0282d28baf79ffbd3cb7c1b29d7d5557436e` (the `feat/modelo-de-zonas` tip) exists inside Control
Tower and is an **ancestor of `master`**. Walking it reaches **58 commits**. The subtree merge
`dbb7626904a09323e19dd7a60f747d29c8c62f5d` imported the history rather than squashing it, so
`git log` and `git blame` continue to work on every migrated file.

## D. Branches — all six reachable

| Branch | Tip | Inside Control Tower |
|---|---|---|
| `master` | `9c13e089` | yes |
| `feat/modelo-de-zonas` | `588f0282` | yes |
| `docs/fase-a-canon` | `1e78cf35` | yes |
| `feat/fase-a-radar` | `fba1ae83` | yes |
| `feat/fase-a-skills` | `3eb9608a` | yes |
| `fix/fase-a-rdd-correction` | `39ff4659` | yes |

The four worktrees under `~/projects/agent-workflows-worktrees` check out branches from this same
list, so they add nothing. `review-fase-a` additionally holds ten staged, uncommitted files; four
were compared and the two that differ from the delivered branch — `tools/install.py` and
`tests/test_install.py` — are the **older** revision. Control Tower's copy adds the
`.retired-skills` archive (a retired runtime skill is moved aside with a UTC stamp via `os.replace`
rather than deleted, so a locally customised skill is never destroyed) plus two tests covering it.
The staged copy still calls `shutil.rmtree`. Superseded, not pending.

## E. Untracked content — one build artifact

| Path | What it is | Disposition |
|---|---|---|
| `tools/plan/plan` | 4 MB statically linked Go ELF binary, built 2026-09-01 | Build artifact of the tool since renamed `radar`; source lives at `agent-workflows/tools/radar/*.go` in Control Tower. Rebuilds with `go build`. |
| `.codegraph/` | Local CodeGraph index | Per-checkout, never shared |
| `.pi/`, `.atl/` | Local agent runtime state | Per-machine |
| `tests/__pycache__/`, `tools/__pycache__/` | Python bytecode | Regenerated |

---

## F. What still points at the old checkout

Two live references resolve to `~/projects/agent-workflows` and must be repaired **before**
deletion, plus one documentation nit.

### F1 — The plan-naming canon (`~/.claude/CLAUDE.md:430`)

Points at `/home/<usuario>/projects/agent-workflows/skills/_shared/plan-naming-convention.md`. Every
agent reads this file before planning. The two copies are **byte-identical**, so the repair is the
path alone.

### F2 — The radiografía engine lookup (`.githooks/pre-push:18`) — fails silently

The hook resolves the engine from three candidates in order: `$RADIOGRAFIA_HOME` (unset),
`$HOME/projects/agent-workflows/radiografia`, and `$(dirname "$root")/agent-workflows`.

**The fallback does not resolve for this repository.** `dirname` of `control-tower/Main` is
`control-tower`, which holds no `agent-workflows`; the engine is one level deeper, at
`control-tower/Main/agent-workflows/radiografia`. The hook therefore works today **only** because
the old checkout still exists.

On deletion the hook prints `radiografía: motor no encontrado, se omite. El push sigue.` and exits
`0`. Pushes keep working and the report silently stops regenerating — by design the hook never
blocks, which is correct behaviour and exactly what makes this failure quiet.

Repair: add `"$root/agent-workflows/radiografia"` as a candidate. The file is tracked and present in
`Main` and all four worktrees; none has local modifications to it.

### F3 — Usage examples (`agent-workflows/radiografia/README.md:30-32`)

Three example invocations still read `bun ~/projects/agent-workflows/radiografia/run.mjs`.
Documentation only; nothing executes them.

### Not to be repaired

`openspec/plans/decision-register.md:201` and `plan-0/STATUS.md:46` name the old path as **history** —
they record that the engine moved out of `scripts/`, then into the standalone repository, and that
since `dbb7626` its canonical source is the subtree while *"el checkout anterior queda como archivo
read-only."* Correct as written.

---

## G. Occupancy at validation time

No process held any of these paths. Last modification: `agent-workflows` 2026-09-03 16:14,
`implementer-1` 16:01, `review-fase-a` 11:22, `implementer-2` 2026-09-02 20:36, `implementer-3`
20:45. The implementation running on 2026-09-04 is in `control-tower/Worktrees/implementer-1`, a
different checkout, and does not touch these directories.
