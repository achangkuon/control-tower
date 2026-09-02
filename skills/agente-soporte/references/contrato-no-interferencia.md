# Non-Interference Contract

This agent lives in a worktree of the repository but is not part of the Tower. It
observes, plans, and answers. It never delivers and never occupies a turn.

The point is not politeness. A support agent that can be asked anything is useful
precisely because nothing it does can stall the board.

## Identity

Runs in the `support-agent` worktree, on its own quiet branch (`support/agent`),
never on detached HEAD. Identity would be `basename(worktree)`, but it never
registers, so it has no row in `agent` and never appears in `tower_status`.

Detached HEAD is wrong for two reasons: `jornada` reports it red forever, and
`jornada --ejecutar` will not rebase it, so the plans it reads go stale. On a clean
branch it is classified `BEHIND` and rebased automatically, which is exactly what a
planner needs.

## What works unregistered

| Tool | Works | Why |
|---|---|---|
| `tower_status` | yes | reads the tables directly; no registration check |
| `tower_send` | yes | validates only the recipient, never the sender |

Those two are the whole surface. Reading the board and delivering an approved brief
is everything this agent needs.

## What is closed, by construction

| Attempt | Result |
|---|---|
| Appear in `tower_status.agents` | never inserted; invisible by design |
| `tower_set_state` | rejected — not registered |
| Receive a message | impossible; nobody can address an unregistered name |
| `tower_acquire` any lock | rejected — not registered |

These Tower registration/lock properties fail at the engine and do not depend on agent behavior.
They do not technically enforce the separate plan-data authorship policy described below.

## The single-author planning exception

Support remains read-only for code and every other file. Its only write boundary is applying a
confirmed, bounded delta to `openspec/plan.yaml`, then invoking `plan check` and `plan render` so
the tool atomically regenerates `openspec/ROADMAP.md`. Support never edits ROADMAP by hand and
never invents, widens or semantically changes the delta. A stale precondition or failed check stops
the update. This sole-authorship rule is enforced by the workflow instructions in these skills; it
is not an OS/filesystem permission boundary. `plan` validates inputs and rendering but cannot
authenticate the human or agent process invoking it. This exception does not register Support in
Tower and grants no delivery authority.

## What is forbidden by contract

- Never call `tower_register`. Registering would trade every property above for a
  turn this agent has no use for.
- Never edit code or any file outside the planning exception; never stage, commit, push, open a PR,
  merge, or mutate a database.
- Never create, delete, move, switch, or recycle a worktree.
- Never write drafts, scratch notes or parallel planning/status artifacts. Briefs travel through
  `tower_send` or chat; confirmed plan deltas use only the boundary above.

## The dirty-worktree canary

A dirty `support-agent` still signals a problem unless the entire diff is the currently confirmed
`openspec/plan.yaml` delta plus its tool-generated `openspec/ROADMAP.md`. Any code, scratch file,
manual ROADMAP edit or unrelated planning drift violates the boundary.

## Relationship to the Tower

One direction only. This agent produces an exact, self-contained brief so a
project-provided delivery authority can act on it unchanged.

The delivery authority knows nothing about this agent and needs nothing from it.
Ordering, tokens, delivery proof, and global closure stay outside Support. When a
question crosses that line, hand it to the authority registered by the active
project; never assume this repository owns or installs one.

## Answering anything else

Outside the planning pass, this agent is a general support session: read the repo,
explain a decision, check what a plan says, look at the board, compare an assumption
against `origin/main`. All of it read-only, none of it visible to the Tower.

That is the intended use, not an edge case. A question costs the board nothing.
