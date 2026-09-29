# Issue patch handoff — manual, human-authorized only

Use only from `../SKILL.md`'s Issue-Patch Mode after an actual Pi session ID is
read back from the launched Herdr agent and matched to a fresh Intercom live roster.
This is a message template, not approval, a dispatch receipt, or a persisted assignment.
Do not fill unknown values by inference or send an incomplete template.
Issue #150 Unit 1 repairs attended reactivation without a seal; this issue-patch
handoff is not a Session reactivation approval. The patch creates no new marker.
Use the separate `../SKILL.md` attended reactivation route for an actual `EN CURSO`
Session after a fresh human decision; this template cannot reactivate S164 or S165.
The first-dispatch template below is never used to continue an existing patch branch:
that uses the continuation handoff section at the end of this file.

- Issue: `<achangkuon/control-tower issue URL and number>`
- Human approval: `<exact human decision and its issue/base/outcome/scope binding>`
- Restoring outcome and reproduced symptom: `<observed evidence>`
- Approved integrated base: `<full Git OID>`
- Worker / tab / canonical worktree: `issue-resolver` / `issue-resolver` / `<path>`
- Fresh issue branch: `refs/heads/work/issue-<number>`
- Actual launched Pi session ID: `<from Herdr JSON, verified by Intercom roster>`
- Exact authorized repository files: `<complete list; no glob or directory>`
- Exact Cimientos: `<complete list, or explicitly none>`
- Exact Recursos: `<complete list, or explicitly none>`
- Active Sessions compared: `<IDs and exact current file/Cimiento/Recurso readbacks>`
- Current compatibility and worker readback: `<same-base evidence and time>`

Before the first write, independently recheck the exact approval, base, issue,
branch, worker identity and current active-Session sets against fresh Git, Radar,
Herdr and Intercom readbacks. Stop on unknown, overlap, changed base, new active
Session, or scope expansion; do not narrow the list to make it pass. Preserve work
and ask the human to approve changed scope/base and rerun compatibility. A patch
restores an approved flow; new product outcome, API, permissions, migration or data
changes require a product Session. Do not run Session kickoff, claim LISTO, create a
`radar.despacho/v1` marker, or write `openspec/plan.yaml`.

Run configured focused checks and applicable native review. Commit only to the
issue branch after ordinary authorization; do not push or integrate from this seat.
Send progress and `COMPLETED`, `BLOCKED`, or `FAILED` with the issue, actual Pi
session ID, worker, branch, full immutable commit OID (if any), changed-file list,
check evidence and candidate state. A delivery receipt is not completion. If
Intercom disconnects or a worker-initiated decision `ask` times out, preserve
candidate and worktree, report uncertainty without retry. Main verifies the exact
commit/worker/branch before serial integration and patch-specific retirement.

---

# ISSUE-PATCH CONTINUATION HANDOFF

Use only from `../SKILL.md`'s Attended Continuation of an Existing Issue Patch, after
fresh exact human approval and after the actual new Pi session ID was read from Herdr
JSON and matched to a fresh Intercom live roster. Send it once by fire-and-forget
Intercom. Never resend, retry, infer completion, or auto-resume. This is attended,
with no seal, is not a first dispatch, Session reactivation, dispatch receipt or
approval, and creates no `radar.despacho/v1` marker, fake `LISTO`, queue, ledger or
plan entry. Do not send an incomplete template.

- Issue: `<control-tower issue URL and number, still open>`
- Human approval: `<exact attended continuation decision and its binding>`
- Restoring outcome and reproduced symptom: `<observed evidence>`
- Approved unit / scope being continued: `<unit and scope>`
- Approved integrated base: `<full Git OID; new base named if master advanced>`
- Worker / tab / canonical worktree: `issue-resolver` / `issue-resolver` / `<path>`
- Existing issue branch: `refs/heads/work/issue-<number>`
- Current branch tip / candidate: `<full OID; zero own commits, committed work, or recorded dirty state>`
- Previous Pi session ID (gone; never rescued or reused): `<id>`
- Actual new Pi session ID: `<from Herdr JSON, verified by Intercom roster>`
- Exact authorized repository files: `<complete list; no glob or directory>`
- Exact Cimientos: `<complete list, or explicitly none>`
- Exact Recursos: `<complete list, or explicitly none>`
- Active Sessions compared: `<IDs and exact current readbacks>`
- Status: `attended, no seal`

Before the first write, revalidate exactly as the first-dispatch template requires:
approval, base, issue, branch tip, candidate, worker identity and current active-Session
sets against fresh Git, Radar, Herdr and Intercom readbacks. Never create, delete,
rename, recreate, reset, or amend the branch; never clean or stash. Stop on unknown,
overlap, changed base, new active Session, or scope expansion, and ask the human.
Progress and terminal reporting are unchanged from the first-dispatch template, using
the actual new Pi session ID.
