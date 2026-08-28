# Design: host-neutral runtime identity, binding, and loopback ownership

## Decision summary

S4.10 will add an isolated host-runtime contract family under its approved `Área`. The implementation publishes exactly five closed v1 JSON shapes, composes them at runtime without creating a sixth public shape, and owns an in-memory binding/incarnation ledger. Port reservation uses one constructor-bound, host-neutral acquire-at-reservation capability: it receives the exact validated five-shape context plus the requested port and creates the final listener for that binding during `reserve`.

There is no reserve-then-transfer lifecycle. The ownership ledger retains only exact private ownership metadata and a private close capability for the final listener. `reserve` returns bounded, non-authoritative success metadata and never exposes a socket, server, lease, adoption token, or transferable handle.

The public shapes are fixed by Decision 89 and remain exactly:

| Shape | `schema_version` literal | Other instance fields |
| --- | --- | --- |
| Identity | `control-tower.host-runtime.identity/v1` | `runtime_id` |
| Worktree | `control-tower.host-runtime.worktree/v1` | `worktree_id` |
| Process | `control-tower.host-runtime.process/v1` | `process_id` |
| Incarnation | `control-tower.host-runtime.incarnation/v1` | `incarnation_id` |
| Binding | `control-tower.host-runtime.binding/v1` | `binding_id`, `runtime_id`, `worktree_id`, `process_id`, `incarnation_id`, `loopback_port` |

Each schema uses `additionalProperties: false`, requires every listed instance field, and has no defaults or coercion. Schema metadata such as `$schema` and `$id` is not an instance field.

## Authority and scope

This design implements the proposal and specification for S4.10 under:

- `openspec/plans/plan-4/STATUS.md:739-746`;
- Decision 80: Tower-launched processes only, Pi first without deleting OpenCode;
- Decision 84: the runtime contract precedes and remains independent of host adapters;
- Decision 86: worktree isolation and unpredictable identifiers are Tower-owned concerns; and
- Decision 89: exactly five separate, independently versionable public v1 shapes with the current fields.

Permitted implementation edits are only:

- `contracts/host-runtime/**`
- `schemas/host-runtime-*.schema.json`
- `test/contracts/host-runtime/**`

The design does not implement or modify Pi, OpenCode, Intercom, adapters, broker/supervisor behavior, keepalive, installation, packaging, observe/health/stop/attach, recovery, S4.4, S4.8, S4.9, S4.11, S4.12, or S8.12. The acquire-at-reservation capability is an internal dependency-injection boundary, not adapter logic, a broker startup path, or a public serialized contract.

## Public contract and identifier grammar

### Canonical identifiers

Each identifier is an opaque, kind-separated, lowercase value containing 128 random bits encoded as 32 hexadecimal characters:

| Field | Grammar |
| --- | --- |
| `runtime_id` | `^ct_runtime_[0-9a-f]{32}$` |
| `worktree_id` | `^ct_worktree_[0-9a-f]{32}$` |
| `process_id` | `^ct_process_[0-9a-f]{32}$` |
| `incarnation_id` | `^ct_incarnation_[0-9a-f]{32}$` |
| `binding_id` | `^ct_binding_[0-9a-f]{32}$` |

The prefixes identify contract kind only; they encode no vendor, path, process number, pane, endpoint, broker, session, or wire-format fact. Uppercase, shortened, padded, alternate-encoding, host-derived, or whitespace-bearing forms are non-canonical and rejected.

`createHostRuntimeIdentifier(kind, { randomBytes })` will be the only provided generator. Its randomness port is constructor-bound/injected for deterministic tests, must return exactly 16 bytes, and is not accepted on individual operations. Validation proves canonical representation; authority still comes only from an exact current binding, never from identifier syntax.

`loopback_port` is an integer from 1 through 65535. It carries no hostname. The default Node acquisition fixes the network address to `127.0.0.1`; callers cannot provide or substitute an address.

### Schema loading and bounded operation results

A local host-runtime schema registry loads only the five `schemas/host-runtime-*.schema.json` files with Ajv 2020 using strict mode, all errors, no coercion, no defaults, and no removal of additional properties. It does not modify the repository-wide `contracts/schema-registry.mjs`, because that file is outside S4.10's `Área`.

Exports are validators and ownership operations, not another serialized authority contract. Any internal tuple, resolver result, close capability, map entry, pending record, or diagnostic is private implementation state and MUST NOT be published as a sixth schema.

Successful `reserve` and `release` calls may acknowledge only `binding_id`, `incarnation_id`, and `loopback_port`. This bounded result is an ephemeral operation acknowledgement, has no schema/version discriminator, grants no authority, and cannot be supplied in place of any of the five public objects. It contains no listener, socket, server, lease, close function, adoption token, credentials, or host-specific value.

## Runtime components

| Component | Responsibility |
| --- | --- |
| `schema-registry.mjs` | Load and compile the five schemas; expose one validator per public shape. |
| `identifiers.mjs` | Generate kind-separated canonical identifiers from injected 16-byte randomness. |
| `binding-context.mjs` | Resolve and validate one exact five-shape context; reject missing, ambiguous, malformed, or crossed candidates. |
| `ownership-registry.mjs` | Serialize reservation state, maintain current/retired bindings and incarnations, invoke final-listener acquisition, retain only private close capabilities plus exact ownership metadata, and authorize exact release. |
| `node-loopback-acquisition.mjs` | Default internal implementation that creates and holds the final standalone exclusive listener on `127.0.0.1` during reservation and returns only its private close capability to the ledger. |
| `errors.mjs` | Define stable typed host-runtime failures using the repository's `ContractError` convention. |
| `index.mjs` | Export the five validators, identifier generator, and ownership factory; expose no listener/lease/adoption API. |

File names may be combined during implementation to stay within the line budget, but responsibilities and dependency direction remain the same: schemas/identifiers → context validation → ownership ledger → injected final-listener acquisition. No lower component imports a host adapter.

## Validation composition and acquisition contract

`createHostRuntimeOwnership({ resolveContexts, acquireAtReservation })` receives both dependencies once at construction. `acquireAtReservation` defaults internally to the Node standalone implementation. Callers cannot replace resolution or acquisition behavior per operation.

`resolveContexts(binding)` returns private fixed-position candidate tuples:

```text
[identity, worktree, process, incarnation, binding]
```

The tuple is never serialized, schema-registered, or exported as a public contract. It exists only so a trusted owner can supply the relationships among the five independently versioned shapes without changing them.

After exactly one complete tuple has been validated, that same private context is passed to the constructor-bound acquisition capability:

```text
acquireAtReservation(exactContext, requestedPort) -> privateCloseCapability

exactContext = [identity, worktree, process, incarnation, binding]
requestedPort = binding.loopback_port
```

This is an internal capability contract, not a sixth public shape. Its requirements are:

1. It receives the already-validated exact context and the requested port; it does not re-resolve, infer, normalize, or substitute identity.
2. The registry verifies `requestedPort === binding.loopback_port` before calling it.
3. One reservation attempt invokes it at most once after pending ownership is recorded.
4. A successful call means the final listener for that exact binding already exists and is listening; a probe, unbound socket, provisional listener, or promise of later adoption is not success.
5. It returns only a private idempotence-guarded close capability. The acquisition implementation may privately capture its listener, but neither the listener nor an object representing it enters the ledger or operation result.
6. The final listener remains held continuously until that close capability confirms release or process teardown closes it. No later release/rebind, transfer, adoption, or handoff step exists.

The default Node implementation creates the final standalone listener itself with `127.0.0.1`, the requested port, and exclusive binding. That listener is the resource exercised by S4.10 tests and standalone consumers. It is not a temporary reservation for a later server and is never described as reserve-then-transfer.

A later approved broker composition may inject a different `acquireAtReservation` implementation under its own Session. That implementation must create its own final listener for the exact context during the reservation call and return only a close capability. This design supplies only the neutral seam; it does not define broker handlers, credentials, startup, supervision, adapter wiring, or listener adoption.

For each reservation or release, the service:

1. Validates the input binding against the binding schema.
2. Calls the constructor-bound resolver and requires a finite array.
3. Validates every candidate component against its own public schema.
4. Compares every identifier and the port exactly; normalization, inference, sorting, first-match selection, and host-derived fallback are forbidden.
5. Requires exactly one complete matching tuple.
6. Returns a typed missing/crossed failure for zero complete matches and an ambiguous failure for more than one.
7. Applies current-incarnation and ownership checks before acquisition or close.

A candidate assembled from components of two otherwise valid tuples has no complete match and is rejected as crossed. Duplicate complete tuples are ambiguous rather than silently deduplicated.

## Binding and incarnation bookkeeping

The ownership registry is authoritative only for its own lifetime and keeps private maps/sets:

- `activeByPort`: exact ownership metadata plus the private close capability for one final listener per numeric port;
- `activeByOwner`: the same current record keyed by `runtime_id + worktree_id + process_id`;
- `bindingHistory`: the immutable first association of each `binding_id` with its owner, incarnation, and port;
- `incarnationHistory`: every `incarnation_id` ever admitted by this registry;
- `pendingByPort`: exact metadata for acquisitions in progress, preventing two concurrent callers from passing preflight for one port; and
- `cleanupPending`: exact metadata plus a close capability only when a failed post-acquisition path could not confirm close.

No map stores a public or transferable socket/lease object. The active and cleanup records contain only exact scalar ownership metadata and a private close function; the acquisition implementation privately owns every other listener detail.

The registry enforces these invariants:

1. A current owner has at most one active binding and one continuously held final listener.
2. A port has at most one active or pending owner.
3. A `binding_id` never moves to a different runtime, worktree, process, incarnation, or port.
4. An `incarnation_id` is admitted once and never becomes current again after release.
5. Runtime, worktree, or process identifiers may recur only as part of a later binding with a never-seen incarnation.
6. Matching a port, owner component, or binding identifier alone never grants authority.
7. History is recorded only after final-listener acquisition succeeds and state is rechecked; failed acquisition grants no authority.
8. Successful release removes active authority but retains binding/incarnation history, making replay stale even if the numeric port is later reused.
9. The only transition from acquired to released is invocation of the stored close capability; there is no state for transferred, adoptable, detached, or awaiting-rebind.

These rules make reuse safe without ordering opaque identifiers. Freshness is membership in the current registry record, not lexical order, wall-clock time, process ID, or port value.

## Loopback reservation lifecycle

### Reserve

1. Validate and resolve one exact five-shape context.
2. Reject retired/reused incarnation or crossed binding history.
3. Reject an active owner, active port, or pending port collision without changing existing state.
4. Record exact pending ownership before awaiting I/O.
5. Call `acquireAtReservation(exactContext, binding.loopback_port)` exactly once. Success means the final listener for this binding is already listening and continuously held; the call returns only its private close capability.
6. Recheck owner, port, binding, and incarnation state after acquisition. This closes the async race between preflight and publication without closing or rebinding the listener.
7. On a clean recheck, publish exact active metadata with the close capability, record immutable history, clear pending state, and return only the bounded acknowledgement `{ binding_id, incarnation_id, loopback_port }`.
8. On acquisition failure, clear pending state and publish no authority. Translate an OS loopback collision separately from an unknown acquisition failure.
9. On failure after successful acquisition, invoke the returned close capability before returning. If close cannot be confirmed, retain only exact cleanup-pending metadata plus that close capability and fail typed; never report the binding as reserved or the port as available.

Because the acquisition call creates the final listener, there is no check-then-bind gap and no reserve-then-transfer gap. The listener is never released for a later consumer to race for the port.

### Release

1. Revalidate and re-resolve the exact five-shape context.
2. Require exact equality with the current active record, including binding, incarnation, and port.
3. Reject foreign, crossed, stale, already-released, or port-only release requests without invoking the current close capability.
4. Invoke the private close capability for the continuously held final listener.
5. Remove active state only after confirmed close; preserve active state on close failure so the owner can retry and no port is falsely advertised as released.
6. Retain immutable binding/incarnation history after success and return only bounded acknowledgement metadata.

The owner may call a private/service-level `dispose()` for process teardown. It attempts every held or cleanup-pending close capability, reports aggregate typed cleanup failure, and never changes public binding shapes. `dispose()` is resource cleanup, not S4.11 stop semantics and not caller authority over a runtime process.

## Typed failures

| Code | Meaning |
| --- | --- |
| `CT_HOST_RUNTIME_SCHEMA_INVALID` | A public shape, version literal, identifier, port, or extra field is invalid. |
| `CT_HOST_RUNTIME_CONTEXT_MISSING` | A required public component has no candidate. |
| `CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS` | More than one complete candidate tuple matches. |
| `CT_HOST_RUNTIME_BINDING_CROSSED` | Valid-looking components do not form one exact tuple, or an identifier moved contexts. |
| `CT_HOST_RUNTIME_STALE` | A retired/replayed incarnation or binding attempted to regain authority. |
| `CT_HOST_RUNTIME_BINDING_ACTIVE` | The owner already has a different current binding. |
| `CT_HOST_RUNTIME_PORT_RESERVED` | The port is active or pending for another exact binding. |
| `CT_HOST_RUNTIME_PORT_OCCUPIED` | Final-listener acquisition received the OS occupied-address result for loopback. |
| `CT_HOST_RUNTIME_NOT_OWNER` | Release does not exactly match the current owner. |
| `CT_HOST_RUNTIME_ACQUISITION_FAILED` | The final listener for the exact binding could not be established; no availability probe is treated as ownership. |
| `CT_HOST_RUNTIME_CLEANUP_FAILED` | A final listener could not be confirmed closed, so state remains active or cleanup-pending. |

Failures expose bounded diagnostics about contract kind and mismatch category, never raw resolver objects, acquisition inputs, close functions, socket handles, host-specific values, or an inferred replacement.

## Data flow

```text
five public values in trusted candidate source
             │
             ▼
private exact tuple ─────► five strict schema validators
             │                         │
             └──── exact equality ◄────┘
                          │
          missing / ambiguous / crossed rejected
                          │
                          ▼
              current-incarnation ledger
                          │
             stale / replay / collision rejected
                          │
             record exact pending ownership
                          │
                          ▼
 acquireAtReservation(exact tuple, requested port)
                          │
        creates FINAL listener for exact binding
                          │
             returns private close capability only
                          │
                post-await state recheck
                          │
                          ▼
 publish metadata + close capability; listener stays held
                          │
 exact release ───────────┴─────► invoke close, retain history
```

At no point does the data flow expose or transfer a listener. Future approved composition changes only the injected acquisition implementation; it does not add an adoption step to this lifecycle.

## Strict TDD design

Apply runs under Strict TDD with `bun test`. Each behavior begins with a focused RED test against an observable operation or constructor-bound internal seam, then the minimum GREEN implementation, then refactoring while focused and full suites remain green.

### RED seams and deterministic fakes

| RED behavior | Seam |
| --- | --- |
| Wrong version, malformed kind prefix, missing/extra field, non-integer/out-of-range port | Five schema validators with table-driven fixtures. |
| Crossed binding assembled from two valid contexts | Injected `resolveContexts` returning two private tuples whose components are mixed. |
| Ambiguous identity/context | Resolver returns duplicate complete tuples; service must reject rather than select. |
| Stale replay after release and after port reuse | Deterministic identifiers plus in-memory ledger; no clock or process dependency. |
| Concurrent requests for one port | Deferred fake `acquireAtReservation` proves pending-state serialization. |
| Exact-context final acquisition with no handoff gap | Injected acquisition records one call with the exact five objects and requested port, marks its final listener held before resolving, exposes only a close spy to the ledger, remains held for the binding lifetime, and proves release invokes that same close once. The test fails on a second acquisition, any pre-release close, any later bind/adopt callback, context drift, or port mismatch. |
| Default Node final standalone listener | Real bounded Node evidence proves the listener is created on `127.0.0.1` during `reserve`, remains occupied through the active lifetime, and becomes reusable only after exact `release`; no transfer/adoption function is exported or called. |
| Externally occupied port | Real bounded Node listener on `127.0.0.1` using an OS-assigned ephemeral port, then the default acquisition attempts that held port and returns `CT_HOST_RUNTIME_PORT_OCCUPIED`. |
| Foreign/stale release | Two deterministic bindings and a fake private close capability recording call counts. |
| Acquisition or cleanup failure | Injected acquire/close failures with exact call counts and state readback. |
| Safe cleanup | Fake close capabilities prove every successfully acquired final listener is active, confirmed closed, or retained as cleanup-pending; none disappears. |
| Bounded results and host neutrality | Assertions prove reserve/release results contain only the three acknowledgement fields, expose no handle/capability, reject adapter vocabulary, and introduce only approved paths. |

The decisive no-gap test is falsifiable: acquisition must receive the exact validated tuple once, create/mark the final listener held before resolving, remain held without any intermediate close, and be closed by release. A probe followed by bind, a reservation followed by adoption, a listener returned to the caller, or any release-and-rebind sequence fails the test.

Focused commands:

```bash
bun test test/contracts/host-runtime/shapes.test.mjs
bun test test/contracts/host-runtime/ownership.test.mjs
bun test test/contracts/host-runtime/loopback.test.mjs
```

After each GREEN/refactor checkpoint, run:

```bash
bun test test/contracts/host-runtime
bun test
```

No test uses a fixed external port, sleeps, wall-clock freshness, a real Pi/OpenCode process, broker, supervisor, adapter, or network address other than `127.0.0.1`.

## File forecast

| Path | Planned responsibility |
| --- | --- |
| `schemas/host-runtime-identity-v1.schema.json` | Closed identity shape and version/ID literals. |
| `schemas/host-runtime-worktree-v1.schema.json` | Closed worktree shape and version/ID literals. |
| `schemas/host-runtime-process-v1.schema.json` | Closed process shape and version/ID literals. |
| `schemas/host-runtime-incarnation-v1.schema.json` | Closed incarnation shape and version/ID literals. |
| `schemas/host-runtime-binding-v1.schema.json` | Closed exact binding and loopback-port range. |
| `contracts/host-runtime/*.mjs` | Local schema validation, identifier generation, exact context composition, ownership ledger, typed errors, and internal final-listener acquisition. |
| `test/contracts/host-runtime/*.test.mjs` | Strict TDD contract, ownership, exact-context final acquisition, collision, replay, no-gap lifecycle, cleanup, and real-loopback evidence. |

No existing source, repository-wide schema registry, payload, installer, host implementation, broker, adapter, or planning authority is edited.

## Commit and workload forecast

S4.10 remains one Sesión and one existing Módulo. Implementation uses sequential direct commits only as delivery mechanics; it creates no additional planning level and runs SDD once for the whole Sesión.

| Commit outcome | Includes tests | Authored-line forecast | Focused verification | Reverse-order rollback boundary |
| --- | --- | ---: | --- | --- |
| `feat(contracts): add host-runtime v1 shapes` | Schemas, canonical IDs, strict validators | 260–350 | `bun test .../shapes.test.mjs` | Remove only the five unused schemas and shape/ID modules/tests. |
| `feat(contracts): enforce exact runtime binding freshness` | Resolver composition, crossed/ambiguous rejection, current/retired ledger | 300–390 | `bun test .../ownership.test.mjs` | Remove ledger/context behavior and tests while leaving standalone shapes valid. |
| `feat(contracts): acquire final loopback listeners by exact binding` | Exact-context acquisition seam, default final standalone listener, bounded acknowledgements, collision/release/cleanup, and no-gap tests | 300–390 | `bun test .../loopback.test.mjs` | Close/remove acquisition and reservation behavior/tests while leaving validation/ledger contracts intact. |

Every commit stays below 400 authored additions plus deletions, carries its own behavior tests, is independently verifiable at its checkpoint, and is revertible in reverse order without unrelated changes. Estimated total is 860–1,130 authored lines across three commits; therefore a single commit is not acceptable. Delivery is direct with no PR, as instructed.

## Rollout and rollback

The rollout is additive and dormant: no current composition root imports the new contract during S4.10. Standalone S4.10 ownership uses the default Node acquisition, which creates its final listener during reservation and closes it during exact release. There is no dormant listener intended for transfer.

Later approved composition may inject a different final-listener acquisition under its own Session without changing the five schemas or adding adoption. S4.10 does not implement that composition.

Rollback is reverse-order commit reversion. Reverting final-listener ownership first closes/removes the only runtime resource behavior; reverting ledger composition next removes freshness state; reverting schemas last removes the public contract. There is no migration, durable data, installed payload, adapter state, transferable lease, or broker state to repair.

## Design checks

- Exactly five public v1 shapes; no collapse, rename, extra instance field, public envelope, or delegated vendor shape.
- Canonical neutral identifiers and shape-specific version literals are explicit.
- Exact relationship resolution rejects missing, ambiguous, and crossed candidates.
- Current/retired bookkeeping rejects stale state and replay after release or reuse.
- Constructor-bound acquisition receives the exact validated five-shape context plus requested port once.
- Successful acquisition means the final listener already exists for that binding and remains continuously held until close.
- The ledger stores only exact ownership metadata and a private close capability; no socket/lease object is public or transferable.
- `reserve` and `release` return bounded non-authoritative metadata only.
- The default Node `127.0.0.1` path is a final standalone listener, never a reserve-then-transfer path.
- Future broker composition can replace only the internal acquisition implementation under later authority; no broker or adapter behavior is designed here.
- Strict TDD has a falsifiable no-release/rebind, no-adoption seam.
- Foreign release and cleanup uncertainty fail closed while preserving existing authority.
- All planned edits remain inside S4.10's exact `Área`.
- No new unresolved always-escalate decision is introduced by this correction.
