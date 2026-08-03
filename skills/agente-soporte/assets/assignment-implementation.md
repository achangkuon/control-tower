# Implementation Assignment

Replace every placeholder. Send exactly one copy-paste block to the assigned agent.

```text
IMPLEMENTATION ASSIGNMENT: <UNIT_ID>

Project/repository: <PROJECT_AND_REPOSITORY>
Role: <ROLE>
Objective: <OBJECTIVE>
Technical source: <PLAN_SPEC_STATUS_AND_INSTRUCTIONS>
Verified base: <REMOTE_AND_BASE_REF>@<BASE_SHA>
Assigned worktree: <ASSIGNED_WORKTREE_OR_PENDING_USER_VERIFICATION>
Current branch expectation: <DISCOVERED_BRANCH_CONVENTION>
Dependencies/checkpoints: <DEPENDENCIES_AND_UNBLOCK_CONDITIONS>
Shared resources: <SHARED_RESOURCES>
DB mode: <none|read|write|schema>
DB authority/commands: <PROJECT_DISCOVERED_DB_POLICY_AND_COMMANDS>
Confidence: <high|medium|low> because <REASON>

The user created and assigned the worktree. Do not create, delete, move, switch, recycle, or repair worktrees. Verify that your current directory is exactly the assigned worktree, the repository identity is correct, and the existing state is safe. STOP on mismatch, unrelated changes, reservation conflict, or unverified base.

Load `work-unit-commits` before implementation.

DB mode contract:
- `none`: do not connect to, query, or mutate a DB. Run only non-DB checks.
- `read`: use only project-discovered read-only commands and stable-window policy. Do not run seeds, resets, migrations, destructive/stateful tests, or any write. Acquire a read semaphore only when project policy requires it.
- `write|schema`: load `coordinador_multi_agente`, identify the project resource, and acquire explicit semaphore ownership before the first mutation. No ownership means no mutation. Release and report ownership in finally-style handling after success, failure, or interruption.

Never infer a provider or DB command. STOP when DB mode, command authority, target, or semaphore ownership is unclear.

Allowed scope:
<ALLOWED_PATHS_BEHAVIORS_AND_RESOURCES>

Forbidden scope:
<FORBIDDEN_PATHS_BEHAVIORS_AND_RESOURCES>

Required implementation and verification:
<TASKS_TESTS_RUNTIME_CHECKS_AND_EVIDENCE>

Delivery boundary:
1. Implement only this unit and run the required verification.
2. Complete every source-mutating formatter, generator, normalization, and fix before staging.
3. Stage exactly the intended bytes, paths, and file modes. Inspect the staged snapshot and exclude unrelated content.
4. Leave the candidate UNCOMMITTED and set `tower_set_state(state: "READY", note: "candidato staged, sin commitear")`. Only the ten states the Tower accepts are valid; any finer phase goes in `note`.
5. Do not start review, commit, push, open/update a PR, merge, deploy DB, or perform global session closure. Wait for the Tower to transfer the `git-delivery` token.

STOP and report on scope drift, conflicting changes, failed required tests, dependency drift, DB semaphore uncertainty, or inability to produce one exact staged candidate. For `write|schema`, release the held semaphore before returning, even on failure.

Return: unit id, worktree, branch, verified base SHA, staged paths/modes, staged diff/stat, tests with exact results, DB mode/commands, semaphore acquisition/release evidence, rollback boundary, discoveries, blockers, and the exact statement `READY: candidate staged and uncommitted`.
```
