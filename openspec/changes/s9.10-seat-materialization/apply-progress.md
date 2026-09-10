# S9.10 Seat Materialization — Apply Progress

## Status

**BLOCKED before implementation.** No executable files or task checkboxes were changed.

The authoritative native status command was run in the assigned worktree:

```text
gentle-ai sdd-status s9.10-seat-materialization --cwd /home/emili/projects/control-tower/Worktrees/implementer-3 --json --instructions
```

It reports `artifactStore: openspec`, `applyState: blocked`, and `nextRecommended: resolve-blockers` because:

1. `proposal.md` is missing or partial.
2. `openspec/changes/s9.10-seat-materialization/specs/<domain>/spec.md` is missing or partial.
3. Native SDD runtime authority rejects the change name `s9.10-seat-materialization` as invalid and reports unreadable authority, so no bounded apply attempt can be acquired.

The change directory contains only `design.md` and `tasks.md`; there is no local proposal or spec. Engram searches for `sdd/s9.10-seat-materialization/spec` and prior `apply-progress` timed out, so no Engram spec/progress could be retrieved or merged during this run.

## Inputs consumed

- File design: `openspec/changes/s9.10-seat-materialization/design.md`
- Engram design: observation 10525, topic `sdd/s9.10-seat-materialization/design`
- File tasks: `openspec/changes/s9.10-seat-materialization/tasks.md`
- Engram tasks: observation 10527 revision 2, topic `sdd/s9.10-seat-materialization/tasks`
- Engram full-binding authority: observation 10522
- Engram preflight: observation 10523
- Engram init / Strict TDD authority: observation 6158
- Plan 9 S9.10 and Decision 108 were read from the OpenSpec files.

## Structured status consumed

```yaml
schemaName: gentle-ai.sdd-status
changeName: s9.10-seat-materialization
artifactStore: openspec
changeRoot: /home/emili/projects/control-tower/Worktrees/implementer-3/openspec/changes/s9.10-seat-materialization
artifacts:
  proposal: missing
  specs: missing
  design: done
  tasks: done
  applyProgress: missing-at-start
  verifyReport: missing
applyState: blocked
nextRecommended: resolve-blockers
actionContext:
  mode: repo-local
  workspaceRoot: /home/emili/projects/control-tower/Worktrees/implementer-3
  allowedEditRoots:
    - /home/emili/projects/control-tower/Worktrees/implementer-3
warnings:
  - Native runtime authority is unreadable because it rejects the dotted change name.
  - Engram search timed out; hybrid persistence could not yet be read or confirmed.
```

## TDD Cycle Evidence

| Module/task | Stage | Command | Result |
|---|---|---|---|
| Not started | N/A | N/A | Blocked before RED by authoritative SDD status. |

## Completed implementation tasks and checkbox updates

None. All 12 implementation-owned task rows remain unchecked. The two parent-owned lifecycle rows are deferred unchanged.

## Files changed

- `openspec/changes/s9.10-seat-materialization/apply-progress.md` — blocked-run evidence only.

No executable Area file changed. Tower remained OFF; no Herdr, runtime, DB, network, commit, push, or Git worktree mutation was performed.

## Tests run

None. Strict TDD prohibits production implementation before a RED test, and apply is blocked before creating that RED test.

## Remaining tasks

All implementation-owned task rows remain unchecked:

- [ ] Add the RED examples in `test/hosts/seat-cli.test.mjs`; accept only `CT_SEAT_REJECTED` before any Git call, no Herdr call, and unchanged `asignar` with no switch/checkout/branch/reset/ref-update argv. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: accepted design and strict-TDD baseline. Rollback boundary: remove only these new RED assertions. <!-- sdd-owner: implementation -->
- [ ] Update `hosts/seat-cli.mjs` and `workspace/slots.mjs`; accept closed binding shape, exact lowercase 40-hex `base_sha`, existing role/lane/branch rules, named permanent seat, and literal `confirmed: true` before the first Git call, with exact public error rendering. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.1.1 RED. Rollback boundary: revert parser/validator/API additions only; no Git mutation exists yet. <!-- sdd-owner: implementation -->
- [ ] Extend `test/hosts/seat-cli.test.mjs`; accept deterministic `CT_SEAT_REJECTED` with no Git argv for every invalid shape, plus one success-path mapping assertion that does not claim persistent assignment state. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.1.2 GREEN. Rollback boundary: remove only triangulation cases. <!-- sdd-owner: implementation -->
- [ ] Refactor only `hosts/seat-cli.mjs`, `workspace/slots.mjs`, and `test/hosts/seat-cli.test.mjs`; accept the focused suite unchanged and a reviewable parser without shared permissive parsing. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.1.3 TRIANGULATE. Rollback boundary: revert this refactor without removing the approved RED/GREEN behavior. <!-- sdd-owner: implementation -->
- [ ] Add RED matrix cases in `test/workspace/slots.test.mjs`; require exact codes for absent/detached/dirty/unmerged seats, unresolved/nonexact/master-contained base, existing target/replay, drift, switch failure, wrong branch/HEAD/ref, dirty seat, displaced-ref drift, and other-worktree drift; assert no destructive argv. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: M9.10.1 complete. Rollback boundary: remove only matrix tests. <!-- sdd-owner: implementation -->
- [ ] Update `workspace/slots.mjs`; accept one forward switch only after equal snapshots, success only after every required postcondition, `CT_SEAT_MUTATION_FAILED` or `CT_SEAT_POSTCONDITION_FAILED` only with proven restoration, and `CT_SEAT_ROLLBACK_FAILED` with preserved diagnostics when safety proof is absent. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.2.1 RED. Rollback boundary: revert only materialization/snapshot/recovery code; `assign()` remains read-only. <!-- sdd-owner: implementation -->
- [ ] Extend `test/workspace/slots.test.mjs`; accept snapshot-B drift before switch, an existing requested branch as `CT_SEAT_BRANCH_EXISTS` even with matching values, no reset/clean/stash/force/delete absent proof, and structured `before`/`observed`/`rollback` diagnostics after mutation. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.2.2 GREEN. Rollback boundary: remove only alternate safety cases. <!-- sdd-owner: implementation -->
- [ ] Refactor `workspace/slots.mjs` and `test/workspace/slots.test.mjs`; accept unchanged matrix results, stable error precedence, and no new Git command class outside the approved read/switch/bounded-rollback argv. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.2.3 TRIANGULATE. Rollback boundary: revert helper-only changes while retaining all matrix behavior. <!-- sdd-owner: implementation -->
- [ ] Add a disposable harness in `test/workspace/slots.test.mjs` using `test/helpers/git.mjs`; accept real-Git RED cases for clean success intent, dirty/unmerged seat non-mutation, existing target branch non-mutation, and a decorator that dirties between snapshots. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: M9.10.2 complete. Rollback boundary: delete only temporary test repositories and harness cases. <!-- sdd-owner: implementation -->
- [ ] Update only `workspace/slots.mjs` and `test/workspace/slots.test.mjs`; accept real success with requested branch/HEAD at the exact non-master commit, clean seat, preserved old ref, plus safe postcondition recovery that returns to the old branch and deletes only the exact operation-created unchanged target ref. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.3.1 RED. Rollback boundary: revert real-harness support and materialization adjustments together. <!-- sdd-owner: implementation -->
- [ ] Extend `test/workspace/slots.test.mjs`; accept `CT_SEAT_DRIFT` before switch for snapshot drift, and `CT_SEAT_ROLLBACK_FAILED` after a post-switch unexpected commit while preserving that commit/ref and the displaced ref with no reset/clean/stash. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.3.2 GREEN. Rollback boundary: remove only fault decorators and their temporary repositories. <!-- sdd-owner: implementation -->
- [ ] Refactor only `test/workspace/slots.test.mjs` and, if required, `workspace/slots.mjs`; accept both focused suites, then `bun test` on unchanged final bytes, the four-path authored-line count at or below 400, and a recorded real-Git success/recovery result. Focused command: `bun test test/workspace/slots.test.mjs test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.3.3 TRIANGULATE. Rollback boundary: revert the single executable commit limited to the four Area paths; if count exceeds 400, stop before candidate presentation. <!-- sdd-owner: implementation -->

## Workload / PR boundary

Direct-push/no PR was approved and the task forecast is 305–400 authored executable lines. No executable candidate exists; no budget count applies yet.

## Required remediation

Create/restore the authoritative proposal and specs artifacts for this change and repair or provide a valid native runtime authority/change identifier. Then rerun native status until it returns `applyState: ready` and acquire succeeds before starting the first RED cycle.
