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

The contract MUST NOT implement adapters; broker or supervisor management; observe, health, stop, or attach operations; Pi recovery or successor behavior; installation, packaging, runtime-payload membership, or release behavior. It MUST NOT touch, revive, reinterpret, or plan work owned by S4.4, S4.8, S4.9, S4.11, S4.12, or S8.12.

#### Scenario: A host-specific or out-of-scope responsibility is proposed

- GIVEN an implementation or contract change introduces host-adapter vocabulary, broker/supervisor behavior, lifecycle operations, recovery, installation, packaging, or a path outside the approved Área
- WHEN the S4.10 contract boundary is evaluated
- THEN the change MUST be rejected as outside S4.10
