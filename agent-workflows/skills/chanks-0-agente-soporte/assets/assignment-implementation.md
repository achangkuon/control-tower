# Implementation handoff

Replace every placeholder and issue one bounded handoff to the selected implementer. This handoff authorizes no plan mutation, lock, dispatch, runtime assignment, or delivery by itself.

```text
IMPLEMENTATION HANDOFF: <SESSION_ID>

Project/repository: <IDENTITY>
Verified base: <BASE_REF>@<SHA>
Admission bundle: fresh HEAD + Session ID + SHA-256 digests of exact radar status --json/radar sesion <ID> bytes; state/blocker; Zone-ordered LISTO choices; seats, queue rows/length, and choice count (never assigned agents)
Session discriminator: <native encargo | legacy>
Resume basis: <same Session identity plus native ODD record, code, and evidence | first pending Módulo for legacy>
Current branch and worker: <FULL_BRANCH_REF> / <APPROVED_ALIAS, PI_SESSION_ID, ABSOLUTE_WORKTREE, RUNTIME, KIND>
Exact authorized files: <PATHS_OR_READ_ONLY>
Full unattended seal when present: <ENTIRE_VALID_APPROVED_CONTRACT, ID, DIGEST, SEALED_AT, EXPIRY, REPOSITORY/SESSION BINDINGS, BASE REF/SHA, PERMISSIONS, COMMIT CEILING, RDD CONSENT POLICY, RETRIES, VERIFICATION; OR NONE>
Encargo constraints: <FOUR_PART_SUMMARY>
Dependencies and authority: <EVIDENCE>
Compatibility: <CIENTOS_RECURSO_EVIDENCE>
Required checks/TDD config: <COMMANDS_AND_EFFECTIVE_CONFIG>
Forbidden scope: <PATHS_AND_EFFECTS>
Responsible parent: <IDENTITY_AND_RETURN_CHANNEL>
```

Accept only the fresh binding before skill selection. Verify repository, HEAD, branch, worktree,
and compatibility before editing. Native ODD retains the same Session identity and reconciles its
native technical record, code, and evidence; legacy continues at first pending Módulo for legacy.
Do not choose another Session, widen scope, create a fake lock, or infer SDD. Native SDD requires
explicit human `solicitud_sdd` and its own preflight. Carry the full unattended seal without
loosening any bindings, expiry, base, permissions, commit ceiling, or RDD consent policy; validate
it with independent revalidation before work, including freshness against the worker's own Radar
admission and Git identity. An absent, expired, mismatched, or changed seal grants nothing.

Only after all ODD tasks are checked, send the exact Session+worker `listo para revisión` signal
through Intercom to Main, with receipt identity for the coordinator's verified readback.

For every sealed terminal outcome — COMPLETED, BLOCKED, or FAILED — send a terminal wake report,
even when ODD tasks are unfinished. Identify Session and worker with checks, commits, changed paths,
review outcomes, stopped decisions, and budget used, plus risks and rollback boundary. Neither signal
nor report authorizes delivery; the responsible parent verifies integration and closure separately.
