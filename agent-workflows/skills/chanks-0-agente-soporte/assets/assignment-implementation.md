# Implementation handoff

Replace every placeholder and issue one bounded handoff to the selected implementer. This handoff authorizes no plan mutation, lock, dispatch, runtime assignment, or delivery by itself.

```text
IMPLEMENTATION HANDOFF: <SESSION_ID>

Project/repository: <IDENTITY>
Verified base: <BASE_REF>@<SHA>
Admission bundle: fresh HEAD + Session ID + SHA-256 digests of exact radar status --json/radar sesion <ID> bytes; state/blocker; Zone-ordered LISTO choices; seats, queue rows/length, and choice count (never assigned agents)
Session discriminator: <native encargo | legacy>
Resume basis: <same Session identity plus native ODD record, code, and evidence | first pending Módulo for legacy>
Current branch: <BRANCH>
Exact authorized files: <PATHS_OR_READ_ONLY>
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
explicit human `solicitud_sdd` and its own preflight. Return changed paths, checks, review outcome
where applicable, actual delivery evidence, rollback boundary, risks, blockers, and parent evidence.
