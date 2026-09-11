# Read-only handoff

Replace every placeholder and send one bounded request.

```text
READ-ONLY HANDOFF: <ID>

Question/objective: <OBJECTIVE>
Repository/view: <CONTEXT>
Scope: <ALLOWED_INSPECTION>
Dependencies: <SOURCES_AND_PRECONDITIONS>
Forbidden scope: <FORBIDDEN_PATHS_AND_EFFECTS>
Required evidence: <COMMANDS_FILES_AND_CITATIONS>
Responsible parent: <IDENTITY_AND_RETURN_CHANNEL>
```

Verify repository and context before inspection. Read only: do not edit, generate, format,
stage, commit, push, mutate remote services, claim shared resources, or update plan evidence.
Stop on mismatch, missing authority, Git contamination that affects the conclusion, or a request
that requires mutation.

Return: concise answer, exact evidence, confidence, contradictions, and
`READ_ONLY_COMPLETE: no delivery state created`.
