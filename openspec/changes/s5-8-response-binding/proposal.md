# Proposal: Atomic Parked-Decision Response Binding

## Intent

Extend the canonical Main authorization store so Main can persist one validated `parked-decision-response-v1` together with the authorization's terminal transition. The response and terminal state must become visible as one atomic authorization-record replacement under the existing Main authority, lock, and transaction boundary.

This closes the contract gap between S5.7's pure response artifact and the canonical authorization lifecycle needed by later work. It does not implement that later work.

## Authority and current-state gap

S5.7 already owns the closed, versioned response schema, registry entry, constructor, digest, and cross-record binding rules. It deliberately performs no authority lookup, transition, or persistence. The existing Main store owns terminal authorization transitions, but it cannot yet accept or persist the selected parked-decision response that authorizes such a transition.

The maintainer resolved the only escalating decision through Option B: persist the explicit `parked-decision-response-v1` atomically with the terminal authorization transition in the same canonical Main store, lock, and transaction. Because the current store commits one authorization file through CAS and atomic replacement, the in-scope atomic representation is to make the validated response part of that same authorization-record replacement; a separate response file would introduce an unguaranteed multi-file transaction and is out of scope.

## Scope

Implementation is limited to:

- `main-store/store.mjs`
- `test/main-store.test.mjs`

The change will preserve the existing M5.8.1–M5.8.3 and their Tareas without renaming, splitting, or adding plan IDs. At Session scope it will:

1. Require the existing Main authority and `assertMain` boundary for a selected response.
2. Validate the supplied response through S5.7's canonical registered contract rather than duplicating schema or caller assertions.
3. Bind the response to the exact PENDING authorization, authorization revision, parked decision identity and digest, one enumerated `option_id`, Session snapshot digest, and response digest.
4. Persist the complete versioned response and the terminal authorization state in one CAS-protected atomic replacement while holding the existing authorization/Jornada lock boundary.
5. Treat a byte-identical replay as idempotent and reject any divergent replay without another effect.
6. Preserve existing MERGE and START_JORNADA authorization behavior without migration.

## Affected areas

| Area | Effect |
|---|---|
| Main authorization transition | Accepts a canonical selected response only when all authorization, origin, expiry, revision, decision, option, and snapshot bindings match. |
| Main store persistence | Commits response plus terminal state as one authorization-record replacement; neither effect may be independently visible. |
| Idempotency and concurrency | Exact replay returns the existing terminal result; stale or divergent inputs fail closed under existing CAS and lock semantics. |
| Tests | Add failure witnesses for authority, lifecycle, origin, binding, partial-write, replay, and backward-compatibility behavior. |

## Scope boundaries and non-goals

This Session does not modify or add behavior in `escalation/**`, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, `contracts/**`, `schemas/**`, `test/contracts/**`, fixtures, Plan files, or Specs files. It creates no migration, DB state, second authority boundary, shadow store, response sidecar, second writer, authority method, or caller-provided validation assertion.

It does not connect Telegram, implement S5.5's ledger, contamination, independent selection, or resume behavior, address S1.12, or perform jornada planning. S5.7 remains the sole owner of the response contract; S5.8 only consumes it through the canonical registry and validator.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Partial visibility of response and terminal state | Store both in the same authorization record and commit them through one existing atomic replacement under the same lock and CAS check. |
| Caller substitutes text, a label, index, or boolean assertion for canonical selection | Accept only the registered `parked-decision-response-v1` and verify exact bound identities and the enumerated `option_id`. |
| Replay changes option, digest, origin, revision, or snapshot | Permit only byte-identical replay; reject every divergent binding with zero additional effects. |
| Existing authorization actions regress | Keep the response path additive and prove MERGE and START_JORNADA compatibility without record migration. |
| Authority is duplicated or bypassed | Reuse `assertMain`, the canonical authorization path, and the existing lock/transaction; add no alternate method, writer, or persistence path. |
| Workload exceeds the review boundary | Stop before implementation exceeds 390 authored lines or introduces material 400-line risk. |

The phase must stop and escalate if atomicity cannot be achieved with one canonical authorization-record replacement, if a forbidden path becomes necessary, or if a new decision falls into an always-escalate class.

## Rollback

Rollback is a single revert of the changes to `main-store/store.mjs` and `test/main-store.test.mjs`. No migration or data repair is required. S5.7's versioned schemas and contract modules remain unchanged and available because they are outside this Session.

## Success criteria

S5.8 succeeds only when all of the following are true:

- Only Main, through the canonical S5.1 authorization store, can persist a selected response.
- The complete `parked-decision-response-v1` and terminal authorization transition are committed atomically under the same `assertMain`, lock, CAS, and atomic write.
- Authorization ID/revision, parked-decision ID/digest, exactly one enumerated option ID, Session snapshot digest, origin, and response digest are all verified against canonical records.
- Non-PENDING, expired, consumed, foreign-origin, stale-revision, or mismatched input fails closed without changing persisted bytes.
- Exact replay is idempotent; divergent replay creates no second or partial effect.
- Existing MERGE and START_JORNADA flows remain compatible without migration.
- No second store, response sidecar, writer, authority, caller assertion, or persistence path exists.
- The S5.7 contract is consumed without modifying its schemas, registry, invariants, tests, or fixtures.
- `bun test test/main-store.test.mjs` and the full `bun test` suite pass with no new failures.
- Implementation changes remain confined to the two approved paths and within the 280–390-line forecast.
