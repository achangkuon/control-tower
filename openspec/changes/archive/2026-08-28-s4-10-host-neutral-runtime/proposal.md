# Host-neutral runtime identity, binding, and loopback-port ownership

## Intent

Establish the first public host-neutral runtime contract for Control Tower so a Tower-owned runtime can identify and bind an exact worktree process incarnation to an exact loopback port without depending on Pi, OpenCode, Intercom, or another host's vocabulary.

This proposal covers the already-approved whole Session S4.10 only. It preserves the existing `Plan → Sesión → Módulo → Tarea` hierarchy, including M4.10.1 and T4.10.1.1–T4.10.1.3, and does not create a second work hierarchy.

## Problem

Control Tower needs a stable contract beneath host adapters. Without that neutral boundary, runtime identity can inherit vendor-specific concepts, a port can be mistaken as belonging to the wrong worktree or process, and stale state can be replayed as if it represented the current runtime incarnation.

Those ambiguities are security and correctness failures at the ownership boundary. A structurally plausible object must not be accepted when its identity, worktree, process, binding, incarnation, or port relationship is incomplete, crossed, stale, colliding, or extended with undeclared authority-bearing data.

## Proposed outcome

S4.10 will define and validate one strict host-neutral contract with these observable properties:

- Runtime identity, worktree, process, binding, and incarnation are explicit, distinct, and validated together without Pi/OpenCode terminology.
- A loopback port belongs to one exact binding, and that binding is tied to the exact runtime identity and current incarnation.
- Port reservation and release preserve that ownership relationship rather than treating the port number as standalone evidence.
- Binding collisions, occupied-port collisions, cross-binding use, stale incarnation or replay state, ambiguous identity, and undeclared extra fields fail closed.
- Contract schemas and runtime validation agree on the same closed shape and ownership invariants.
- The contract can later support Pi and the parked OpenCode implementation as adapters without making either adapter the product authority.

Decision 89 fixes the public v1 representation: five separate, independently versionable shapes with the exact fields stated in `specs/host-runtime/spec.md` — identity (`schema_version`, `runtime_id`), worktree (`schema_version`, `worktree_id`), process (`schema_version`, `process_id`), incarnation (`schema_version`, `incarnation_id`), and binding (`schema_version`, `binding_id`, `runtime_id`, `worktree_id`, `process_id`, `incarnation_id`, `loopback_port`). The specification and design stages may define canonical identifier encoding, reservation lifecycle, and validation composition, but MUST NOT alter, collapse, extend, or delegate those public shapes without new maintainer authority.

## Scope

Implementation is limited to the exclusive S4.10 Área:

- `contracts/host-runtime/**`
- `schemas/host-runtime-*.schema.json`
- `test/contracts/host-runtime/**`

The shared resource claim is limited to the identity/binding namespace and loopback-port reservation.

Within that boundary, S4.10 includes:

- Versioned schemas for the host-neutral runtime identity and binding contracts.
- Exact runtime validation of identity, worktree, process, binding, incarnation, and their cross-bindings.
- Loopback-port reservation and release behavior tied to the exact binding.
- Contract tests for valid ownership and fail-closed rejection of ambiguity, collision, crossed bindings, stale state, replay, and extra fields.
- Separation of neutral contract behavior from every host adapter.

## Contract boundaries

### Host neutrality

Neutral contract names and semantics must describe Control Tower concepts, not Pi sessions, OpenCode instances, Intercom endpoints, pane state, or vendor wire formats. Pi and OpenCode may later translate to this contract, but neither may define it or become an authority source within it.

### Exact ownership

A port number alone is not proof of ownership. Acceptance requires the exact binding and its validated relationship to runtime identity, worktree, process, and incarnation. A binding from one runtime context cannot authorize another, even if both refer to the same numeric port at different times.

### Current incarnation

Incarnation distinguishes current runtime ownership from stale or replayed state. Prior state must not regain validity merely because a worktree, process reference, binding identifier, or port value is reused or resembles a current value.

### Closed validation

The public contracts are closed shapes. Missing required relationships, conflicting values, ambiguous representations, unknown fields, and cross-object drift are rejected rather than ignored, repaired, defaulted permissively, or inferred from adapter state.

### Worktree isolation

Decision 86 fixes one broker namespace per worktree under a Tower-owned supervisor with unpredictable identifiers. S4.10 expresses the neutral identity and binding constraints needed by that topology, but it does not implement the broker, supervisor, keepalive, adapter, or lifecycle operations outside the approved Área.

## Non-goals

S4.10 does not:

- Implement Pi, OpenCode, Intercom, or any other host adapter.
- Implement broker or supervisor process management.
- Implement observe, health, stop, or attach behavior owned by S4.11.
- Implement Pi recovery or successor behavior owned by S4.12.
- Touch, revive, reinterpret, or plan work for S4.4, S4.8, S4.9, or S8.12.
- Change installation, packaging, runtime payload membership, or release behavior.
- Adopt foreign processes that Control Tower did not launch.
- Create a shared broker, cross-worktree namespace, external network listener, or durable mailbox.
- Modify any path outside the approved S4.10 Área.

## Affected areas

| Area | Intended impact |
| --- | --- |
| Host-runtime contracts | Define neutral identity, binding, incarnation, and loopback-port ownership semantics. |
| Versioned JSON schemas | Express closed public contract shapes with no undeclared fields. |
| Runtime validation | Enforce exact cross-bindings and reject collision, stale state, replay, ambiguity, and drift. |
| Loopback-port reservation | Reserve and release a port as a property of the exact binding, not as standalone authority. |
| Contract tests | Prove host neutrality, exact ownership, valid lifecycle behavior, and fail-closed rejection cases. |
| Future host adapters | Receive a stable boundary to implement later without influencing this Session's contract. |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Vendor vocabulary leaks into the public contract and makes Pi or OpenCode architectural authority. | Require host-neutral schema names, validation semantics, and tests; reject imports or concepts specific to adapters. |
| A numeric port is treated as sufficient ownership evidence. | Validate the port only through the exact binding and its runtime identity, worktree, process, and incarnation relationships. |
| Port release or reuse makes stale state valid again. | Make current incarnation and exact binding part of validation and test replay after release/reuse as a closed failure. |
| Schema validation and runtime reservation behavior enforce different invariants. | Specification and design must define one canonical contract path and test both structural and ownership failures. |
| Strict closed shapes impede future evolution. | Use explicit versioned schemas; future additions require a deliberate contract version rather than silently accepting extra fields. |
| Broker, lifecycle, adapter, or installation work leaks into S4.10. | Enforce the exclusive Área and explicit S4.11/S4.12/S4.4/S4.8/S4.9/S8.12 ownership boundaries. |
| Implementation exceeds one independently verifiable, revertible 400-authored-line commit. | Tasks must preserve S4.10 as one Sesión while arranging sequential, independently verifiable direct commits, each within the repository budget. |

## Rollback

The proposal stage changes no runtime behavior. If the later S4.10 implementation must be rolled back, revert contract code, schemas, and their contract tests together so no schema-only or validator-only partial contract remains.

Rollback requires no migration or data repair because S4.10 introduces no database state, external listener, adapter activation, installed payload change, or durable mailbox. Reversion must not replace the neutral contract with Pi/OpenCode vocabulary, permissive defaults, inferred ownership, shared broker state, or acceptance of stale or extra fields.

## Success criteria

S4.10 succeeds only when all of the following are measurably true:

1. Identity, worktree, process, binding, and incarnation validate together through a public contract containing no Pi/OpenCode vocabulary.
2. A loopback port is accepted only as belonging to the exact validated binding; a crossed binding or occupied-port collision is rejected closed.
3. Ambiguous identity, stale incarnation, replayed state, missing relationships, conflicting values, and undeclared extra fields are rejected closed.
4. Reservation and release preserve exact binding ownership, and released or reused port values do not revive prior authority.
5. Schemas, runtime validation, reservation behavior, and tests enforce one coherent neutral contract.
6. Tests cover the approved RED cases: ambiguous identity, occupied port, crossed binding, and stale replay.
7. No adapter, broker, supervisor, observe/health/stop/attach, recovery, installation, or packaging responsibility is implemented.
8. The implementation diff touches no path outside `contracts/host-runtime/**`, `schemas/host-runtime-*.schema.json`, and `test/contracts/host-runtime/**`.
9. Any independently verifiable and revertible implementation commit stays within 400 authored lines.

## Authority and next stage

This proposal is governed by Session S4.10 in `openspec/plans/plan-4/STATUS.md` and resolved decisions 80, 84, 86, and 89 in `openspec/plans/decision-register.md`:

- Decision 80 makes Pi the first implementation host while preserving OpenCode and restricts authoritative attachment to Tower-launched processes with unpredictable identifiers.
- Decision 84 requires the host-neutral runtime interface before the Pi adapter and keeps lifecycle, identity, binding, observation, stop, and attach at the neutral boundary.
- Decision 86 fixes one broker per worktree, a Tower-owned supervisor, short runtime paths, unpredictable session identifiers, and Tower-owned keepalive registration.
- Decision 89 fixes the five separate public v1 shapes and their exact current fields.

No unresolved always-escalate decision was found within the approved S4.10 proposal boundary. The next recommended stage is specification, which should turn these ownership rules and rejection conditions into precise contract scenarios without revising the approved Sesión, Módulo, Tareas, Área, Recurso, or neighboring Session ownership.
