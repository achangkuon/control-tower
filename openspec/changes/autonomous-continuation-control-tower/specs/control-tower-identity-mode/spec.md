# Control Tower Identity and Mode — Revision 11

## Requirements

### Requirement: CT-R4 Registration-bound claimant identity and fail-closed receive

Registration MUST persist one `host_process_instance` bound to `plugin_instance`, proven root, MCP process, PID start marker, and `binding_epoch`; claim and recovery MUST validate that full tuple. `register({request_identity,expected_binding_epoch,expected_binding_state})` returns `{binding_id,binding_epoch,binding_status,replayed}`; the first registration MUST CAS `{expected_binding_epoch:0,expected_binding_state:"ABSENT"}`, and a same-root rebind MUST CAS the exact ACTIVE epoch/state before retiring it and incrementing the epoch. A second root MUST persist MULTIPLEXED conflict history with no ACTIVE row. Receive is argument-free and non-consuming; it MUST reject missing, mismatched, non-unique, or multiplexed identity before returning any delivery, and only `claim` consumes.

#### Scenario: CT-R4-S1 Registration and claim identity
- GIVEN a host registers a proven root and MCP process with ABSENT/0 CAS
- WHEN it registers, claims, or later recovers a handoff
- THEN the full plugin/root/MCP/PID-start/epoch tuple is checked at every boundary

#### Scenario: CT-R4-S2 Same-root rebind fences
- GIVEN an ACTIVE root registers a new MCP process with exact CAS
- WHEN registration succeeds
- THEN the old binding retires, epoch increments, and old generations/tokens return `CT_FENCE_MISMATCH`

#### Scenario: CT-R4-S3 Second root multiplexes
- GIVEN root A is ACTIVE for a plugin instance
- WHEN root B registers for that instance
- THEN conflict history is immutable, processes become MULTIPLEXED, no ACTIVE row remains, nothing is consumed

#### Scenario: CT-R4-S4 Receive mismatch is non-mutating
- GIVEN identity is missing, mismatched, zero/multiple ACTIVE, or multiplexed
- WHEN any receive path is called
- THEN it returns `CT_SESSION_ISOLATION_UNPROVEN` or `CT_SESSION_MULTIPLEXED` and leaves the message pending

#### Scenario: CT-R4-S5 First registration CAS
- GIVEN no claimant binding exists
- WHEN register supplies any expectation other than `{expected_binding_epoch:0,expected_binding_state:"ABSENT"}`
- THEN it returns `CT_FENCE_MISMATCH` without creating a binding

#### Scenario: CT-R4-S6 Same-root CAS is mandatory
- GIVEN an ACTIVE same-root binding at epoch E
- WHEN register supplies a stale epoch/state or a different root
- THEN it returns `CT_FENCE_MISMATCH` or `CT_SESSION_MULTIPLEXED` without touching bindings

### Requirement: CT-R11 Persistent mode, lease, rollback epoch, zero-live exclusion

The system MUST persist `continuation_mode={OFF|ON|ROLLING_BACK}` and `rollback_epoch`, checked in every writer/delivery transaction. OFF and ROLLING_BACK MUST reject ordinary register/create/validate/publish/receive/claim/ack/attest/complete/reject/revise/recover with `CT_CONTINUATION_OFF` or `CT_ROLLBACK_IN_PROGRESS`; exceptions are named anchor/schema/bootstrap, status, activation, rollback, rebind, finish, and rollback-owner Main `recover` at matching epoch. In ROLLING_BACK, recovery MUST permit `SUSPEND_PENDING`, `SUSPEND_ATTESTATION`, `CANCELLED`, or `POISONED`, but MUST reject `NOT_STARTED`, `ROLLED_BACK`, `REDELIVER_WORK`, and `REDELIVER_ATTESTATION` non-mutating with `CT_RECOVERY_DISPOSITION_FORBIDDEN`; no ROLLING_BACK transition may insert a PENDING delivery. OFF MUST reject recovery. Suspended states are non-live audit inventory; `finishRollback` MUST require zero live claims, deliveries, and workers. Exact shapes: `status()`→`{mode,schema_version,rollback_epoch,lease_status,main_binding_status,live_counts,pending_counts}` read-only in any mode, never exposing tokens or anchor secret; `beginRollback`→`{mode:"ROLLING_BACK",rollback_epoch,lease_version,lease_expires_at,replayed}`; `rebindMain`→`{main_binding_id,binding_epoch,rollback_epoch,lease_version,lease_expires_at,replayed}`; `finishRollback`→`{mode:"OFF",rollback_epoch,quiescence_digest,replayed}`.

#### Scenario: CT-R11-S1 OFF rejects ordinary transactions
- GIVEN persisted mode OFF
- WHEN any ordinary writer or delivery API is called
- THEN it returns `CT_CONTINUATION_OFF` without changing any row, delivery, budget, or evidence

#### Scenario: CT-R11-S2 Recovery disposition gates
- GIVEN ROLLING_BACK, matching-epoch rollback-owner Main; `NOT_STARTED`, `ROLLED_BACK`, `REDELIVER_WORK`, and `REDELIVER_ATTESTATION`
- WHEN Main evaluates each; ordinary writers omit/use stale rollback epoch
- THEN each recovery returns `CT_RECOVERY_DISPOSITION_FORBIDDEN` with no mutation or PENDING delivery
- AND omission and stale attempts return `CT_ROLLBACK_IN_PROGRESS` without mutation

#### Scenario: CT-R11-S3 Administrative exceptions are explicit
- GIVEN status, bootstrap, rollback, rebind, or manual activation
- WHEN authorized by the named administrator/Main context
- THEN only its documented administrative effect occurs and no continuation work is delivered

#### Scenario: CT-R11-S4 OFF follows quiescence
- GIVEN live rows remain or polling has not quiesced
- WHEN finishRollback or manual/legacy replacement is requested
- THEN it returns `CT_NOT_QUIESCENT`; OFF requires zero live rows and an atomic transition

#### Scenario: CT-R11-S5 Rebind uses expired lease and proof
- GIVEN ROLLING_BACK, expected epoch/lease, an expired lease, and fresh old-Main termination proof
- WHEN rebindMain executes
- THEN it waits only within the bounded writer window, retires old Main, increments binding/lease versions, transfers the lease, and keeps delivery closed
