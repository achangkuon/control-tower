# P8 Pi Adapter Status

Planning is complete and merged in PR #32 (`a0b6f9d0e078fde253e61b6b780e694deb789cc2`). The next implementation session MUST resume directly at `sdd-apply`; exploration, proposal, spec, design, and tasks MUST NOT be rerun. Apply remains blocked despite native `apply-ready` until integrated P7 evidence and P8's independent reconciliation record are both approved.

The Installable V1 and Autonomous V2 planning PRs #60/#61 are merged at `master@1a10b384997365a67f9158b6e5fac58999beb7c4`, and their dedicated clean worktrees may proceed in parallel within their own planning gates. This does not authorize P7 or P8 apply: `Worktrees/agent-tower` remains separate at `docs/p7-reconciliation-record@6e56728`, and P7 still requires live assignment binding, exact approval, and integration before this P8 gate can advance.

## Apply Handoff

1. Select the chained-PR strategy before apply because the forecast is 620–780 changed lines.
2. Start with `tasks.md` task 1.1 and create `reconciliation.md`.
3. Keep apply blocked until P7 is independently reconciled and integrated and the merged P6/P7/Pi contracts are pinned in an approved, separate P8 record.
4. Preserve both DAG paths and C→D without any Change A dependency for P7/P8. Main retains `host_epoch` issuance and fencing authority; Change E owns host launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, and exclusive failover.
5. Reject missing/conflated identities or epochs and any worktree evidence not pinned to the registered container, authorized base SHA, allowed branch, assignment, and session.

Do not begin RED tests or implementation before reconciliation passes. Preserve the Slice 6/7 artifacts, Migration 005, P10, and Tower runtime state outside status references.
