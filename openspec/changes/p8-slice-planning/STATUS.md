# P8 Pi Adapter Status

Planning is complete and merged in PR #32 (`a0b6f9d0e078fde253e61b6b780e694deb789cc2`). The bounded P7 reconciliation record is approved and integrated at `a1dce220dae594006bda0722d0bdb640cf4b9be7`; it remains prerequisite evidence, not P7 runtime/apply completion. P8's independent S1.12 record is **APPROVED / COMPLETE**, with maintainer approval in Engram observation 8483 at `2026-08-11T19:17:33Z`, bound to base `3db3c121d48a07d7696afe6a88de044f30ea4695` and both frozen pre-approval document hashes. This evidence permits only S1.17 entry at T1.17.1.1 to validate that exact record; exploration, proposal, spec, design, and tasks MUST NOT be rerun.

The Installable V1 and Autonomous V2 planning PRs #60/#61 are merged at `master@1a10b384997365a67f9158b6e5fac58999beb7c4`, and their dedicated clean worktrees may proceed in parallel within their own planning gates. This does not authorize P8 apply or satisfy its independent gate.

## Apply Handoff

1. Select the chained-PR strategy before apply because the forecast is 620–780 changed lines.
2. Start with `tasks.md` T1.17.1.1 and consume and verify the approved S1.12 `reconciliation.md`; do not recreate or re-author it.
3. Keep RED and runtime implementation blocked until T1.17.1.1 validation passes. S1.12 approval alone does not authorize installation, delivery, production readiness, commit, push, or Tower.
4. Preserve both DAG paths and C→D without any Change A dependency for legacy P7/P8. Main retains `host_epoch` issuance and fencing authority; Change E owns host launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, and exclusive failover.
5. Reject missing/conflated identities or epochs and any worktree evidence not pinned to the registered container, authorized base SHA, allowed branch, assignment, and session.

Do not begin RED tests or runtime implementation before approved-record validation passes. Preserve the prior verified structural and regression evidence without claiming a new test run: `/tmp/pi-bash-85651b86eeea4749.log`, SHA-256 `0036a6179102a1deb9a4a11e5be0e4c7af747b24ccc5c6467dc69d2756b34a4e`, 598 pass, 0 fail, 3,495 `expect()` calls, 39 files, 56.50s; the source aggregate remained unchanged. Preserve the Slice 6/7 artifacts, Migration 005, P10, and Tower runtime state outside status references.
