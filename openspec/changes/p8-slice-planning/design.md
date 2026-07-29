# Design: P8 — Pi Adapter

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers; P7 means `p7-host-neutral-loop-opencode-adapter`. Neither value denotes positional Plan P6 or Plan P7.

## Technical Approach

Add a generation-scoped Pi extension over merged P7 `host/loop.mjs`. P7 retains polling, peek, retry, serialization, and invalidation; P8 supplies reconciled lifecycle classification, wake eligibility, generation ownership, and `pi.sendMessage`. Identity shapes remain opaque until reconciliation pins them.

P8 apply remains blocked until P7 has an approved reconciliation record that is integrated and P8's separate record is approved. Native `apply-ready` or the P7 record alone is insufficient. P8 depends on integrated P7, not Change A, while preserving `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E` with C→D and no A→P7/P8 edge.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| Cache root context | Simple but stale and field-coupled | Rejected. `PiSessionGate` issues opaque leases and re-proves authority per action/wake. |
| Assume shutdown before reload | Simpler, but late events cross generations | Rejected. A process-local `GenerationCoordinator` owns one controller per root and atomically replaces only with proven newer-generation evidence. |
| Trust event root/child fields | Easy but forgeable | Rejected. Only Pi-owned context/session relationships issue root evidence. |
| Adapter retry/access | Self-contained but duplicates policy | Rejected. P7 owns retry; P8 never peeks, consumes, claims, or acknowledges. |

## Data Flow

```text
Pi callback -> trusted classifier -> child/ambiguous: no-op
                             `-> root lease -> generation ownership -> P7 lifecycle
P7 wake -> withCurrentIdleRoot(lease,generation, invoke) -> pi.sendMessage
root shutdown/plugin dispose -> revoke generation -> synchronous loop.dispose
```

Each installation receives a monotonic opaque token. Equivalent trusted resume evidence for the same root and token returns the existing binding/controller: it does not bind, settle, schedule, peek, wake, or change ownership/generation. Equivalence comes from `PiSessionGate`, never payload equality. Missing, stale, different-root, same-token conflicting, or otherwise non-equivalent evidence fails closed with the owner unchanged. Only trusted evidence proving a newer generation enters replacement: revoke and synchronously dispose the old owner before binding exactly one new loop. Old/non-owner callbacks and completions are inert; an issued send is not retractable, but its completion cannot mutate either generation.

## File Changes

| File | Action | Description |
|---|---|---|
| `adapters/pi/index.ts` | Create | Extension factory, classifier/gate composition, generation coordinator, lifecycle and wake mapping. |
| `adapters/pi/package.json` | Create | Reconciliation-pinned private Pi manifest metadata; no installation/cutover. |
| `test/host-adapters.test.mjs` | Modify | Pi CT-R5, gate, discrimination, overlap, and late-event RED cases. |
| `host/loop.mjs` | Read-only | Consume the exact reconciled P7 contract; no Pi semantics. |
| `test/helpers/host-adapter-conformance.mjs` | Read-only | Consume unchanged CT-R5 fixture unless P7 reconciliation amends it first. |

## Interfaces / Contracts

```ts
installPiAdapter({ pi, createLoop, sessionGate, generations, wakeEnvelope })

sessionGate.classify(event, ctx, adapterGeneration)
// -> { kind: "root-settled" | "root-shutdown", lease } | { kind: "child" | "ambiguous" }

generations.resume(lease, adapterGeneration)
// -> EXISTING | REPLACED | INELIGIBLE; EXISTING performs no controller call.

sessionGate.withCurrentIdleRoot(lease, adapterGeneration, invoke)
// re-proves ownership, root/session equivalence, and idle; invokes synchronously or is INELIGIBLE.
```

`lease` and equivalence are opaque reconciliation outputs, not schema. Classification trusts a generation-registered callback plus Pi-owned context/session evidence: settlement requires the current idle root; shutdown requires target equality with the live lease; a proven parent is child; everything else is ambiguous. Event fields grant no authority. Wake re-resolves current context and rechecks lease, ownership, equality, and idle; failure closes safely.

Wake calls `pi.sendMessage(wakeEnvelope, { deliverAs: "followUp", triggerTurn: true })` once inside the gate. The reconciled envelope is descriptor-free. Throws/rejections propagate to P7; P8 never retries.

## Testing Strategy

| Layer | Planned RED proof |
|---|---|
| Shared | Unchanged `CT-R5-S1..S5@Pi`, including child no-ops and synchronous root disposal. |
| Unit | Wake-time eligibility; root/child discrimination; replacement and late-event races; exact options/rejection. Focused RED mapped to `spec.md:59-67`: while one root/generation is polling, replay equivalent trusted resume evidence; assert the identical owner/controller and generation, one binding, unchanged timer queue, and—after deterministic execution—only the baseline single peek/wake. Replay during an in-flight wake and assert no extra schedule/peek/wake. Conflicting evidence returns `INELIGIBLE` without mutation; proven newer evidence alone follows dispose-before-replace. |
| Regression | Focused host-adapter/polling/fail-closed suites, then `bun test`, using fakes and no Tower runtime state. |

## Threat Matrix

| Boundary | Applicability | Design response / RED |
|---|---|---|
| Documentation-like paths | N/A: no file execution/classification | None |
| Git repository selection | N/A: no Git invocation | None |
| Commit state | N/A: no VCS automation | None |
| Push state | N/A: no remote operation | None |
| PR commands | N/A: no PR automation | None |

## Migration / Rollout

No migration required. P8 never edits Migration 005 and performs no P10 installation, publication, activation, or cutover.

Before any RED, S1.17 MUST consume and validate the approved S1.12 `reconciliation.md`; it MUST NOT recreate or re-author it. The record MUST pin merged evidence for P6 capability, root equivalence/current-session authority, pending preservation, and witness decision; P7 factory/lifecycle/wake/disposal/fixture contracts; Pi callback identity, root/child/shutdown proof, idle timing, current-session lookup, `sendMessage`, manifest/unload semantics; and process-shared coordinator lifetime. Missing proof keeps P8 blocked and fail closed.

The record MUST distinguish `project_id`, `plan_id`, `slice_id`, `assignment_id`, `jornada_id`, `session_id`, `host_process_instance`, `plugin_instance`, and `root_session_id`; it MUST keep capability `binding_epoch`, Main-issued/Change-E-enforced `host_epoch`, and process-local non-authoritative `generation` separate. Assignment evidence pins an authorized in-container `Worktrees/<plan>/<lane>/<slice>` path, base SHA, allowed branch, assignment, and session. Workspace Manager owns worktree lifecycle; Change E owns host lifecycle, heartbeat, stop proof, session naming, host-epoch enforcement, and exclusive failover. P8 owns neither.

## Open Questions

All concrete P6/P7/Pi seams above are apply-blocking reconciliation outputs; none may be guessed in P8.
