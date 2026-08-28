# Blocked Wait

Replace every placeholder.

```text
BLOCKED WAIT: <UNIT_ID>

Assigned worktree: <ASSIGNED_WORKTREE>
Current state: <STATE>
Blocker: <VERIFIED_BLOCKER>
Unblock condition: <EXACT_EVENT_EVIDENCE_OR_HUMAN_DECISION>
Owner of unblock: <OWNER>
Evidence to recheck: <PATH_SHA_URL_COMMAND_OR_RECEIPT_STATUS>

Preserve the worktree and candidate exactly as they are. Do not edit, normalize, stage/unstage, commit, amend, rebase, push, open/update a PR, merge, start/repeat review, touch DB, release reservations, or perform closure work.

STOP and wait until the Tower supplies evidence that the unblock condition is satisfied. Time passing alone is not evidence.

Return now: immutable-state summary, blocker evidence, and `BLOCKED: waiting for <UNBLOCK_CONDITION>`.
```
