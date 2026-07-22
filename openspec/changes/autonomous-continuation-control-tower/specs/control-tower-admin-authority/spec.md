# Control Tower Admin Authority — Revision 11

## Requirements

### Requirement: CT-R10 Canonical Main binding and server-resolved authority

Main authority MUST derive only from server-resolved repository/common directory, Main worktree, branch, trusted UID, and ACTIVE anchor-matched `Ctx`; payload claims MUST NOT grant authority. `main_binding_v1` MUST persist `{host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch,main_session_id}`. It MUST copy six identity members from the `bootstrapMain` `Ctx`: host, plugin, root, MCP, PID-start, and `main_session_id=root_session_id`; `binding_epoch` MUST equal CAS-checked `expected_binding_epoch+1`. Main-gated APIs MUST compare that tuple with caller `Ctx`, rejecting missing, stale, duplicate, or multiplexed identity non-mutating.

#### Scenario: CT-R10-S1 Canonical binding
- GIVEN bootstrapMain resolves the configured directory, worktree, branch, and Main context
- WHEN binding runs
- THEN exactly one canonical binding, epoch, and Main session is ACTIVE

#### Scenario: CT-R10-S2 Server-resolved authority
- GIVEN a Main-gated call whose payload identity differs from server metadata
- WHEN authority is evaluated
- THEN the server tuple decides, payload claims are ignored, and only ACTIVE Main proceeds

#### Scenario: CT-R10-S3 Stale Main identity
- GIVEN no ACTIVE binding or a retired epoch/session
- WHEN a Main-gated operation is requested
- THEN it is rejected non-mutating with the applicable Main/session error

#### Scenario: CT-R10-S4 Duplicate Main identity
- GIVEN duplicate ACTIVE bindings or conflicting Main roots/sessions
- WHEN a Main-gated operation is requested
- THEN it is rejected non-mutating, conflict history is kept, and no row changes

#### Scenario: CT-R10-S5 BootstrapMain binds only
- GIVEN a valid anchor, canonical Main context, and mode OFF
- WHEN bootstrapMain is called with the expected anchor and epoch
- THEN it returns only `{main_binding_id,binding_epoch,state:"ACTIVE",replayed}` and neither activates nor delivers

#### Scenario: CT-R10-S6 Activation is explicit
- GIVEN an ACTIVE Main binding, mode OFF, matching epoch, valid evidence
- WHEN activate is called
- THEN it returns only `{mode:"ON",activation_epoch,replayed}` and performs no launch, selection, or recovery

### Requirement: CT-R3 Complete API contracts, idempotency, and deterministic errors

The API MUST expose exactly `provisionMainAuthorityAnchor`, `bootstrapAdmin`, `bootstrapMain`, `activate`, `register`, `create`, `validate`, `publish`, `receive`, `claim`, `ack`, `attestCompletion`, `complete`, `reject`, `revise`, `recover`, `beginRollback`, `rebindMain`, `finishRollback`, `status`, and MUST NOT expose `start`. `Ctx` is ingress-created and immutable: `{effective_uid,canonical_repo,git_common_dir,worktree,branch,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch}`; request actor/role/session fields are forbidden and top-level canonical `request_identity` grants no authority. Lifecycle operations return the common `{id,state,generation,replayed}`; administrative and binding responses never inherit handoff fields. Every mutation is one `BEGIN IMMEDIATE` transaction; an exact operation + `request_identity` + CAS tuple replays the committed response with only `replayed:true`, while a different tuple or a new identity for a committed single-use transition returns `CT_IDEMPOTENCY_CONFLICT` without mutation. Completion persistence MUST be exactly `{request_identity,handoff_id,generation,token_hash,evidence_digest,attestation_id,committed_result}`. Evaluation order: schema/anchor → mode/rollback epoch → actor/binding → idempotency → existence → state/generation/token CAS → proof/evidence/budget/quiescence. Stable errors: `CT_SCHEMA_INVALID`, `CT_ANCHOR_REQUIRED`, `CT_ANCHOR_MISMATCH`, `CT_CONTINUATION_OFF`, `CT_ROLLBACK_IN_PROGRESS`, `CT_ROLLBACK_EPOCH_MISMATCH`, `CT_ADMIN_REQUIRED`, `CT_WORKFLOW_MAIN_REQUIRED`, `CT_SESSION_ISOLATION_UNPROVEN`, `CT_SESSION_MULTIPLEXED`, `CT_MAIN_BINDING_CONFLICT`, `CT_IDEMPOTENCY_CONFLICT`, `CT_NOT_FOUND`, `CT_INVALID_TRANSITION`, `CT_FENCE_MISMATCH`, `CT_PAYLOAD_INVALID`, `CT_EFFECT_MANIFEST_REQUIRED`, `CT_COMPLETION_MISMATCH`, `CT_COMPLETION_ATTESTATION_REQUIRED`, `CT_RECOVERY_REQUIRED`, `CT_RECOVERY_CLAIM_PRESENT`, `CT_RECOVERY_DISPOSITION_FORBIDDEN`, `CT_SESSION_BUDGET_EXHAUSTED`, `CT_ACTIVATION_EVIDENCE_REQUIRED`, `CT_ROLLBACK_LEASE_ACTIVE`, `CT_NOT_QUIESCENT`, `CT_BUSY`.

#### Scenario: CT-R3-S1 Replay versus conflict
- GIVEN an idempotent lifecycle result or attestation exists
- WHEN the same or a conflicting tuple is retried
- THEN the exact tuple replays with `replayed:true` and conflicts return `CT_IDEMPOTENCY_CONFLICT`

#### Scenario: CT-R3-S2 Wrong actor, state, or fence
- GIVEN a gated operation with wrong actor, illegal state, or stale fence
- WHEN it is evaluated
- THEN it returns the applicable deterministic error and changes nothing

#### Scenario: CT-R3-S3 Invalid completion before commit
- GIVEN no committed completion and a missing, mismatched, or unconsumable attestation
- WHEN `complete` is evaluated
- THEN it returns `CT_COMPLETION_MISMATCH` or `CT_COMPLETION_ATTESTATION_REQUIRED` and changes nothing

#### Scenario: CT-R3-S4 Completion retry and race
- GIVEN two `complete` requests race for one handoff
- WHEN one commits and either request is retried
- THEN winner and exact-tuple loser replay the same result; any conflicting tuple returns `CT_IDEMPOTENCY_CONFLICT`

#### Scenario: CT-R3-S5 Exact response families
- GIVEN an authorized administrative, binding, handoff, delivery, status, or attestation request
- WHEN it commits or replays
- THEN it returns only its specified shape with no token or anchor secret
