# Persistent-worker retire mode

Run this mode only after the responsible parent records a dispatched Sesión's delivery in
`openspec/plan.yaml`. The human's approval of the dispatch authorizes this retirement in advance,
and only when all six applicable checks pass for that Sesión. Read the worker declaration from the
repository `AGENTS.md`; it remains the source for the worker's persistent worktree and tab.

Dispatch and retirement both cite and follow `references/retiro.md`'s `## Shared lock protocol`
exactly. All checks and retirement decisions happen only under the lock it proves owned.

## Shared lock protocol

1. Resolve the canonical absolute common directory with `git rev-parse --path-format=absolute --git-common-dir`. The one stable lock directory is exactly `$common_dir/gentle-ai.chanks-3-despacho-herdr.lock`; no per-Sesión, per-worker, relative, or alternate pathname is valid. It is a persistent synchronization directory, never removed during normal release or recovery.
2. Before any lock or pool mutation, prove Linux/local coherent advisory `flock` semantics for this canonical common directory: it must be Linux and local, and independently opened descriptors for the same canonical directory inode must demonstrate exclusive nonblocking contention. Unsupported, remote, unavailable, or incoherent semantics fail closed. This generic Herdr-local flow adds neither multi-host assumptions nor a coordinator.
3. Create `$lock_dir` only once by atomic `mkdir -- "$lock_dir"` when it is absent, then reopen and validate it; never treat `mkdir` as ownership. Open the canonical `$lock_dir` with directory/no-follow semantics, require it remains a directory, and bind every operation to its canonical pathname and `(st_dev, st_ino)`. Any path, type, ownership, or inode change fails closed without worker mutation.
4. Acquire and retain `flock(LOCK_EX|LOCK_NB)` on that validated directory descriptor for the whole protocol. A contender that cannot acquire it mutates nothing. A second reclaimer that cannot acquire the flock mutates nothing. After acquiring it, reread the pathname, `(st_dev, st_ino)`, owner record, and every authorization-bound fact before any mutation; a second reclaimer must not rely on evidence read before the flock.
5. For this exact parent and run, generate one fresh cryptographically unguessable owner token. The complete ownership record contains its state (`HELD` or `RELEASED`), token, session/run ID, parent identity and run ID, host, PID, and process-start identity. Access `$lock_dir/owner-token` with no-follow semantics and validate a regular file, owner, mode `0600`, and one link before reading. For a readable record, retain its exact bytes and require exact readback. For an unreadable record, obtain only no-follow metadata without reading its content; it is never treated as a normal acquisition. Write a complete record atomically, fsync the file and lock directory, then reread it through the validated canonical path and revalidate `(st_dev, st_ino)` before every state mutation.
6. Normal acquisition while holding the flock is allowed only from a valid complete `RELEASED` record, or from an explicitly authorized initial empty state. In either case, atomically replace or create the complete `HELD` record for this run, fsync/read back it exactly, and revalidate pathname and inode before dispatch or retirement. An empty, partial, unreadable, malformed, altered, foreign, or otherwise ambiguous record is not normal acquisition.
7. Release while still holding the flock only after every success or proven rollback condition: atomically replace the owned complete `HELD` record with a complete `RELEASED` record, fsync/read back it exactly, then unlock and close the descriptor. Never unlink `owner-token` or remove `$lock_dir`.
8. Recover a valid `HELD` record only while holding the flock and only with fresh maintainer authorization bound to `$lock_dir`, its `(st_dev, st_ino)`, and the exact raw `HELD` record; fresh proof that the exact owner process is absent or replaced from its host, PID, and process-start identity; and fresh proof that every declared worker is quiescent: no active agent, dirty tree, pending delivery, or identity divergence. Revalidate all of that evidence after flock acquisition, then replace that record with a new complete `HELD` record and perform the normal fsync/readback and pathname/inode validation.
9. Recover absence only while holding the flock, with fresh maintainer authorization bound to the canonical `$lock_dir` path, its `(st_dev, st_ino)`, and the `EMPTY` marker for absence, plus fresh worker quiescence. Recover a readable malformed or interrupted record only while holding the flock, with fresh maintainer authorization bound to the canonical `$lock_dir` path, its `(st_dev, st_ino)`, and the SHA-256 of the exact raw bytes for a readable malformed or interrupted record, plus fresh worker quiescence. Recover an unreadable owner-token only while holding the flock, with fresh maintainer authorization bound to the canonical `$lock_dir` path, its `(st_dev, st_ino)`, the explicit `UNREADABLE` sentinel, and exact no-follow file metadata available without content: file dev/inode, owner, mode, link count, size, timestamps; also require fresh worker quiescence. Under the flock, re-read and re-stat all bound metadata under the flock immediately before atomic replacement. Any drift fails closed. A live valid `HELD` record still requires the owner-absence or replacement proof in step 8. Live, ambiguous, mismatched, or replaced-inode owner is never reclaimed. No rename quarantine is used. Old quarantine evidence is foreign evidence: preserve it unless separately authorized by its exact path and `(st_dev, st_ino)`; never delete or reclaim it automatically, including by TTL.

## Six checks

1. `radar status` computes the Sesión `✅ COMPLETO` or `📚 ARCHIVADO`.
2. Its `entrega.commit` is an ancestor of master, proven with `git merge-base --is-ancestor`.
3. `git status --porcelain` inside its declared persistent worker worktree prints nothing.
4. `git cherry master work/<id>` prints no line that starts with `+`. A line that starts with `-` is a commit master already holds through a cherry-pick or rebase, and it does not block.
5. The agent for this Sesión in the declared worker's tab is `idle` or `done`, or that agent no longer exists; no other agent may occupy the worker.
6. Git and fresh live Herdr readback prove the declared worker's exact persistent worktree and tab identity, that it is non-Main, and that it belongs to this completed Sesión.

If any check fails, change no worker state: preserve its tab, worktree, dependencies, and branch;
release only an owned lock and report which check failed. A failed retirement never infers reuse,
never force-deletes branches, and never touches another worker.

## Order

1. Under the owned lock, run all six checks before the first worker mutation; lock acquisition itself never authorizes a worker mutation.
2. Only after all six pass, close only the completed agent; preserve its declared persistent tab, worktree, and dependencies.
3. Only after that close succeeds, leave the worker detached at integrated master. Never remove a declared pool worker and never delete its reusable worker branch.
4. Perform fresh Git, Radar, and Herdr free readback: the declared worker must be clean, non-Main, identity-matched, have no active agent or pending delivery, and be detached at the integrated master.
5. Release only through the `## Shared lock protocol` after that fresh free readback. If the close, detach, or readback is ambiguous, retain the lock and ask the human; do not infer reuse or mutate another worker.

Report the six check results, agent-close result, detached-master readback, lock result, and every
step's outcome to the responsible parent.
