# Control Tower Migration and Polling — Revision 11

## Requirements

### Requirement: CT-R8 Out-of-band authority, additive migration, legacy continuity

`provisionMainAuthorityAnchor({request_identity,expected_config_digest})` MUST run out of band from the local install/admin CLI before any runtime use: it derives and verifies the configured canonical repository, common dir, Main worktree, branch, and trusted UID, then atomically persists an unpredictable owner-only `main_authority_anchor_v1`, returning exactly `{anchor_id,anchor_epoch,state:"PROVISIONED",replayed}` (mismatch: `CT_ANCHOR_MISMATCH`). `bootstrapAdmin` MUST only validate that pre-existing anchor and migrate schema/mode to OFF, returning exactly `{anchor_id,schema_version,mode:"OFF",replayed}`; it MUST NOT create, replace, or authorize an anchor.

Migration MUST be additive, byte-checksummed, version-manifested, and leave legacy rows and behavior unchanged. Before P2, bounded prerequisite P1-FC MUST change fresh-install Migration 001 constraints from exact `= 1` to `>= 1`, re-run Slice 1, and receive scoped re-judgment. The superseded exact-v1 checksum MUST be rejected non-mutating; it MUST NOT be repaired with table rebuild/rename/copy. Migration 002 MAY then add only claimant-binding/conflict/lease objects and v2 rows, and update the singleton schema version `1→2` while mode remains OFF. Any checksum, DDL, config, anchor, lease, or version-specific manifest drift MUST fail closed with continuation OFF.

#### Scenario: CT-R8-S1 Migration failure
- GIVEN checksum or DDL validation fails
- WHEN bootstrap runs
- THEN migration rolls back, continuation stays OFF, and legacy behavior is retained

#### Scenario: CT-R8-S2 Constraint and inactive receive
- GIVEN a duplicate ACTIVE claimant identity, a MULTIPLEXED claimant scope, or inactive continuation
- WHEN P2 registration or continuation receive is attempted
- THEN the error is atomic and no continuation delivery or legacy message is consumed
- AND attestation single-use constraints remain covered by CT-R6-S3 when that schema is added

#### Scenario: CT-R8-S3 Out-of-band anchor
- GIVEN no runtime anchor exists and configured context is valid
- WHEN the install/admin CLI provisions the anchor
- THEN a versioned owner-only anchor exists; payload role/identity/location grants nothing

#### Scenario: CT-R8-S4 Bootstrap never provisions
- GIVEN a missing or mismatched pre-existing anchor
- WHEN bootstrapAdmin runs
- THEN it returns `CT_ANCHOR_REQUIRED` or `CT_ANCHOR_MISMATCH`, stays OFF, and creates no anchor

#### Scenario: CT-R8-S5 OFF administration
- GIVEN a valid anchor and schema with mode OFF
- WHEN bootstrapAdmin, bootstrapMain, then explicit activate run
- THEN migration and binding happen while OFF, activation returns ON without launch or delivery, legacy stays additive

### Requirement: CT-R5 Root-only polling

Every supported host adapter MUST delegate polling, wake throttling, and stop-before-receive ordering to one host-neutral controller bound to exactly one proven root. OpenCode MUST map root `session.idle`/disposal and `promptAsync`; Pi MUST map `agent_settled`/`session_shutdown` and idle-safe message injection; Claude MUST map `Stop`/`SessionEnd` and bounded hook rewake. Child creation, idle, or deletion MUST NOT start or stop root polling. Root deletion, disposal, shutdown, or terminal stop MUST stop polling before wake or receive, and lifecycle events MUST NOT consume without verified identity. The five CT-R5 scenarios MUST run unchanged as a conformance matrix for OpenCode, Pi, and Claude; host adapters MUST NOT import or duplicate SQLite transition logic.

#### Scenario: CT-R5-S1 Child deletion preserves polling
- GIVEN a live bound root, child, and pending handoff
- WHEN the child is deleted
- THEN root polling continues and the handoff remains pending

#### Scenario: CT-R5-S2 Root deletion stops polling
- GIVEN a root session is polling
- WHEN the root is deleted or disposed
- THEN polling stops before wake/receive and no delivery is consumed

#### Scenario: CT-R5-S3 Child creation is ignored
- GIVEN a live bound root is polling with a pending handoff
- WHEN a child session is created
- THEN root polling is unchanged and the handoff remains pending

#### Scenario: CT-R5-S4 Child idle is ignored
- GIVEN a live bound root and child with root polling active
- WHEN the child becomes idle
- THEN root polling continues and no delivery is woken or consumed

#### Scenario: CT-R5-S5 Root disposal stops before receive
- GIVEN a root is disposed while a poll wake or receive could occur
- WHEN disposal is processed
- THEN polling stops before wake/receive and no child or root event consumes a delivery

### Requirement: CT-R9 Cooperative threat boundary

The system MUST address accidental duplicate sessions, stale state, crashes, scope drift, and wrong-session actions for cooperative same-UID agents. Host/plugin/root/epoch values MUST arrive through the adapter's constructor capability and MUST NOT be accepted from tool arguments, environment fields, or request payloads. Absence of that capability keeps continuation MCP routes unavailable. This capability boundary and server derivation MUST NOT claim protection from malicious local same-UID process bypasses.

#### Scenario: CT-R9-S1 Trusted misuse
- GIVEN a cooperative agent presents a wrong root, actor, or stale fence
- WHEN it invokes a guarded operation
- THEN deterministic fail-closed behavior applies without a hostile-process security claim
