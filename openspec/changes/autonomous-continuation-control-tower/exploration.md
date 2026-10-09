# Exploration: autonomous-continuation-control-tower

## Current State

The Control Tower is a standalone Bun/ESM repository at `/home/<usuario>/.config/opencode/control-tower`, currently on `master` at `71ab571`, with no remote. The Plan A commit is present on top of baseline `f583df7`; `.atl/`, `NEXT-SESSION-off-enforcement.md`, and the newly initialized `openspec/` area are untracked and must remain untouched.

`core.mjs` is the only SQLite boundary. It locates a repository-scoped `.git/control-tower` directory, owns the legacy `agent`, `message`, and `lock` tables, and exposes register/state/send/receive/lock/deactivate/status operations. Guarded writes use an ACTIVE sentinel plus a second check inside `BEGIN IMMEDIATE`; the current fail-closed tests prove OFF rejects writes, preserves legacy rows, leaves pending messages pending, permits safe release, and does not change database mtime. `status` remains readable while OFF.

`mcp.mjs` is a hand-rolled JSON-RPC MCP adapter exposing eight legacy `tower_*` tools. Plan A keeps `tower_status` available while OFF and makes mutation descriptions require an `active:true` status check. `bin/torre` owns human `on`, `off`, `status`, `log`, `unlock`, and `reset` commands; the CLI now labels retained OFF rows as stale. `plugin/tower-spike.js` is a root-session waker: it tracks child sessions, polls the root inbox after root idle, consumes through `core.receive`, and rate-limits wakes. Its current deletion path stops polling on any `session.deleted`, so CT-R5 needs an explicit root-only lifecycle boundary and dedicated tests.

The approved Revision 11 plan adds an OFF-default continuation plane beside the unchanged legacy queue. Its trust root is an out-of-band, owner-only `main_authority_anchor_v1`; runtime bootstrap validates but never creates authority. Continuation has separate handoff, delivery, claimant, attestation, evidence, mode, lease, and rollback records. It remains plan-agnostic: it persists and fences policy decisions but never discovers work, selects a unit, launches a session, or activates itself.

## Affected Areas

- `core.mjs` — additive continuation schema, server-derived context, transactions, modes, bindings, lifecycle, delivery, evidence, idempotency, recovery, and rollback while preserving the legacy API and tables.
- `mcp.mjs` — expose the exact continuation contract without exposing `start`, claimant tokens, anchor secrets, or caller-supplied authority; retain the legacy tools and OFF fail-closed behavior.
- `install.sh` — out-of-band anchor provisioning must happen before runtime use and must verify canonical repository/common-dir/Main/branch/UID context without accepting caller authority.
- `bin/torre` — explicit local administration for anchor/bootstrap/activation/rollback/status; no launch, selection, or automatic recovery.
- `plugin/tower-spike.js` — bind polling to the root session, ignore child lifecycle events, and stop polling before root disposal can wake or receive.
- `test/fail-closed.test.mjs` — existing Plan A regression suite remains mandatory; it is the compatibility guard for legacy OFF behavior.
- `test/migration.test.mjs` — Phase 0 restore evidence plus CT-R8 migration/anchor cases.
- `test/identity.test.mjs` — CT-R4, CT-R9, CT-R10, and CT-R11 identity/mode/admin/idempotency cases.
- `test/lifecycle.test.mjs` — CT-R2, CT-R6, CT-R1, and CT-R12 delivery/lifecycle/attestation/effect-manifest cases.
- `test/recovery.test.mjs` — CT-R7 and CT-R11 recovery, suspension, redelivery, proof, and rollback-disposition cases.
- `test/polling.test.mjs` — CT-R5 polling cases: child/root events and disposal ordering.

## Phase and Slice Map

| Planned unit | Control Tower scope | Primary files | Independent rollback boundary |
|---|---|---|---|
| Phase 0 | Immutable byte/hash/version/repository baseline and baseline-restore RED→GREEN→REFACTOR evidence; no runtime feature | External baseline evidence plus `test/migration.test.mjs` | Restore to `f583df7`; no production behavior is allowed to change |
| Slice 1 | CT-R8 anchor, additive migration, OFF default, legacy continuity | `core.mjs`, `install.sh`, `bin/torre`, `test/migration.test.mjs` | Remove continuation schema/anchor administration; legacy `agent`/`message`/`lock`, ACTIVE fail-closed behavior, and Plan A tests remain |
| Slice 2 | CT-R4 identity/CAS, CT-R9 cooperative boundary, CT-R11-S1 mode/lease foundation | `core.mjs`, `mcp.mjs`, `test/identity.test.mjs` | Remove claimant bindings and mode enforcement layer; continuation remains OFF and legacy queue contract is unchanged |
| Slice 3 | CT-R10 Main binding, CT-R3 exact API/idempotency/error order, CT-R11-S3…S5 administration/rollback gates | `core.mjs`, `mcp.mjs`, `test/identity.test.mjs` | Remove Main/admin API layer while retaining Slice 1–2 migration and identity foundations; no delivery is enabled |
| Slice 4 | CT-R6 delivery/peek/claim/budget and CT-R2 inert canonical payload/provenance | `core.mjs`, `test/lifecycle.test.mjs` | Remove delivery/claim rows and APIs; handoff creation/validation remains non-delivering and legacy queue is unaffected |
| Slice 5 | CT-R1 lifecycle, Main attestation, completion idempotency, CT-R12 manifest/compensation boundary | `core.mjs`, `test/lifecycle.test.mjs` | Remove lifecycle/attestation effects; claimed continuation cannot complete, while prior migration/delivery records remain auditable |
| Slice 6 | CT-R7 evidence-bound recovery, CT-R11-S2 rollback dispositions, suspension and ON-only redelivery | `core.mjs`, `test/recovery.test.mjs` | Remove recovery/redelivery transitions; leave continuation OFF/quiescent and retain audit rows; never fall back to claimant-only completion |
| Slice 7 | CT-R5 root-only polling and disposal ordering | `plugin/tower-spike.js`, `test/polling.test.mjs` | Restore current plugin polling behavior only after Slice 7 tests and ensure no continuation delivery is consumed by a child/root disposal event |

All implementation units must keep RED tests before production edits, then GREEN, then REFACTOR. Because Slices 1–6 share the core boundary, they are a dependent chain of additive work units rather than independent cherry-picks; each later slice must remain removable by disabling only its continuation capability and leaving legacy behavior intact.

## Control Tower Scenario Map

| Capability | Stable scenarios | Slice / test boundary |
|---|---|---|
| CT-R1 lifecycle and actor authority | CT-R1-S1, S2, S3, S4, S5, S6 | Slice 5 / `test/lifecycle.test.mjs` |
| CT-R2 payload and provenance | CT-R2-S1, S2, S3 | Slice 4 / `test/lifecycle.test.mjs` |
| CT-R3 API contracts, idempotency, errors | CT-R3-S1, S2, S3, S4, S5 | Slice 3 / `test/identity.test.mjs` |
| CT-R4 claimant identity and receive fences | CT-R4-S1, S2, S3, S4, S5, S6 | Slice 2 / `test/identity.test.mjs` |
| CT-R5 root-only polling | CT-R5-S1, S2, S3, S4, S5 | Slice 7 / `test/polling.test.mjs` |
| CT-R6 delivery, claim, budget, attestation race | CT-R6-S1, S2, S3, S4, S5, S6 | Slice 4 / `test/lifecycle.test.mjs` |
| CT-R7 recovery and rollback dispositions | CT-R7-S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12 | Slice 6 / `test/recovery.test.mjs` |
| CT-R8 anchor, migration, legacy continuity | CT-R8-S1, S2, S3, S4, S5 | Slice 1 / `test/migration.test.mjs` |
| CT-R9 cooperative threat boundary | CT-R9-S1 | Slice 2 / `test/identity.test.mjs` |
| CT-R10 canonical Main binding | CT-R10-S1, S2, S3, S4, S5, S6 | Slice 3 / `test/identity.test.mjs` |
| CT-R11 mode, lease, rollback epoch, zero-live exclusion | CT-R11-S1 (Slice 2), S2 (Slice 6), S3–S5 (Slice 3) | `test/identity.test.mjs` and `test/recovery.test.mjs` |
| CT-R12 effect manifest and compensation proof | CT-R12-S1, S2, S3, S4 | Slice 5 / `test/lifecycle.test.mjs` |

This covers all 64 Control Tower scenarios. Revision 11 additionally requires that ROLLING_BACK reject `NOT_STARTED`, `ROLLED_BACK`, `REDELIVER_WORK`, and `REDELIVER_ATTESTATION` with `CT_RECOVERY_DISPOSITION_FORBIDDEN`, and that no rollback transition insert a PENDING delivery.

## API and Policy Boundary

The later Proyecto-Alpha policy track may consume only the Control Tower contract: canonical handoff creation/validation/publication, non-consuming `receive`, atomic one-unit `claim`, pre-`ack` revalidation and effect-manifest evidence, Main `attestCompletion`, claimant `complete`, and Main-gated reject/revise/recover/rollback/status results. It may rely on server-derived fingerprints, generation, binding fences, deterministic error codes, immutable decisions, and persisted completion tuple `{request_identity,handoff_id,generation,token_hash,evidence_digest,attestation_id,committed_result}`.

Control Tower MUST NOT implement the policy track's discovery precedence, OpenSpec parsing, dependency/reservation decisions, ownership selection, project rollout/runbook, or one-unit policy. Payload paths, URLs, and executable-looking references are inert evidence only. The API boundary must keep caller actor/role/session fields out of authority decisions and must never expose `start`, tokens through status, or anchor secrets.

## Verification and Rollback Boundaries

Verification is independent of Proyecto-Alpha and must use only the Control Tower test files plus the existing `test/fail-closed.test.mjs` regression suite. The configured command is `bun test`; the original plan's per-slice `node --test` labels are planning references, not a reason to bypass the repository's configured runner. A final CT-only run should cover migration, identity, lifecycle, recovery, polling, and fail-closed tests together, with stable CT IDs mapped to the 64-scenario matrix above.

Tests must use isolated temporary Git repositories and temporary tower roots. They must assert the real signals—ACTIVE presence/absence, SQLite rows/mtime, transaction atomicity, pending delivery state, binding/lease epochs, and polling order—not only formatted CLI output. The actual Control Tower must remain OFF; no production registration, activation, runtime DB mutation, delivery, PR, push, or remote operation is part of exploration or verification planning.

The global rollback boundary is administrative and proof-bound: ordinary continuation writes stop in OFF and ROLLING_BACK; `beginRollback` acquires the writer barrier, freezes inventory, and increments the rollback epoch; `SUSPEND_PENDING` and `SUSPEND_ATTESTATION` create retained non-live audit states without PENDING rows; terminal dispositions close claims without generation changes; `finishRollback` reaches OFF only at zero live claims/deliveries/workers and quiesced polling; later explicit ON alone permits generation-incrementing work or attestation redelivery. Recovery never completes work and never invokes claimant-only `complete`.

## Approaches

1. **Additive continuation plane in the existing core boundary** — extend `core.mjs` with versioned continuation tables/transactions and keep the legacy queue functions/tables and MCP tools intact; expose the exact new API through the existing hand-rolled adapter.
   - Pros: preserves the single SQLite writer/transaction authority, makes migration and legacy continuity testable in one repository, and follows the approved “beside unchanged legacy queue” design.
   - Cons: `core.mjs` becomes large; shared database migrations and idempotency/error ordering require strict slice sequencing and focused tests.
   - Effort: High

2. **Separate continuation store/module behind adapters** — place continuation persistence in a new internal module while `core.mjs` remains a façade for legacy and continuation calls.
   - Pros: lowers local file complexity and gives lifecycle/recovery helpers clearer ownership.
   - Cons: risks splitting the only SQLite authority, complicates atomic cross-plane migration, and can accidentally redesign the normative API or legacy compatibility boundary.
   - Effort: High

## Recommendation

Use Approach 1 as the externally visible architecture: additive continuation tables and APIs beside the untouched legacy queue, with every mutation remaining in one SQLite transaction and every slice tested/rolled back as a dependent work unit. Internal helper extraction is acceptable only after GREEN and only if `core.mjs` remains the authoritative transaction boundary. Implement Phase 0, then Control Tower Slices 1–7 in order; stop before any Proyecto-Alpha policy work or activation. This is the only approach that directly preserves Plan A's fail-closed guarantees while satisfying the approved Revision 11 contracts without introducing a second authority path.

## Risks

- The core/API surface is substantially larger than the current eight-tool legacy surface; accidental changes to `tower_status`, legacy queue consumption, or OFF semantics would violate Plan A compatibility.
- `main_authority_anchor_v1` is intentionally out-of-band and owner-only; treating runtime bootstrap as a provisioning path would recreate the rejected circular trust model.
- Shared `core.mjs` edits across Slices 1–6 create dependency and rollback coupling; work-unit commits must be stacked and each boundary must retain a deterministic OFF fallback.
- SQLite migration, idempotency, fencing, and rollback disposition must be transactionally atomic; partial schema or mode drift must fail closed without consuming legacy or continuation messages.
- The current plugin stops polling on any deleted session; without root identity and disposal-order tests, child lifecycle events can consume or strand work.
- Recovery evidence is deliberately strict (fresh paired termination proofs, exact identity/generation, compensation/read-back); weakening it to unblock work would allow duplicate or unsafe execution.
- The later policy track depends on exact payload, generation, fence, evidence, and error contracts; Control Tower must not absorb policy decisions or path execution.

## Ready for Proposal

Yes. The Control Tower-only scope is sufficiently mapped for `sdd-propose`: Phase 0 plus Slices 1–7, CT-only tests and rollback boundaries, Plan A compatibility, and the API contract consumed later by Proyecto-Alpha. Keep the track OFF and do not authorize apply, activation, delivery, database mutation, PR, push, or policy-module work.
