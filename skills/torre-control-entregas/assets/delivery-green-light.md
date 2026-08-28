# Delivery Green Light

Replace every placeholder. Send once, only for a frozen `READY` candidate.

```text
DELIVERY GREEN LIGHT: <UNIT_ID>

Assigned worktree: <ASSIGNED_WORKTREE>
Repository identity: <REPOSITORY_IDENTITY>
Branch: <BRANCH>
Discovered base: <REMOTE_BASE_REF>@<BASE_SHA>
Frozen staged scope: <PATHS_AND_FILE_MODES>
Commit message: <CONVENTIONAL_COMMIT_MESSAGE>
PR policy/source: <BRANCH_PR_REQUIREMENTS>

The `git-delivery` token has been TRANSFERRED to you and you are now its holder. Do not call `tower_acquire` for it. Do not manipulate worktrees.

1. Confirm with `tower_status` that `git-delivery` names you as holder. STOP if it names anyone else — you do not have the turn.
2. Verify the exact assigned worktree path, repository identity, branch, and process cwd. STOP unless cwd resolves to `<ASSIGNED_WORKTREE>` and all four values match.
3. Verify the forge has no open PR for `<BRANCH>`. If one exists, STOP before commit or push and request a distinct correction handoff; do not invent that workflow here.
4. Verify the staged candidate is byte-for-byte and mode-for-mode identical to the frozen candidate, and that the remote base has not moved. STOP on any mutation, unstaged source change, or base drift.
5. Set `tower_set_state(state: "DELIVERING")`. Commit exactly the staged candidate. Do not amend, normalize, generate, format, or otherwise mutate it.
6. Push the exact commit using the verified remote/branch convention.
7. Recheck that no PR exists. Load `branch-pr` for PR policy only; this handoff owns lifecycle order. Load `chained-pr` when oversized. Create one NEW PR, then set `tower_set_state(state: "PR_OPEN", pr_url: "<URL>")`.
8. Do not merge automatically. STOP and return control to the Tower. KEEP the token: you still hold `git-delivery` while the PR is open.
9. Once the Tower reports the merge verified on the remote, set `tower_set_state(state: "MERGED")` and release with `tower_release(lock: "git-delivery")`. Until then no other unit can deliver, which is the point.

STOP on an existing PR, rejected push, context or remote mismatch, base drift, policy failure, or any request to alter the frozen candidate.

Return: commit SHA, push evidence, PR URL, remote head SHA, checks/blockers, and `I did not auto-merge`.
```
