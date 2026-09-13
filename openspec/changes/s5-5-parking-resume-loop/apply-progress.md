# Apply progress: S5.5 Parking and Resume Loop

## Status consumed

- Change: `s5-5-parking-resume-loop`; artifact store: `both`; route: approved `design-tasks` bridge.
- Proposal/spec: not applicable. Design and tasks were present and Apply-ready.
- Action context: `repo-local`; allowed root was the active worktree; warnings: none.
- Strict TDD: enabled; runner: `bun test`.
- Delivery: maintainer-approved `size:exception`; one direct, coherent implementation unit; do not commit or deliver from Apply.

## Completed implementation tasks

All implementation-owned tasks are visibly checked in `tasks.md`:
`T5.5.1.1`–`T5.5.1.4`, `T5.5.2.1`–`T5.5.2.3`, `T5.5.3.1`–`T5.5.3.3`, and `T5.5.4.1`–`T5.5.4.4`.

- Added constructor-bound parking/request coordination. Parking runs before unchanged request emission; controller outcomes are frozen and dependency errors pass through unchanged.
- Added read-only Support boundary verification using only six boundary fields and opaque continuation capabilities. Getter traps cover forbidden `primary`, `alternatives`, and `conflicts` access.
- Added exact resume sequencing: authoritative binding read, Main-validated terminal capability, fresh exact-coordinate reconciliation, then one injected resume effect.
- No contracts, schemas, stores, authority, continuation, routing, or delivery code was changed.

## TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN / REFACTOR |
|---|---|---|---|---|
| T5.5.1.1 | `test/escalation/parked.test.mjs` | Unit | Missing-module RED, exit 1 | Complete immutable parking outcome passes |
| T5.5.1.2 | `test/escalation/parked.test.mjs` | Unit | Missing-module RED, exit 1 | Incomplete dependency rejection and zero request pass |
| T5.5.1.3 | `test/escalation/parked.test.mjs` | Unit | Prior REDs | GREEN: focused tests pass |
| T5.5.1.4 | `test/escalation/parked.test.mjs` | Unit | N/A (refactor task) | Port-error normalization and `bun test test/escalation` pass |
| T5.5.2.1 | `test/escalation/parked.test.mjs` | Unit | Missing-module RED, exit 1 | Independent boundary drifts pass fail-closed |
| T5.5.2.2 | `test/escalation/parked.test.mjs` | Unit | Prior RED | GREEN: getter traps remain untouched |
| T5.5.2.3 | `test/escalation/parked.test.mjs` | Unit | N/A (refactor task) | Frozen read-only witness unchanged; focused suite passes |
| T5.5.3.1 | `test/escalation/independent.test.mjs` | Unit | Missing-module RED, exit 1 | Default/alternative one-capability paths pass |
| T5.5.3.2 | `test/escalation/independent.test.mjs` | Unit | Missing-module RED, exit 1 | Frozen `NO_SCOPE`, zero continuation access passes |
| T5.5.3.3 | `test/escalation/independent.test.mjs` | Unit | Prior REDs | GREEN: focused test passes |
| T5.5.4.1 | `test/escalation/resume.test.mjs` | Unit | Missing-module RED, exit 1 | Exact binding, capability, and resume call pass |
| T5.5.4.2 | `test/escalation/resume.test.mjs` | Unit | Missing-module RED, exit 1 | Stale/divergent reconciliation blocks with zero resume |
| T5.5.4.3 | `test/escalation/resume.test.mjs` | Unit | Missing-module RED, exit 1 | Invalid capabilities preserve witness and skip effects |
| T5.5.4.4 | `test/escalation/resume.test.mjs` | Unit | Prior REDs | GREEN: focused test passes |

Triangulation is represented by independently varied incomplete records, all boundary drifts, both selection paths, `NO_SCOPE`, and stale/divergent/invalid resume cases. No production refactor beyond the minimal controller implementation was required.

## Verification evidence

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | Passed; installed declared dependencies needed by the worktree (`yaml` had been absent). |
| `bun test test/escalation/parked.test.mjs` | Passed: 5 tests. |
| `bun test test/escalation/independent.test.mjs` | Passed: 3 tests. |
| `bun test test/escalation/resume.test.mjs` | Passed: 3 tests. |
| `bun test test/escalation` | Passed: 31 tests, 0 failures. |
| `bun test` | Failed outside this change: 1234 pass, 2 fail in `test/pre-push-plan-gate.test.mjs` (`an invalid plan stops the push...`; `configuring core.hooksPath...`). |
| `rg 'Depende de|Área|Recurso' escalation/` | Exit 1 / zero matches (required clean source witness). |
| `git diff --check` | Passed. |

Runtime harness: N/A. Both controllers are constructor-bound unit seams; their injected-port calls are the complete runtime boundary exercised above.

## Changed files and size

| Path | Additions | Deletions |
|---|---:|---:|
| `escalation/parked.mjs` | 37 | 0 |
| `escalation/resume.mjs` | 29 | 0 |
| `test/escalation/parked.test.mjs` | 81 | 0 |
| `test/escalation/independent.test.mjs` | 40 | 0 |
| `test/escalation/resume.test.mjs` | 46 | 0 |
| **Implementation-only total** | **233** | **0** |

The total is computed once over the five implementation/test files; SDD Markdown is excluded. It is below the 350–390 engineering forecast and remains covered by the accepted `size:exception`.

## Deviations, remaining work, and rollback

- No design deviation and no unauthorized path changes.
- No implementation-owned unchecked tasks remain.
- Deferred parent lifecycle ledger remains unchanged (all **pending**):
  1. Record the actual de-duplicated production/test `git diff --numstat` total under the accepted `size:exception`; evidence reference: maintainer decision in `tasks.md`.
  2. Preserve the 350–390 engineering target without treating 400 as an `ask-on-risk` stop; evidence reference: maintainer decision in `tasks.md`.
  3. Record the five focused commands, complete-suite result, zero-result source witness, and runtime-harness N/A against delivered bytes; evidence reference: none yet.
  4. Perform bounded post-apply review of the five allowed paths and the direct-commit rollback boundary before repository-policy delivery; evidence reference: none yet.
- Rollback boundary: remove only the two new controllers and their three focused tests; retain all durable parking, authorization/response, Support, checkpoint, and completed-work records byte-for-byte.
- Risk: the complete suite has two unrelated pre-push-plan-gate failures. Do not treat the full suite as green until the parent diagnoses them; no delivery action was taken.

## Provider-bound single remediation

**Continuation status consumed:** exact change `s5-5-parking-resume-loop`; artifact store `both`; proposal/spec not applicable; design/tasks/apply-progress already done; all 14 implementation tasks checked; native Apply state `all_done`, ordinary next step Verify. This was the separately authorized provider-bound correction after Verify defects, under the supplied repo-local allowed edit roots. No remediation token was persisted.

### Superseded claims and correction

- Superseded the numeric-expiry claim: proposal expiry is now a canonical ISO timestamp parsed by `Date.parse`, required to be finite, and compared as epoch milliseconds to injected `now()`.
- Superseded the per-call terminal-capability API claim: `terminalResponses.assertFor` is a constructor-bound trusted Main port; public `resume` accepts exactly `{ parked_decision_id }` and rejects raw response/capability/authority fields before any port call.
- Superseded disconnected witness claims: parking, proposal success/rejections, and invalid resume paths use temporary byte-backed files and readbacks. Parking passes an existing canonical `parked-decision-v1` unchanged through `createParkingComposition`; resume uses the canonical `parkedCheckpointBinding` fixture and validator.

### TDD Cycle Evidence

| Remediation behavior | Safety net | RED | GREEN / triangulation | Refactor |
| --- | --- | --- | --- | --- |
| ISO proposal expiry and `CLAIM_MISMATCH` | 11 focused tests passed | 8 failed / 4 passed: prior numeric expiry rejected future ISO values and masked later states | 12 focused tests pass: future, elapsed, malformed, and claim-mismatch cases cover distinct branches | Minimal `Date.parse` local variable; focused tests remain green |
| Constructor-bound terminal authority and closed resume input | 11 focused tests passed | Prior implementation rejected no per-call capability removal and invoked binding reads before extra-field rejection | 12 focused tests pass: trusted receipt, raw response/capability/authority rejection, exact ordering, and project divergence | Kept stable dependency codes and frozen reconciliation-required outcome |
| Canonical byte-backed parking and resume evidence | 11 focused tests passed | Canonical fixture tests exposed the incorrect authority/expiry behavior | 12 focused tests pass with canonical helpers, existing parking boundary, and byte readbacks for all rejection paths | Removed disconnected in-memory witness assertions |

### Correction verification

| Command | Result |
| --- | --- |
| `bun test test/escalation/parked.test.mjs test/escalation/independent.test.mjs test/escalation/resume.test.mjs` (safety net) | Passed: 11 tests. |
| Same focused command (RED) | Failed: 8 tests / 4 passed; failures were the expected ISO expiry and constructor-authority defects. |
| Same focused command (GREEN) | Passed: 12 tests, 0 failures. |
| `bun test test/escalation` | Passed: 32 tests, 0 failures. |
| `git diff --check` | Passed. |
| `rg 'Depende de|Área|Recurso' escalation/` | Zero matches (exit 1 normalized as the required clean result). |

The complete `bun test` suite was not run during this correction and is **not** claimed green. The two `test/pre-push-plan-gate.test.mjs` failures recorded before remediation remain independently classified as pre-existing/environmental.

### Changed paths and remaining risk

| Path | Additions | Deletions |
| --- | ---:|---:|
| `escalation/parked.mjs` | 38 | 0 |
| `escalation/resume.mjs` | 30 | 0 |
| `test/escalation/parked.test.mjs` | 118 | 0 |
| `test/escalation/independent.test.mjs` | 59 | 0 |
| `test/escalation/resume.test.mjs` | 87 | 0 |
| **Implementation/test total** | **332** | **0** |

Counts use the current untracked-file baseline (`/dev/null`) and exclude SDD Markdown. No contract, schema, store, authority implementation, routing, continuation, plan, delivery, staging, commit, or push changed. Remaining risk is limited to the separately classified complete-suite pre-push-plan-gate failures and parent-owned Verify/delivery lifecycle work.
