# Proposal: Autonomous Continuation — Control Tower Track

## Intent

Add the approved Revision 11 continuation substrate to the standalone Control Tower while keeping it deterministic, plan-agnostic, OFF by default, and backward-compatible with Plan A at HEAD `71ab571`. Deliver the same host-neutral continuation loop through bounded OpenCode, Pi, and Claude adapters. This is a multi-host amendment, not a redesign of Revision 11.

## Scope

### In Scope
- Phase 0: immutable baseline/hash/version evidence and restore proof without changing production behavior.
- Original Slices 1–7: anchor/migration; identity/mode; Main/API contracts; delivery/claim; lifecycle/attestation/effects; recovery/rollback; root-only polling.
- A host-neutral polling/wake controller with thin OpenCode, Pi, and Claude lifecycle adapters; every adapter runs the same CT-R5 contract.
- Versioned runtime publication under `~/.local/share/opencode/control-tower/releases/<git-sha>` with an atomically replaced `current` symlink only after isolated verification.
- CT-only independent verification of all 64 CT-R1…CT-R12 scenario IDs, plus existing fail-closed regressions, using isolated temporary Git/Tower roots. CT-R5 is executed as a three-host conformance matrix without creating new normative scenario IDs.
- Preserve legacy `agent`, `message`, and `lock` tables, queue behavior, tools, readable OFF status, and OFF fail-closed/no-mutation guarantees.

### Out of Scope
- Servi-Task-U discovery, OpenSpec interpretation, ownership, one-unit policy, project rollout, runbooks, or policy scripts.
- Runtime mutation of the actual Tower during planning/tests; activation, delivery, or hostile same-UID protection.
- Replacing or deleting `~/.config/opencode/control-tower` before a verified cutover.
- Host-specific policy inside the SQLite authority or host-neutral controller.
- Activation, commit, push, PR, remote work, or any authorization for them.

## Capabilities

### New Capabilities
- `control-tower-admin-authority`: canonical Main authority, exact API, idempotency, errors.
- `control-tower-identity-mode`: claimant identity, mode, lease, rollback epoch.
- `control-tower-delivery-claim`: peek, atomic claim, budget, provenance.
- `control-tower-completion-attestation`: lifecycle, evidence, effects, completion.
- `control-tower-recovery-rollback`: proof-bound recovery, suspension, redelivery.
- `control-tower-migration-polling`: anchor, additive migration, root-only polling.

### Modified Capabilities
- None.

## Approach

Extend the existing `core.mjs` SQLite authority with an additive continuation plane beside the unchanged legacy queue. Keep every mutation transactional and fenced. Put polling, stop-before-receive ordering, wake throttling, and delivery orchestration in a host-neutral controller; keep OpenCode events/client calls, Pi extension events/message injection, and Claude hooks/rewake mechanics in separate adapters. The later Servi-Task-U track is a dependent consumer of this exact CT API, identity, fence, evidence, and deterministic-error contract—not a Tower responsibility.

## Affected Areas

| Area | Impact |
|---|---|
| `core.mjs`, `mcp.mjs` | Additive host-neutral SQLite authority and API contract |
| `host/loop.mjs` | Host-neutral polling, wake, and disposal ordering |
| `plugin/tower-spike.js`, `adapters/pi/`, `adapters/claude/` | Thin host lifecycle adapters |
| `install.sh`, `bin/torre`, `scripts/publish-runtime.mjs` | Explicit administration, versioned publication, and verified cutover |
| `test/{migration,identity,lifecycle,recovery,polling,host-adapters,runtime-publish,fail-closed}.test.mjs` | 64-ID CT verification plus three-host CT-R5 conformance |

## Risks

| Risk | Mitigation |
|---|---|
| Legacy/OFF regression | Preserve Plan A tests and fail closed |
| Duplicate or unsafe work | Atomic fences, attestations, proof-bound recovery |
| Core coupling | Keep SQLite authority and loop controller host-neutral; isolate each host adapter |
| Host lifecycle drift | Contract-test OpenCode, Pi, and Claude adapters against the same CT-R5 fixture |
| Unsafe cutover | Publish immutable release, verify it, atomically switch `current`, then update host configs; preserve legacy source until success |

## Rollback Plan

Keep continuation OFF, quiesce and disposition live continuation records, retain audit evidence, and revert additive units to Plan A `71ab571`; legacy queue/tools remain available. Before cutover, rollback removes only the candidate release. After cutover, atomically restore `current` and host configuration backups; `~/.config/opencode/control-tower` remains untouched until the replacement runtime is proven. Phase 0 separately proves the historical `f583df7` baseline restore without authorizing it.

## Dependencies

- Approved Revision 11 proposal/design/specs and Judgment Day Round 2 result.

## Success Criteria

- [ ] All 64 stable CT scenario IDs and fail-closed regressions pass under `bun test` against isolated fixtures; CT-R5 passes for OpenCode, Pi, and Claude.
- [ ] Host-neutral core/controller code imports no OpenCode, Pi, or Claude SDK surface.
- [ ] Actual Tower remains OFF and its runtime database is unchanged during planning/tests.
- [ ] A candidate release is verified under `~/.local/share/opencode/control-tower/releases/<git-sha>` before `current` or any host config changes.
- [ ] Exact API/identity/fence/evidence/error contracts are consumable by the later Servi-Task-U track without Tower policy logic.
