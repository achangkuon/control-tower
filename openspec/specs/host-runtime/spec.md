# Host Runtime Specification

## Purpose

Define the public, versioned host-neutral contract that binds one Tower-launched runtime incarnation in one worktree to one loopback port. The contract is independent of Pi, OpenCode, Intercom, broker, and supervisor vocabulary.

## Requirements

### Requirement: Neutral closed identity and binding shapes

The system MUST publish only the following closed v1 contract shapes in `schemas/host-runtime-*.schema.json`:

- an identity shape with exactly `schema_version` and `runtime_id`;
- a worktree shape with exactly `schema_version` and `worktree_id`;
- a process shape with exactly `schema_version` and `process_id`;
- an incarnation shape with exactly `schema_version` and `incarnation_id`; and
- a binding shape with exactly `schema_version`, `binding_id`, `runtime_id`, `worktree_id`, `process_id`, `incarnation_id`, and `loopback_port`.

Each shape MUST require every listed field, reject every unlisted field, and require its own v1 schema-version literal. Identifiers MUST be canonical opaque identifiers as defined by the versioned schema; callers MUST NOT substitute host-specific session, endpoint, pane, broker, adapter, or wire-format fields.

#### Scenario: A complete neutral binding validates

- GIVEN v1 identity, worktree, process, and incarnation values and a v1 binding containing their exact identifiers and one valid loopback port
- WHEN the values are validated together
- THEN validation MUST accept them without requiring or deriving any Pi, OpenCode, Intercom, broker, supervisor, or adapter field

#### Scenario: An undeclared field is rejected

- GIVEN any v1 host-runtime contract object with all required fields and one additional field
- WHEN schema or runtime validation is performed
- THEN validation MUST reject the object closed

#### Scenario: A required cross-binding field is absent or non-canonical

- GIVEN a binding missing one required identifier or containing an identifier that does not satisfy its v1 schema representation
- WHEN validation is performed
- THEN validation MUST reject the binding closed without defaulting, repairing, or inferring a value

### Requirement: Exact identity, worktree, process, binding, and incarnation cross-binding

The system MUST accept a binding only when its `runtime_id`, `worktree_id`, `process_id`, and `incarnation_id` exactly identify one validated identity, worktree, process, and current incarnation in the same validation context. A binding MUST be unique for its exact five-part ownership tuple (`runtime_id`, `worktree_id`, `process_id`, `binding_id`, `incarnation_id`).

The system MUST reject a binding when any referenced value is absent, ambiguous, belongs to another validated context, or differs from the exact value used to establish the binding. The system MUST NOT treat a matching port, process identifier, worktree identifier, or binding identifier alone as proof of the remaining ownership relationship.

#### Scenario: A crossed binding is rejected

- GIVEN two validated runtime contexts with different worktree, process, binding, or incarnation identifiers
- WHEN a binding combines identifiers from those contexts
- THEN validation MUST reject it closed even if its runtime identifier or loopback port matches one context

#### Scenario: An ambiguous identity is rejected

- GIVEN more than one candidate identity, worktree, process, or incarnation can satisfy a binding reference
- WHEN the binding is validated
- THEN validation MUST reject it closed rather than select, order, or infer a candidate

### Requirement: Current incarnation prevents stale and replayed authority

The system MUST treat an incarnation as current only for the exact validated binding that established it. A prior binding or reservation MUST NOT regain validity because a runtime, worktree, process, binding identifier, or numeric port is later reused.

The system MUST reject stale or replayed binding and reservation state when its incarnation identifier is not the current incarnation of the exact ownership tuple. The system MUST NOT refresh, roll forward, or recreate an incarnation from stale input.

#### Scenario: Replay after reuse is rejected

- GIVEN a binding is released and a later valid binding uses a reused port or another reused non-incarnation identifier
- WHEN the released binding or its reservation is replayed
- THEN the system MUST reject the replay because its incarnation is not current

#### Scenario: A stale incarnation is rejected before port ownership is accepted

- GIVEN a structurally valid binding whose identity, worktree, process, and binding identifiers otherwise match a current context but whose incarnation identifier is prior
- WHEN the binding is validated or used for reservation
- THEN the system MUST reject it closed and MUST NOT reserve, release, or authorize the port

### Requirement: Loopback-port ownership and collision handling

The system MUST reserve a valid loopback port only for one exact current validated binding. The reservation MUST record and validate the binding's identity, worktree, process, binding, and incarnation relationship; a numeric port MUST NOT constitute independent authority.

The system MUST reject a reservation when the requested port is not a valid loopback port, is already reserved by another binding, is occupied on loopback, or cannot be proven available for the exact binding. The system MUST reject collision rather than displace, share, adopt, or reinterpret an existing owner.

#### Scenario: The exact binding reserves an available loopback port

- GIVEN a current validated binding and an available valid loopback port
- WHEN that binding reserves the port
- THEN the system MUST associate the reservation only with that exact binding and its current incarnation

#### Scenario: Another binding requests a reserved port

- GIVEN a loopback port reserved by one current binding
- WHEN another binding requests that port
- THEN the system MUST reject the request closed and preserve the existing reservation

#### Scenario: An externally occupied loopback port is rejected

- GIVEN a valid loopback port is occupied by a listener not owned by the requesting binding
- WHEN the binding requests reservation
- THEN the system MUST reject the request closed and MUST NOT adopt, replace, or claim the listener

### Requirement: Neutral unpublished validation before ownership publication

The ownership registry MAY accept one optional caller-neutral `validateUnpublished` capability. When supplied, it MUST be a function. The registry MUST invoke it only after acquiring the exact loopback reservation and its exact private close capability, while the reservation remains unpublished, and before publishing ownership. When the capability is absent, reservation behavior, acknowledgment shape, service shape, release behavior, and publication semantics MUST remain unchanged.

The validator MUST receive only one immutable neutral metadata view containing exactly `binding_id`, `runtime_id`, `worktree_id`, `process_id`, `incarnation_id`, and `loopback_port`. It MUST NOT receive close, release, publish, registry maps, mutable ownership, adapter state, or host-specific policy. The registry MUST retain sole ownership of the exact close capability and sole authority to publish the acquired reservation.

Successful synchronous or asynchronous validation MUST permit exactly one publication of the exact acquired reservation. A validator throw or rejection MUST prevent publication and make the registry invoke that same exact close capability. If close succeeds, reservation MUST fail closed as an acquisition failure. If close throws, rejects, or cannot be confirmed, reservation MUST fail as cleanup failure and the registry MUST quarantine the exact close with its neutral metadata, block port reuse, and retain it for disposal retry. The registry MUST NOT substitute best-effort cleanup, reconstruct a close capability, or leave uncertain ownership untracked.

#### Scenario: Optional validation accepts unpublished ownership

- GIVEN a current exact binding, an acquired loopback reservation, and a validator
- WHEN validation completes successfully
- THEN the validator MUST have observed only frozen neutral metadata while the reservation was unpublished
- AND the registry MUST publish the exact reservation once after validation

#### Scenario: No validator preserves compatibility

- GIVEN a current exact binding and no unpublished validator
- WHEN the registry acquires the reservation
- THEN it MUST publish and acknowledge the reservation with the existing public service and acknowledgment shapes

#### Scenario: Validation failure closes without publication

- GIVEN the registry acquired a reservation and retained its exact close capability
- WHEN the validator throws or rejects
- THEN the registry MUST NOT publish ownership
- AND it MUST invoke that exact close capability and report the reservation failure without exposing private validation detail

#### Scenario: Uncertain validation cleanup is quarantined

- GIVEN validation failed and the exact close throws, rejects, or remains uncertain
- WHEN another binding requests the same loopback port or the registry disposes
- THEN the port MUST remain unavailable while quarantined
- AND disposal MUST retry the same exact close capability before clearing quarantine

#### Scenario: Validation cannot gain ownership authority

- GIVEN a validator attempts to inspect or retain its input
- WHEN it examines the immutable view
- THEN no close, release, publish, registry map, mutable ownership, host, adapter, broker, Pi, OpenCode, or Intercom authority MUST be present

### Requirement: Synchronous final-currentness guard before publication

The ownership registry MAY accept one optional caller-neutral `validateCurrentBeforePublish` capability. When supplied, it MUST be a function and MUST run synchronously after `validateUnpublished` has completed and after the registry repeats its local publication-safety check, immediately before publication in the same stack. When absent, existing reservation and publication behavior MUST remain unchanged.

The guard MUST receive the same immutable metadata containing exactly `binding_id`, `runtime_id`, `worktree_id`, `process_id`, `incarnation_id`, and `loopback_port`, without close or host vocabulary. Only the primitive boolean `true` permits publication. A throw, `false`, any non-boolean, Promise, or thenable MUST fail closed without awaiting, assimilating, or continuing from that result.

A failed guard MUST prevent publication and invoke the exact private close capability under the existing acquisition-failure and cleanup-quarantine rules. A process replaced in the same worktree seat MUST NOT publish; only metadata matching the current process and incarnation may pass.

#### Scenario: Current exact ownership publishes

- GIVEN asynchronous unpublished validation completed and the local safety recheck still passes
- WHEN the synchronous final-currentness guard returns primitive `true`
- THEN the registry MUST publish the exact reservation immediately in the same stack

#### Scenario: Stale or non-synchronous currentness fails closed

- GIVEN the process was replaced in the same worktree seat or the guard does not return primitive `true`
- WHEN final currentness is checked
- THEN the registry MUST NOT publish or acknowledge the reservation
- AND it MUST close or quarantine that exact acquisition without awaiting or assimilating the guard result

### Requirement: Exact release and safe port reuse

The system MUST release a port only when the release request validates the exact current binding and incarnation that own its reservation. A release MUST remove authority for that released binding; it MUST NOT validate old binding state if the numeric port is later reserved again.

The system MAY permit a released port to be reserved by a later current binding only after the earlier exact ownership is no longer active. The later reservation MUST establish its own binding and incarnation relationship.

#### Scenario: The owning current binding releases its port

- GIVEN a current binding owns a loopback-port reservation
- WHEN that exact binding with its current incarnation releases the port
- THEN the reservation MUST cease to authorize that binding

#### Scenario: A foreign or stale binding attempts release

- GIVEN a loopback port is reserved by a current binding
- WHEN a different binding or an earlier incarnation requests release
- THEN the system MUST reject the request closed and preserve the current reservation

### Requirement: Host-runtime boundary and session scope

The host-runtime contract implementation and its contract tests MUST be confined to `contracts/host-runtime/**`, `schemas/host-runtime-*.schema.json`, and `test/contracts/host-runtime/**`.

The contract MUST NOT implement adapters; broker or supervisor management; Pi recovery or successor behavior; installation, packaging, runtime-payload membership, or release behavior. It MUST NOT touch, revive, reinterpret, or plan work owned by S4.4, S4.8, S4.9, S4.12, or S8.12.

S4.11 MAY implement observe, health, stop, and attach only in its exclusive Área and only under the requirements of this delta. S4.11 MUST NOT modify the S4.10 contract or its contract-test boundary.

(Previously: S4.10 excluded all observe, health, stop, and attach operations from the host-runtime contract boundary.)

#### Scenario: S4.11 operations remain outside the S4.10 contract area

- GIVEN an S4.11 implementation provides an operation boundary
- WHEN its paths and responsibilities are evaluated
- THEN it MUST remain in the S4.11 exclusive Área and MUST NOT change S4.10 host-runtime contract files

### Requirement: Exact current binding and closed operation inputs

The system MUST authorize observe, health, stop, and attach only for the exact current S4.10 binding and incarnation. It MUST validate the complete current binding relationship, including its runtime, worktree, process, binding, and incarnation identifiers, before issuing a challenge, accepting proof, reporting a proven result, acknowledging a stop request, or acknowledging attach.

Every S4.11 operation input, challenge, proof, and acknowledgment representation MUST be closed: it MUST require its declared fields and reject every undeclared field. It MUST NOT default, repair, infer, or derive a missing identity, binding, incarnation, operation, producer, or challenge value. A matching port, process, worktree, runtime, or binding identifier alone MUST NOT establish authority for any other value.

#### Scenario: An exact current operation context is accepted

- GIVEN a complete operation input whose binding and incarnation exactly match one current S4.10 context
- WHEN an operation validates the input
- THEN the system MUST treat only that exact context as eligible for its operation

#### Scenario: A crossed, stale, incomplete, or extra-field context is rejected

- GIVEN an operation input, challenge, proof, or acknowledgment that has an undeclared field, a missing declared field, a stale incarnation, or an identifier from another current context
- WHEN it is validated
- THEN the system MUST reject it closed and MUST NOT issue authority, accept proof, or return a successful acknowledgment

### Requirement: Producer-issued challenge and matching proof authority

The system MUST use a producer-issued challenge for every operation that accepts producer evidence or returns an attach acknowledgment. A challenge MUST be bound to exactly one operation, one exact current binding, one exact current incarnation, and its issuing producer. The system MUST accept proof only when the proof exactly matches an issued challenge and comes from that challenge's issuing producer.

A challenge MUST be one-use. Every producer call for an issued challenge MUST terminally consume that challenge when it returns valid matching proof, returns a producer-call error, or returns proof that mismatches the challenge. After terminal consumption, the system MUST reject any reuse of that challenge; any retry MUST obtain a new producer-issued challenge bound to the retry operation and the exact current binding, incarnation, and issuing producer. A producer-call error MUST NOT preserve or renew the challenge. A proof mismatch MUST fail closed and MUST NOT establish a proven result, attach authority, or any successful acknowledgment. The system MUST reject closed a replayed, stale, foreign, self-reported, cross-operation, cross-binding, cross-incarnation, producer-mismatched, or challenge-mismatched proof. A caller claim, transport delivery, request acknowledgment, caller-selected producer, or absence of contradictory evidence MUST NOT substitute for matching producer proof.

#### Scenario: Matching producer proof is accepted once

- GIVEN the producer issued a challenge bound to `health` and to one exact current binding and incarnation
- WHEN that same producer returns proof that exactly matches that challenge and context
- THEN the system MUST accept the proof for that operation and MUST reject any later reuse of the challenge

#### Scenario: Non-matching proof cannot gain authority

- GIVEN an issued challenge for one operation, binding, incarnation, and producer
- WHEN proof is supplied by a different producer, self-reported by the caller, replayed, or bound to a different operation, binding, or incarnation
- THEN the system MUST reject the proof closed and MUST NOT establish a proven result or attach authority
- AND a challenge object consumed or rejected by any composed operation MUST NOT regain authority in another operation

#### Scenario: A producer-call error or proof mismatch consumes the challenge

- GIVEN an issued challenge for one operation, exact current binding, incarnation, and producer
- WHEN the producer call errors or returns proof that does not exactly match the challenge
- THEN the system MUST terminally consume the challenge, fail closed, and reject any retry using it
- AND WHEN the caller retries the operation
- THEN the system MUST require a new producer-issued challenge

### Requirement: Observe preserves the evidence boundary

The `observe` operation MUST return only available producer evidence and the applicable non-proven condition. Timeout policy MUST remain owned by each producer or adapter. The host-neutral core MUST NOT implement timers, sleeps, wall-clock reads, cancellation, deadlines, or `Promise.race`. Producer timeout or silence MUST reach the core only as producer rejection or a `null`, `undefined`, or missing response, and MUST map to a non-proven unavailable condition. It MUST NOT promote missing, partial, disconnected, timed-out, silent, self-reported, transport-delivered, or otherwise uncertain information into a proven runtime fact.

#### Scenario: Missing or disconnected observation remains unproven

- GIVEN observe cannot obtain matching producer proof because evidence is missing, partial, disconnected, timed out, or silent
- WHEN observe returns
- THEN its result MUST remain non-proven and MUST NOT state healthy, stopped, or dead as proven

### Requirement: Health has only three state distinctions

The `health` operation MUST distinguish exactly `proven healthy`, `disconnected/unknown`, and `proven dead`. It MUST return `proven healthy` or `proven dead` only from matching proof from the challenge's issuing producer for the exact current binding and incarnation. Disconnect, producer rejection representing timeout or silence, `null`, `undefined`, missing response, transport delivery, or a caller claim MUST result only in `disconnected/unknown` and MUST NOT independently prove death. A foreign or malformed non-null proof MUST remain a proof mismatch rather than producer unavailability.

#### Scenario: Matching proof establishes a health state

- GIVEN a health challenge for the exact current binding and incarnation
- WHEN its issuing producer returns matching proof of healthy or dead
- THEN health MUST return respectively `proven healthy` or `proven dead`

#### Scenario: Disconnection is not death

- GIVEN health cannot obtain matching producer proof because the producer is disconnected, times out, is silent, or returns no response
- WHEN health returns
- THEN it MUST return `disconnected/unknown` and MUST NOT return `proven dead`

### Requirement: Stop acknowledgment is distinct from producer-proven state

The `stop` operation MUST represent request acknowledgment separately from producer-proven stopped or dead state. A stop-request acknowledgment MUST NOT by itself establish that the runtime stopped or died. Disconnect, timeout, silence, missing response, or transport delivery during stop MUST NOT be promoted to producer-proven death or stopped state.

When the producer call fails during `stop`, including rejection or a `null`, `undefined`, or missing response representing producer-owned timeout or silence, the system MUST return request `not acknowledged` and runtime `disconnected/unknown`. It MUST NOT report the runtime as stopped or dead, and it MUST NOT preserve or reuse the challenge from the failed producer call.

#### Scenario: Acknowledgment is not lifecycle proof

- GIVEN the producer acknowledges receipt of a stop request for the exact current binding and incarnation
- WHEN stop returns that acknowledgment
- THEN the system MUST report it separately from producer-proven stopped or dead state

#### Scenario: Stop disconnection remains non-proven

- GIVEN a stop request receives disconnect, timeout, silence, missing response, or transport delivery without matching producer proof of stopped or dead
- WHEN stop returns
- THEN it MUST NOT report the runtime as producer-proven stopped or dead

#### Scenario: Stop producer-call failure is not acknowledged and remains unknown

- GIVEN a stop challenge for the exact current binding and incarnation
- WHEN the producer call fails
- THEN stop MUST return request `not acknowledged` and runtime `disconnected/unknown`
- AND THEN it MUST NOT return stopped or dead and MUST terminally consume the failed call's challenge

### Requirement: Attach requires fresh matching proof and exact acknowledgment binding

The `attach` operation MUST require fresh matching proof from the producer that issued its attach challenge for the exact current binding and incarnation. It MUST reject closed stale, replayed, foreign, self-reported, cross-operation, cross-binding, cross-incarnation, producer-mismatched, or challenge-mismatched proof.

A successful attach acknowledgment MUST be bound to that same exact binding and incarnation. Producer rejection or a `null`, `undefined`, or missing response MUST be producer unavailable and MUST NOT return an attach acknowledgment. A foreign or malformed non-null proof MUST remain a proof mismatch. The system MUST NOT acknowledge attach from a matching port, process, runtime, worktree, or binding identifier alone.

#### Scenario: Attach acknowledges the proven exact context

- GIVEN an attach challenge and fresh matching proof from its issuing producer for one exact current binding and incarnation
- WHEN attach succeeds
- THEN its acknowledgment MUST identify that same binding and incarnation

#### Scenario: Attach rejects stale or crossed proof

- GIVEN an attach challenge for one exact current binding and incarnation
- WHEN attach receives stale, replayed, foreign, self-reported, cross-operation, cross-binding, cross-incarnation, producer-mismatched, or challenge-mismatched proof
- THEN attach MUST reject closed and MUST NOT return an acknowledgment

### Requirement: Host-neutral operational boundary and confined responsibility

The S4.11 operation boundary MUST use neutral terminology and MUST remain confined to `hosts/runtime-port.mjs`, `hosts/runtime-observe.mjs`, `test/hosts/runtime-port.test.mjs`, and `test/hosts/runtime-observe.test.mjs`. It MUST NOT implement adapters, broker or supervisor behavior, installation, packaging, runtime payloads, recovery, successor creation, quiescence, or any host-specific product semantics. It MUST NOT modify the S4.10 v1 public shapes, identifier grammar, reservation lifecycle, ownership registry, or loopback-port ownership rules.

#### Scenario: A prohibited responsibility or vocabulary is introduced

- GIVEN a proposed S4.11 implementation or test introduces adapter, broker, installation, recovery, or host-specific responsibility or terminology, or changes S4.10 public contracts
- WHEN the change is evaluated
- THEN it MUST be rejected as outside S4.11
