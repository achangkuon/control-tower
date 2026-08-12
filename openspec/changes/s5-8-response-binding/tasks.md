# Tasks: Atomic Main Authorization Response Binding

Implement the maintainer-approved Option B only: extend the canonical Main authorization transition so one complete S5.7 `parked-decision-response-v1` is persisted in the same authorization-record replacement as the terminal state. Strict TDD is active.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–390 authored lines (90–130 store; 190–260 focused tests) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single direct-push change; no PRs in this repository |
| Delivery strategy | direct-push |
| Chain strategy | N/A — PRs and chained PRs prohibited |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Medium

## Execution contract

- **Dependencies:** `S5.7` is complete; use its registered constructors, `validate`, `assertParkedDecisionResponseBinding`, and `parkedDecisionResponseDigest` without editing their owner paths.
- **Área:** `main-store/store.mjs`, `test/main-store.test.mjs`
- **Recurso:** authorization store de Main, bajo `assertMain` y su mismo lock/transacción; exclusividad sobre sus transiciones. Sin DB y sin token de entrega.
- **Strict TDD commands:** RED and each GREEN increment run `bun test test/main-store.test.mjs`; after all focused work passes, run check-only `git diff --check` and then `bun test`. No formatter, linter, or type checker is configured.
- **Scope and line-count witnesses:** before editing, record the baseline with `git status --short`, `git diff --name-only`, and `git diff --numstat`. Before every GREEN expansion and before the full suite, verify that `git diff --name-only` names only the two approved paths and calculate additions plus deletions from `git diff --numstat -- main-store/store.mjs test/main-store.test.mjs`. Stop immediately—without adding a path, seam, migration, authority, writer, sidecar, or retry—if the forecast becomes materially greater than 390 lines or exceeds 400 lines.
- **Stop and escalate:** stop before apply if one-record atomic visibility is doubtful, a forbidden path becomes necessary, a new always-escalate decision appears, or the line-count checkpoint fails. Pre-rename failures retain unchanged-byte witnesses; after rename, parent-directory-fsync failure is indeterminate durability and must reconcile through a later canonical read/replay, never a rollback or automatic retry.
- **Delivery boundary:** this task artifact creates no code, commit, or push. The repository's later delivery policy is one reversible direct-push candidate to `master`, without a PR or chained PR; no delivery action belongs to this phase.
- **Rollback boundary:** one revert limited to `main-store/store.mjs` and `test/main-store.test.mjs`; no migration, sidecar cleanup, or data repair.

## Módulo M5.8.1 — Terminal response under Main

**Dependencies:** S5.7 canonical response contract; existing `createMainStore`, `consumeAuthorization`, `assertMain`, `commit`, `atomicWrite`, and Jornada lock ordering.
**Traceability:** Spec requirements “Main is the sole response-persistence authority,” “Eligible authorization lifecycle is required,” and “Response and terminal state have one atomic visibility boundary”; design §§ Canonical input capture, Authoritative authorization anchor, Common context gate, One-record terminal representation, and Honest atomic-write failure semantics.

- [x] **Tarea T5.8.1.1 — RED:** In `test/main-store.test.mjs`, add failing, byte-witnessed cases for non-Main/invalid capability, unpaired response fields, invalid response contract, non-PENDING records except a coherent response-bearing terminal replay anchor, and legacy terminal records, plus expired or malformed expiry, stale revision, candidate drift, foreign project/registry, absent or mismatched authoritative origin/target, and inactive/stale Jornada. Add terminal-request witnesses proving project/registry, candidate, consumed PENDING revision, origin, and target are all rejected before replay can return. **Done when:** the focused command fails solely because the response-bearing transition and ordered common context gate are absent, every rejected pre-rename case proves unchanged authorization bytes, and only a coherent response-bearing terminal record is admitted to the replay path while legacy terminal records remain rejected. <!-- sdd-owner: implementation -->
- [x] **Tarea T5.8.1.2 — GREEN:** In `main-store/store.mjs`, extend only `consumeAuthorization(input)` with an all-or-nothing `parked_decision` / `parked_decision_response` mode. After `assertMain`, detach inputs; use S5.7’s exported digest and registered validators plus final `assertParkedDecisionResponseBinding`; acquire and preserve the existing Jornada-then-authorization lock/CAS path; derive either the PENDING anchor or a coherent terminal predecessor anchor. For an eligible PENDING authorization, embed the complete validated response and origin in `terminal_audit`, append the exact PENDING predecessor, and perform one `commit`/one `atomicWrite` replacement. Track whether rename occurred so pre-rename errors preserve unchanged bytes while post-rename parent-directory-fsync errors report indeterminate durability without rollback or retry. **Done when:** the focused command passes the new positive terminal transition and failure witnesses, one authorization record contains both terminal state and complete response, `beforeCommit` observes the Jornada lock, and no response-only persistence path exists. <!-- sdd-owner: implementation -->
- [x] **Tarea T5.8.1.3 — REFACTOR:** Consolidate private response-mode/anchor/context helpers in `main-store/store.mjs` while retaining exactly one public `consumeAuthorization` transition and one S5.7 acceptance path. Remove any local schema, digest, origin, option, snapshot, or caller-assertion substitute; preserve the existing response-less behavior. Re-run the focused command. **Done when:** focused tests pass; source inspection shows `assertMain`, the registered S5.7 validation plus final binding assertion, one lock/CAS/atomic replacement route, and no new public method, authority, writer, or store. <!-- sdd-owner: implementation -->

## Módulo M5.8.2 — Cryptographic binding and idempotency

**Dependencies:** M5.8.1 green path and the S5.7 canonical constructors/digest/binding assertion.
**Traceability:** Spec requirements “The S5.7 response contract is canonical,” “Exact authorization and decision binding,” “Replay is exact and idempotent,” and “Concurrent requests preserve one canonical outcome”; design §§ Stable binding set and deterministic rejection, Transition and replay protocol, and Honest atomic-write failure semantics.

- [x] **Tarea T5.8.2.1 — RED:** In `test/main-store.test.mjs`, construct valid S5.7 records and independently resealed drift witnesses for authorization ID/revision, parked-decision ID/digest, enumerated `option_id`, Session snapshot digest, origin, and decision target. Supply a different well-formed `response_digest` and require `CT_AUTH_RESPONSE_BINDING` with deterministic `Rejected response binding response_digest: expected <canonical digest>, actual <supplied value>` output. For every drift, assert the named stable binding and unchanged persisted bytes. **Done when:** the focused command fails because the store lacks the required deterministic ordered binding checks, while S5.7 remains the only schema/digest owner. <!-- sdd-owner: implementation -->
- [x] **Tarea T5.8.2.2 — RED:** Add exact-replay and race witnesses in `test/main-store.test.mjs`: replay using the original consumed PENDING `expected_revision`; property-reordered but canonical-equivalent input; changed option/origin/revision/snapshot/digest; changed terminal decision, `response_id`, `responded_at`, or other complete-response bytes; and independent-process identical/competing callers. **Done when:** the focused command fails until replay first traverses the complete common context gate, returns `replayed: true` only for identical canonical complete-response bytes, returns `CT_AUTH_RESPONSE_REPLAY_DIVERGENT` only after stable bindings pass, and proves at most one revision-2 replacement/history append. <!-- sdd-owner: implementation -->
- [x] **Tarea T5.8.2.3 — GREEN/REFACTOR:** Implement the stable binding comparisons in the design’s fixed order and deterministic expected/actual rendering; compare captured complete canonical response bytes plus the S5.7 digest for replay; reject terminal decision or non-binding-byte divergence without writing. Preserve the terminal predecessor-anchor validation before replay and the existing Jornada lock/CAS serialization. Remove duplicate digest math and every caller-sourced expected binding. Re-run the focused command. **Done when:** focused tests prove one commit plus one replay for identical callers, one commit plus one named rejection for competing callers, no revision/history growth on replay or rejection, and no duplicated digest or caller-validation path remains. <!-- sdd-owner: implementation -->

## Módulo M5.8.3 — Compatibility and unique ownership of the authorization store

**Dependencies:** M5.8.1 and M5.8.2; existing response-less MERGE and START_JORNADA behavior.
**Traceability:** Spec requirements “Existing authorization actions remain additive and compatible” and “Scope and verification remain bounded”; design §§ File changes, Test design mapped to approved work, Non-goals and forbidden paths, and Rollback, traceability, and stop conditions.

- [x] **Tarea T5.8.3.1 — RED:** In `test/main-store.test.mjs`, add regression witnesses showing existing MERGE and START_JORNADA authorizations transition without either response field, retain their prior result/record shape, and require neither migration nor repair. **Done when:** the focused command fails only if response mode changes the existing response-less lifecycle. <!-- sdd-owner: implementation -->
- [x] **Tarea T5.8.3.2 — GREEN:** Make the response mode strictly additive in `main-store/store.mjs`; consume S5.7’s registered constructors/validation in tests without editing `contracts/**`, `schemas/**`, `test/contracts/**`, or fixtures. Add the post-rename durability-error witness using the existing `beforeCommit` seam: restore permissions in `finally`, read the canonical authorization, and prove reconciliation yields the one visible terminal result as an exact replay with no revision/history growth. Re-run the focused command. **Done when:** focused tests pass for response-less compatibility, pre-S5.8 record reads, pre-rename unchanged bytes, and the honest post-rename reconciliation outcome without a migration, sidecar, rollback, or blind retry. <!-- sdd-owner: implementation -->
- [x] **Tarea T5.8.3.3 — REFACTOR / check-only verification:** Perform the final scope, ownership, and test checks without source mutation: `git diff --check`; approved-path and line-count witnesses; focused `bun test test/main-store.test.mjs`; then full `bun test`. Inspect the two approved files for absence of a response sidecar, shadow store, second writer, second authority method, caller validation flag/assertion, terminal-only `extensions` semantics, rollback after rename, or blind commit retry. **Done when:** both test commands pass, `git diff --check` is clean, only `main-store/store.mjs` and `test/main-store.test.mjs` differ, authored additions plus deletions remain within 280–390 and not materially above 390, and every forbidden construct is absent. <!-- sdd-owner: implementation -->

## Requirement traceability

| Approved requirement / design obligation | Tareas |
|---|---|
| Main-only authority, PENDING lifecycle, ordered common context gate | T5.8.1.1–T5.8.1.3 |
| One-record atomic visibility; pre-rename unchanged bytes; post-rename indeterminate durability and reconciliation | T5.8.1.2, T5.8.3.2 |
| Canonical S5.7 validation, response digest, and all stable bindings | T5.8.1.2–T5.8.2.3 |
| Exact replay, divergent replay, and concurrent canonical outcome | T5.8.2.2–T5.8.2.3 |
| MERGE/START_JORNADA compatibility without migration | T5.8.3.1–T5.8.3.2 |
| Two-path scope, no second authority/store/writer/assertion, focused/full verification, and line budget | T5.8.1.3, T5.8.3.3 |

## Apply evidence to preserve

Record the baseline and final path/line-count witnesses; each RED failure reason; each GREEN focused result; the final focused and full-suite results; the post-rename reconciliation result; all S5.8 binary acceptance outcomes; rollback boundary; and any stop condition. Runtime harness is N/A: this is a bounded Main-store transition tested through the Bun suite, with no external runtime, delivery, Telegram, or database effect.
