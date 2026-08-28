# Tasks: host-neutral runtime operations

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750–950 aggregate authored additions + deletions; three direct commits of 220–360 each, never over 400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Direct commit 1 → Direct commit 2 → Direct commit 3; sequential local construction only |
| Delivery strategy | single-pr (repository delivery is sequential direct commits; no PR) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

No size exception is authorized. Decisions 84, 92, and 93 completely authorize this scope. The three direct commits are independently test-green and revertible but are **not** separately deliverable; do not direct-deliver or push until all three exist and the complete S4.11 contract passes.

## Scope and execution guard

**Área (exclusive, exact):** `hosts/runtime-port.mjs`, `hosts/runtime-observe.mjs`, `test/hosts/runtime-port.test.mjs`, and `test/hosts/runtime-observe.test.mjs`. Do not modify S4.10, exports/composition roots, adapters, broker/supervisor, installation, packaging, payloads, recovery, database, or any other path.

**Strict TDD:** before the first RED, run `bun test` and record a baseline of at least **914 pass / 0 fail**. After every direct-commit boundary, rerun `bun test`; the baseline must not lose 914 passing tests and must remain at 0 failures. RED is the only expected failing state and must be limited to the newly added focused assertions before the matching GREEN change.

**Boundary evidence required for every direct commit:**

| Boundary | Focused command | Directory command | Full command | Diff and leak checks |
|---|---|---|---|---|
| 1 | `bun test test/hosts/runtime-port.test.mjs` | `bun test test/hosts` | `bun test` | `git diff --check`; inspect `git diff --name-only` for only the four Área paths; assert frozen exact keys and no `producer_ref`, `challenge_ref`, challenge, proof, capability, raw-cause, or host-object leakage; inspect imports for no adapter/broker/supervisor/host dependency; search the four Área paths for `Pi`, `OpenCode`, `Intercom`, `broker`, `supervisor`, `adapter`, `pane`, and `session` and require no product vocabulary match. |
| 2 | `bun test test/hosts/runtime-observe.test.mjs` | `bun test test/hosts` | `bun test` | Repeat Boundary 1 diff, exact-key/frozen-result, capability-leak, import, and neutral-vocabulary checks. |
| 3 | `bun test test/hosts/runtime-port.test.mjs test/hosts/runtime-observe.test.mjs` | `bun test test/hosts` | `bun test` | Repeat Boundary 1 checks and prove the final diff remains exactly the four Área paths; no S4.10 contract change or public wiring/export. |

At each GREEN completion, record the direct commit SHA, exact focused/directory/full results, changed-line total, inspected paths, and rollback boundary in Engram `sdd/s4-11-host-neutral-operations/apply-progress` before the next direct commit. Stop immediately and set apply BLOCKED if any direct commit reaches or exceeds 401 authored additions + deletions, any changed path escapes Área, any public/security decision is needed, a required check fails outside the intentional RED state, or the full suite is below 914 pass or above 0 fail.

## Módulo 4.11.1 — Host-neutral runtime operations

### Tarea 4.11.1.1 — RED — Direct commit 1: neutral challenge, context, and terminal-consumption core

**Start:** clean S4.10 behavior and a recorded `bun test` baseline of at least 914 pass / 0 fail. Touch only `hosts/runtime-port.mjs` and `test/hosts/runtime-port.test.mjs` unless a test fixture must live in the approved observation test path.

**RED → GREEN → TRIANGULATE → REFACTOR evidence:**
1. **RED:** add deterministic direct tests for closed `{ binding }` input; constructor-bound producer only; exact S4.10 context snapshots and revalidation before/after async boundaries; challenge operation/binding/incarnation/producer matching; and zero producer calls for invalid input or crossed context. Confirm the focused command fails only on the new missing core behavior.
2. **GREEN:** implement the private neutral `runtime-port` core: exact-context reuse, closed challenge request validation, synchronous weak in-flight/consumed identity guards, one proof call for the winner, and `finally` terminal consumption for valid proof, producer-call error, and proof mismatch. Do not expose the finished four-operation factory yet.
3. **TRIANGULATE:** use deferred producer fakes to prove one-use reuse rejection, concurrent reuse with exactly one proof call, mismatch/error consumption followed by fresh-challenge retry, and context drift after issuance or after a proof call. Confirm retained consumed challenge objects remain rejected and completed calls are removed from the in-flight guard.
4. **REFACTOR:** reduce fixtures/helpers without weakening exact field, call-count, frozen-object, cleanup, or error-code assertions; preserve neutral terminology and the strict boundary.

**Verification and commit boundary:** run Boundary 1 evidence above, keep authored change at 280–360 lines and no more than 400, then create one direct commit describing neutral one-use proof challenge enforcement. It is locally coherent and test-green, but not a deliverable S4.11 contract.

**Rollback:** revert this direct commit to remove `hosts/runtime-port.mjs` and its direct tests; no S4.10 behavior or public composition may remain changed.

- [x] Complete the strict-TDD core boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->

### Tarea 4.11.1.2 — GREEN — Direct commit 2: observe and health evidence/state behavior

**Start:** Direct commit 1 is committed, parent-held, test-green, within 400 authored lines, and checkpointed. Implement only the observation mapper and its direct tests in the approved Área; retain Commit 1's internal authority boundary unchanged.

**RED → GREEN → TRIANGULATE → REFACTOR evidence:**
1. **RED:** add direct `runtime-observe` tests that fail for missing/partial/disconnected/timed-out/silent evidence promotion, non-matching proof, and the health states `PROVEN_HEALTHY`, `DISCONNECTED_UNKNOWN`, and `PROVEN_DEAD`.
2. **GREEN:** implement closed proof checks plus frozen, exact-key observe and health result mapping. Accept proven health/death only from matching producer proof; map issuance/call failure, silence, timeout, and missing response only to evidence unavailable or disconnected/unknown.
3. **TRIANGULATE:** prove health `HEALTHY` and `DEAD` mapping separately; prove foreign, self-reported, cross-operation, cross-binding, cross-incarnation, extra-field, and challenge-mismatched proof cannot establish a result; exercise context drift before returned success.
4. **REFACTOR:** consolidate table-driven negative cases and exact-key assertions while retaining direct probes for uncertainty, proof mismatch, frozen results, diagnostics bounds, and prohibited vocabulary/import leakage.

**Verification and commit boundary:** run Boundary 2 evidence above, keep authored change at 220–290 lines and no more than 400, then create one direct commit describing neutral observe/health evidence-state mapping. It is locally coherent and test-green, but not a deliverable S4.11 contract.

**Rollback:** revert this direct commit to remove only `hosts/runtime-observe.mjs` observe/health mapping and its tests; Commit 1 remains test-green but is still not deliverable.

- [x] Complete the strict-TDD observe/health boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->

### Tarea 4.11.1.3 — REFACTOR — Direct commit 3: stop and attach acknowledgment/security behavior

**Start:** Direct commits 1 and 2 are committed, parent-held, test-green, each within 400 authored lines, and checkpointed. Compose only the final frozen `observe`, `health`, `stop`, and `attach` service in the approved Área; add no public export or composition wiring.

**RED → GREEN → TRIANGULATE → REFACTOR evidence:**
1. **RED:** add direct tests that fail for stop acknowledgment being treated as state, stop producer-call failure, stop disconnect/timeout/silence/missing response, and attach without fresh matching proof. Include direct attach probes for replay, foreign producer, wrong operation/binding/incarnation/challenge, and leaked acknowledgment fields.
2. **GREEN:** compose the four-operation factory with exactly `{ binding }` inputs; map stop call failure exactly to `request: NOT_ACKNOWLEDGED` plus `state: DISCONNECTED_UNKNOWN`; return attach acknowledgment only after fresh matching proof and final exact-current-context revalidation, bound to the canonical binding and incarnation.
3. **TRIANGULATE:** prove acknowledged + `UNKNOWN` is not stopped/dead; prove error-consumed stop challenge requires a new challenge; prove attach success has only its exact frozen keys; prove stale/crossed/foreign/replayed proof returns no acknowledgment; and rerun challenge one-use, mismatch/error consumption, concurrent reuse, and context-drift probes through the composed service.
4. **REFACTOR:** consolidate operation fixtures and rejection tables, retain every direct security probe and result-boundary assertion, and confirm the factory exposes exactly `observe`, `health`, `stop`, and `attach` with no caller-selected producer/proof seam.

**Verification and commit boundary:** run Boundary 3 evidence above, keep authored change at 250–300 lines and no more than 400, then create one direct commit describing host-neutral runtime operation exposure. This ends construction only after all three commits and the full suite are green; no partial sequence may be delivered.

**Rollback:** a single revert removes the factory/integration behavior but is not a full S4.11 rollback. Full rollback is mandatory in reverse commit order (3 → 2 → 1) and removes both modules and both test files together, leaving S4.10 untouched.

- [x] Complete the strict-TDD stop/attach boundary, record its exact evidence and Engram apply checkpoint, and create no more than one direct commit. <!-- sdd-owner: implementation -->

## Parent review holds

- [x] After direct commit 1 and before any work for T4.11.1.2, hold on exactly the Commit 1 diff, changed-line total, Boundary 1 evidence, Área confinement, and Engram checkpoint; targeted verifier PASS after one scoped closed-binding correction; do not direct-deliver the partial sequence. <!-- sdd-owner: parent -->
- [x] After direct commit 2 and before any work for T4.11.1.3, hold on exactly the Commit 2 diff, changed-line total, Boundary 2 evidence, Área confinement, and Engram checkpoint; do not direct-deliver the partial sequence. <!-- sdd-owner: parent -->
- [x] After direct commit 3 and before verification/delivery, hold on exactly all three direct-commit diffs, their individual <=400 authored-line proofs, Boundary 3 full-suite evidence, complete rollback order, and the final Engram checkpoint; direct delivery remains prohibited until full S4.11 verification passes. <!-- sdd-owner: parent -->
