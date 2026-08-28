# Apply progress: S4.11 host-neutral runtime operations

## Structured status consumed

- Change: `s4-11-host-neutral-operations`
- Artifact store: hybrid
- Apply state: in progress; direct commit boundary 1 implementation complete
- Action context: authoritative workspace `/home/emili/projects/control-tower/Worktrees/implementer-1`; edits restricted to boundary product paths plus SDD artifacts
- Resolved authority: Decisions 84, 92, and 93; no new always-escalate decision encountered
- Delivery: sequential direct commits, partial chain non-deliverable
- Parent-held attempt token: `sha256:78d61b4ae09339d41cc4f2b07bd80f025e183b028dd6e0b77086ec2edcfb1bdc` (not acquired, settled, or reset)

## Completed implementation tasks

- [x] T4.11.1.1 — strict-TDD neutral challenge, exact-context, and terminal-consumption core.
- Persisted task checkbox updated in OpenSpec and Engram.
- Parent review hold remains unchecked and is deferred to the parent lifecycle.

## TDD Cycle Evidence

| Stage | Command / evidence | Exact result |
|---|---|---|
| Baseline | `bun test` before RED | 914 pass, 0 fail, 5291 expect calls, 71 files, 110.05s |
| RED | `bun test test/hosts/runtime-port.test.mjs` after adding direct tests and before production code | 0 pass, 1 fail, 1 module-resolution error: `hosts/runtime-port.mjs` absent |
| GREEN | `bun test test/hosts/runtime-port.test.mjs` | 6 pass, 0 fail, 46 expect calls, 1 file, 253ms |
| TRIANGULATE | Direct cases for shared-object concurrency, valid/error/mismatch consumption, fresh retry, and drift after issuance/proof | Included in the focused 6-pass run; one winner and one proof call asserted directly |
| REFACTOR | Consolidated tuple/challenge/deferred fixtures without weakening exact key, frozen, error-code, or call-count assertions | Focused suite remained 6 pass, 0 fail |

## Implemented semantics

- Constructor binds one operation, exact S4.10 resolver, and one producer capability; callers provide exactly `{ binding }`.
- Exact context is resolved before issuance, after issuance, and after proof settlement.
- Issued challenges are closed, frozen, operation/producer/context-bound records.
- Synchronous weak in-flight and consumed guards allow one concurrent winner and reject retained challenge reuse.
- Valid proof, producer error, and proof mismatch all terminally consume the challenge; retry requires a fresh challenge.
- Crossed or malformed challenges make zero proof calls; invalid input/context makes zero producer calls.
- Public authority exposes only frozen `execute`; no disposal or caller-selected producer/proof capability is exposed.
- Successful output is the exact frozen bounded record `{ operation, binding_id, incarnation_id, status: "MATCHED" }`; errors use frozen bounded `ContractError` diagnostics and omit raw causes.

## Verification evidence

- Focused: `bun test test/hosts/runtime-port.test.mjs` → 6 pass, 0 fail.
- Directory: `bun test test/hosts` → 151 pass, 0 fail, 950 expect calls, 18 files, 2.33s.
- Full: `bun test` → 920 pass, 0 fail, 5337 expect calls, 72 files, 109.47s.
- Import/export check → PASS; sole export is `createHostRuntimeProofPort`.
- `git diff --check` → PASS.
- Neutral vocabulary/import scans → PASS for both boundary product paths.
- Direct exact-key/frozen/capability leakage assertions → PASS in focused tests.

## Boundary measurement

- Base HEAD: `e57f9c47cc86108ea97b45e26900c0788eeaba9d`
- Product paths: exactly `hosts/runtime-port.mjs` and `test/hosts/runtime-port.test.mjs`
- Numstat: `114\t0\thosts/runtime-port.mjs`; `132\t0\ttest/hosts/runtime-port.test.mjs`
- Authored additions + deletions: 246 (below 400)
- No runtime-observe, S4.10, plan, adapter, broker, install, or other product path was modified by this boundary.
- Existing parent-owned modifications to `openspec/plans/decision-register.md` and `openspec/plans/plan-4/STATUS.md` were left untouched.

## Rollback boundary

Remove `hosts/runtime-port.mjs` and `test/hosts/runtime-port.test.mjs` together. S4.10 behavior and every unrelated product path remain unchanged. No commit exists, so rollback is deletion of these two untracked product files only.

## Deviations

- No behavioral design deviation.
- The boundary uses 246 authored lines rather than the 280–360 forecast; all required direct security and call-count cases remain present.
- No commit was created because the delegated instruction explicitly stops before parent review, staging, and commit.

## Remaining tasks

- [ ] Complete the strict-TDD observe/health boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->
- [ ] Complete the strict-TDD stop/attach boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->
- [ ] After direct commit 1 and before any work for T4.11.1.2, hold on exactly the Commit 1 diff, changed-line total, Boundary 1 evidence, Área confinement, and Engram checkpoint; do not direct-deliver the partial sequence. <!-- sdd-owner: parent -->
- [ ] After direct commit 2 and before any work for T4.11.1.3, hold on exactly the Commit 2 diff, changed-line total, Boundary 2 evidence, Área confinement, and Engram checkpoint; do not direct-deliver the partial sequence. <!-- sdd-owner: parent -->
- [ ] After direct commit 3 and before verification/delivery, hold on exactly all three direct-commit diffs, their individual <=400 authored-line proofs, Boundary 3 full-suite evidence, complete rollback order, and the final Engram checkpoint; direct delivery remains prohibited until full S4.11 verification passes. <!-- sdd-owner: parent -->

## Workload / PR boundary

Direct commit boundary 1 is implementation-complete but intentionally unstaged and uncommitted. It is not a deliverable S4.11 contract. Stop here for the parent-owned review hold; do not begin boundary 2.

## Verifier BLOCK correction — closed binding validation

Status: the one authorized correction is GREEN and ready for the parent's final recheck. Boundary 2 remains unstarted; no review, stage, commit, push, token acquisition, or lifecycle action occurred.

### Exact correction

- Added direct coverage for a binding with an undeclared field and for `null`, `undefined`, empty-object, and primitive malformed bindings.
- Every case now asserts the unchanged S4.10 `CT_HOST_RUNTIME_SCHEMA_INVALID` frozen `ContractError`, frozen bounded diagnostics, and zero challenge/proof calls.
- `execute` now passes the caller's original binding to unchanged `resolveExactContext` before creating the private canonical binding copy. It does not strip, default, repair, or infer fields. Copying occurs only after exact S4.10 validation succeeds.

### Correction TDD Cycle Evidence

| Stage | Command / evidence | Exact result |
|---|---|---|
| Safety net | `bun test test/hosts/runtime-port.test.mjs` before correction | 6 pass, 0 fail, 46 expect calls, 1 file, 230ms |
| RED | Same focused command after adding undeclared/null/undefined/malformed binding cases and before production correction | 6 pass, 1 fail, 47 expect calls; new test received a non-`ContractError` value, proving the validation defect |
| GREEN | Same focused command after validating the original binding before copying | 7 pass, 0 fail, 77 expect calls, 1 file, 239ms |
| TRIANGULATE | Undeclared-field object plus `null`, `undefined`, `{}`, and primitive binding cases | All five rejection paths passed with exact frozen S4.10 error and zero producer calls |
| REFACTOR | None; the minimum one-line ordering correction was retained | Focused suite stayed GREEN |

### Corrected verification evidence

- Focused: `bun test test/hosts/runtime-port.test.mjs` → 7 pass, 0 fail, 77 expect calls.
- Directory: `bun test test/hosts` → 152 pass, 0 fail, 981 expect calls, 18 files, 2.37s.
- Full: `bun test` → 921 pass, 0 fail, 5368 expect calls, 72 files, 109.02s.
- Import/export check → PASS; sole export remains `createHostRuntimeProofPort`.
- `git diff --check` and no-index checks for both untracked product files → PASS.
- Neutral vocabulary scan → PASS; adapter/broker/supervisor import scan → PASS; bounded-output leak scan → PASS.
- Product paths remain exactly `hosts/runtime-port.mjs` and `test/hosts/runtime-port.test.mjs`.

### Corrected boundary measurement

- Numstat: `114\t0\thosts/runtime-port.mjs`; `154\t0\ttest/hosts/runtime-port.test.mjs`.
- Authored additions + deletions: 268, below the 400-line boundary budget.
- The implementation-owned Boundary 1 checkbox remains checked because all required checks are GREEN.
- The parent-owned hold remains byte-for-byte unchecked and deferred.
- Remaining exact unchecked tasks are unchanged from the cumulative list above.

Apply-progress revision: verifier-BLOCK correction 1, same active attempt. Parent-held token `sha256:78d61b4ae09339d41cc4f2b07bd80f025e183b028dd6e0b77086ec2edcfb1bdc` remained untouched.

## Immutable Commit 1 checkpoint

This checkpoint supersedes the earlier uncommitted-boundary metadata without removing its TDD and correction history.

- Commit: `356c9eac76e862d2fde47720ee97af84b0ae23d6` — `feat(hosts): enforce one-use runtime proof challenges`.
- Immutable product boundary: exactly `hosts/runtime-port.mjs` and `test/hosts/runtime-port.test.mjs`.
- Numstat: `114` additions / `0` deletions and `154` additions / `0` deletions; 268 authored lines total, below the 400-line limit.
- Baseline: 914 pass / 0 fail / 5291 expect calls.
- Initial RED: 0 pass / 1 fail because `hosts/runtime-port.mjs` was absent.
- Initial GREEN: 6 pass / 0 fail / 46 expect calls.
- Targeted verifier: BLOCK on malformed binding validation.
- Correction RED: 6 pass / 1 fail / 47 expect calls.
- Final focused: 7 pass / 0 fail / 77 expect calls.
- Final hosts directory: 152 pass / 0 fail.
- Final full suite: 921 pass / 0 fail.
- Diff, import, neutral-vocabulary, exact-key, frozen-result, and leakage checks: PASS.
- Final targeted verifier: PASS.
- Native settle complete evidence: `sha256:c93b86eb0bbd7b0d878fd920f5da156be06e5dad9dec40115cdf3ebb48bb0cc4`.
- Rollback: restore base `e57f9c47cc86108ea97b45e26900c0788eeaba9d` and remove both boundary paths.
- Persisted task state: implementation T4.11.1.1 checked; parent Commit 1 hold checked; implementation T4.11.1.2 and T4.11.1.3 plus parent Commit 2 and Commit 3 holds remain unchecked.
- Delivery status: partial three-commit sequence remains non-deliverable; no push or delivery occurred.
- Next boundary: T4.11.1.2 may proceed. Do not begin T4.11.1.3 until Commit 2 is checkpointed and its parent hold is complete.

Apply-progress revision: immutable Commit 1 checkpoint; Boundary 2 authorized to proceed.

## Direct commit boundary 2 — observe and health

Status: implementation complete and GREEN; intentionally unstaged and uncommitted for the parent-owned hold. Immutable Boundary 1 at `356c9eac76e862d2fde47720ee97af84b0ae23d6` remains unchanged. Parent-held token `sha256:2f98b74912b0d7b6cc49f6aa5446ef9e49a6f7a02e35428f72810235136c8cf0` was not acquired, settled, reset, or otherwise touched.

### TDD Cycle Evidence

| Stage | Command / evidence | Exact result |
|---|---|---|
| Baseline | `bun test` before Boundary 2 RED | 921 pass, 0 fail, 5368 expect calls, 72 files, 108.29s |
| RED | `bun test test/hosts/runtime-observe.test.mjs` after direct tests and before production code | 0 pass, 1 fail, 1 module-resolution error: `hosts/runtime-observe.mjs` absent |
| GREEN | `bun test test/hosts/runtime-observe.test.mjs` | 6 pass, 0 fail, 70 expect calls, 1 file, 280ms |
| TRIANGULATE | Direct tables for observe unavailable/error/missing response, HEALTHY/DEAD/unknown, foreign/self-report/cross-operation/cross-binding/cross-incarnation/challenge/partial/extra-field proof, exact call counts, and context drift | Included in the focused 6-pass run |
| REFACTOR | Consolidated context, challenge, proof, and exact frozen-result fixtures while retaining direct security and call-count assertions | Focused suite remained 6 pass, 0 fail |

### Implemented semantics

- `createRuntimeObserve` and `createRuntimeHealth` reuse the immutable Boundary 1 proof port and constructor-bound producer.
- Observe returns exact frozen matching-producer evidence only after matching proof; issuance failure, call failure, null/missing response, disconnect, timeout, and silence remain `EVIDENCE_UNAVAILABLE`.
- Health maps only matching `HEALTHY` and `DEAD` proofs to `PROVEN_HEALTHY` and `PROVEN_DEAD`; unavailable/error/null response maps only to `DISCONNECTED_UNKNOWN`.
- Foreign, self-reported, cross-operation, cross-binding, cross-incarnation, challenge-mismatched, partial, and extra-field proof cannot establish a result and remains a proof mismatch.
- Exact current-context drift after the proof call prevents success.
- Public results are exact-key, frozen, bounded, and contain no producer/challenge capability or host-specific value.
- Stop, attach, and the final four-operation factory were not introduced.

### Verification evidence

- Focused: `bun test test/hosts/runtime-observe.test.mjs` → 6 pass, 0 fail, 70 expect calls.
- Directory: `bun test test/hosts` → 158 pass, 0 fail, 1051 expect calls, 19 files, 2.56s.
- Full: `bun test` → 927 pass, 0 fail, 5438 expect calls, 73 files, 109.32s; no loss from the 921-pass Boundary 2 baseline.
- Import/export check → PASS; exact exports are `createRuntimeHealth` and `createRuntimeObserve`; sole product import is immutable `./runtime-port.mjs`.
- `git diff --check` plus no-index checks for both untracked Boundary 2 files → PASS.
- Exact-key, frozen-result, direct call-count, security, capability-leak, neutral-vocabulary, forbidden-import, and context-drift assertions/scans → PASS.

### Boundary measurement and rollback

- Base/immutable HEAD: `356c9eac76e862d2fde47720ee97af84b0ae23d6`.
- Boundary 2 product paths: exactly `hosts/runtime-observe.mjs` and `test/hosts/runtime-observe.test.mjs`.
- Numstat: `71\t0\thosts/runtime-observe.mjs`; `126\t0\ttest/hosts/runtime-observe.test.mjs`.
- Authored additions + deletions: 197, below the 400-line limit.
- Existing parent-owned modifications under `openspec/plans/` were untouched and are not part of Boundary 2.
- Rollback Boundary 2 by removing only these two untracked files; immutable Boundary 1 remains test-green but the partial S4.11 sequence remains non-deliverable.

### Persisted task state and remaining tasks

- [x] T4.11.1.2 — strict-TDD observe/health boundary. OpenSpec and Engram task checkbox updated.
- [ ] Complete the strict-TDD stop/attach boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->
- [ ] After direct commit 2 and before any work for T4.11.1.3, hold on exactly the Commit 2 diff, changed-line total, Boundary 2 evidence, Área confinement, and Engram checkpoint; do not direct-deliver the partial sequence. <!-- sdd-owner: parent -->
- [ ] After direct commit 3 and before verification/delivery, hold on exactly all three direct-commit diffs, their individual <=400 authored-line proofs, Boundary 3 full-suite evidence, complete rollback order, and the final Engram checkpoint; direct delivery remains prohibited until full S4.11 verification passes. <!-- sdd-owner: parent -->

Workload / PR boundary: Boundary 2 is a 197-line direct construction boundary within the planned single delivery sequence. It is not independently deliverable. Stop before parent review, staging, commit, push, plan docs, or Boundary 3.

Apply-progress revision: Boundary 2 implementation GREEN; ready for parent review hold 2.

## Boundary 2 maintainer-authorized correction and Parent Hold 2 reconciliation

Status: the corrected Boundary 2 candidate is frozen and Parent Hold 2 has passed. Commit 2 has **not** been created, so the parent-owned Commit 2 hold checkbox remains unchecked and T4.11.1.3 remains prohibited.

### Authority validation

- Decision 92 is preserved unchanged in `openspec/plans/decision-register.md` and still authorizes the exact host-neutral, fail-closed observe/health scope: one-use operation/binding/incarnation-bound producer challenges, matching same-producer proof, uncertainty-preserving observe, and three-state health semantics.
- Decision 93 is preserved unchanged and still authorizes terminal challenge consumption on valid proof, producer error, or proof mismatch. Its stop-error rule remains reserved for T4.11.1.3 and does not expand Boundary 2.
- No contradiction exists between Decisions 92/93, the proposal, delta spec, design, corrected four-path candidate, or this checkpoint.

### Corrected immutable candidate

- HEAD/base: `356c9eac76e862d2fde47720ee97af84b0ae23d6`.
- Candidate paths and SHA-256:
  - `hosts/runtime-port.mjs`: `7c6b02db7bdf406d66e392c10a265f57aeaea892d576a8a504b0f1aa6bf117b5`
  - `hosts/runtime-observe.mjs`: `0b7a943d9002c4ddee2bc3669231d587e85f16c1ed3c9876d301693d8ca2e7c6`
  - `test/hosts/runtime-port.test.mjs`: `cf52097639e28ff9e97f3f2761a58d22d0fa5641acb9ed8c9aa1b36cc9daee4b`
  - `test/hosts/runtime-observe.test.mjs`: `9085996730f6a02c5f8ad93a15b85abbb6807bbe94d78b8709b2dbd7afbda5ca`
- Correction delta: 199 authored lines.
- Final HEAD-scoped Commit 2 candidate: 191 authored lines across exactly the four approved Área paths (30 + 27 + 33 + 101); below the 400-line limit.
- Rollback boundary: restore the four candidate paths to HEAD `356c9eac76e862d2fde47720ee97af84b0ae23d6`; immutable Commit 1 remains unchanged.

### Correction TDD and frozen verification evidence

| Stage | Exact frozen result |
|---|---|
| Correction RED — port | 7 pass, 2 fail |
| Correction RED — observe | 6 pass, 1 fail |
| GREEN — port | 9 pass, 0 fail, 81 expect calls |
| GREEN — observe | 4 pass, 0 fail, 59 expect calls |
| GREEN — combined | 13 pass, 0 fail, 140 expect calls |
| Fresh focused reliability recheck | PASS, no findings |
| Native SDD settle | Complete; evidence revision `sha256:f937413e5e01c0eb1698092487445e93fb9d454d2e69ecd92deec2916547336b` |
| Parent Hold 2 | PASS |

No tests were rerun during this reconciliation; the evidence above was already frozen by the authorized correction and parent hold.

### Persisted task and lifecycle state

- The implementation-owned T4.11.1.2 checkbox is already visibly `[x]` in `tasks.md`; no checkbox correction was required.
- The parent-owned Commit 2 hold remains byte-for-byte unchecked because no Commit 2 exists.
- Exact remaining implementation task:
  - [ ] Complete the strict-TDD stop/attach boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->
- Exact deferred parent lifecycle actions:
  - [ ] After direct commit 2 and before any work for T4.11.1.3, hold on exactly the Commit 2 diff, changed-line total, Boundary 2 evidence, Área confinement, and Engram checkpoint; do not direct-deliver the partial sequence. <!-- sdd-owner: parent -->
  - [ ] After direct commit 3 and before verification/delivery, hold on exactly all three direct-commit diffs, their individual <=400 authored-line proofs, Boundary 3 full-suite evidence, complete rollback order, and the final Engram checkpoint; direct delivery remains prohibited until full S4.11 verification passes. <!-- sdd-owner: parent -->

### Next exact action

Parent lifecycle must stage exactly the corrected four-path candidate and create Commit 2, then reconcile that immutable commit checkpoint and only then mark the parent Commit 2 hold complete. T4.11.1.3 MUST NOT begin before that reconciliation.

Apply-progress revision: corrected Boundary 2 candidate reconciled after Parent Hold 2 PASS; awaiting parent-owned staging and Commit 2 checkpoint.

## Immutable Commit 2 checkpoint

This checkpoint supersedes only the earlier uncommitted Boundary 2 metadata. All prior baseline, RED/GREEN/TRIANGULATE/REFACTOR, correction, review, and immutable Commit 1 evidence above remains cumulative and unchanged.

### Immutable commit identity

- Commit: `beaa597eac05cb466832452deac2b6ce7ad86e87` — `feat(hosts): isolate runtime observation outcomes`.
- Tree: `7741cf4b46a66a5a2765817eff093d0b4fed339f`.
- Immutable product boundary: exactly `hosts/runtime-observe.mjs`, `hosts/runtime-port.mjs`, `test/hosts/runtime-observe.test.mjs`, and `test/hosts/runtime-port.test.mjs`.
- Numstat: `33` additions / `0` deletions; `20` additions / `10` deletions; `101` additions / `0` deletions; `26` additions / `1` deletion, respectively.
- Authored additions + deletions: 180 + 11 = 191, below the 400-line limit.
- Blob content SHA-256 values match the corrected reviewed candidate:
  - `hosts/runtime-port.mjs`: `7c6b02db7bdf406d66e392c10a265f57aeaea892d576a8a504b0f1aa6bf117b5`
  - `hosts/runtime-observe.mjs`: `0b7a943d9002c4ddee2bc3669231d587e85f16c1ed3c9876d301693d8ca2e7c6`
  - `test/hosts/runtime-port.test.mjs`: `cf52097639e28ff9e97f3f2761a58d22d0fa5641acb9ed8c9aa1b36cc9daee4b`
  - `test/hosts/runtime-observe.test.mjs`: `9085996730f6a02c5f8ad93a15b85abbb6807bbe94d78b8709b2dbd7afbda5ca`

### Frozen authority and verification evidence

- Decisions 92 and 93 remain preserved and valid with no contradiction.
- Parent Hold 2: PASS.
- Fresh focused reliability recheck: PASS, no findings.
- Native SDD attempt settled at evidence revision `sha256:f937413e5e01c0eb1698092487445e93fb9d454d2e69ecd92deec2916547336b`.
- No tests were rerun during this immutable-checkpoint reconciliation.
- No code or test file was edited, and no stage, commit, checkout, reset, stash, clean, or push operation was performed during reconciliation.

### Persisted task and delivery state

- [x] T4.11.1.1 — immutable Commit 1 remains complete.
- [x] T4.11.1.2 — immutable Commit 2 is now checkpointed.
- [x] Parent Commit 1 hold remains complete.
- [x] Parent Commit 2 hold is now visibly complete in `tasks.md` after immutable commit reconciliation.
- Exact next implementation task remains unstarted:
  - [ ] Complete the strict-TDD stop/attach boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->
- Exact deferred parent lifecycle action:
  - [ ] After direct commit 3 and before verification/delivery, hold on exactly all three direct-commit diffs, their individual <=400 authored-line proofs, Boundary 3 full-suite evidence, complete rollback order, and the final Engram checkpoint; direct delivery remains prohibited until full S4.11 verification passes. <!-- sdd-owner: parent -->
- The two-commit partial chain remains explicitly non-deliverable. No push or delivery occurred.

### Rollback and next exact action

- Commit 2 rollback boundary: revert `beaa597eac05cb466832452deac2b6ce7ad86e87` to remove only the observe/health construction outcome while immutable Commit 1 remains; the resulting partial sequence is still not a deliverable S4.11 contract.
- T4.11.1.3 is now the next unchecked implementation task and may begin under strict TDD. It was not started by this reconciliation.
- After T4.11.1.3 is complete and immutable Commit 3 exists, return to the parent-owned final hold; no remote delivery is authorized before complete S4.11 verification.

Apply-progress revision: immutable Commit 2 checkpoint; Boundary 3 authorized but unstarted.

