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
