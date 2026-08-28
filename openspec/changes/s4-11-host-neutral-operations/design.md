# Design: host-neutral runtime operations

## Decision summary

S4.11 adds one constructor-bound, host-neutral JavaScript operation service in the four approved paths. `createHostRuntimeOperations({ resolveContexts, producer })` exposes only frozen `observe`, `health`, `stop`, and `attach` methods. Each operation accepts exactly `{ binding }`; callers cannot provide a producer, challenge, proof, result mapper, adapter, endpoint, or host object.

The service imports and reuses S4.10's existing `resolveExactContext` unchanged. It snapshots the validated exact context, asks the constructor-bound producer to issue an operation-bound challenge, synchronously registers that challenge before the proof call, invokes only that same producer, terminally consumes the challenge for success, rejection, or mismatched proof, revalidates the exact current context after the asynchronous boundary, and then maps the outcome to one frozen operation-specific result.

Challenge coordination is private and per call. Weak identity guards reject concurrent or later reuse of the same producer-issued challenge object without strongly retaining completed challenges. Per-call references are released in `finally`, so the service owns no long-lived timer, listener, process, socket, producer call, or scalar replay ledger. Global uniqueness of producer-issued challenge references remains an invariant of the same trusted producer that issues and consumes them; the service independently enforces exact object reuse and proof matching at its boundary.

No new schema, adapter, broker, public host identifier, persistence path, implementation path, or fifth public operation is introduced. Decisions 84, 92, 93, and 94 are sufficient. Replacing strong challenge history with private weak identity guards is an internal resource-management choice, not a new public or security policy; this design therefore remains PASS.

## Scope and authority

Permitted future implementation edits are exactly:

- `hosts/runtime-port.mjs`
- `hosts/runtime-observe.mjs`
- `test/hosts/runtime-port.test.mjs`
- `test/hosts/runtime-observe.test.mjs`

S4.10 remains immutable. In particular, the five v1 schemas, identifier grammar, `resolveExactContext`, ownership registry, reservation rules, and loopback-port rules are reused but not edited.

The design excludes adapters, broker/supervisor behavior, installation, packaging, runtime payloads, recovery, successor creation, quiescence, host-specific vocabulary, database work, and every path outside the four-file Área. The operation boundary is not exported through or added to `contracts/host-runtime/index.mjs`; future composition may import the approved host module directly under later authority.

## Component design

| Path | Responsibility |
| --- | --- |
| `hosts/runtime-port.mjs` | Public factory; closed operation inputs; S4.10 exact-context resolution; constructor-bound producer authority; private weak challenge guards; one-use consumption; race control; current-context revalidation; per-call cleanup; and typed failures. |
| `hosts/runtime-observe.mjs` | Closed proof-shape checks and fixed observe/health/stop/attach result mapping. It receives only canonical context plus a normalized proof-call outcome and returns frozen bounded records. It owns no producer capability or challenge guard. |
| `test/hosts/runtime-port.test.mjs` | Exact-context reuse, closed inputs, producer authority, challenge replay/mismatch, concurrent reuse, terminal consumption, retry, current-context drift, and per-call cleanup tests. |
| `test/hosts/runtime-observe.test.mjs` | Operation-specific evidence, uncertainty, health, stop, attach, bounded-result, leakage, and host-neutrality tests. |

`runtime-port.mjs` imports `resolveExactContext` from `contracts/host-runtime/binding-context.mjs` and `failContract` from `contracts/errors.mjs`. Neither imported module changes. `runtime-port.mjs` is the only authority-bearing S4.11 module; mapping helpers in `runtime-observe.mjs` are non-authoritative transformations and are not accepted as injected dependencies.

## Public service contract

```js
createHostRuntimeOperations({ resolveContexts, producer })
  -> Object.freeze({ observe, health, stop, attach })

observe({ binding }) -> Promise<ObserveResult>
health({ binding })  -> Promise<HealthResult>
stop({ binding })    -> Promise<StopResult>
attach({ binding })  -> Promise<AttachAcknowledgement>
```

Constructor requirements:

- `resolveContexts` is a function satisfying the delivered S4.10 resolver seam.
- `producer` is bound once by trusted composition and has a bounded neutral `producer_ref`, `issueChallenge(request)`, and `call(request)`.
- The producer guarantees that every successful issuance returns a fresh frozen challenge object and that a consumed producer challenge cannot be issued again as fresh. This is the same producer authority required by Decisions 92 and 93, not a caller-selected dependency.
- No operation accepts a producer or producer reference. The operation caller therefore cannot select, replace, or claim producer authority.
- Missing or malformed constructor capabilities throw `TypeError`, matching existing host-module convention.

Every operation input is a plain, non-array object with exactly one own key, `binding`. `binding` must pass S4.10 validation and resolve to exactly one complete current tuple. Extra keys such as `producer`, `proof`, `challenge`, `operation`, `adapter`, or `endpoint` fail before any producer effect.

## Private canonical operation context

After `resolveExactContext(binding, resolveContexts)` returns the S4.10 tuple
`[identity, worktree, process, incarnation, binding]`, the service copies only these validated scalars into a frozen private snapshot:

```text
runtime_id
worktree_id
process_id
binding_id
incarnation_id
loopback_port
```

This snapshot is not a sixth schema or public result. It prevents caller mutation across `await` boundaries and carries no resolver tuple, listener, close function, socket, endpoint, host object, or adapter value. The validated binding itself is also copied with exactly its seven existing v1 fields for later current-context revalidation.

Exact currentness is checked at three points:

1. before challenge issuance;
2. after challenge issuance and before the producer proof call; and
3. after the producer call settles and before any result or acknowledgment is returned.

Each check calls the unchanged S4.10 resolver and requires the resulting scalar snapshot to equal the initial snapshot. A missing, ambiguous, crossed, malformed, or stale context preserves the exact S4.10 `ContractError`; S4.11 does not wrap, soften, or reinterpret it.

## Producer challenge and proof seam

### Issuance request

The service calls only the constructor-bound producer:

```js
producer.issueChallenge(Object.freeze({
  operation, producer_ref,
  runtime_id, worktree_id, process_id,
  binding_id, incarnation_id, loopback_port,
}))
```

`operation` is exactly one of `OBSERVE`, `HEALTH`, `STOP`, or `ATTACH`. The producer returns a frozen, closed challenge with those exact fields plus bounded neutral `challenge_ref`. Both references are internal, are never returned publicly, and encode no host or adapter meaning.

The service validates every challenge field exactly against the requested operation, bound producer, and canonical context. It neither defaults nor repairs a value. A crossed challenge object is marked consumed before rejection so the same producer-issued object cannot later regain authority. A malformed non-object value grants no authority and cannot reach the proof call.

### Private registration, proof call, and cleanup

The service owns two private weak identity guards:

```text
inFlightChallenges: WeakSet<Challenge>
consumedChallenges: WeakSet<Challenge>
```

For a valid frozen challenge object, duplicate detection and insertion into `inFlightChallenges` happen synchronously with no `await` between them. Membership in either guard fails with `CT_HOST_RUNTIME_CHALLENGE_REUSED`. Two concurrent operations that receive the same challenge object therefore have one deterministic winner and exactly one proof call.

The service then invokes only:

```js
producer.call(Object.freeze({ challenge: frozenCanonicalChallenge }))
```

The operation caller cannot supply this call, its target, or its response. The returned proof is a closed record whose common fields exactly repeat the challenge, including `operation`, `producer_ref`, `challenge_ref`, and every context scalar. Operation-specific fields are fixed below.

A `finally` block always removes the challenge from `inFlightChallenges` and adds that exact producer-issued object to `consumedChallenges`. This terminal transition occurs once whether the call:

- returns valid matching proof;
- rejects or throws; or
- returns missing, malformed, foreign, crossed, cross-operation, or otherwise mismatched proof.

The weak consumed guard does not keep a challenge alive. If the producer retains and reissues the same object, membership remains observable and reuse is rejected. If no code retains it, garbage collection may reclaim it and the weak guard entry without any explicit public cleanup. A structurally equal new object is eligible only when the trusted producer issued it as a genuinely fresh challenge under its own one-use invariant.

A retry always starts from a new `issueChallenge` call and must receive a fresh producer-issued challenge. Producer-call failure never preserves or renews the failed challenge. Per-call canonical snapshots, proof values, and promise references become unreachable when the call settles; the service stores no completed operation promise and owns no long-lived external resource.

### Proof shapes

All proof records repeat the exact common challenge fields and add only these operation fields:

| Operation | Required operation-specific proof fields | Accepted values |
| --- | --- | --- |
| `OBSERVE` | `evidence` | exactly `OBSERVED` |
| `HEALTH` | `state` | exactly `HEALTHY` or `DEAD` |
| `STOP` | `request_acknowledged`, `state` | boolean; exactly `STOPPED`, `DEAD`, or `UNKNOWN` |
| `ATTACH` | `attached` | exactly `true` |

No proof accepts an undeclared field. A proof cannot carry arbitrary producer payload, capabilities, functions, endpoints, credentials, process objects, sockets, sessions, panes, or adapter-specific evidence. Matching proof is itself the bounded producer evidence; S4.11 does not define a host payload schema.

## Operation-specific public results

Every result is a newly created frozen plain object with an exact key set. Results never contain `producer_ref`, `challenge_ref`, a challenge, proof, cause object, producer capability, proof function, resolver value, host-specific object, or arbitrary producer payload.

### Observe

```js
// matching producer proof
{ operation: "OBSERVE", binding_id, incarnation_id,
  evidence: "MATCHING_PRODUCER_PROOF", uncertainty: null }

// issuance or producer-call failure
{ operation: "OBSERVE", binding_id, incarnation_id,
  evidence: null, uncertainty: "EVIDENCE_UNAVAILABLE" }
```

Observe reports only whether matching producer evidence was obtained. It does not claim healthy, stopped, or dead and cannot convert missing, partial, silent, timed-out, disconnected, or failed evidence into a proven runtime fact.

### Health

```js
{ operation: "HEALTH", binding_id, incarnation_id,
  state: "PROVEN_HEALTHY" | "DISCONNECTED_UNKNOWN" | "PROVEN_DEAD" }
```

`PROVEN_HEALTHY` and `PROVEN_DEAD` require matching `HEALTHY` or `DEAD` proof. Issuance failure, producer-call rejection, timeout represented as rejection, silence, or missing response maps only to `DISCONNECTED_UNKNOWN`. A returned malformed or mismatched proof is a security/contract failure, not an unknown health result, and throws `CT_HOST_RUNTIME_PROOF_MISMATCH` after consuming the challenge.

### Stop

```js
{ operation: "STOP", binding_id, incarnation_id,
  request: "ACKNOWLEDGED" | "NOT_ACKNOWLEDGED",
  state: "PROVEN_STOPPED" | "PROVEN_DEAD" | "DISCONNECTED_UNKNOWN" }
```

A matching stop proof maps the acknowledgment boolean and state independently. Acknowledgment never upgrades state. `UNKNOWN` maps to `DISCONNECTED_UNKNOWN`; only matching `STOPPED` or `DEAD` proof maps to a proven state.

Any challenge-issuance or producer-call failure returns exactly `request: "NOT_ACKNOWLEDGED"` and `state: "DISCONNECTED_UNKNOWN"`. It never returns stopped or dead. When a challenge was issued and the proof call failed, that challenge is already terminally consumed before this result is built.

### Attach

```js
{ operation: "ATTACH", binding_id, incarnation_id, acknowledged: true }
```

Attach returns this acknowledgment only after fresh matching proof and final exact-current-context revalidation. Its `binding_id` and `incarnation_id` come from the validated canonical snapshot, never from loose proof fields. Issuance or producer-call failure throws `CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE`; malformed, stale, replayed, crossed, foreign, producer-mismatched, or challenge-mismatched proof throws and returns no acknowledgment.

## Failure matrix and taxonomy

| Condition | Observable outcome | Challenge handling | Producer proof calls |
| --- | --- | --- | ---: |
| Input missing/extra/malformed | `CT_HOST_RUNTIME_OPERATION_INVALID` | none | 0 |
| S4.10 shape/context missing, ambiguous, crossed, or stale | Exact unchanged S4.10 error | none, or consumed if drift occurs after issuance | 0 if rejected before call |
| Producer issuance fails | observe unavailable; health unknown; stop not acknowledged + unknown; attach `CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE` | none issued | 0 |
| Challenge malformed or crossed | `CT_HOST_RUNTIME_CHALLENGE_INVALID` | consumed when object identity exists; otherwise no authority created | 0 |
| Challenge already in flight or consumed | `CT_HOST_RUNTIME_CHALLENGE_REUSED` | existing weak membership unchanged | 0 for loser/replay |
| Proof call rejects/throws | operation failure mapping above; attach unavailable error | terminally consumed in `finally` | 1 |
| Proof has extra/missing/foreign/crossed field or wrong operation/result | `CT_HOST_RUNTIME_PROOF_MISMATCH` | terminally consumed in `finally` | 1 |
| Matching proof but context changed before return | Exact unchanged S4.10 error | terminally consumed in `finally` | 1 |

New S4.11 codes are deliberately small and testable:

- `CT_HOST_RUNTIME_OPERATION_INVALID`
- `CT_HOST_RUNTIME_CHALLENGE_INVALID`
- `CT_HOST_RUNTIME_CHALLENGE_REUSED`
- `CT_HOST_RUNTIME_PROOF_MISMATCH`
- `CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE`

They use the existing frozen `ContractError` convention with diagnostics containing only `component` and `category`. Messages and diagnostics contain no identifiers, producer output, challenge/proof bytes, host values, functions, or raw causes. S4.10 errors propagate unchanged.

## Race, retry, failure, and resource analysis

### Deterministic concurrency

- Input validation and first exact-context resolution are synchronous.
- Challenge issuance may settle concurrently, but weak duplicate check plus registration has no intervening `await`; JavaScript run-to-completion makes one registration atomic relative to another.
- The first registration wins. Later use of the same object fails closed while it remains reachable, whether the first proof call is pending, fulfilled, rejected, or mismatched.
- Different fresh challenge objects proceed independently. Result order is promise-settlement order and grants no cross-operation authority.
- A challenge issued for one operation cannot satisfy another because operation is repeated in issuance request, challenge, proof, and mapper selection. The same challenge object is consumed or rejected across the composed service, so use in any operation prevents it from regaining authority in every other operation.

### Failure and retry

- Producer-call rejection is an uncertain operational outcome, not runtime-state proof.
- A malformed returned value is a proof mismatch, not a retryable disconnection classification.
- Retry is explicit: invoke the operation again, causing new exact-context validation and new challenge issuance. Reusing the previous producer-issued object always fails.
- Current-context drift at either asynchronous boundary fails closed. A successful producer answer cannot revive a stale incarnation.

### Internal cleanup

Each call owns its canonical snapshot, challenge, proof value, and promise chain. The only shared coordination structures are weak identity guards, which do not keep completed challenges alive. `finally` removes every terminal call from the in-flight guard on valid proof, call error, or mismatch. No service-level collection retains completed calls, and no public method exists for cleanup or closure.

A producer call that remains pending keeps only that invocation's normal promise chain alive. Timeout policy belongs exclusively to each producer or adapter: the host-neutral core MUST NOT add timers, sleeps, wall-clock reads, cancellation, deadlines, `Promise.race`, pollers, listeners, sockets, process handles, or an active-operation registry. A producer-owned timeout or silence reaches the core only as producer rejection or a `null`, `undefined`, or missing response. Those unavailable outcomes map to observe evidence unavailable, health disconnected/unknown, stop not acknowledged plus disconnected/unknown, and attach `CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE`; attach never acknowledges an unavailable producer. Foreign or malformed non-null proof remains `CT_HOST_RUNTIME_PROOF_MISMATCH`.

No result is returned after a context fails final revalidation. Internal cleanup cannot turn a producer failure into a proven state or attach acknowledgment.

## Requirement and scenario coverage

| Spec coverage | Test evidence |
| --- | --- |
| R1 exact current context accepted | Each operation receives one exact S4.10 tuple; producer sees the exact canonical request. |
| R1 crossed/stale/incomplete/extra rejected | Table-driven input, binding, tuple, challenge, proof, and acknowledgment-shape assertions; no producer call on pre-call rejection. |
| R2 matching proof accepted once | Health success followed by reuse of the same producer-issued challenge object; only the first call returns a proven result. |
| R2 non-matching proof rejected | Self-report fields in operation input, foreign producer reference, wrong challenge, operation, binding, and incarnation all fail closed. |
| R2 call error or mismatch consumes | Deferred/rejecting/malformed producer; same challenge retry fails; fresh challenge retry succeeds. |
| R3 observe evidence boundary | Proof success returns only matching-proof evidence; missing/rejected evidence returns `EVIDENCE_UNAVAILABLE` and no runtime state. |
| R4 matching health proof | `HEALTHY` and `DEAD` map only to the two proven states. |
| R4 disconnection is not death | Issuance rejection, call rejection, silence fixture, and missing response map only to `DISCONNECTED_UNKNOWN`. |
| R5 acknowledgment is distinct | Stop acknowledgment and runtime state are asserted as separate fields, including acknowledged + unknown. |
| R5 stop disconnection non-proven | Stop failed/unavailable fixtures never return stopped/dead. |
| R5 producer-call failure | Exact not-acknowledged + unknown result; challenge consumed; fresh challenge required. |
| R6 attach exact acknowledgment | Matching attach proof returns only exact binding/incarnation acknowledgment. |
| R6 stale/crossed attach rejected | Replay, foreign producer, wrong operation/binding/incarnation/challenge return no acknowledgment. |
| R7 prohibited responsibility/vocabulary | Export/result/source-path assertions reject capability leakage and forbidden host-specific keys; no adapter/broker imports. |
| Modified boundary scenario | Changed-path assertion remains exactly the four S4.11 paths and proves S4.10 files unchanged. |

All eight requirements and all fifteen scenarios are covered. Several scenario tests use table cases so malformed, crossed, stale, replayed, foreign, and extra-field variants remain visible without duplicating setup.

## Strict TDD and verification strategy

Future apply must use RED → GREEN → TRIANGULATE → REFACTOR with deterministic fakes. No test uses a real host process, adapter, broker, network socket, wall clock, sleep, random timing, or timeout race.

Key seams:

- S4.10 tuple fixtures and injected `resolveContexts` prove exact-context reuse.
- Deferred promises control issuance and proof-call ordering.
- Call counters prove zero calls before validation, exactly one call for a winning challenge, and no second call for reuse.
- Mutable resolver fixtures prove current-context drift is checked after each async boundary.
- Frozen-result and exact-key assertions prove bounds and leakage prevention.
- Weak-guard tests hold one proof call pending, race the same challenge object, settle valid/error/mismatch paths, and prove in-flight references are removed while retained challenge objects remain rejected as consumed.

Focused commands:

```bash
bun test test/hosts/runtime-port.test.mjs
bun test test/hosts/runtime-observe.test.mjs
bun test test/hosts/runtime-port.test.mjs test/hosts/runtime-observe.test.mjs
bun test
```

The full-suite expectation is zero failures from the recorded 914-pass baseline or the later baseline observed when apply starts. Design work itself runs no tests and changes no runtime bytes.

## Authored-line forecast and direct-commit decomposition

Estimated authored additions plus deletions: **750–950 lines**. Implementation is split into exactly three sequential direct commits, each independently test-green, safely revertible, and capped at 400 authored lines. These are technical construction boundaries only. Remote delivery occurs only after all three commits exist, the complete S4.11 contract is verified, and the repository's direct-push checks are satisfied.

| Sequential direct commit outcome | Planned behavior and tests | Forecast | Focused verification | Single-commit revert boundary |
| --- | --- | ---: | --- | --- |
| `feat(hosts): enforce one-use runtime proof challenges` | Add the internal exact-context proof executor, constructor-bound producer checks, weak in-flight/consumed guards, terminal valid/error/mismatch handling, retry freshness, concurrency, drift, and focused port tests. The final four-operation factory is not yet exposed. | 280–360 | `bun test test/hosts/runtime-port.test.mjs` | Removes the internal executor and port tests; no S4.11 operation service is exposed. |
| `feat(hosts): isolate runtime observation outcomes` | Complete closed proof validation and fixed observe/health result mapping in `runtime-observe.mjs`, with its focused tests. No authority-bearing operation service is exposed. | 220–290 | Both focused test files | Removes the non-authoritative observe/health mapper and its focused tests; the internal challenge executor remains test-green but is not an S4.11 deliverable. |
| `feat(hosts): expose host-neutral runtime operations` | Compose stop and attach with the existing observe/health mapper and expose exactly observe, health, stop, and attach; complete bounded results, stop failed-call behavior, attach acknowledgment, rejection matrix, exact changed-path assertions, and full-scope integration cases. | 250–300 | Both focused test files, then `bun test` | Removes the only public S4.11 operation factory and its stop/attach integration cases; remaining internal modules are not represented as a finished public contract. |

Each commit includes the tests for its own technical boundary and remains at or below 400 authored lines. No intermediate commit or partial sequence is a deliverable S4.11 public contract. In particular, mapper-only, internal challenge-only, observe-only, or observe/health-only states must never be described or delivered as completed S4.11.

## Rollout and rollback

Rollout is additive and dormant. No existing composition root, package export, adapter, broker, payload, installer, schema registry, or S4.10 module is changed. A later authorized composition may construct the service with one trusted producer and resolver; S4.11 itself performs no wiring.

The three direct commits are prepared and verified sequentially, but remote direct-push delivery happens only after the full sequence is complete and test-green. This preserves reviewable and revertible construction units without publishing a partial operation contract.

A single technical commit can be reverted safely at its stated boundary with the applicable focused tests remaining green. That does not make the remaining partial sequence a finished or deliverable S4.11 contract. Full S4.11 rollback reverts all three commits in reverse order and removes `hosts/runtime-port.mjs`, `hosts/runtime-observe.mjs`, `test/hosts/runtime-port.test.mjs`, and `test/hosts/runtime-observe.test.mjs` as one complete rollback outcome, matching the proposal. S4.10 ownership and incarnation behavior remains unchanged throughout, and there is no database, migration, durable challenge store, listener, spawned process, adapter state, or host resource to repair.

## Design checks

- The public authority exposes only observe, health, stop, and attach.
- The operation caller supplies only one exact S4.10 binding.
- The producer is bound once at construction; no caller-selected producer or proof seam exists.
- Every producer proof call terminally consumes its challenge on valid proof, call error, or mismatch.
- Retry always requires a fresh producer-issued challenge.
- Duplicate concurrent use of the same challenge object has one atomic registration winner and one proof call.
- Weak identity guards and per-call `finally` cleanup prevent the service from retaining completed challenges or calls.
- Operation, producer, challenge, binding, incarnation, and all exact context identifiers are compared without inference.
- Current context is revalidated after asynchronous boundaries before success or acknowledgment.
- Observe never promotes uncertainty; health has exactly three public states.
- Stop acknowledgment and runtime state remain independent; call failure is exactly not acknowledged + disconnected/unknown.
- Attach returns only an exact binding/incarnation acknowledgment after fresh matching proof.
- Results and errors are frozen, exact, bounded, neutral, and capability-free.
- No new schema, implementation path, adapter, broker, recovery, payload, or host-specific semantic is designed.
- All eight requirements and fifteen scenarios have deterministic tests.
- Exactly three sequential direct commits are planned; each is test-green, independently revertible, and no larger than 400 authored lines.
- No partial commit sequence is a deliverable S4.11 public contract; full rollback removes both runtime modules and both tests together.
- Producer/adapter-owned timeout policy and the timer-free neutral core are fixed by maintainer Decision 94; no timeout mechanism is introduced here.
- No new always-escalate decision remains open.
