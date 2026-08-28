# Delta for Host Runtime

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Host-runtime boundary and session scope

The host-runtime contract implementation and its contract tests MUST be confined to `contracts/host-runtime/**`, `schemas/host-runtime-*.schema.json`, and `test/contracts/host-runtime/**`.

The contract MUST NOT implement adapters; broker or supervisor management; Pi recovery or successor behavior; installation, packaging, runtime-payload membership, or release behavior. It MUST NOT touch, revive, reinterpret, or plan work owned by S4.4, S4.8, S4.9, S4.12, or S8.12.

S4.11 MAY implement observe, health, stop, and attach only in its exclusive Área and only under the requirements of this delta. S4.11 MUST NOT modify the S4.10 contract or its contract-test boundary.

(Previously: S4.10 excluded all observe, health, stop, and attach operations from the host-runtime contract boundary.)

#### Scenario: S4.11 operations remain outside the S4.10 contract area

- GIVEN an S4.11 implementation provides an operation boundary
- WHEN its paths and responsibilities are evaluated
- THEN it MUST remain in the S4.11 exclusive Área and MUST NOT change S4.10 host-runtime contract files
