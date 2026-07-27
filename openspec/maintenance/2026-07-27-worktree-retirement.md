# Worktrees retired safely and recycled from canonical Main

The stale linked worktrees were retired only after their tracked state was verified and the sole uncommitted documentation change was backed up. The operational worktree homes were then recreated cleanly from canonical `master`, without reusing stale task branches.

## Outcome

| Check | Result |
|---|---|
| Canonical checkout | `/home/emili/projects/control-tower/Main` |
| Retirement base | `55efaf45720ead271d84434ccdd9194c19e0a5e0` |
| Safety backup | Preserved outside the repository |
| Recycled worktrees | `agent-tower`, `multi-agentic-dashboard`, `tower-implementation` |
| Worktree mode | Detached from canonical `master`; task branches are created per assignment |
| Registered worktrees | `4` — Main plus the three recycled worktrees |
| Branch deletion | None |

## Safety boundary

Before removing a worktree, every registered checkout was inspected for staged and unstaged tracked changes:

- `Main`: no tracked changes;
- `multi-agentic-dashboard`: no tracked changes;
- `tower-implementation`: no tracked changes;
- `agent-tower`: only `docs/architecture/sdd-tower-implementation.md` was modified.

The `agent-tower` binary patch was compared byte-for-byte with the safety backup before retirement.

| Backup evidence | Value |
|---|---|
| Directory | `/home/emili/projects/control-tower/Backups/worktree-recycle-2026-07-27-123457` |
| Patch | `agent-tower-uncommitted.patch` |
| Patch SHA-256 | `ff08b5cb6073421e2e732318cd615d830bd0a9a6db5824a837e6168172be9b88` |
| Full document copy | `sdd-tower-implementation.md` |

## Retirement sequence

1. Removed `Worktrees/multi-agentic-dashboard` with `git worktree remove --force`.
2. Removed `Worktrees/tower-implementation` with `git worktree remove --force`.
3. Removed `Worktrees/agent-tower` last with `git worktree remove --force`.
4. Ran `git worktree prune`; stale `.git/worktrees` administrative records were removed.
5. Removed Main's untracked `.gitignore` only after exact comparison with:

   ```text
   # Local Pi runtime state
   .atl/
   ```

6. Fast-forwarded `master` from `78b4523` to `55efaf4` using `git pull --ff-only origin master`.
7. Verified the leftover unregistered scaffold contained no files, symlinks, or hidden entries, then removed only empty directories with `rmdir`.

No local or remote branch was deleted. The retired worktrees' local branch refs remain available:

- `docs/p8-apply-handoff` at `bcf0588d96bcc12e128e3edd02a62e83bd12a9d8`;
- `p6-closure-claim-present-evidence` at `d7f6c361e6ad4dac4463562b34a52f3aaa5bad23`;
- `docs/sdd-tower-implementation` at `7e45a69cc66fd82852ca582c84ec1aba73149977`.

## Recycling correction

The requested operational endpoint was not a Main-only topology. The three worktree homes were therefore recreated from canonical `master`:

```text
/home/emili/projects/control-tower/Worktrees/agent-tower
/home/emili/projects/control-tower/Worktrees/multi-agentic-dashboard
/home/emili/projects/control-tower/Worktrees/tower-implementation
```

Each was created with detached `HEAD` from `master`. This avoids silently reviving stale task branches or rewriting preserved branch refs. Before an agent writes, its assignment must create a fresh task-scoped branch from the current canonical base.

After the documentation delivery merges, all three detached worktrees are advanced to the resulting `origin/master` commit and verified clean.

## Verification contract

The final operational topology must satisfy:

```text
registered worktree count = 4
Main branch = master
Main HEAD = origin/master
agent-tower HEAD = origin/master (detached)
multi-agentic-dashboard HEAD = origin/master (detached)
tower-implementation HEAD = origin/master (detached)
all four worktrees clean
```

## Roadmap impact

This maintenance changed local repository hygiene only. It did not change any product track status, blocker, remaining implementation scope, owner, or next action. The canonical next action remains the one in [`openspec/plans/master-index.md`](../plans/master-index.md#10-punto-de-retoma): refresh native status for `sdd-tower-contract-schemas`, then continue Change A from `spec` without repeating its proposal.
