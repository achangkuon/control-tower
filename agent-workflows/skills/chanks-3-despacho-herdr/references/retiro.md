# Retire mode

Run this mode only after the responsible parent records a dispatched Sesión's delivery in
`openspec/plan.yaml`. The human's approval of the dispatch authorizes this retirement in advance,
and only when all six checks pass for that Sesión.

## Six checks

1. `radar status` computes the Sesión `✅ COMPLETO` or `📚 ARCHIVADO`.
2. Its `entrega.commit` is an ancestor of master, proven with `git merge-base --is-ancestor`.
3. `git status --porcelain` inside its worktree prints nothing.
4. `git cherry master work/<id>` prints no line that starts with `+`. A line that starts with `-` is a commit master already holds through a cherry-pick or rebase, and it does not block.
5. The agent in the Sesión's tab is `idle` or `done`, or that tab no longer exists.
6. The path is `Worktrees/<id>` with branch `work/<id>` for this Sesión, and never the main checkout.

If any check fails, change nothing: keep the tab, the worktree, and the branch, and report which
check failed.

## Order

1. Close the Sesión's Herdr tab.
2. Remove its worktree with `git worktree remove Worktrees/<id>`, never forced.
3. Delete its branch with the safe `git branch -d work/<id>`. When master holds the work only through
   a cherry-pick or rebase, Git refuses; keep the branch, report it, and never force the deletion.
4. Read back `git worktree list`; the path must no longer appear.

Report the six check results and every step's outcome to the responsible parent.
