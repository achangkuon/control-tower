# Proposal: P8 — Pi Adapter

## Intent

Add a thin Pi adapter over P7's host-neutral controller, satisfying shared CT-R5 lifecycle and wake semantics without SQLite or continuation authority.

Planning is provisional; **apply is blocked pending reconciliation of merged P6/P7 contracts.**

## Scope

### In Scope
- Map proven-root `agent_settled`, guarded by `ctx.isIdle()`, into the controller lifecycle.
- Map controller wake requests to `pi.sendMessage(..., { deliverAs: "followUp", triggerTurn: true })`.
- Dispose synchronously on proven-root `session_shutdown`; ignore child and ambiguous lifecycle evidence.
- Prove Pi CT-R5 and lifecycle edge cases through the shared fixture.
- Add the Pi extension and manifest metadata under `adapters/pi/`.

### Out of Scope
- SQLite/core imports, receive/claim calls, domain policy, Pi-owned polling, Migration 005 edits, or schema changes.
- P10 installation, publication, activation, or cutover.
- Changes to P6/P7 worktrees or unrelated OpenSpec artifacts.

## Capabilities

### New Capabilities
- `control-tower-pi-adapter`: Root lifecycle mapping, idle-safe follow-up wakes, fail-closed identity, and shared CT-R5 conformance.

### Modified Capabilities
- None.

## Approach

Inject Pi lifecycle evidence and wake behavior into merged `host/loop.mjs`; keep polling, throttling, serialization, retry, and disposal controller-owned. Reuse `test/host-adapters.test.mjs` without Pi-specific controller semantics. Before RED implementation, reconcile merged P6 schema/dispatcher contracts, P7 loop ports and fixture, Pi identity, wake payload, and polling-witness decisions.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `adapters/pi/` | New | Extension and host manifest metadata |
| `test/host-adapters.test.mjs` | Modified | Pi CT-R5 and lifecycle conformance |
| `host/loop.mjs` | Dependency | P7-owned; change only for a reconciled host-neutral defect |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| P6/P7 contract drift | High | Enforce the pre-apply reconciliation blocker |
| Ambiguous Pi root evidence | Medium | Fail closed; never bind or wake from uncertain identity |
| Shutdown/wake race | Medium | Dispose synchronously; contract-test stale callbacks |
| Scope leaks into schema or P10 | Medium | Keep Migration 005, runtime, and installation untouched |

## Rollback Plan

Revert the adapter, metadata, and Pi fixture cases as one schema-neutral unit. No database or runtime rollback is required.

## Dependencies

- Merged and reconciled P6 continuation/schema/dispatcher contracts.
- Merged and reconciled P7 controller API and shared adapter fixture.

## Success Criteria

- [ ] Pi passes unchanged CT-R5-S1 through CT-R5-S5 plus focused idle, reload, rejection, and shutdown tests.
- [ ] The adapter imports no SQLite/core authority and never receives, claims, polls, throttles, or retries.
- [ ] Wake mapping uses exact follow-up options and rejected sends preserve pending delivery.
- [ ] Migration 005, Tower state, P10 paths, and other agents' worktrees remain untouched.
- [ ] Apply begins only after the P6/P7 reconciliation decision is recorded.
