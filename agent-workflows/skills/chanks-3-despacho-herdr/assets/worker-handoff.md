# V2 worker handoff

Use only from `../SKILL.md` (Execution Steps, handoff step) for a Session dispatched through
Herdr. Replace every placeholder and issue one bounded handoff by fire-and-forget Intercom
`send` to the verified Pi session. This handoff authorizes no plan mutation, lock, dispatch,
runtime assignment, or delivery by itself. Gentle AI decides how the Session is implemented,
checked, reviewed and committed; nothing here overrides it.

```text
IMPLEMENTATION HANDOFF: <SESSION_ID>

Project/repository: <IDENTITY>
Verified base: <BASE_REF>@<SHA>
Session discriminator: <native encargo | legacy>
Resume basis: <same Session identity plus native ODD record, code, and evidence | first pending Módulo for legacy>
Current branch and worker: <FULL_BRANCH_REF> / <APPROVED_ALIAS, PI_SESSION_ID, ABSOLUTE_WORKTREE, RUNTIME, KIND>
Exact authorized files: <PATHS_OR_READ_ONLY>
Full unattended seal when present: <ENTIRE_VALID_APPROVED_CONTRACT, ID, DIGEST, SEALED_AT, EXPIRY, REPOSITORY/SESSION BINDINGS, BASE REF/SHA, PERMISSIONS, COMMIT CEILING, VERIFICATION; OR NONE>
Encargo constraints: <FOUR_PART_SUMMARY>
Dependencies and authority: <EVIDENCE>
Compatibility: <CIENTOS_RECURSO_EVIDENCE>
Required checks: <COMMANDS_NAMED_BY_THE_SESSION>
Forbidden scope: <PATHS_AND_EFFECTS>
Responsible parent: <IDENTITY_AND_RETURN_CHANNEL>
```

Run `../../chanks-3-session-kickoff/SKILL.md` first: the worker's own fresh admission, before
editing anything. Verify repository, HEAD, branch, worktree, and compatibility before editing.
Native ODD retains the same Session identity and reconciles its native technical record, code,
and evidence; legacy continues at first pending Módulo for legacy. Do not choose another
Session, widen scope, create a fake lock, or infer SDD. Native SDD requires explicit human
`solicitud_sdd` and its own preflight.

Carry the full unattended seal without loosening any bindings, expiry, base, permissions, or
commit ceiling; validate it with independent revalidation before work, including freshness
against the worker's own Radar admission and Git identity, tolerating only the dispatch
marker's own `LISTO` to `EN CURSO` change when `chanks/despachos/<ID>.json` matches the seal's
Session, branch, worktree, and worker exactly
(`../../chanks-4-unattended-implementation/references/sealing-and-routing.md`). An absent,
expired, mismatched, or changed seal, or any other drift, grants nothing.

Under a seal, a Gentle AI consent envelope, a correction the worker cannot make, or any decision
outside the seal stops that Session: report `BLOCKED` with one self-contained decision block.
The worker never answers a consent envelope for the human; other Sessions continue. Without a
seal (attended dispatch), a human decision is a worker-initiated `ask` answered only by the
exact inbound `reply`.

Only after all ODD tasks are checked, send the exact Session+worker `listo para revisión` signal
through Intercom to Main, with receipt identity for the coordinator's verified readback.

For every sealed terminal outcome — COMPLETED, BLOCKED, or FAILED — send a terminal wake report,
even when ODD tasks are unfinished. Identify Session and worker with checks, commits, changed
paths, review outcomes, stopped decisions, and budget used, plus risks and rollback boundary.
Neither signal nor report authorizes delivery; the responsible parent verifies integration and
closure separately.
