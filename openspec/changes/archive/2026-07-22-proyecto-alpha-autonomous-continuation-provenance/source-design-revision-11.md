# Design: Autonomous Plan Continuation Loop — Automatic Corrective Revision 11

## Technical Approach

Add an OFF-default subsystem beside the unchanged legacy queue. Administration establishes authority, schema, mode, Main binding, rollback epoch, and lease; continuation persists handoffs, delivery, claimant fences, attestations, effects, and idempotent results. Tower remains plan-agnostic and never selects or launches work.

**Size exception:** this design intentionally exceeds the 800-word target because the gate requires exact contracts for every lifecycle and administrative API. Tables keep the exceptional detail reviewable.

## Architecture Decisions

| Choice | Rejected alternative | Rationale |
|---|---|---|
| Out-of-band `main_authority_anchor_v1` | `bootstrapAdmin` generating/self-authorizing an anchor | Authority exists before runtime/API use; payload or role cannot manufacture it. |
| Separate handoff, claim, and delivery rows | State-only delivery | Atomic close/fence/redelivery and one live delivery per generation become enforceable. |
| No PENDING work during ROLLING_BACK | Republish while quiescing | Rollback can reach zero live rows and OFF. |
| Suspend, then redeliver attestation only after ON | Rerun or claimant-only completion | Preserves Main evidence without repeating work or deadlocking rollback. |
| Server-context authority and top-level request identity | Actor fields in business payloads | Identity, authorization, and idempotency remain independent of proposal content. |

## Authority Bootstrap: Non-Circular Trust

Before plugin, MCP, or Tower runtime use, the explicit local installation/administrative CLI runs:

```text
provisionMainAuthorityAnchor({request_identity, expected_config_digest})
```

The CLI reads configured canonical repository/common-dir/Main worktree/branch/trusted UID, derives and verifies Git paths, branch, and effective UID itself, generates an unpredictable `anchor_id`, and atomically writes a versioned, owner-only anchor. Caller-supplied identity/role/location is neither accepted nor stored as authority. Runtime `bootstrapAdmin` **cannot create, replace, or authorize** the anchor: it validates the existing anchor against fresh server-derived context, performs additive schema/mode migration, and fails closed with continuation OFF on absence or mismatch. `bootstrapMain` then binds an exact live server-resolved Main tuple.

This is non-circular because the authorization root is established by a prior operator installation event, not by the API call it authorizes. V1 protects cooperative same-UID agents from accidental wrong-session/stale-state actions; the same trusted UID can alter local files, so malicious same-UID resistance is explicitly not claimed.

## State and Rollback Flow

```text
install CLI → anchor
OFF --bootstrapAdmin→ OFF --bootstrapMain/activate→ ON
ON --beginRollback→ ROLLING_BACK --terminal disposition/suspend→ zero live --finishRollback→ OFF
OFF --later explicit activate→ ON --Main recover suspended work/attestation→ fresh PENDING delivery

DRAFT→VALIDATED→PUBLISHED→CLAIMED→STARTED→COMPLETION_ATTESTED→COMPLETED
                                      └ rollback: CANCELLED|POISONED
PUBLISHED + PENDING WORK --rollback SUSPEND_PENDING→ WORK_SUSPENDED --later ON REDELIVER_WORK→ PUBLISHED
COMPLETION_ATTESTED --rollback→ ATTESTATION_SUSPENDED --later ON recover→ COMPLETION_ATTESTED
delivery: PENDING --claim→ CLAIMED --disposition/complete→ CLOSED
```

ROLLING_BACK may not create PENDING work or redelivery. For a frozen PUBLISHED row whose WORK delivery is PENDING and which has no claim or claimant, rollback-owner Main at the matching `rollback_epoch` may apply `SUSPEND_PENDING` without termination receipts: atomically close the delivery, record an immutable disposition, and transition to non-live `WORK_SUSPENDED`, with generation unchanged and no delivery created. `SUSPEND_PENDING` fails with `CT_RECOVERY_CLAIM_PRESENT` if any claim or claimant exists; claimed rows use their exact termination/disposition paths. Each snapshotted CLAIMED/STARTED row is terminally `CANCELLED` after valid not-started/compensation proof or `POISONED` when safety is unprovable. COMPLETION_ATTESTED may instead become non-live `ATTESTATION_SUSPENDED`: preserve the immutable unused attestation, fence/clear claimant, and close delivery. Terminal and suspended dispositions do **not** increment generation.

`finishRollback` treats `WORK_SUSPENDED` and `ATTESTATION_SUSPENDED` as retained non-live audit states, so frozen inventory can be fully dispositioned while live claim, delivery, and worker counts reach zero. Only after a later explicit OFF→ON activation may Main call `recover(..., REDELIVER_WORK)` on WORK_SUSPENDED; one transaction increments generation, transitions to PUBLISHED, and inserts one fresh PENDING WORK delivery. The analogous `REDELIVER_ATTESTATION` path preserves the unused attestation, increments generation, and inserts fresh PENDING `ATTESTATION_REDELIVERY`. ON-only `NOT_STARTED` and compensated `ROLLED_BACK` similarly increment generation and insert fresh PENDING work delivery. Recovery never completes a handoff. A redelivery claimant may call only `complete`, never `ack` or execute.

## Common Contract

`Ctx` is ingress-created and immutable: `{effective_uid,canonical_repo,git_common_dir,worktree,branch,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch}`. APIs derive actor authority only from `Ctx`; request actor/role/session fields are forbidden.

Every mutating request places canonical UUID `request_identity` at the **top level**, beside CAS fields and outside `payload/evidence`. MCP/CLI ingress validates/canonicalizes it; it grants no authority. A commit stores `{operation,request_identity,id,generation,CAS_digest,committed_response}`. Exact operation+identity+CAS retry returns the stored response with `replayed:true`; reuse with a different tuple, or a new identity attempting an already committed single-use transition, returns `CT_IDEMPOTENCY_CONFLICT` unchanged.

The common handoff success `{id,state,generation,replayed}` applies only to handoff lifecycle operations; `claim` and attestation operations add only their stated fields. Administrative and binding APIs return their exact response shapes below and never inherit common handoff fields. `status` and `receive` retain their stated read-only shapes. Every mutation is one `BEGIN IMMEDIATE` transaction; failure changes no handoff, claim, delivery, budget, evidence, event, binding, or mode row.

## Exact API Contracts

Abbreviations: **A** = `Ctx` matches provisioned anchor; **M** = `Ctx` matches the unique ACTIVE `main_binding_v1`; **C** = unique ACTIVE claimant binding. `eg` means `expected_generation`; `es` means `expected_state`.

| API signature / request fields | Authority; mode/state | Atomic effect; response; idempotency/failure |
|---|---|---|
| `provisionMainAuthorityAnchor({request_identity,expected_config_digest})` | Local install/admin CLI; pre-runtime | Read configured canonical identity, verify it against server-derived Git/UID context, then generate/write anchor. Exact response `{anchor_id,anchor_epoch,state:"PROVISIONED",replayed}`. Existing/config CAS mismatch `CT_ANCHOR_MISMATCH`. |
| `bootstrapAdmin({request_identity,expected_anchor_id,expected_schema_version,target_schema_version,expected_mode:"OFF"})` | A; absent DB or OFF | Validate pre-existing anchor, migrate atomically, persist OFF. Never provisions anchor. Exact response `{anchor_id,schema_version,mode:"OFF",replayed}`. Missing/mismatch `CT_ANCHOR_REQUIRED|CT_ANCHOR_MISMATCH`; schema CAS/drift/DDL `CT_SCHEMA_INVALID`; mode CAS `CT_FENCE_MISMATCH`. |
| `bootstrapMain({request_identity,expected_anchor_id,expected_binding_epoch})` | A and server-derived canonical Main location; OFF | Retire stale exact binding and bind `{host,plugin,root,mcp,pid-start,main_session,binding_epoch+1}` ACTIVE. Exact response `{main_binding_id,binding_epoch,state:"ACTIVE",replayed}`. Stale epoch `CT_FENCE_MISMATCH`; conflict/multiplex `CT_MAIN_BINDING_CONFLICT`. |
| `activate({request_identity,expected_mode:"OFF",expected_binding_epoch,evidence_digest})` | A+M; OFF | Verify rollout evidence and quiescence; OFF→ON. Exact response `{mode:"ON",activation_epoch,replayed}`. Mode/binding CAS `CT_FENCE_MISMATCH`; missing evidence `CT_ACTIVATION_EVIDENCE_REQUIRED`. No launch/delivery. |
| `status()` | Observer; any mode | Read-only `{mode,schema_version,rollback_epoch,lease_status,main_binding_status,live_counts,pending_counts}`; never tokens or anchor secret. |
| `register({request_identity,expected_binding_epoch,expected_binding_state})` | Server-derived C candidate; ON | First registration MUST CAS `{expected_binding_epoch:0,expected_binding_state:"ABSENT"}`; same-root rebind MUST CAS the exact ACTIVE epoch/state before retiring it and incrementing epoch. Second-root conflict records MULTIPLEXED/no ACTIVE. Exact response `{binding_id,binding_epoch,binding_status,replayed}`. Stale epoch/state `CT_FENCE_MISMATCH`; isolation/multiplex `CT_SESSION_ISOLATION_UNPROVEN|CT_SESSION_MULTIPLEXED`. Never grants Main. |
| `create({request_identity,lineage_id,revision,payload,payload_digest})` | Registered C producer; ON | Validate bounds/JCS, insert immutable DRAFT generation 0. Duplicate lineage/revision conflict is `CT_IDEMPOTENCY_CONFLICT`; common response. |
| `validate({request_identity,id,es:"DRAFT",eg,payload_digest,validation_digest})` | M; ON/DRAFT | CAS exact immutable payload/provenance to VALIDATED and record decision. Bad provenance `CT_PAYLOAD_INVALID`; stale CAS `CT_FENCE_MISMATCH|CT_INVALID_TRANSITION`. |
| `publish({request_identity,id,es:"VALIDATED",eg,validation_digest})` | M; ON/VALIDATED | CAS to PUBLISHED and insert exactly one PENDING `WORK` delivery for generation. Constraint/race fails unchanged. |
| `receive()` | C; ON | Non-consuming peek. Returns `{delivery:null}` or `{delivery:{delivery_id,id,state,generation,purpose}}`; identity/multiplex/mode failure leaves PENDING untouched. |
| `claim({request_identity,delivery_id,id,es,eg,purpose})` | C; ON; `es:PUBLISHED` for WORK or `es:COMPLETION_ATTESTED` for ATTESTATION_REDELIVERY | Recheck ACTIVE tuple/mode, CAS delivery PENDING→CLAIMED, consume one session budget, bind claimant, create token/hash. Returns common + `{delivery_id,purpose,token}`. Token is returned only in committed/replayed response; losers get `CT_FENCE_MISMATCH`, empty delivery, or `CT_SESSION_BUDGET_EXHAUSTED`. |
| `ack({request_identity,id,es:"CLAIMED",eg,token,revalidation_digest,effect_manifest_digest,boundary_digest})` | Owning C; ON/WORK claim | Verify token, snapshots, complete manifest; CAS to STARTED. Sole start API. Redelivery purpose `CT_INVALID_TRANSITION`; incomplete manifest `CT_EFFECT_MANIFEST_REQUIRED`. |
| `attestCompletion({request_identity,id,es:"STARTED",eg,claimant_fence_digest,evidence,evidence_digest})` | M; ON/STARTED | Verify canonical evidence/effects and live fence, insert one immutable unused attestation, CAS to COMPLETION_ATTESTED. Returns common + `{attestation_id,evidence_digest}`. Mismatch `CT_COMPLETION_MISMATCH`. |
| `complete({request_identity,id,es:"COMPLETION_ATTESTED",eg,token,attestation_id,evidence_digest})` | Owning C; ON; original or redelivery claim | Verify live token and single-use attestation, consume attestation, close claim/delivery, persist committed result, CAS COMPLETED. Returns common + `{attestation_id,result}`. Missing/mismatch `CT_COMPLETION_ATTESTATION_REQUIRED|CT_COMPLETION_MISMATCH`; exact race loser replays. |
| `reject({request_identity,id,es,eg,reason_digest})` | M; ON; unclaimed DRAFT/VALIDATED/PUBLISHED | CAS REJECTED; close any PENDING delivery; immutable decision. CLAIMED-or-later `CT_INVALID_TRANSITION`. |
| `revise({request_identity,id,es:"REJECTED",expected_revision,replacement_payload,replacement_digest})` | M; ON/REJECTED | Preserve source; create immutable DRAFT revision N+1 generation 0. Returns new id/common response; wrong source/revision fails unchanged. |
| `recover({request_identity,id,es,eg,expected_claimant_binding_digest?,disposition,termination_receipt_ids?,compensation_digest?,rollback_epoch?})` | M; ON, or rollback-owner M with matching epoch; recoverable live/suspended state | Claim-bound dispositions verify fresh ≤30s allowlisted paired termination proof and exact identity. `SUSPEND_PENDING` and later `REDELIVER_WORK` require no claimant digest or termination receipts because the row has no claim/claimant; their atomic effects and errors are below. Recovery never calls/returns COMPLETED. Proof/CAS failure `CT_RECOVERY_REQUIRED|CT_FENCE_MISMATCH`; forbidden mode/disposition `CT_RECOVERY_DISPOSITION_FORBIDDEN`. |
| `beginRollback({request_identity,expected_mode:"ON",expected_binding_epoch,lease_ms,inventory_digest})` | A+M; ON | Acquire writer barrier; ON→ROLLING_BACK, increment epoch, create owner lease, freeze live inventory, stop new polling/writers. Exact response `{mode:"ROLLING_BACK",rollback_epoch,lease_version,lease_expires_at,replayed}`. Mode/binding CAS `CT_FENCE_MISMATCH`; contention `CT_BUSY`. |
| `rebindMain({request_identity,expected_mode:"ROLLING_BACK",expected_rollback_epoch,expected_lease_version,old_main_termination_receipt_id})` | A at canonical Main location; ROLLING_BACK | Require expired lease and fresh exact old-Main proof; bounded writer wait; retire old binding, bind new M, increment binding epoch/lease version, transfer lease. Exact response `{main_binding_id,binding_epoch,rollback_epoch,lease_version,lease_expires_at,replayed}`. Mode/lease CAS `CT_FENCE_MISMATCH`; epoch mismatch `CT_ROLLBACK_EPOCH_MISMATCH`; active lease `CT_ROLLBACK_LEASE_ACTIVE`; proof failure `CT_RECOVERY_REQUIRED`. Registration/delivery stay closed. |
| `finishRollback({request_identity,expected_mode:"ROLLING_BACK",expected_rollback_epoch,expected_lease_version,quiescence_digest})` | Rollback-owner M; ROLLING_BACK | Count `WORK_SUSPENDED` and `ATTESTATION_SUSPENDED` as dispositioned retained non-live inventory; require all other frozen rows terminal, zero live claim/delivery/worker rows, and polling quiescence; release lease and atomically set OFF. Exact response `{mode:"OFF",rollback_epoch,quiescence_digest,replayed}`. Mode/lease CAS `CT_FENCE_MISMATCH`; epoch mismatch `CT_ROLLBACK_EPOCH_MISMATCH`; otherwise `CT_NOT_QUIESCENT`. |

For every administrative or binding mutation above, an exact operation + `request_identity` + request/CAS tuple retry replays the exact committed response with only `replayed:true`; reuse of that identity with any different tuple, or a new identity attempting an already committed single-use transition, returns `CT_IDEMPOTENCY_CONFLICT` without mutation. The per-row named CAS errors apply before any side effect and are likewise non-mutating.

### Recovery disposition effects

| Mode / input | Required atomic result |
|---|---|
| ON + CLAIMED/`NOT_STARTED` | Fence/clear claimant, close delivery, immutable disposition; generation++; PUBLISHED + fresh PENDING WORK. |
| ON + STARTED/`ROLLED_BACK` | Additionally verify complete compensation/read-back; then same generation++/PENDING WORK republish. |
| ON + WORK_SUSPENDED/`REDELIVER_WORK` | Require explicit later ON activation and no claim/claimant; immutable redelivery disposition; generation++; PUBLISHED + exactly one fresh PENDING WORK. |
| ON + COMPLETION_ATTESTED or ATTESTATION_SUSPENDED/`REDELIVER_ATTESTATION` | Preserve unused attestation, fence/clear claimant, close old delivery, immutable disposition; generation++; COMPLETION_ATTESTED + fresh PENDING ATTESTATION_REDELIVERY. |
| ON or ROLLING_BACK + `CANCELLED|POISONED` | Fence/clear claimant, close delivery, immutable disposition and terminal state; generation unchanged; no PENDING. |
| ROLLING_BACK + PUBLISHED with PENDING WORK and no claim/claimant/`SUSPEND_PENDING` | Require rollback-owner Main and matching epoch; close PENDING delivery, record immutable disposition, set WORK_SUSPENDED; generation unchanged; no delivery. Any claim/claimant returns `CT_RECOVERY_CLAIM_PRESENT`; state/delivery CAS mismatch returns `CT_FENCE_MISMATCH`. |
| ROLLING_BACK + COMPLETION_ATTESTED/`SUSPEND_ATTESTATION` | Preserve unused attestation; fence/clear claimant, close delivery, record disposition, set ATTESTATION_SUSPENDED; generation unchanged; no PENDING. |
| ROLLING_BACK + `NOT_STARTED|ROLLED_BACK|REDELIVER_WORK|REDELIVER_ATTESTATION` | Reject `CT_RECOVERY_DISPOSITION_FORBIDDEN`; no mutation. |

## Deterministic Error Order

Within a transaction evaluate: schema/anchor → mode/rollback epoch → actor/binding → idempotency → existence → state/generation/token CAS → evidence/proof/budget/quiescence. Stable codes are `CT_SCHEMA_INVALID`, `CT_ANCHOR_REQUIRED`, `CT_ANCHOR_MISMATCH`, `CT_CONTINUATION_OFF`, `CT_ROLLBACK_IN_PROGRESS`, `CT_ROLLBACK_EPOCH_MISMATCH`, `CT_ADMIN_REQUIRED`, `CT_WORKFLOW_MAIN_REQUIRED`, `CT_SESSION_ISOLATION_UNPROVEN`, `CT_SESSION_MULTIPLEXED`, `CT_MAIN_BINDING_CONFLICT`, `CT_IDEMPOTENCY_CONFLICT`, `CT_NOT_FOUND`, `CT_INVALID_TRANSITION`, `CT_FENCE_MISMATCH`, `CT_PAYLOAD_INVALID`, `CT_EFFECT_MANIFEST_REQUIRED`, `CT_COMPLETION_MISMATCH`, `CT_COMPLETION_ATTESTATION_REQUIRED`, `CT_RECOVERY_REQUIRED`, `CT_RECOVERY_CLAIM_PRESENT`, `CT_RECOVERY_DISPOSITION_FORBIDDEN`, `CT_SESSION_BUDGET_EXHAUSTED`, `CT_ACTIVATION_EVIDENCE_REQUIRED`, `CT_ROLLBACK_LEASE_ACTIVE`, `CT_NOT_QUIESCENT`, and `CT_BUSY`.

## Evidence and Invariants

Attestation binds unit, repo/common-dir fingerprints, worktree/branch/base, merge SHA/URL, source, generation, claimant/binding fence, JCS digest, effects, Main binding/epoch, time, and ID. `termination_receipt_v1` binds allowlisted issuer/verifier/method, observation ≤30s, OS boot/session, exact host/plugin/root/MCP PID+start markers, binding/rollback epochs, generation, and both-terminated result. Self-assertion, PID reuse, stale/live/ambiguous proof fails.

Each generation has at most one live claim and delivery. `WORK_SUSPENDED` and `ATTESTATION_SUSPENDED` are retained non-live audit states; neither counts as a live claim, delivery, or worker. No transition executed in ROLLING_BACK may insert a PENDING delivery. `SUSPEND_PENDING` requires the frozen PUBLISHED/PENDING pair and absence of every claim/claimant in the same transaction; `REDELIVER_WORK` requires ON and increments generation before inserting the sole new PENDING WORK delivery. Paths remain inert. Pre-`ack` manifests cover every DB/API/filesystem effect, target, operation, observability, compensatability, and pre-state digest; ROLLED_BACK requires ordered receipts and independent per-effect/aggregate read-back. Root-only polling ignores child creation, idle, and deletion; root deletion/disposal stops polling before wake or receive.

## File Changes

| File | Action | Design responsibility |
|---|---|---|
| `~/.config/opencode/control-tower/{install.sh,bin/torre}` | Modify | Out-of-band anchor provisioning and admin commands. |
| `~/.config/opencode/control-tower/{core.mjs,mcp.mjs}` | Modify | Versioned schema, exact APIs, transactions, mode, authority, recovery. |
| `~/.config/opencode/control-tower/plugin/tower-spike.js` | Modify | Root-bound non-consuming polling and disposal ordering. |
| `~/.config/opencode/control-tower/test/{migration,identity,lifecycle,recovery,polling}.test.mjs` | Create | Contract/race/proof tests. |
| `scripts/{continuation-policy,continuation-e2e}.test.mjs` | Create | Proyecto-Alpha policy and pilot. |
| `openspec/maintenance/torre-control-runbook.md` | Modify | Installation, activation, rollback, legacy fallback. |

## Strict TDD Contract for Tasks

Tasks MUST split every behavior slice into three separately numbered, ordered items:

1. **RED:** create the behavior test first and execute it against unchanged production code; retain command/output proving the expected behavioral failure. No production edit is permitted before that failure.
2. **GREEN:** make only the minimum production change required; execute the focused RED test until it passes, then relevant regression tests.
3. **REFACTOR:** improve structure only after GREEN while focused and regression tests remain passing; record commands/results.

This applies independently to anchor/bootstrap, modes/APIs, identity, lifecycle, recovery, rollback, races, policy, and polling. Polling RED tasks MUST separately execute failing tests for **child creation**, **child idle**, **child deletion**, and **root deletion/disposal**; GREEN preserves root polling for all child events and proves root disposal stops before wake/receive; REFACTOR follows only while all four remain green.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | Applicable | `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh` remain inert; execute/source/import or root escape fails closed. | One test per named class. |
| Git repository selection | Applicable | Relative, absolute, and `git -C` resolution must equal configured fingerprints; mismatch fails without mutation. | One test per selector. |
| Commit state | N/A — no commit operation | No design response required. | None. |
| Push state | N/A — no push operation | No design response required. | None. |
| PR commands | N/A — no PR composition | No design response required. | None. |

## Migration / Rollout

Migration is additive and retains legacy rows/behavior. Any drift leaves continuation OFF. Manual activation requires all isolation, lifecycle, concurrency, migration, recovery, E2E, and pilot evidence: 10/10 runs, no loss/duplicate/fence/provenance/budget/unsafe-recovery breach, and at least 9/10 unchanged proposals. Herdr and hostile same-UID protection remain deferred. APPLY and activation remain unauthorized.

## Corrective Revision 11 Gate Map

1. Circular bootstrap removed: **Authority Bootstrap** and `provisionMainAuthorityAnchor`/`bootstrapAdmin` contracts.
2. ROLLING_BACK deadlock removed: **State and Rollback Flow**, disposition table, `finishRollback`.
3. Poison/cancel/suspend atomicity: disposition table and generation rule.
4. Complete contracts: **Common Contract**, all API signatures, CAS, responses, idempotency, and deterministic errors.
5. Strict TDD: explicit RED→GREEN→REFACTOR task contract and four root/child lifecycle cases.

No open questions.
