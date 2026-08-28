# Apply progress — S4.10 host-neutral runtime

## Direct commit 1 — host-runtime v1 shapes

Status: direct commit boundary 1 is complete and immutable at `4ba00b3557cdfee6d99bddbb6424eec51a3fce27` (`feat(contracts): add host-runtime v1 shapes`). Parent review hold and implementation checkpoint are complete.

`ready_for_parent_review: false`
`next_checkpoint: direct commit 2 RED`

### Completed implementation tasks

- [x] RED — absent host-runtime contract proven by focused failure.
- [x] GREEN — five closed Decision-89 schemas, local strict validators, and injected exactly-16-byte neutral identifier generation.
- [x] TRIANGULATE — wrong versions, missing/extra fields, wrong-kind/uppercase/short/whitespace IDs, malformed random bytes, invalid ports, host vocabulary, and exact five-schema inventory covered.
- [x] REFACTOR/final verification — Decision 90 authorized the exact one-line schema inventory adjustment from 26 to 31; focused, directory, and full suites pass on the final candidate.
- [x] Before direct commit 1 — allowed-path inspection, Decision-90 exact diff, review, budget, evidence, native settlement, and immutable commit all complete.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| T4.10.1.1 | `test/contracts/host-runtime/shapes.test.mjs` | Unit/contract | N/A (new files) | `0 pass, 1 fail, 1 error`: missing `contracts/host-runtime/index.mjs` | `4 pass, 0 fail, 73 expects` | Required negative matrices included; `4 pass` | Decision 90 inventory line applied by parent; `git diff --check` clean; focused `76 pass`; directory `4 pass`; full `896 pass` |

### Decision 90 and exact inventory diff

Decision 90 is canonical and authorizes only this existing-file replacement in `test/contracts/schema.test.mjs`:

```diff
-    expect(schemaFiles).toHaveLength(26)
+    expect(schemaFiles).toHaveLength(31)
```

Structural exact-diff check: PASS. The complete file diff contains one deletion and one addition only. Final file SHA-256: `4f9daaf885263bdbfae3ffdc38273bbe69c8a46a92a01d1d1384b8b7e553af54`.

### Verification evidence

- Preserved RED: `bun test test/contracts/host-runtime/shapes.test.mjs` → exit 1; missing module; `0 pass, 1 fail, 1 error`.
- Check-only whitespace: `git diff --check` → exit 0, no output.
- Focused final: `bun test test/contracts/host-runtime/shapes.test.mjs test/contracts/schema.test.mjs` → `76 pass`, `0 fail`, `296 expect() calls`, 2 files.
- Directory final: `bun test test/contracts/host-runtime` → `4 pass`, `0 fail`, `73 expect() calls`, 1 file.
- Full exact final candidate (run once): `bun test` → `896 pass`, `0 fail`, `5169 expect() calls`, 69 files, 81.64s.
- Runtime harness: N/A — direct commit 1 adds dormant schemas and pure validation/identifier behavior; no runtime listener exists until direct commit 3.
- Resource check after tests: no live Bun processes matched `pgrep -af '(^|/)bun( |$)'`; no runtime process/resource was created by this boundary.

### Exact implementation boundary and snapshot

- `contracts/host-runtime/identifiers.mjs` — `932bb09a90ef2967188c1cc500384c49d99d239c6c39650d48621ae2a3245aa9`
- `contracts/host-runtime/index.mjs` — `890bd46a8a7966a1b5836150715d2af3bfd8801de474ee16f3429597723eb472`
- `contracts/host-runtime/schema-registry.mjs` — `2d352c25db6e1d02725d3c8f4dea2b650c46602a83c96a684d2fcd2e0dea8aca`
- `schemas/host-runtime-binding-v1.schema.json` — `3bd577dc7183fdb59ba7a7cb74d2bd431f950ba48d53e43183baca21dea34b52`
- `schemas/host-runtime-identity-v1.schema.json` — `a23fa1e4fd7b9709f3916f16f30a3a692de6f53ef0037f9cfb0ec416064e8171`
- `schemas/host-runtime-incarnation-v1.schema.json` — `5c01f87d2595852c5562f01be2432cef1d820d4e6629a238ebe363ad8cd33198`
- `schemas/host-runtime-process-v1.schema.json` — `0221f48b748d53d295fef42c79ffd3bac81da4c251c82e10c19e19b01279f04f`
- `schemas/host-runtime-worktree-v1.schema.json` — `42b1ef079fc0390538d394dbde7d44878c082021cdac22def3ca28a2f82b0917`
- `test/contracts/host-runtime/shapes.test.mjs` — `7f75b7f9e9beebccf9f5bdee7ce7e6d116387d81198bff57ddfde4a6bb825ad5`
- `test/contracts/schema.test.mjs` — `4f9daaf885263bdbfae3ffdc38273bbe69c8a46a92a01d1d1384b8b7e553af54`

Scoped numstat:

```text
11  0  contracts/host-runtime/identifiers.mjs
9   0  contracts/host-runtime/index.mjs
25  0  contracts/host-runtime/schema-registry.mjs
45  0  schemas/host-runtime-binding-v1.schema.json
19  0  schemas/host-runtime-identity-v1.schema.json
19  0  schemas/host-runtime-incarnation-v1.schema.json
19  0  schemas/host-runtime-process-v1.schema.json
19  0  schemas/host-runtime-worktree-v1.schema.json
70  0  test/contracts/host-runtime/shapes.test.mjs
1   1  test/contracts/schema.test.mjs
```

Authored additions + deletions: **238** (`<=400`).

Rollback boundary: remove the nine additive host-runtime implementation/test files and revert only the Decision-90 inventory assertion from 31 to 26. No adapter, broker, listener, package, install, durable data, or runtime state is involved.

### Review, retake, settlement, and immutable commit

- Initial native evidence failed: `sha256:25b51429537d0745f72619f6eb174b490ddacde080eb761c0c22fad4089d05ad`.
- Decision 90 authorized the single inventory assertion replacement documented above.
- The parent performed the reset/retake sequence; this checkpoint performed no acquire, settle, or reset mutation.
- The retaken candidate passed the exact focused, directory, full-suite, whitespace, resource, and no-Bun-leak checks recorded above.
- Formal `review-risk` remained typed unavailable because RDD is OFF and there was no controller candidate lineage. This was not converted into a fabricated approval.
- One focused verifier completed with PASS and no blockers.
- Native retake settled complete with passing evidence `sha256:6147a45e83a154bb4d711623a77c5d31f81f4190ed68067c46408a5854fbd082`, remediating the failed evidence above.
- Parent review hold is checked in `tasks.md`.
- Parent created immutable commit `4ba00b3557cdfee6d99bddbb6424eec51a3fce27` (`feat(contracts): add host-runtime v1 shapes`): 10 files, 237 insertions, 1 deletion, 238 authored lines (`<=400`).

Rollback boundary: revert commit `4ba00b3557cdfee6d99bddbb6424eec51a3fce27`. Semantically, this removes the nine additive host-runtime files and restores only the inventory assertion from 31 to 26; it does not affect adapters, brokers, listeners, packages, installation, durable data, or runtime state.

### Scope and state checks

The immutable commit contains only the ten paths listed above. The working tree now contains only separate planning/authority documentation artifacts: modified `openspec/plans/decision-register.md`, modified `openspec/plans/plan-4/STATUS.md`, and untracked S4.10 OpenSpec artifacts. No implementation diff remains. This metadata checkpoint changed only `tasks.md`, `apply-progress.md`, and their Engram mirrors; it ran no tests and performed no Git or native lifecycle mutation.

No push, PR, direct commit 2, or direct commit 3 work occurred.

### Remaining exact unchecked implementation tasks

#### Direct commit 2
- [ ] RED — add `test/contracts/host-runtime/ownership.test.mjs` cases using an injected `resolveContexts(binding)` seam that fail for missing components, crossed valid-looking tuples, duplicate complete tuples, and any first-match, sorting, normalization, or inferred-context behavior. <!-- sdd-owner: implementation -->
- [ ] GREEN — implement exact five-object context validation in `contracts/host-runtime/binding-context.mjs` (or a budget-equivalent local module) and typed failures for schema-invalid, missing, ambiguous, and crossed contexts; require exactly one schema-valid tuple whose IDs and port exactly match the binding. <!-- sdd-owner: implementation -->
- [ ] RED — add failing ownership cases for binding-history movement, a current owner attempting another binding, stale incarnation, and replay after release followed by permitted port/non-incarnation reuse. <!-- sdd-owner: implementation -->
- [ ] GREEN — implement the private in-memory ownership ledger in `contracts/host-runtime/ownership-registry.mjs` (or a budget-equivalent local module): immutable binding/incarnation history, active owner/port records, current-incarnation checks, and fail-closed stale/replay rejection without public handles or a sixth schema. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE / REFACTOR — verify both distinct contexts and mixed components, history preservation after release, and bounded neutral diagnostics; run `bun test test/contracts/host-runtime/ownership.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact results. <!-- sdd-owner: implementation -->
- [ ] Before direct commit 2, inspect the allowed-path diff, run the focused behavior review for context exactness/freshness, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

#### Direct commit 3
- [ ] RED — add `test/contracts/host-runtime/loopback.test.mjs` with a deferred injected `acquireAtReservation` seam proving pending-port serialization, one call with the exact validated five-object context and `binding.loopback_port`, a listener held before success, no pre-release close, and no second bind/adopt/transfer/rebind path. <!-- sdd-owner: implementation -->
- [ ] GREEN — extend the ownership registry with constructor-bound acquisition: record exact pending ownership before I/O, call acquisition once, recheck state after acquisition, retain only private close capability plus scalar ownership metadata, and return only `{ binding_id, incarnation_id, loopback_port }`. <!-- sdd-owner: implementation -->
- [ ] RED — add failing tests for reserved-port concurrency, externally occupied `127.0.0.1` ephemeral port, foreign/stale release, acquisition failure, post-acquisition cleanup uncertainty, and replay after a released port is reused. <!-- sdd-owner: implementation -->
- [ ] GREEN — add `contracts/host-runtime/node-loopback-acquisition.mjs` (or a budget-equivalent local module) that creates the final exclusive `127.0.0.1` listener during reservation; implement exact release only after confirmed private close, preserve active/cleanup-pending state on cleanup failure, and map occupied loopback errors to `CT_HOST_RUNTIME_PORT_OCCUPIED`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE / REFACTOR — prove real bounded loopback behavior: final listener remains occupied until exact release and is reusable only afterwards; prove results expose no socket, lease, close function, or host-specific value; run `bun test test/contracts/host-runtime/loopback.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact results. <!-- sdd-owner: implementation -->
- [ ] Before direct commit 3, inspect the allowed-path diff, run the focused behavior review for final-listener/no-gap/cleanup behavior, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

Parent-owned direct commit 1 review is checked. Parent-owned direct commit 2 and 3 reviews remain unchecked and byte-preserved in `tasks.md`.

### Structured status consumed

- Change: `s4-10-host-neutral-runtime`; artifact store: hybrid.
- Required spec, design, tasks, and previous apply-progress were retrieved from Engram and OpenSpec.
- Action context: workspace `/home/emili/projects/control-tower/Worktrees/implementer-1`; metadata-only checkpoint after parent commit; no source, test, schema, authority-document, Git, test-runner, acquire, settle, or reset action permitted.
- Workload boundary: commit 1 is 238 authored additions + deletions, within the 400-line ceiling.
- Direct commit 1 state: complete and immutable at `4ba00b3557cdfee6d99bddbb6424eec51a3fce27`.
- Next implementation checkpoint: direct commit 2 RED.
- Parent lifecycle boundary: apply continues with direct commits 2 and 3; no receipt or delivery gate was created or approved by this checkpoint.

## Direct commit 2 — exact context and freshness ownership

Status: implementation complete, uncommitted, and stopped before the parent-owned focused review/commit hold.

`ready_for_parent_review: true`
`next_checkpoint: parent review of direct commit 2`

### Completed implementation tasks and persisted checkboxes

- [x] RED — missing/crossed/ambiguous context and forbidden inference/normalization/first-match behavior.
- [x] GREEN — exact private five-object context validation with all five commit-1 validators and typed bounded failures.
- [x] RED — binding movement, second active binding, stale incarnation, immutable history, and replay after release/reuse.
- [x] GREEN — private in-memory current/retired ownership ledger with no listener, handle, acquisition, or sixth schema.
- [x] TRIANGULATE / REFACTOR — mixed/distinct contexts, all-component schema rejection, retained history, and neutral diagnostics.
- [ ] Before direct commit 2 — intentionally left unchecked for parent review/checkpoint/commit.

### TDD Cycle Evidence

| Task | RED | GREEN | TRIANGULATE / REFACTOR |
|---|---|---|---|
| T4.10.1.2 context | `bun test test/contracts/host-runtime/ownership.test.mjs` → exit 1; missing named export; `0 pass, 1 fail, 1 error` | focused → `5 pass, 0 fail, 45 expects` | final focused → `5 pass, 0 fail, 60 expects` |
| T4.10.1.2 ledger | Covered by the same initial missing-factory RED before production code | movement/active/stale/replay cases GREEN | directory and full suites GREEN; history remains private and immutable |

### Final verification

- Focused: `bun test test/contracts/host-runtime/ownership.test.mjs` → `5 pass`, `0 fail`, `60 expect() calls`, 1 file.
- Directory: `bun test test/contracts/host-runtime` → `9 pass`, `0 fail`, `133 expect() calls`, 2 files.
- Full final boundary (run once): `bun test` → `901 pass`, `0 fail`, `5229 expect() calls`, 70 files, 80.26s.
- Check-only: `git diff --check -- contracts/host-runtime/index.mjs` → exit 0; new files contain no whitespace errors by write/readback.
- Runtime harness: N/A — this boundary is an in-memory ledger only and intentionally performs no I/O or listener acquisition.

### Files and scoped budget

```text
50  0  contracts/host-runtime/binding-context.mjs
1   0  contracts/host-runtime/index.mjs
46  0  contracts/host-runtime/ownership-registry.mjs
96  0  test/contracts/host-runtime/ownership.test.mjs
```

Authored additions + deletions against immutable `4ba00b3557cdfee6d99bddbb6424eec51a3fce27`: **193** (`<=400`). No commit-1 schema or inventory file changed. Planning/authority docs already present in the working tree are outside this scoped count and were not modified by implementation.

Rollback boundary: remove `binding-context.mjs`, `ownership-registry.mjs`, and `ownership.test.mjs`, then remove only the ownership export line from `contracts/host-runtime/index.mjs`. Commit-1 validators, identifiers, schemas, and inventory remain intact. No runtime resource exists to close.

### Scope and lifecycle state

No acquisition seam, listener, concurrency/pending state, occupied-port handling, cleanup capability, commit-3 test, commit, push, PR, review lifecycle, native token acquire/settle/reset, or delivery action occurred. The parent-owned direct commit 2 review hold and implementation `Before direct commit 2` row remain unchecked. All direct commit 3 rows remain unchecked.

### Remaining exact unchecked implementation tasks

- [ ] Before direct commit 2, inspect the allowed-path diff, run the focused behavior review for context exactness/freshness, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->
- [ ] RED — add `test/contracts/host-runtime/loopback.test.mjs` with a deferred injected `acquireAtReservation` seam proving pending-port serialization, one call with the exact validated five-object context and `binding.loopback_port`, a listener held before success, no pre-release close, and no second bind/adopt/transfer/rebind path. <!-- sdd-owner: implementation -->
- [ ] GREEN — extend the ownership registry with constructor-bound acquisition: record exact pending ownership before I/O, call acquisition once, recheck state after acquisition, retain only private close capability plus scalar ownership metadata, and return only `{ binding_id, incarnation_id, loopback_port }`. <!-- sdd-owner: implementation -->
- [ ] RED — add failing tests for reserved-port concurrency, externally occupied `127.0.0.1` ephemeral port, foreign/stale release, acquisition failure, post-acquisition cleanup uncertainty, and replay after a released port is reused. <!-- sdd-owner: implementation -->
- [ ] GREEN — add `contracts/host-runtime/node-loopback-acquisition.mjs` (or a budget-equivalent local module) that creates the final exclusive `127.0.0.1` listener during reservation; implement exact release only after confirmed private close, preserve active/cleanup-pending state on cleanup failure, and map occupied loopback errors to `CT_HOST_RUNTIME_PORT_OCCUPIED`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE / REFACTOR — prove real bounded loopback behavior: final listener remains occupied until exact release and is reusable only afterwards; prove results expose no socket, lease, close function, or host-specific value; run `bun test test/contracts/host-runtime/loopback.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact results. <!-- sdd-owner: implementation -->
- [ ] Before direct commit 3, inspect the allowed-path diff, run the focused behavior review for final-listener/no-gap/cleanup behavior, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

### Structured status consumed

- Change: `s4-10-host-neutral-runtime`; artifact store: hybrid; strict TDD active with `bun test`.
- Action context: authoritative workspace `/home/emili/projects/control-tower/Worktrees/implementer-1`; edit roots limited to implementation paths plus task/apply metadata.
- Immutable base: `4ba00b3557cdfee6d99bddbb6424eec51a3fce27`; active native token remains parent-held and untouched.
- Workload path: direct commit 2 only, 193 authored lines; no size exception required.
- Parent lifecycle boundary: stop now for parent review/commit; do not begin direct commit 3.

### Direct commit 2 scoped pre-commit correction — direct fail-closed coverage

Status: the originating focused verifier's sole BLOCK was corrected with direct observable tests only. Production code was unchanged. `ready_for_targeted_recheck: true`.

Added direct assertions in `test/contracts/host-runtime/ownership.test.mjs` for:

- invalid input binding → `CT_HOST_RUNTIME_SCHEMA_INVALID`;
- resolver non-array and candidate tuples of lengths 4 and 6 → `CT_HOST_RUNTIME_CONTEXT_MISSING`;
- absent, omitted, or non-function `resolveContexts` constructor dependency → stable `TypeError("resolveContexts must be a function")`;
- a distinct active owner colliding on the current port → `CT_HOST_RUNTIME_PORT_RESERVED`;
- foreign binding, stale-incarnation, and already-released release attempts → `CT_HOST_RUNTIME_NOT_OWNER`.

Strict TDD phase: TRIANGULATE / REFACTOR coverage of existing rejection behavior; no new production RED was required and no implementation bug was exposed.

Final correction verification:

- Focused: `bun test test/contracts/host-runtime/ownership.test.mjs` → `8 pass`, `0 fail`, `84 expect() calls`, 1 file.
- Directory: `bun test test/contracts/host-runtime` → `12 pass`, `0 fail`, `157 expect() calls`, 2 files.
- Full: `bun test` → `904 pass`, `0 fail`, `5253 expect() calls`, 70 files, 79.31s.
- Check-only: `git diff --check` → exit 0, no output.
- Runtime harness: N/A — commit 2 remains an in-memory ledger with no I/O or listener acquisition.

Corrected commit-2 scoped numstat against immutable `4ba00b3557cdfee6d99bddbb6424eec51a3fce27`:

```text
50  0  contracts/host-runtime/binding-context.mjs
1   0  contracts/host-runtime/index.mjs
46  0  contracts/host-runtime/ownership-registry.mjs
129 0  test/contracts/host-runtime/ownership.test.mjs
```

Authored additions + deletions: **226** (`<=400`). Rollback boundary is unchanged: remove the three new files and only the ownership export line from `contracts/host-runtime/index.mjs`.

The `Before direct commit 2` implementation checkpoint and parent-owned direct commit 2 focused-review hold remained unchecked at that historical correction checkpoint pending targeted recheck. Every direct commit 3 row remained unchecked; no commit-3 work began. No commit, push, PR, lifecycle action, or native token acquire/settle/reset occurred in that correction checkpoint. Parent-held token `sha256:e0a3ee1f2faddfcb19a8c856fbb5dd9a13bf3fcc3dcf2a02fe59c73d0aefc886` remained untouched.

## Direct commit 2 — immutable checkpoint after commit

Status: complete and immutable at `0b4f8802b355e4036c1d3426e0613e6951916824` (`feat(contracts): enforce exact runtime binding freshness`). Commit 1 history remains valid and unchanged.

`ready_for_parent_review: false`
`next_checkpoint: direct commit 3 RED`

### Final boundary, TDD, and review evidence

- Exact boundary: 4 paths, 226 authored additions + deletions (`<=400`).
- Strict TDD RED: absent named export.
- Focused: `bun test test/contracts/host-runtime/ownership.test.mjs` → `8 pass`, `0 fail`, `84 expect() calls`.
- Directory: `bun test test/contracts/host-runtime` → `12 pass`, `0 fail`, `157 expect() calls`.
- Full: `bun test` → `904 pass`, `0 fail`, `5253 expect() calls`.
- Check-only: `git diff --check` → PASS.
- Runtime harness: N/A — this boundary is an in-memory ledger with no I/O or listener.

The initial focused verifier BLOCKED on missing direct fail-closed branch coverage. A single test-only correction in `test/contracts/host-runtime/ownership.test.mjs` added direct coverage for invalid bindings, malformed resolver results and tuple lengths, invalid constructor dependency, active-port collision, and foreign/stale/already-released release attempts. Production code was unchanged. The targeted recheck PASSED.

Native attempt settled complete with evidence `sha256:efac3005863c977c85e43ac13e467d3bbc300ed55336a428978fddce9a1be8a5`. RDD remained OFF; this checkpoint created or approved no receipt and performed no lifecycle action.

### Rollback boundary

Remove `contracts/host-runtime/binding-context.mjs`, `contracts/host-runtime/ownership-registry.mjs`, and `test/contracts/host-runtime/ownership.test.mjs`, then remove only the ownership export from `contracts/host-runtime/index.mjs`. Direct commit 1 at `4ba00b3557cdfee6d99bddbb6424eec51a3fce27` remains valid.

### Exact current state

All direct commit 1 and direct commit 2 implementation rows are checked. Parent review holds for direct commits 1 and 2 are checked. Every direct commit 3 implementation row and its parent hold remain unchecked and byte-preserved.

No source, test, schema, Git, test-runner, commit, push, PR, acquire, settle, reset, receipt, or delivery mutation was performed by this metadata-only checkpoint. It consumed exact HEAD `0b4f8802b355e4036c1d3426e0613e6951916824` with planning/authority artifacts only.

### Remaining exact unchecked implementation tasks

- [ ] RED — add `test/contracts/host-runtime/loopback.test.mjs` with a deferred injected `acquireAtReservation` seam proving pending-port serialization, one call with the exact validated five-object context and `binding.loopback_port`, a listener held before success, no pre-release close, and no second bind/adopt/transfer/rebind path. <!-- sdd-owner: implementation -->
- [ ] GREEN — extend the ownership registry with constructor-bound acquisition: record exact pending ownership before I/O, call acquisition once, recheck state after acquisition, retain only private close capability plus scalar ownership metadata, and return only `{ binding_id, incarnation_id, loopback_port }`. <!-- sdd-owner: implementation -->
- [ ] RED — add failing tests for reserved-port concurrency, externally occupied `127.0.0.1` ephemeral port, foreign/stale release, acquisition failure, post-acquisition cleanup uncertainty, and replay after a released port is reused. <!-- sdd-owner: implementation -->
- [ ] GREEN — add `contracts/host-runtime/node-loopback-acquisition.mjs` (or a budget-equivalent local module) that creates the final exclusive `127.0.0.1` listener during reservation; implement exact release only after confirmed private close, preserve active/cleanup-pending state on cleanup failure, and map occupied loopback errors to `CT_HOST_RUNTIME_PORT_OCCUPIED`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE / REFACTOR — prove real bounded loopback behavior: final listener remains occupied until exact release and is reusable only afterwards; prove results expose no socket, lease, close function, or host-specific value; run `bun test test/contracts/host-runtime/loopback.test.mjs`, then `bun test test/contracts/host-runtime` and `bun test`, recording exact results. <!-- sdd-owner: implementation -->
- [ ] Before direct commit 3, inspect the allowed-path diff, run the focused behavior review for final-listener/no-gap/cleanup behavior, save test evidence and the reverse-order rollback boundary to Engram `sdd/s4-10-host-neutral-runtime/apply-progress`, measure `git diff --numstat` as authored additions + deletions (must be `<=400`), and commit only this boundary. <!-- sdd-owner: implementation -->

### Structured status consumed

- Change: `s4-10-host-neutral-runtime`; artifact store: hybrid; strict TDD active with `bun test`.
- Action context: authoritative workspace `/home/emili/projects/control-tower/Worktrees/implementer-1`; metadata-only edits limited to task/apply mirrors.
- Immutable HEAD: `0b4f8802b355e4036c1d3426e0613e6951916824`.
- Workload boundary: direct commit 2 is 226 authored lines, within the 400-line ceiling.
- Next implementation checkpoint: direct commit 3 RED.
- Parent lifecycle boundary: apply continues with direct commit 3; no receipt or delivery gate was created or approved here.

## Direct commit 3 — final loopback listener acquisition

Status: implementation complete and stopped before the parent-owned review/checkpoint/commit rows. `ready_for_parent_review: true`.

### Completed implementation tasks and persisted checkboxes

The first five T4.10.1.3 implementation rows are checked: acquire-at-reservation RED/GREEN, collision/cleanup RED/GREEN, and real-loopback TRIANGULATE/REFACTOR. `Before direct commit 3` and the parent focused-review hold remain unchecked and byte-preserved.

### TDD Cycle Evidence

| Cycle | RED | GREEN / final evidence |
|---|---|---|
| Exact acquisition and pending serialization | focused exit 1: `service.reserve is not a function`; 0 pass, 1 fail | exact five-object reference plus port observed once; pending collision rejected; held-before-success; no pre-release close or transfer/adopt/rebind surface |
| Collision, cleanup, replay, real listener | cleanup-uncertainty assertion failed while the disposal promise correctly resolved; 3 pass, 1 fail | corrected observable contract: reservation fails `CT_HOST_RUNTIME_CLEANUP_FAILED`; focused 4 pass, 0 fail, 16 expects |

### Final verification and real-loopback proof

- Focused: `bun test test/contracts/host-runtime/loopback.test.mjs` → 4 pass, 0 fail, 16 expects.
- Directory: `bun test test/contracts/host-runtime` → 16 pass, 0 fail, 173 expects.
- Full final boundary, run once: `bun test` → 908 pass, 0 fail, 5269 expects, 71 files, 100.53s.
- `git diff --check` → PASS.
- Real bounded Node evidence used an OS-assigned ephemeral `127.0.0.1` port: reserve made a competing exclusive listen fail `EADDRINUSE`; foreign release did not free it; exact release made the same port reusable. A separately held ephemeral listener mapped to `CT_HOST_RUNTIME_PORT_OCCUPIED`.
- Cleanup proof: every test service is disposed with `Promise.allSettled`; final post-test `pgrep` check recorded separately below. Public acknowledgements contain only `binding_id`, `incarnation_id`, and `loopback_port`; no socket, lease, close capability, hostname, transfer, adoption, or rebind API is exposed.

### Files, budget, and rollback

```text
60  14  contracts/host-runtime/ownership-registry.mjs
20   0  contracts/host-runtime/node-loopback-acquisition.mjs
87   0  test/contracts/host-runtime/loopback.test.mjs
```

Authored additions + deletions against immutable `0b4f8802b355e4036c1d3426e0613e6951916824`: **181** (`<=400`). Paths are limited to the assigned implementation roots; commits 1–2 public schemas/shapes remain unchanged.

Rollback boundary: remove `node-loopback-acquisition.mjs` and `loopback.test.mjs`, and revert only the commit-3 pending/acquisition/private-close/dispose extension in `ownership-registry.mjs`; commit-2 synchronous metadata-only `activate`/`release` behavior remains.

### Structured status consumed

- Change: `s4-10-host-neutral-runtime`; hybrid artifact store; Strict TDD active with `bun test`.
- Authoritative workspace: `/home/emili/projects/control-tower/Worktrees/implementer-1`; implementation edits stayed within `contracts/host-runtime/**` and `test/contracts/host-runtime/**`, plus allowed tasks/apply metadata.
- Immutable HEAD: `0b4f8802b355e4036c1d3426e0613e6951916824`; parent-held native token `sha256:116c6711773c418143beba8fb00efbcfc3ae242d9b2c35009887acc7c20b43aa` was not acquired, settled, or reset.
- Remaining exact unchecked implementation row: `- [ ] Before direct commit 3, inspect the allowed-path diff, run the focused behavior review for final-listener/no-gap/cleanup behavior, save test evidence and the reverse-order rollback boundary to Engram \`sdd/s4-10-host-neutral-runtime/apply-progress\`, measure \`git diff --numstat\` as authored additions + deletions (must be \`<=400\`), and commit only this boundary. <!-- sdd-owner: implementation -->`
- Deferred lifecycle action: parent-owned direct commit 3 focused review remains unchecked. No commit, push, PR, or lifecycle action occurred.

### Direct commit 3 scoped pre-commit correction — resilience and direct release coverage

Status: all three originating verifier findings were corrected within the existing commit-3 boundary. `ready_for_targeted_recheck: true`.

#### TDD Cycle Evidence

| Cycle | RED | GREEN / TRIANGULATE |
|---|---|---|
| Pending acquisition vs dispose | Focused test failed because `dispose()` resolved before cleanup-pending emerged; initial correction RED run: 3 pass, 3 fail (dispose false success, retry/concurrency coverage), followed by isolated RED confirmation | `dispose()` marks teardown first, awaits every tracked reservation operation, then snapshots active and cleanup-pending resources; cleanup failure remains retained and makes disposal fail. Regression proves two failed close attempts and no false success/resource loss. |
| Exact release concurrency/retry | Concurrent exact releases invoked the injected close twice (`Expected: 1, Received: 2`) | Registry stores one in-flight release promise per active record before invoking close. Concurrent callers share it; success removes authority once; failure clears only the in-flight guard while preserving active authority for a safe retry. |
| Node close idempotence | Covered by the same focused RED batch | Node acquisition stores the first close promise immediately; every concurrent or later close call receives that same result, so the underlying `server.close` is invoked at most once. |
| Stale/already-released direct coverage | Direct synchronous already-released release initially surfaced `CT_HOST_RUNTIME_NOT_OWNER`; test harness wrapped it as an observable rejection | Direct stale-incarnation and already-released attempts assert `CT_HOST_RUNTIME_STALE` / `CT_HOST_RUNTIME_NOT_OWNER` and prove the close count does not change. Active close failure proves authority remains and the next exact release retries safely. |

#### Final verification

- Focused: `bun test test/contracts/host-runtime/loopback.test.mjs` → **6 pass, 0 fail, 25 expects**.
- Directory: `bun test test/contracts/host-runtime` → **18 pass, 0 fail, 182 expects**.
- Full: `bun test` → **910 pass, 0 fail, 5278 expects, 71 files, 99.67s**.
- Diff checks: tracked `git diff --check` and untracked-file `git diff --no-index --check` → PASS, no output.
- Leak check: `pgrep -af '(^|/)bun( |$)'` → no output after all tests.
- Runtime cleanup: real loopback listeners were closed and their ephemeral ports were reusable; no Bun process or listener handle remained.

#### Corrected boundary and scope

```text
76  14  contracts/host-runtime/ownership-registry.mjs
16   0  contracts/host-runtime/node-loopback-acquisition.mjs
116  0  test/contracts/host-runtime/loopback.test.mjs
```

Authored additions + deletions against immutable `0b4f8802b355e4036c1d3426e0613e6951916824`: **222** (`<=400`). No decision or scope expansion was exposed. Public API and the five public shapes are unchanged; no S4.11, broker, adapter, stop, install, or packaging behavior was added.

Rollback boundary remains commit 3 only: remove the additive Node acquisition and loopback test files and revert the pending/acquisition/private-close/dispose additions in `ownership-registry.mjs`. Commits 1–2 remain valid.

The exact unchecked implementation row `- [ ] Before direct commit 3, inspect the allowed-path diff, run the focused behavior review for final-listener/no-gap/cleanup behavior, save test evidence and the reverse-order rollback boundary to Engram \`sdd/s4-10-host-neutral-runtime/apply-progress\`, measure \`git diff --numstat\` as authored additions + deletions (must be \`<=400\`), and commit only this boundary. <!-- sdd-owner: implementation -->` remains pending targeted recheck and parent checkpoint. The parent-owned direct commit 3 review hold remains byte-preserved and unchecked.

Structured status: hybrid store; Strict TDD active; authoritative workspace `/home/emili/projects/control-tower/Worktrees/implementer-1`; edits stayed within the three assigned implementation paths plus apply-progress metadata. Parent-held token `sha256:116c6711773c418143beba8fb00efbcfc3ae242d9b2c35009887acc7c20b43aa` remained untouched. No acquire, settle, reset, commit, push, PR, receipt, or lifecycle mutation occurred.

### Direct commit 3 maintainer-authorized terminal-disposal retake

Status: the single retake authorized after reset revision `sha256:3e35a40e...` is complete and `ready_for_final_recheck: true`. It remediates failed evidence `sha256:de11...` and is bound to the parent-held active retake token `sha256:f47b1b2c213c1bdcaf1e8e25bdf157f9f39fc1b77709bfa1139dfd7731db357e`, which this apply did not acquire, settle, or reset. Native revision `bb241...` was consumed from parent context; no second correction or retake was attempted.

#### TDD Cycle Evidence

| Cycle | RED | GREEN / TRIANGULATE |
|---|---|---|
| Private terminal disposal gate and late reservation | `bun test test/contracts/host-runtime/loopback.test.mjs` → exit 1; **6 pass, 1 fail, 27 expects**. The late reservation invoked acquisition once (`Expected: 0`, `Received: 1`). | Focused final → **7 pass, 0 fail, 29 expects**. A reservation started after the disposal gate rejects with existing `CT_HOST_RUNTIME_CLEANUP_FAILED`; acquisition remains at zero both while disposing and after disposed. |

#### Code semantics

- The ownership registry now keeps private lifecycle state `accepting → disposing → disposed`.
- `dispose()` changes the state to `disposing` synchronously, returns one stable disposal promise, waits every reservation admitted while `accepting`, closes the complete active and cleanup-pending snapshot, and reaches terminal `disposed` in `finally`.
- `reserve()` started after the gate returns the existing fail-closed cleanup rejection before validation or acquisition, so no resource can appear after successful disposal.
- Reservations admitted before the gate retain the existing tracked quiescence and cleanup behavior. No public API, error code, serialized shape, Node acquisition, adapter, broker, install, or S4.11 behavior changed.

#### Final verification

- Focused: `bun test test/contracts/host-runtime/loopback.test.mjs` → **7 pass, 0 fail, 29 expects**.
- Directory: `bun test test/contracts/host-runtime` → **19 pass, 0 fail, 186 expects**.
- Full: `bun test` → **911 pass, 0 fail, 5282 expects, 71 files, 103.18s**.
- Diff checks: `git diff --check` plus check-only reads of both untracked commit-3 files → PASS, no output.
- Leak check: `pgrep -af '(^|/)bun( |$)'` → no output.

#### Exact commit-3 boundary from `0b4f8802b355e4036c1d3426e0613e6951916824`

```text
85  14  contracts/host-runtime/ownership-registry.mjs
16   0  contracts/host-runtime/node-loopback-acquisition.mjs
127  0  test/contracts/host-runtime/loopback.test.mjs
```

Authored additions + deletions: **242** (`<=400`). Changed implementation paths are exactly the three listed above. Rollback remains commit 3 only: remove the two additive files and revert the commit-3 ownership-registry extension; commits 1–2 remain valid.

The implementation-owned `Before direct commit 3` row and parent-owned direct commit 3 hold remain unchecked, as required. No commit, push, PR, authority-document edit, lifecycle mutation, or second correction occurred.

Structured status: authoritative hybrid/OpenSpec workspace; required spec, design, tasks, previous apply progress, proposal, config, source, and tests were consumed. Strict TDD was active. Allowed edit roots were the two named implementation files plus this cumulative apply-progress artifact. `ready_for_final_recheck: true`; next action is parent lifecycle final recheck.

### Direct commit 3 final maintainer-authorized dispose/release coalescing retake

Status: the second and final maintainer-authorized retake at reset revision `sha256:a3bdf...` is complete and `ready_for_final_verifier: true`. It remediates failed evidence `sha256:0a43...` and is bound to parent-held token `sha256:5f253b477223a23631fa2c844ce8f098e6d24af98b61bd6289c63f511de15a17`, which this apply did not acquire, settle, or reset. Any final verifier BLOCK ends work; no third correction is authorized.

#### TDD Cycle Evidence

| Cycle | RED | GREEN / TRIANGULATE |
|---|---|---|
| Concurrent `dispose()` plus exact `release()` | `bun test test/contracts/host-runtime/loopback.test.mjs` → exit 1; **7 pass, 1 fail, 30 expects**. After disposal began closing the active record, exact release invoked the underlying close a second time (`Expected: 1`, `Received: 2`); the failing assertion left the deferred close unresolved and the test hook timed out. | Focused final → **8 pass, 0 fail, 34 expects**. `closeRecord(record)` registers one promise in `releaseInFlight` before the microtask invokes `record.close()`. Both disposal and release call that helper, reuse the same promise, remove active/cleanup state once on success, return the same bounded acknowledgement to release, and clear only the guard on failure so retry semantics remain intact. |

#### Final verification

- Focused: `bun test test/contracts/host-runtime/loopback.test.mjs` → **8 pass, 0 fail, 34 expects**.
- Directory: `bun test test/contracts/host-runtime` → **20 pass, 0 fail**, 3 files.
- Full: `bun test` → **912 pass, 0 fail, 5287 expects**, 71 files, 109.73s.
- Diff checks: tracked `git diff --check` and check-only reads of both additive files → PASS, no output.
- Leak check: `pgrep -af '(^|/)bun( |$)'` → no output.

#### Exact commit-3 boundary and authored retake

Boundary from immutable HEAD `0b4f8802b355e4036c1d3426e0613e6951916824`:

```text
89  14  contracts/host-runtime/ownership-registry.mjs
16   0  contracts/host-runtime/node-loopback-acquisition.mjs
143  0  test/contracts/host-runtime/loopback.test.mjs
```

Authored additions + deletions: **262** (`<=400`). Scoped status proves exactly those same three commit-3 paths differ. This retake authored changes only in `ownership-registry.mjs` and `loopback.test.mjs`: one shared close-promise helper/reuse path and one direct concurrent regression. `node-loopback-acquisition.mjs` remained byte-unchanged with SHA-256 `a382736eb46e40915130d6074a33434d2706280381e0caa0a1cb28e678b4bcc6`, matching the pre-retake candidate hash.

Rollback remains commit 3 only: remove the additive Node acquisition and loopback test files and revert the commit-3 ownership-registry extension. Commits 1–2 remain valid. Public APIs, errors, and serialized shapes are unchanged; no new path, S4.11, adapter, broker, install, acquisition-module edit, commit, push, PR, or lifecycle mutation occurred.

The implementation-owned `Before direct commit 3` row and parent-owned direct commit 3 review hold remain unchecked pending the FINAL verifier and parent commit action. Structured status consumed: authoritative hybrid/OpenSpec workspace; Strict TDD active; exact allowed implementation roots were honored; workload boundary is 262 authored lines; next action is `parent-lifecycle` FINAL verifier.

## Direct commit 3 — immutable final checkpoint after verifier and commit

Status: complete and immutable at `28163d2d332153c342e68f8ed72538c69e99301d` (`feat(contracts): own loopback reservations by exact binding`). This final checkpoint merges the initial commit-3 implementation, scoped correction, terminal-disposal reset/retake, final dispose/release coalescing reset/retake, verifier result, native settlement, and immutable commit while preserving all commit 1–2 history above.

`ready_for_parent_review: false`
`next_checkpoint: sdd-verify`

### Completed task and persisted checkbox state

- [x] Before direct commit 3 — allowed-path diff, focused final-listener/no-gap/cleanup review, strict-TDD evidence, leak/diff checks, `<=400` measurement, native settlement, and immutable commit are complete.
- All **17 implementation-owned** task rows are visibly `[x]` in `tasks.md`.
- All **3 parent-owned** review-hold rows are visibly `[x]` in `tasks.md`.
- Exact total task state: **20/20 checked; 0 unchecked**. No task was added or reworded.

### Final commit-3 TDD and verification evidence

- Final retake RED was reproduced twice: focused loopback **7 pass, 1 fail, 30 expects**; concurrent `dispose()` plus exact `release()` attempted a second close before the shared gate was resolved.
- GREEN focused: `bun test test/contracts/host-runtime/loopback.test.mjs` → **8 pass, 0 fail, 34 expects**.
- Directory: `bun test test/contracts/host-runtime` → **20 pass, 0 fail**, 3 files.
- Full: `bun test` → **912 pass, 0 fail, 5287 expects**, 71 files.
- Diff checks and leak check: PASS.
- Final semantics: the terminal disposal gate prevents late acquisition; `dispose()` and exact `release()` share one `releaseInFlight` promise, invoke close once, remove authority once after success, and preserve retry authority after failure.
- Final verifier: **PASS** for terminal gate, one shared dispose/release promise, close-once behavior, and preserved retry authority.

### Exact immutable boundary, settlement, and rollback

- Commit: `28163d2d332153c342e68f8ed72538c69e99301d` — `feat(contracts): own loopback reservations by exact binding`.
- Boundary: **3 paths, +248/-14 = 262 authored lines** (`<=400`).
- Native settle: complete with passing evidence `sha256:62b9b6cc37e25be3d12f5f6e3976491ee7e97184e77738fe5b012047dcb287d4`, remediating `sha256:0a43e56e1e59a5303edab03c851354d796b04851dd8dc471fecfd2d4dae8631c`.
- Parent review hold was already checked before this metadata checkpoint.
- Rollback: revert commit `28163d2d332153c342e68f8ed72538c69e99301d` to restore direct commit 2 at `0b4f8802b355e4036c1d3426e0613e6951916824`. This removes the additive Node acquisition and loopback test files and reverts only commit-3 ownership-registry behavior; commits 1–2 remain intact.

### Final structured status consumed

- Change: `s4-10-host-neutral-runtime`; artifact store: hybrid; Strict TDD evidence was supplied by the immutable implementation boundary.
- Authoritative workspace: `/home/emili/projects/control-tower/Worktrees/implementer-1`; exact HEAD supplied by parent: `28163d2d332153c342e68f8ed72538c69e99301d`.
- Action context: metadata-only edits limited to `tasks.md`, `apply-progress.md`, and their Engram mirrors. No code, tests, Git, review, receipt, native lifecycle, push, PR, or release action was performed here.
- Workload / PR boundary: direct commit 3 is 262 authored lines, within its 400-line ceiling; repository delivery remains three sequential immutable direct commits with no PR.
- Remaining tasks: none.
- RDD remains OFF under the manual override; no receipt was created or claimed.
- Next recommended phase: `verify`.

## S4.10 ownership remediation successor after integral verify failure

Status: maintainer-authorized remediation is implemented and stopped before parent review/commit. `ready_for_parent_review: true`; `ready_for_parent_review` is not a verify PASS. The failed `verify-report.md` remains unchanged and authoritative until the parent reruns integral verification.

### Authority and preserved history

- Immutable remediation base: `28163d2d332153c342e68f8ed72538c69e99301d`; commits 1–3 were not modified.
- Parent-supplied reset revision: `sha256:115365...`; failed evidence: `sha256:03bb62...`.
- Parent-held remediation token `sha256:d89d9709bc258f505039ae9aeb4923f60559c0eeaa0466a914c6936cffd8f158` remained untouched: no acquire, settle, or reset occurred.
- RDD remained OFF. No review lifecycle, commit, push, PR, receipt, archive, or verify-report mutation occurred.

### TDD Cycle Evidence

| Cycle | RED against `28163d2...` | GREEN / TRIANGULATE |
|---|---|---|
| Acquisition-free ownership surface | Focused ownership + loopback run failed because the service still exposed `activate`; the differential service-key assertions received `activate,dispose,release,reserve` instead of `dispose,release,reserve`. | Removed `activate` from the private factory return surface and migrated every ownership test to `reserve()` with an exact deterministic constructor-bound `acquireAtReservation` fake returning a private async close capability. Existing validation, history, collision, release, and bounded-diagnostic intent remains covered. |
| Cleanup-pending port reuse | Differential regression created cleanup uncertainty after a successful acquisition/post-await publication race; a later binding on the same port resolved instead of rejecting. | Reservation preflight now treats any cleanup-pending record with the requested port as occupied and rejects `CT_HOST_RUNTIME_PORT_RESERVED`; it neither displaces, adopts, nor reuses the uncertain record. |

The first malformed migration run had a test syntax error and was immediately corrected before production work; the valid RED then reported 13 pass / 5 fail, including both authorized differential defects. Minimum production GREEN changed only `ownership-registry.mjs`.

### Exact changes

- `contracts/host-runtime/ownership-registry.mjs`: removed the acquisition-free `activate` operation and its export; reservation preflight scans retained cleanup-pending records by exact numeric port and fails closed with the existing reserved-port contract.
- `test/contracts/host-runtime/ownership.test.mjs`: migrated all former `activate()` usage to awaited `reserve()` calls using one deterministic fake acquisition returning a private close capability; retained stable error code and bounded diagnostic assertions.
- `test/contracts/host-runtime/loopback.test.mjs`: added differential regressions proving the public service has no `activate` path and a cleanup-pending port cannot be reserved by a later binding; updated the existing service-surface assertion.

No new path, public shape, API shape, error code, adapter, broker, installer, package, S4.11 behavior, or unrelated cleanup was added.

### Final verification evidence

- Focused ownership + loopback: `bun test test/contracts/host-runtime/ownership.test.mjs test/contracts/host-runtime/loopback.test.mjs` → **18 pass, 0 fail, 122 expects**, 2 files.
- Host-runtime directory: `bun test test/contracts/host-runtime` → **22 pass, 0 fail, 195 expects**, 3 files.
- Full suite: `bun test` → **914 pass, 0 fail, 5291 expects**, 71 files, 108.42s.
- Import check: `bun --eval 'await import("./contracts/host-runtime/index.mjs"); console.log("import ok")'` → `import ok`.
- Diff check: `git diff --check` → PASS, no output.
- Differential absence check: no callable `.activate(` remains in `contracts/host-runtime/**` or `test/contracts/host-runtime/**`; direct service assertion proves `service.activate === undefined`.
- Leak checks: no Bun process and no Bun-owned listening socket remained.

### Successor boundary, budget, and rollback

Scoped numstat from `28163d2d332153c342e68f8ed72538c69e99301d`:

```text
3   7   contracts/host-runtime/ownership-registry.mjs
24  1   test/contracts/host-runtime/loopback.test.mjs
42  35  test/contracts/host-runtime/ownership.test.mjs
```

Authored additions + deletions: **112** (`<=400`). The successor is one coherent ownership remediation boundary. Parent-provided commit message after parent review and integral verify PASS: `fix(contracts): close runtime ownership gaps`.

Rollback boundary: revert only these three uncommitted path diffs to exact HEAD `28163d2...`; this restores the prior `activate` surface, prior cleanup preflight, and prior tests without altering immutable commits 1–3 or planning authority files.

### Persisted task state and next action

The canonical tasks artifact was re-read: all 17 implementation-owned and 3 parent-owned rows remain visibly `[x]` (20/20). No successor checkbox existed, so no task line was invented or reworded. The failed verify report remains FAIL. Next action is `parent-lifecycle`: parent review followed by integral verify; commit only after PASS.

Structured action context consumed: repo-local authoritative workspace `/home/emili/projects/control-tower/Worktrees/implementer-1`; allowed edits limited to the three existing implementation/test paths and cumulative apply-progress mirrors. Existing unrelated modifications in `openspec/plans/decision-register.md` and `openspec/plans/plan-4/STATUS.md` were not touched.
