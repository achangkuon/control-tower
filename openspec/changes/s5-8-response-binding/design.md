# Design: Atomic Main Authorization Response Binding

## Decision summary

Preserve the maintainer-approved **Option B**: extend the existing `consumeAuthorization(input)` operation with an optional response-bearing mode and persist the complete `parked-decision-response-v1` inside `terminal_audit` of the same authorization record whose state becomes terminal. There is no second public method, authority, writer, file, store, or transaction.

The response path uses one Jornada lock, the existing authorization CAS, and one `atomicWrite` replacement. Exact replay is allowed only after the supplied request has passed the same stable authorization-context and cross-record binding gate as the original transition. A terminal record is not treated as PENDING: replay reconstructs and validates its consumed PENDING anchor from `revision_history` and `terminal_audit` before it can return.

Atomic visibility and durable completion are distinct. The one-file rename makes response and terminal state visible together. The unchanged-byte guarantee applies only before `renameSync`. If the parent-directory `fsyncSync` fails after rename, the outcome is reported as a post-replacement durability error: no rollback is claimed, no automatic retry occurs, and a subsequent canonical read/reconciliation determines whether the terminal record is visible.

## Approved Session contract

| Topic | Preserved decision |
|---|---|
| Option | Option B: explicit `parked-decision-response-v1` in the same Main authorization record, lock, CAS, and transaction as the terminal transition. |
| Área | `main-store/store.mjs`, `test/main-store.test.mjs` |
| Recurso | authorization store de Main, bajo `assertMain` y su mismo lock/transacción; exclusividad sobre sus transiciones. Sin DB y sin token de entrega. |
| Authority | Existing `assertMain`; no alternate actor, capability, authority method, or composition root. |
| Compatibility | Calls without both response fields retain the existing MERGE and START_JORNADA behavior. Existing records require no migration. |
| Stop boundary | Keep the 280–390 authored-line forecast. Stop before material 390/400-line risk, a forbidden path, atomicity doubt, or a new always-escalate decision. |

## Verified existing integration surface

The following names and behaviors were verified in the current repository; none is hypothetical:

| Existing symbol/API | Verified contract used by S5.8 |
|---|---|
| `createMainStore({ root, authority, capability, beforeCommit })` in `main-store/store.mjs` | Owns the Main store and the existing pre-rename failure seam. |
| `consumeAuthorization(input)` | Existing terminal-transition operation to extend; no new response operation is introduced. |
| `assertMain(input)` | Revalidates the bound capability, requires actor `MAIN`, enforces project identity, and rejects credential-bearing input. |
| `commit(kind, id, input, expectedRevision)` | Rechecks the current store revision, appends the prior record to `revision_history`, and delegates one replacement to `atomicWrite`. |
| `atomicWrite(path, value, validate)` | Writes and fsyncs a temporary file, calls `beforeCommit`, acquires the record lock, rechecks CAS, renames, then fsyncs the parent directory. |
| `withLock(path, operation)` | Existing filesystem lock; response transitions preserve Jornada lock outside authorization lock. |
| `readAuthorization(id)` / `readJornada(id)` | Existing canonical read surfaces used for reconciliation and Jornada validation. |
| `validate(schemaName, input)` | Existing registered schema/invariant validator already imported by the Main store; S5.8 uses the registered `parkedDecision` and `parkedDecisionResponse` entries rather than local shape checks. |
| `assertParkedDecisionResponseBinding(response, parkedDecision)` | S5.7 exported final cross-record validation for parked-decision identity, digest, option, and snapshot binding. |
| `parkedDecisionResponseDigest(value)` | S5.7 exported canonical response digest calculation; it excludes `response_digest` and uses RFC 8785 JCS through `digestArtifact`. |
| `canonicalize(value)` | Existing RFC 8785-compatible canonical serializer used for exact semantic-byte comparison and deterministic composite-value formatting. |
| `createParkedDecision` / `createParkedDecisionResponse` | Existing S5.7 constructors used by focused tests to create valid records and resealed drift witnesses. |

New response-specific error codes and private comparison helpers described below are implementation additions inside `main-store/store.mjs`; they are not represented as pre-existing APIs.

## Public API contract

`consumeAuthorization` retains its existing fields and accepts one optional pair:

```js
store.consumeAuthorization({
  actor: "MAIN",
  authorization_id,
  candidate_revision,
  decision,
  expected_revision,
  parked_decision,          // complete parked-decision-v1; response mode only
  parked_decision_response, // complete parked-decision-response-v1; response mode only
})
```

The two response fields are all-or-nothing. Supplying only one fails with `CT_AUTH_RESPONSE_INVALID`. No caller-provided expected decision ID, option assertion, snapshot assertion, origin assertion, digest assertion, validation boolean, or project/registry override is accepted.

For response mode, `expected_revision` always names the consumed PENDING authorization revision. The first transition compares it with the current PENDING `revision`. An exact replay compares the unchanged request value with the terminal record's validated consumed-revision anchor; callers do not rewrite the request to the terminal record's later store revision.

`candidate_revision` remains the S5.1 frozen-candidate check. It must be a canonical digest and equal the authoritative authorization extension on both first transition and replay. `decision` must be an existing terminal state and must equal the persisted terminal state for replay.

## Canonical input capture and response-digest classification

All response inspection occurs after `assertMain` succeeds.

1. Clone the supplied parked decision and response to detach getters, aliases, and later caller mutation.
2. Compute the expected response digest with the exported S5.7 `parkedDecisionResponseDigest` function. Do not reproduce its field omission, canonical serialization, or hashing logic in the store.
3. If a supplied `response_digest` value exists and differs from that canonical expected digest, reject with `CT_AUTH_RESPONSE_BINDING` and the stable binding name `response_digest`. The deterministic diagnostic is `Rejected response binding response_digest: expected <canonical digest>, actual <supplied value>`.
4. Missing or structurally invalid digest fields remain canonical-contract failures. They are rejected as `CT_AUTH_RESPONSE_INVALID`, because there is no valid actual binding value to compare.
5. Canonicalize each detached record through the existing registered validator: `validate("parkedDecision", detachedParkedDecision)` and `validate("parkedDecisionResponse", detachedResponse)`. These calls own schema, invariant, and digest validation; the store adds no local schema or hash implementation.
6. Compare the two individually validated records in the stable order below. These equality checks exist only to map cross-record drift to the required binding name and deterministic expected/actual values; they never make an invalid pair acceptable.
7. Pass the same canonical values to the exported `assertParkedDecisionResponseBinding`. This remains the final S5.7 cross-record acceptance boundary. Any residual contract failure is wrapped as `CT_AUTH_RESPONSE_INVALID` with the original error as `cause`.
8. Capture `canonicalize(validatedResponse)` once for persistence and exact replay comparison. The stored object is the complete validated response, not a digest-only projection.

This ordering prevents S5.7's intentionally generic cross-record error from erasing the rejected binding name, while all schema, invariant, digest math, and final acceptance still come from S5.7's registered/exported logic rather than a duplicate validator.

## Authoritative authorization anchor

After the response pair is canonicalized, locate the authorization only to obtain its Jornada lock path. Acquire the existing Jornada lock and re-read the authorization. The locked read is authoritative; the pre-lock read never decides eligibility or replay.

The response path then derives one authorization anchor:

- **PENDING record:** the current record is the anchor and `anchor.revision` is the consumable revision.
- **Response-bearing terminal record:** validate the current base authorization, `terminal_audit`, and the last `revision_history` entry. The last entry must be the exact PENDING predecessor: same authorization ID, project, registry revision, Jornada binding, candidate extension, decision origin/target extensions, and revision equal to `terminal_audit.authorization_revision`; the terminal store revision must be predecessor revision plus one. That predecessor is the replay anchor.
- **Legacy terminal record without a complete embedded response:** reject with existing `CT_AUTH_TERMINAL`. It is not upgraded, migrated, or treated as replayable.
- **Malformed or incoherent terminal envelope/history:** fail closed with `CT_AUTH_INVALID`; never infer missing authority context from the caller.

This handles a terminal record honestly while retaining the exact PENDING context consumed by the successful transition.

## Common context gate before replay or transition

Every response-bearing request, including a request against a terminal record, passes the following gate in this fixed order before exact replay can return:

1. `assertMain` authority and live capability check.
2. Valid terminal `decision` and paired canonical response inputs.
3. Locked authoritative read and canonical authorization-base validation after excluding only store envelope fields.
4. Authorization identity: input and canonical response `authorization_id` equal the anchor authorization ID.
5. Project/registry context: anchor `project_id` equals the bound Main project and anchor `registry_revision` equals the live Main binding revision.
6. Candidate context: `candidate_revision` is a digest and equals `anchor.extensions["control-tower/candidate-revision"]`.
7. Revision context: input `expected_revision` and response `authorization_revision` both equal the anchor PENDING revision.
8. Authoritative creation binding: both `control-tower/decision-origin` and `control-tower/decision-target` must exist on the anchor; the validated parked decision's `origin` and `question` must equal them.
9. Remaining stable response bindings are compared against the anchor and validated parked decision in the order below.

Only after all nine checks may the protocol branch between exact terminal replay and a new PENDING transition. Therefore a terminal response cannot bypass project/registry, candidate revision, consumed revision, authoritative origin/target, or any response binding.

## Stable binding set and deterministic rejection

`CT_AUTH_RESPONSE_BINDING` uses `Rejected response binding <name>: expected <value>, actual <value>`. Scalars use JSON scalar rendering; objects use `canonicalize`, so expected/actual output is deterministic.

| Order | Binding name | Expected source | Actual source |
|---:|---|---|---|
| 1 | `authorization_id` | Anchor authorization `authorization_id` | Validated response `authorization_id` |
| 2 | `authorization_revision` | Anchor PENDING `revision` | Validated response `authorization_revision` |
| 3 | `parked_decision_id` | Validated parked decision `parked_decision_id` | Validated response `parked_decision_id` |
| 4 | `parked_decision_digest` | Validated parked decision `parked_decision_digest` | Validated response `parked_decision_digest` |
| 5 | `option_id` | Membership in validated parked decision `options` | Validated response `option_id` |
| 6 | `session_plan_snapshot_digest` | Validated parked decision `frozen_scope.session_plan_snapshot_digest` | Validated response value |
| 7 | `origin` | Anchor `extensions["control-tower/decision-origin"]`, projected to the parked-decision origin shape | Validated parked decision `origin` |
| 8 | `decision_target` | Anchor `extensions["control-tower/decision-target"]` | Validated parked decision `question` |
| 9 | `response_digest` | `parkedDecisionResponseDigest(detachedResponse)` | Supplied/validated response `response_digest` |

Project/registry and candidate checks precede this table and retain existing Main-store authorization failure semantics. They are nevertheless mandatory before replay. A terminal replay with a stable binding drift receives the named `CT_AUTH_RESPONSE_BINDING` failure. `CT_AUTH_RESPONSE_REPLAY_DIVERGENT` is reserved for a terminal request that passes every stable binding but differs in terminal decision or other complete-response bytes such as `response_id` or `responded_at`.

## One-record terminal representation

The persisted record remains the existing Main authorization envelope. `commit` removes `expected_revision`, increments the store revision, and appends the exact prior PENDING envelope to `revision_history`.

```js
{
  // unchanged authorization-v1 fields and creation-time extensions
  actor: "MAIN",
  state: decision,
  revision: anchor.revision + 1,
  revision_history: [...current.revision_history, pendingRecordWithoutRevisionHistory],
  terminal_audit: {
    kind: "authorization-terminal",
    authorization_id: anchor.authorization_id,
    authorization_revision: anchor.revision,
    decision,
    project_id: anchor.project_id,
    parked_decision_origin: parked_decision.origin,
    parked_decision_response: canonicalCompleteResponse
  },
  audit_ref: {
    kind: "authorization-terminal",
    record_path: authorizationPath
  }
}
```

The response is not stored in `extensions`; those remain creation-time bindings. `replayed` is not persisted. Exact replay returns an immutable projection of the existing terminal record with `replayed: true` and does not write, increment revision, or append history.

## Transition and replay protocol

1. Run authority, pair selection, detached canonical input capture, and response-digest classification.
2. Locate the authorization, acquire its Jornada lock, and re-read it.
3. Derive the PENDING or terminal predecessor anchor as described above.
4. Run the complete common context gate and stable binding table.
5. If the current record is response-bearing terminal:
   - require persisted `state` and `terminal_audit.decision` to equal the requested `decision`;
   - require persisted `terminal_audit.parked_decision_response.response_digest` to equal the validated response digest;
   - require `canonicalize(persistedCompleteResponse)` to equal the captured canonical response bytes;
   - return the existing result with `replayed: true` only when all checks pass;
   - otherwise reject with `CT_AUTH_RESPONSE_REPLAY_DIVERGENT` and perform no write.
6. If the current record is PENDING:
   - require finite unexpired expiry and the already-validated expected revision;
   - read the canonical Jornada while holding its lock and require `ACTIVE` at the authorization's `jornada_revision`;
   - construct the complete terminal record once;
   - call existing `commit` once with the anchor revision.
7. `commit` prepares and fsyncs one temporary file, calls `beforeCommit`, acquires the authorization lock, rechecks CAS, performs one rename, and fsyncs the parent directory.
8. Release the authorization lock inside `commit`, then the Jornada lock. No response-only write and no later semantic write exists.

Concurrent callers serialize on the Jornada lock. The first eligible caller may replace revision 1 with revision 2. The next locked read observes either an exact replay after the common context gate or a named binding/divergence failure. CAS remains the final defense against writers outside the pre-read timing.

## Honest atomic-write failure semantics

`atomicWrite` must track whether `renameSync(temporary, path)` completed.

| Failure stage | Canonical-path guarantee | Required behavior |
|---|---|---|
| Before rename, including temporary open/write/fsync, `beforeCommit`, lock acquisition, or CAS validation | Prior canonical authorization bytes remain unchanged. | Remove the temporary file, release locks, return the existing write/CAS error, and assert unchanged-byte witnesses. |
| Rename succeeds | Response and terminal state become visible together because they are bytes in one replacement. | Never claim a response-only or terminal-only state. |
| Parent-directory fsync fails after rename | Canonical bytes may already be visible; crash durability is indeterminate. Zero-mutation and rollback guarantees do not apply. | Preserve the original fsync cause under `CT_STORE_WRITE_FAILED` with an explicit post-replacement durability message; do not restore old bytes, do not remove the canonical path, and do not retry `commit`. |

After a post-rename durability error, the current invocation ends without a second semantic action. Reconciliation uses a subsequent authoritative `readAuthorization`/locked response call:

- exact terminal record visible: return/recover as exact replay with no write;
- prior PENDING record visible: no terminal replacement is observable, so only a later explicit CAS-protected attempt may perform the first effect;
- any other or malformed state: stop and escalate; do not repair, migrate, or write a second record.

The existing `beforeCommit` seam is sufficient to test both boundaries without a new production seam. It already forces pre-rename failure. For the post-rename witness, the focused POSIX test can temporarily remove read permission from the authorization directory in `beforeCommit` while retaining write/execute permission: lock creation and rename can complete, but opening the directory for the following fsync fails. The test restores owner-only mode in `finally`, reads the canonical authorization, and proves that reconciliation returns the one terminal result without revision/history growth.

## File changes

### `main-store/store.mjs`

- Import verified existing `canonicalize`, `assertParkedDecisionResponseBinding`, and `parkedDecisionResponseDigest`.
- Add private response-mode, detached-capture, stable-binding, terminal-anchor, and replay-comparison helpers.
- Extend only `consumeAuthorization`; preserve `assertMain`, `commit`, `atomicWrite`, Jornada lock ordering, and the existing public store surface.
- Move every common context and cross-record check before terminal replay return.
- Track pre-/post-rename stage inside `atomicWrite` so errors report honest mutation/durability semantics and never auto-retry.
- Embed the complete validated response in `terminal_audit` and commit once.

### `test/main-store.test.mjs`

- Build parked decisions and responses through verified S5.7 constructors; do not mock or duplicate schema/digest validation.
- Reuse byte witnesses, temporary roots, `beforeCommit`, and independent Bun processes already present in this file.
- Add pre-rename unchanged-byte and post-rename indeterminate-durability/reconciliation witnesses without a second store or response file.
- Keep all production and test changes inside the approved Área.

## Test design mapped to approved work

### M5.8.1 — Terminal response under Main

- **T5.8.1.1 RED:** cover non-Main actor, paired-field errors, legacy terminal, expiry/malformed expiry, stale revision, candidate drift, foreign project/registry, missing or mismatched authoritative origin/target, inactive/stale Jornada, and unchanged bytes for every pre-rename rejection. Add terminal replay attempts proving project/registry, candidate revision, consumed revision, origin, and target are checked before replay can return.
- **T5.8.1.2 GREEN:** prove the complete response and terminal state occupy one authorization file, the Jornada lock is held at `beforeCommit`, no response path exists, and revision history contains the exact PENDING predecessor.
- **T5.8.1.3 REFACTOR:** retain one public `consumeAuthorization` transition and one registered S5.7 acceptance path (`validate` plus final `assertParkedDecisionResponseBinding`), with no local schema/digest validator, alternate authority, or writer.

### M5.8.2 — Cryptographic binding and idempotency

- **T5.8.2.1 RED:** generate separately valid/resealed drift witnesses for authorization ID/revision, parked-decision ID/digest, option, snapshot, origin, and target. Mutate `response_digest` to another well-formed digest and assert deterministic expected/actual `response_digest` rejection through `CT_AUTH_RESPONSE_BINDING`. Persisted bytes remain unchanged.
- **T5.8.2.2 RED:** exact replay with the original PENDING `expected_revision` leaves bytes, revision, and history unchanged; property reorder remains exact after canonicalization. Stable binding drift is named before replay; different terminal decision, `response_id`, `responded_at`, or other non-binding bytes receives `CT_AUTH_RESPONSE_REPLAY_DIVERGENT` with zero additional effects.
- **T5.8.2.3 GREEN/REFACTOR:** compare complete canonical bytes plus the S5.7 digest; remove duplicate digest math and caller-sourced expected bindings.
- Run independent-process identical and competing races. Assert one revision-2 terminal record; identical callers produce one commit plus one replay, while competing callers produce one commit plus one named binding or divergent rejection.

### M5.8.3 — Compatibility and unique ownership

- **T5.8.3.1 RED:** existing MERGE and START_JORNADA records transition without response and preserve prior shape and behavior.
- **T5.8.3.2 GREEN:** exercise S5.7 registered constructors/validation without modifying S5.7 files and read pre-S5.8 records without migration. Cover pre-rename unchanged bytes and the post-rename durability-error reconciliation described above.
- **T5.8.3.3 REFACTOR:** inspect the focused source/API for absence of response sidecar, shadow store, second writer, second authority method, caller validation flag, rollback-after-rename, or blind commit retry.
- Verification remains `bun test test/main-store.test.mjs` and `bun test`.

## Non-goals and forbidden paths

No changes are made to `escalation/**`, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, `contracts/**`, `schemas/**`, `test/contracts/**`, `test/fixtures/contracts/schema-cases-v1.json`, Plan files, or Specs files. S5.8 creates no migration, DB state, second authority boundary, shadow store, response sidecar, second writer, authority method, caller-provided validation assertion, or alternate persistence path.

It does not connect Telegram, implement S5.5 ledger/contamination/independent selection/resume, address S1.12, perform Jornada planning, create remote effects, or adopt an external runtime. S5.7 remains the sole owner of response schemas, registry entries, constructors, digest rules, invariants, tests, and fixtures.

## Rollback, traceability, and stop conditions

Rollback remains one revert limited to `main-store/store.mjs` and `test/main-store.test.mjs`. There is no migration, sidecar, or repair step. Existing records without a response remain valid. Response-bearing records retain their complete response in the existing `terminal_audit` envelope, which the current authorization-base extraction already excludes from schema validation.

Traceability remains in one record: `revision_history` supplies the exact PENDING anchor, `terminal_audit.authorization_revision` identifies the consumed revision, the complete response carries its canonical identities and digest, `parked_decision_origin` records the validated origin, and `audit_ref` points to the same authorization file.

The forecast remains approximately 90–130 authored store lines and 190–260 focused test lines, totaling 280–390. Stop before implementation if honest post-rename handling cannot fit without another public seam/path, if one-record atomic visibility is doubtful, if any forbidden path becomes necessary, if the line risk becomes materially greater than 390/400, or if a new always-escalate decision appears.
