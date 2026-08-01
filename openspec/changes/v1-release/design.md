# Design: S8.7 Bounded Hermes/Telegram Bridge

## Technical Approach

This is the approved S8.7 exception to `openspec/plans/v1-execution-rule.md`. The future implementation area is exactly `bridge/**`, `test/bridge/**`, `core.mjs`, and `bin/torre`. Hermes is optional and owns Telegram transport and tokens; it may import a local in-process ESM bridge. The bridge validates Hermes-derived identity, freshness, replay, project enrollment, and canonical `Main` before state access. It exposes status through `createSupportBrief` and arm/disarm through canonical `core.activate`/`core.deactivate`. No shell, SQL, HTTP, workers, Git, queue, or replay path exists.

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Hermes-local allowlist closure | Hermes supplies one exact numeric `allowed_user_id` and `allowed_chat_id` from non-secret local configuration. The adapter closes over them at construction; missing, non-numeric, wildcard, username, multiple-value, or mismatched configuration fails closed. The lower state API never accepts request allowlist policy. |
| In-process adapter | Avoids a remote endpoint and keeps transport outside Control Tower. Request identities come only from Hermes-derived Telegram metadata, never message text. |
| Canonical project context | `resolveRegisteredMain` is the only project authority. State operations receive its canonical context, never raw Telegram paths. Ambiguous, missing, or mismatched Main validation fails before mutation. |
| Idempotent desired state | Repeated NEW arm/disarm requests are safe because `activate` and `deactivate` are canonical idempotent operations. |

## Data Flow

```text
Telegram → Hermes metadata/config → bridge.handle(request)
  → normalize → allowlist/freshness/replay → resolveRegisteredMain
  ├─ status → createSupportBrief
  └─ arm/disarm → core.activate/core.deactivate
  → exact result + metadata-only audit
```

The normalized request contains exactly `request_id`, `received_at`, `action`, `project_id`, `user_id`, and `chat_id`. The adapter permits only a fixed 120-second freshness window, tracks processed `request_id` values in a bounded in-memory 120-second dedup set, rejects duplicates with `CT_BRIDGE_REPLAY`, and never persists, replays, or queues them.

## Interfaces / Contracts

```js
createHermesBridge({ allowedUserId, allowedChatId, now, audit,
  createSupportBrief, resolveRegisteredMain, activate, deactivate })
  -> { handle(request) }
```

`handle` supports only `status`, `arm`, and `disarm`. Every response is exactly:

```js
{ ok, code, request_id, project_id, action, changed,
  previous_state, current_state }
```

Rejections have nullable state fields and never claim a mutation did not occur when a post-action audit failed. Stable codes include `CT_BRIDGE_OK`, `CT_BRIDGE_UNAUTHORIZED`, `CT_BRIDGE_INVALID_REQUEST`, `CT_BRIDGE_UNSUPPORTED_ACTION`, `CT_BRIDGE_STALE`, `CT_BRIDGE_REPLAY`, `CT_BRIDGE_PROJECT_NOT_FOUND`, `CT_BRIDGE_PROJECT_AMBIGUOUS`, `CT_BRIDGE_MAIN_MISMATCH`, `CT_BRIDGE_AUDIT_FAILED`, and `CT_BRIDGE_OPERATION_FAILED`.

Audit uses exactly `audit({ request_id, project_id, action, user_id, chat_id, outcome_code, changed, occurred_at })`; it never receives message text, tokens, or configuration values. A pre-action audit failure denies mutation. A post-action audit failure returns `CT_BRIDGE_AUDIT_FAILED` with truthful `changed`, `previous_state`, and `current_state`.

## File Changes

| File | Action | Description |
|---|---|---|
| `bridge/**` | Create/modify | Adapter, normalization, project/Main resolution, audit, and dispatch |
| `core.mjs` | Modify | Canonical idempotent `activate` paired with `deactivate` |
| `bin/torre` | Modify | Route local `on` through core; remain Hermes-free |
| `test/bridge/authorization.test.mjs` | Create | Allowlist, identity, request shape, and action rejection |
| `test/bridge/status.test.mjs` | Create | Read-only status and `createSupportBrief` behavior |
| `test/bridge/intent.test.mjs` | Create | Arm/disarm, project ambiguity, canonical Main validation, and idempotency |
| `test/bridge/outage.test.mjs` | Create | Optional Hermes and import-boundary behavior |

## Testing Strategy

RED tests are mapped only to `test/bridge/authorization.test.mjs`, `test/bridge/status.test.mjs`, `test/bridge/intent.test.mjs`, and `test/bridge/outage.test.mjs`. They cover rejection ordering, 120-second stale/replay behavior, byte-stable status reads, canonical context, audit failures, idempotent lifecycle operations, and Hermes absence. Hermes transport E2E is out of repository scope.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable-document classification | No execution boundary | None |
| Git repository selection | Applicable | Only registry-derived canonical Main is used; raw selectors, relative/symlink roots, or common-dir/Main mismatch fail closed before state access | `test/bridge/intent.test.mjs` |
| Commit state | N/A — Git mutation is forbidden | No index/worktree mutation | None |
| Push state | N/A — Git mutation is forbidden | No destination/ref handling | None |
| PR commands | N/A — Git automation is forbidden | No command composition | None |

## Migration / Rollout

No migration required. Missing, stopped, or failing Hermes removes only Telegram access; CLI and local Support remain complete.

## Open Questions: None
