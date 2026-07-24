# Control Tower Admin Authority — Revision 11

## Requirements

### Requirement: CT-R10 Canonical Main binding and server-resolved authority

Main authority MUST derive only from server-resolved repository/common directory, Main worktree, branch, trusted UID, and ACTIVE anchor-matched `Ctx`; payload claims MUST NOT grant authority. `main_binding_v1` MUST persist `{host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch,main_session_id}`. It MUST copy six identity members from the `bootstrapMain` `Ctx`: host, plugin, root, MCP, PID-start, and `main_session_id=root_session_id`; `binding_epoch` MUST equal CAS-checked `expected_binding_epoch+1`. Main-gated APIs MUST compare that tuple with caller `Ctx`, rejecting missing, stale, duplicate, or multiplexed identity non-mutating. Schema 3 MUST persist this history and explicit activation exactly as the P3 design defines. First Main CAS observes active ID `null`/epoch `0`; bootstrap in ON, ROLLING_BACK, ACTIVE lease, and EXPIRED lease returns respectively `CT_FENCE_MISMATCH`, `CT_ROLLBACK_IN_PROGRESS`, `CT_ROLLBACK_LEASE_ACTIVE`, and `CT_FENCE_MISMATCH` after structural validation.

#### Scenario: CT-R10-S1 Canonical binding
- GIVEN bootstrapMain resolves the configured directory, worktree, branch, and Main context
- WHEN binding runs
- THEN exactly one canonical binding, epoch, and Main session is ACTIVE

#### Scenario: CT-R10-S2 Server-resolved authority
- GIVEN a Main-gated call with forbidden caller identity metadata, or a server `Ctx` that differs from the ACTIVE Main binding
- WHEN request shape and authority are evaluated
- THEN caller metadata is rejected `CT_PAYLOAD_INVALID`, otherwise the server tuple alone decides, and only ACTIVE Main proceeds

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

The aggregate continuation dispatcher MUST eventually expose exactly `provisionMainAuthorityAnchor`, `bootstrapAdmin`, `bootstrapMain`, `activate`, `register`, `create`, `validate`, `publish`, `receive`, `claim`, `ack`, `attestCompletion`, `complete`, `reject`, `revise`, `recover`, `beginRollback`, `rebindMain`, `finishRollback`, `status`, and MUST NOT expose `start`. Each slice advertises only implemented routes; unavailable routes fail before database access. This list does not rename or overload the legacy core `register(handle, role)` / consuming `receive(handle)` or the eight legacy `tower_*` MCP tools. The two provisioning operations remain CLI/admin-transport only. A continuation MCP route MUST NOT be advertised until a host adapter supplies its constructor-time trusted metadata capability.

`Ctx` is ingress-created and immutable: `{effective_uid,canonical_repo,git_common_dir,worktree,branch,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch}`. UID/repository/worktree/branch are server-derived; MCP instance and PID-start are server-observed; host/plugin/root/epoch come only from the adapter capability closed over by the dispatcher. `Ctx`, actor, role, session, UID, location, process, PID, and epoch request fields are forbidden and return `CT_PAYLOAD_INVALID`; top-level canonical `request_identity` grants no authority. Without the capability, continuation dispatch is unavailable rather than accepting caller metadata.

Lifecycle operations return the common `{id,state,generation,replayed}`; administrative and binding responses never inherit handoff fields. Every mutation is one `BEGIN IMMEDIATE` transaction. Idempotency and transition identity are scoped by operation: an exact operation + `request_identity` + scope/request/CAS tuple replays the committed response with only `replayed:true`, a different tuple or a new identity for a committed single-use scope returns `CT_IDEMPOTENCY_CONFLICT` without mutation, and the same UUID used by a different operation has no replay/conflict meaning. The audited second-root transition MAY persist and replay an internal `{error:"CT_SESSION_MULTIPLEXED"}` outcome so immutable conflict history is written once; it is always surfaced as the stable error, never a success response. P4 `create|validate|publish|claim` MUST use the exact request/scope/request-digest/CAS membership and response shapes pinned by the P4 design amendment. VALIDATE and PUBLISH requests MUST NOT accept `validation_digest` or caller authority/evidence: the server derives validation evidence/digest and both CAS inputs from constructor-owned Main/Ctx authority plus persisted handoff state, stores canonical server-only replay envelopes, and returns only the common handoff response. Claim is the sole bearer-material exception: only a fresh successful claim returns the public token with `replayed:false`; SQLite persists an integrity-checked token-free response template and exact token-free decision commitment plus token salt/hash. Exact replay verifies the committed identity, CAS, template, decision, and token-hash commitments but returns the token-free response with `replayed:true`; it never reconstructs or rediscloses the bearer. Later token-gated operations validate only the caller-provided bearer against the persisted hash, and no serialized bearer response is persisted or hashed. Completion persistence MUST be exactly `{request_identity,handoff_id,generation,token_hash,evidence_digest,attestation_id,committed_result}`. Evaluation order: schema/anchor → mode/rollback epoch → actor/binding → idempotency → existence → state/generation/token CAS → proof/evidence/budget/quiescence. Stable errors: `CT_SCHEMA_INVALID`, `CT_ANCHOR_REQUIRED`, `CT_ANCHOR_MISMATCH`, `CT_CONTINUATION_OFF`, `CT_ROLLBACK_IN_PROGRESS`, `CT_ROLLBACK_EPOCH_MISMATCH`, `CT_ADMIN_REQUIRED`, `CT_WORKFLOW_MAIN_REQUIRED`, `CT_SESSION_ISOLATION_UNPROVEN`, `CT_SESSION_MULTIPLEXED`, `CT_MAIN_BINDING_CONFLICT`, `CT_IDEMPOTENCY_CONFLICT`, `CT_NOT_FOUND`, `CT_INVALID_TRANSITION`, `CT_FENCE_MISMATCH`, `CT_PAYLOAD_INVALID`, `CT_EFFECT_MANIFEST_REQUIRED`, `CT_COMPLETION_MISMATCH`, `CT_COMPLETION_ATTESTATION_REQUIRED`, `CT_RECOVERY_REQUIRED`, `CT_RECOVERY_CLAIM_PRESENT`, `CT_RECOVERY_DISPOSITION_FORBIDDEN`, `CT_SESSION_BUDGET_EXHAUSTED`, `CT_ACTIVATION_EVIDENCE_REQUIRED`, `CT_ROLLBACK_LEASE_ACTIVE`, `CT_NOT_QUIESCENT`, `CT_BUSY`. P3 activation scope MUST be a request-identity-free digest of Main/lease/evidence fields: exact current identity+scope replays, changed/stale identity or committed scope conflicts, and an uncommitted different ON scope returns `CT_FENCE_MISMATCH`. `status` accepts only omitted/plain-empty arguments; payload drift is `CT_PAYLOAD_INVALID`, anchor/config drift `CT_ANCHOR_MISMATCH`, structural/mode-lease drift `CT_SCHEMA_INVALID`, and well-formed Main cross-row conflict `CT_MAIN_BINDING_CONFLICT`. CT-R3-S1/S3/S4 remain P5-owned; P3 MUST NOT fabricate completion fixtures.

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
- THEN it returns only its specified shape with no token or anchor secret, except that a fresh successful claim returns the one-time public bearer token defined by the P4 delivery/claim contract; only its token hash and token-free response template are persisted, replay never discloses the bearer again, and no other response gains a token
