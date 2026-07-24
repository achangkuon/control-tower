# Proposal: Autonomous Plan Continuation Loop — Revision 11

## Intent

Continue approved work across fresh sessions while Tower stays dumb, deterministic, and plan-agnostic.

## Scope

### Goals
- Establish an administrative plane while OFF through explicit local administration and a pre-existing server-generated `main_authority_anchor_v1`; caller-supplied role, identity, or payload never grants Main authority.
- Disable ordinary continuation registration, delivery, and writes in OFF and ROLLING_BACK. Only bounded admin bootstrap, Main binding, activation, rollback, Main rebind, and status are exceptions.
- Permit ROLLING_BACK Main-crash recovery only by anchor-authorized rebind after lease expiry and fresh old-Main termination proof; otherwise fail closed.
- Recover COMPLETION_ATTESTED by preserving Main attestation, clearing the stale claimant fence, incrementing generation, and creating attestation redelivery for a fresh claimant—never claimant-only `complete` or repeated work.
- Atomically create/restore PENDING delivery with generation reset on every recovery republish. `receive` peeks; `claim` consumes delivery.

### Non-Goals
- Tower-side plan interpretation, work selection, launch, or automatic activation/recovery.
- Herdr integration or hostile same-UID process protection in v1.
- Conversion or removal of legacy queue behavior.

## Scope Boundary

| Plane | Responsibility |
|---|---|
| Administration | Anchor-authorized OFF bootstrap, Main lifecycle, mode, rollback, status. |
| Continuation | Deterministic persistence, delivery, fencing, attestation, evidence. |
| Servi-Task-U | Discovery, Main decisions, revalidation, one-unit policy. |

## Capabilities

### New Capabilities
- `control-tower-admin-authority`: server-resolved Main binding plus the complete API surface, idempotency, and deterministic errors.
- `control-tower-identity-mode`: claimant registration identity/CAS and persisted mode, lease, and rollback epoch.
- `control-tower-delivery-claim`: separate delivery rows, peek receive, atomic claim/budget, and payload provenance validation.
- `control-tower-completion-attestation`: lifecycle, Main attestation, single-use completion, and pre-ack effect manifest proof.
- `control-tower-recovery-rollback`: proof-bound dispositions, suspension, and ON-only redelivery.
- `control-tower-migration-polling`: out-of-band anchor, additive migration, root-only polling, cooperative trust boundary.
- `servi-task-discovery-ownership`: deterministic discovery precedence, stop rules, snapshots, and ownership integrity.
- `servi-task-fresh-session-policy`: Main gates and revision authority plus the fresh-session one-unit path.
- `servi-task-recovery-rollout`: manual identity-bound recovery evidence and rollback safety.
- `servi-task-rollout-activation`: manual activation thresholds, global rollback, suspended redelivery, legacy continuity.

### Modified Capabilities
- None.

## Approach and Rollback

Add both planes beside the untouched legacy queue. Tower defaults OFF; launch and activation remain manual. **Rollback:** administratively quiesce and disposition live work, return to OFF, retain audit data, and resume legacy/manual handoffs.

## Affected Areas

| Area | Impact |
|---|---|
| `~/.config/opencode/control-tower/` | Additive two-plane contract. |
| `skills/torre-control-entregas/`, `openspec/maintenance/` | Policy and operations. |

## Success Criteria

- [ ] V1 defines `register/create/validate/publish/receive/claim/ack/attestCompletion/complete/reject/revise/recover/status`, no `start`, all actor/state/generation/token fences, deterministic errors, and completion idempotency. A server-canonical `request_identity`/request ID independent of business fields distinguishes different requests even when those fields match; persistence records `{request_identity,handoff_id,generation,token_hash,evidence_digest,attestation_id,committed_result}`. Exact retries with the same canonical request identity and tuple replay the committed result; any different request identity or conflicting tuple fails idempotently and without mutation.
- [ ] Attestation evidence covers unit, repository fingerprints, branch, merge SHA/URL, source, generation, claimant fence, canonical digest, and effects; single-use completion and COMPLETION_ATTESTED crash redelivery never repeat work.
- [ ] Recovery republish and ROLLING_BACK Main rebind prove atomicity, lease, anchor, fresh termination evidence, and fail-closed outcomes.
- [ ] Child creation, idle, deletion, and root disposal evidence proves root-only polling; children cannot consume/stop it, and disposal stops before wake/receive.
- [ ] OFF-default, manual launch/activation, cooperative same-UID trust, Herdr deferral, one-unit E2E, and additive legacy continuity pass.

## Risks

| Risk | Mitigation |
|---|---|
| Authority confusion or duplicate work | Separate planes, anchor, fences, atomic delivery, proof-bound recovery. |

## Dependencies

- SQLite, lifecycle evidence, authoritative OpenSpec/reservations, Main, local administration.
