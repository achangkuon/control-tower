# S4.10 — Host-neutral runtime identity, binding, and loopback ownership

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 860–1,130 authored additions + deletions total |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Direct commit 1 → direct commit 2 → direct commit 3 |
| Delivery strategy | direct-push sequential commits |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

The approved repository policy forbids PRs and chained PRs. The three direct commits below are coherent, independently testable/revertible, and each has a hard authored-change ceiling of 400 lines. Stop and report a block if the measured `additions + deletions` for its boundary exceeds 400; do not use an exception or move unrelated work across the boundary.

## Scope and delivery constraints

- **Session / Module / Tareas:** retain S4.10 → M4.10.1 → T4.10.1.1–T4.10.1.3 exactly; commit boundaries are delivery mechanics, not planning levels.
- **Permitted paths only:** `contracts/host-runtime/**`, `schemas/host-runtime-*.schema.json`, `test/contracts/host-runtime/**`, and `test/contracts/schema.test.mjs`.
- **Excluded:** Pi/OpenCode/Intercom adapters, broker or supervisor behavior, install/package/payload changes, S4.11 observe/health/stop/attach, S4.12 recovery, and every path outside the approved Área.
- **Strict TDD:** each behavior batch starts with a focused failing `bun test` test, then receives the smallest GREEN implementation and a refactor with focused and full-suite evidence. Do not write production code before the matching RED test.

## M4.10.1 — Neutral identity and binding contract

### T4.10.1.1 — RED: closed v1 shapes and canonical neutral identifiers

**Direct commit 1:** `feat(contracts): add host-runtime v1 shapes` — forecast 260–350 authored lines; rollback removes only the five unused schemas plus shape/identifier validator code and `test/contracts/host-runtime/shapes.test.mjs`.

- [x] RED — add `test/contracts/host-runtime/shapes.test.mjs` cases that fail against the absent contract for all five Decision-89 shapes, their exact `schema_version` literals, required fields, `additionalProperties: false`, identifier grammars, and `loopback_port` integer range 1–65535. <!-- sdd-owner: implementation -->
- [x] GREEN — add the five `schemas/host-runtime-*-v1.schema.json` files and local `contracts/host-runtime/` schema loading/validation plus `createHostRuntimeIdentifier(kind, { randomBytes })`; accept only the five lowercase kind-separated `ct_<kind>_<32 hex>` forms and injected randomness of exactly 16 bytes. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE — extend `shapes.test.mjs` with wrong version literals, missing/extra fields, wrong-kind/uppercase/short/whitespace IDs, malformed random bytes, non-integer/out-of-range ports, and host-vocabulary rejection; prove no sixth public object or repository-wide schema-registry edit is needed. <!-- sdd-owner: implementation -->
- [x] REFACTOR — keep validator and identifier exports host-neutral and bounded; adjust only `expect(schemaFiles).toHaveLength(26)` to `expect(schemaFiles).toHaveLength(31)` in the manual inventory gate; run `bun test test/contracts/host-runtime/shapes.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact focused and full-suite proof. <!-- sdd-owner: implementation -->
- [x] Before direct commit 1, inspect the allowed-path diff, confirm the inventory change is exactly the single 26→31 line in `test/contracts/schema.test.mjs`, run the focused behavior review for closed shapes/neutrality, save the passing focused and full-suite proof plus rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

### T4.10.1.2 — GREEN: exact context resolution and freshness ownership

**Direct commit 2:** `feat(contracts): enforce exact runtime binding freshness` — forecast 300–390 authored lines; rollback removes context/ledger behavior and `test/contracts/host-runtime/ownership.test.mjs` while leaving commit 1 shapes valid.

- [x] RED — add `test/contracts/host-runtime/ownership.test.mjs` cases using an injected `resolveContexts(binding)` seam that fail for missing components, crossed valid-looking tuples, duplicate complete tuples, and any first-match, sorting, normalization, or inferred-context behavior. <!-- sdd-owner: implementation -->
- [x] GREEN — implement exact five-object context validation in `contracts/host-runtime/binding-context.mjs` (or a budget-equivalent local module) and typed failures for schema-invalid, missing, ambiguous, and crossed contexts; require exactly one schema-valid tuple whose IDs and port exactly match the binding. <!-- sdd-owner: implementation -->
- [x] RED — add failing ownership cases for binding-history movement, a current owner attempting another binding, stale incarnation, and replay after release followed by permitted port/non-incarnation reuse. <!-- sdd-owner: implementation -->
- [x] GREEN — implement the private in-memory ownership ledger in `contracts/host-runtime/ownership-registry.mjs` (or a budget-equivalent local module): immutable binding/incarnation history, active owner/port records, current-incarnation checks, and fail-closed stale/replay rejection without public handles or a sixth schema. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE / REFACTOR — verify both distinct contexts and mixed components, history preservation after release, and bounded neutral diagnostics; run `bun test test/contracts/host-runtime/ownership.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact results. <!-- sdd-owner: implementation -->
- [x] Before direct commit 2, inspect the allowed-path diff, run the focused behavior review for context exactness/freshness, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

### T4.10.1.3 — REFACTOR: acquire final loopback listener and exact release

**Direct commit 3:** `feat(contracts): acquire final loopback listeners by exact binding` — forecast 300–390 authored lines; rollback closes/removes acquisition and reservation behavior plus `test/contracts/host-runtime/loopback.test.mjs` while retaining commits 1–2 validation/freshness behavior.

- [x] RED — add `test/contracts/host-runtime/loopback.test.mjs` with a deferred injected `acquireAtReservation` seam proving pending-port serialization, one call with the exact validated five-object context and `binding.loopback_port`, a listener held before success, no pre-release close, and no second bind/adopt/transfer/rebind path. <!-- sdd-owner: implementation -->
- [x] GREEN — extend the ownership registry with constructor-bound acquisition: record exact pending ownership before I/O, call acquisition once, recheck state after acquisition, retain only private close capability plus scalar ownership metadata, and return only `{ binding_id, incarnation_id, loopback_port }`. <!-- sdd-owner: implementation -->
- [x] RED — add failing tests for reserved-port concurrency, externally occupied `127.0.0.1` ephemeral port, foreign/stale release, acquisition failure, post-acquisition cleanup uncertainty, and replay after a released port is reused. <!-- sdd-owner: implementation -->
- [x] GREEN — add `contracts/host-runtime/node-loopback-acquisition.mjs` (or a budget-equivalent local module) that creates the final exclusive `127.0.0.1` listener during reservation; implement exact release only after confirmed private close, preserve active/cleanup-pending state on cleanup failure, and map occupied loopback errors to `CT_HOST_RUNTIME_PORT_OCCUPIED`. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE / REFACTOR — prove real bounded loopback behavior: final listener remains occupied until exact release and is reusable only afterwards; prove results expose no socket, lease, close function, or host-specific value; run `bun test test/contracts/host-runtime/loopback.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact results. <!-- sdd-owner: implementation -->
- [x] Before direct commit 3, inspect the allowed-path diff, run the focused behavior review for final-listener/no-gap/cleanup behavior, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

## Parent post-apply review holds

Each hold is advisory and must happen before the named direct commit, but does not create a PR or chained-PR workflow.

- [x] Run or reuse a bounded focused review of direct commit 1 for Decision-89 public-shape exactness, canonical neutral IDs, schema closure, test evidence, and the `<=400` measurement. Formal `review-risk` was unavailable under the RDD-off controller; focused verifier PASS recorded. <!-- sdd-owner: parent -->
- [x] Run or reuse a bounded focused review of direct commit 2 for exact-context resolution, crossed/ambiguous/stale rejection, history ownership, test evidence, and the `<=400` measurement. Focused verifier BLOCK on missing branches was corrected once; targeted recheck PASS. <!-- sdd-owner: parent -->
- [x] Run or reuse a bounded focused review of direct commit 3 for acquire-at-reservation, pending concurrency, occupied-port handling, exact release, cleanup uncertainty, no transfer/adoption/rebind gap, test evidence, and the `<=400` measurement. Two maintainer-authorized retakes closed disposal races; final targeted verifier PASS. <!-- sdd-owner: parent -->
