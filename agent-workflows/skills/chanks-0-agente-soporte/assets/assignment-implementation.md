# Implementation handoff

Replace every placeholder and give one bounded handoff to the selected implementer.

```text
IMPLEMENTATION HANDOFF: <SESSION_ID>

Project/repository: <IDENTITY>
Verified base: <BASE_REF>@<SHA>
Current branch: <BRANCH>
Scope: <ALLOWED_PATHS_AND_BEHAVIORS>
Dependencies: <IDS_AND_UNBLOCK_EVIDENCE>
Authority and criteria: <SOURCES_AND_BINARY_CRITERIA>
Shared-path risk: <EXACT_PATHS_OR_NONE>
Required checks: <COMMANDS_AND_EXPECTED_EVIDENCE>
Forbidden scope: <PATHS_AND_EFFECTS>
Responsible parent: <IDENTITY_AND_RETURN_CHANNEL>
```

Verify repository, `HEAD`, branch, and worktree state before editing. Do not select another
Sesión or widen scope. A static planning forecast never grants a live lock; stop and report a
shared-path conflict to the responsible parent. Follow the route revalidated by
`chanks-3-session-kickoff` through `chanks-4-puente`, entering the native SDD pipeline only for `full-sdd`, keep each
Módulo independently revertible with its tests, and report Git contamination rather than hiding it.

Return: Sesión, repository and branch evidence, changed paths, checks with exact results,
rollback boundary, discoveries, risks, blockers, and the evidence for the responsible parent.
