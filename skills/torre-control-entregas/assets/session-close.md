# Work-Unit Session Close

Replace every placeholder. This gathers evidence; it does not authorize global closure.

```text
WORK-UNIT CLOSE REPORT: <UNIT_ID>

Assigned worktree: <ASSIGNED_WORKTREE>
Expected terminal state: <READ_ONLY_COMPLETE|MERGED|BLOCKED|ABANDONED>
Relevant PR/merge evidence: <URLS_AND_SHAS_OR_NA>

Inspect only. Do not edit global status/index documents, Notion, project-wide memory, another worktree, or closure artifacts. Do not declare the global session closed and do not run `session-doc`. The Tower owns global reconciliation and closure.

This report is idempotent. On retry, re-verify current remote merged state and return the same evidence without mutating global closure checkpoints.

STOP if remote state contradicts the expected terminal state or if local evidence is incomplete. Preserve the worktree unchanged.

Return: final unit state; branch/worktree cleanliness; staged/unstaged/untracked summary; PR and verified remote merge evidence; DB/resource status; tests; concise discoveries; unresolved blockers; recommended next step; and `WORK_UNIT_CLOSED: global session remains Tower-owned`.
```
