---
name: chanks-3-coordinador-manual
description: "Trigger: route one already human-approved Pi manual batch while the Torre is off, then accept its terminal evidence without owning worker execution."
license: Apache-2.0
metadata:
  author: emili
  version: "2.0"
---

## Activation Contract

This is the deliberate stateless Tranche 3 router and explicit Tower-off manual fallback after V1.
Load it only after one human approval binds the parallel count, exact LISTO Sesión IDs, and exact Pi
worker alias, exact Pi session ID, exact cwd/worktree, runtime, and kind for each Sesión. The approval is a complete batch, not a proposal:
it never selects, substitutes, reduces, expands, optimizes, or reorders.

Manual pre-V1 batches are Pi-only. Never load Tower skills, never read or write Tower state, never claim
Tower is running, or create provisional cross-runtime support. This skill owns no queue, roster, ledger,
assignment state, approval persistence, or auto-resume. S155's dispatch marker is evidence only,
not a queue or assignment ledger. It does not own ODD continuity: preserve same Session identity
and native ODD record/code/evidence reconciliation for Encargo, or first pending Módulo for legacy.

## Approved-Dispatch Mode

Delegate all admission, pool, lock, Herdr, Intercom, and retirement mechanics to
`chanks-3-despacho-herdr`. That skill revalidates the exact approved binding and owns its own failure
rules; this coordinator adds no admission, pool, or recovery procedure.

After confirmed fire-and-forget handoffs, Main returns. It never waits, polls, supervises, retries, or
uses `ask`. In particular, two approved Pi workers receive independent fire-and-forget handoffs:
handoff B is sent without waiting for worker A, and Main returns after both delivery results.

## Terminal-Event Mode

Accept only inbound `COMPLETED`, `BLOCKED`, or `FAILED` events that identify the exact assigned Sesión,
worker, and worker evidence. Each implementer owns implementation, self-verification, native RDD, and
Module commits. Main must not inspect, review, correct, rerun tests or RDD, or mutate the worker
candidate. Before terminal handling, fresh Intercom and Herdr readbacks must prove the sender matches the
already human-approved/dispatched exact alias, exact Pi session ID, and exact cwd/worktree; Git readback must prove the
reported commit is the dispatched worktree candidate before integration. Any missing, mismatched, or unavailable
readback stops: no integration, retry, remapping, or inferred terminal.

Only after verified inbound `listo para revisión` from the exact dispatched Session/worker and
Intercom/Herdr/Git readbacks, persist S155's structured `review_ready` witness atomically on the
existing `radar.despacho/v1` marker in the Git common dir at `chanks/despachos/<ID>.json`. Its
`transport: intercom`, `type: listo para revisión`, nonempty `message_id`, RFC3339 `received_at`,
`sesion`, `worker`, absolute `worktree`, and full `branch` must match the marker and verified receipt.
Check existing marker/path identity; never manufacture a witness from an outbound send or terminal
claim, overwrite a mismatch, or infer receipt when readback is unavailable. This is evidence, not
an assignment state or delivery permission.

A `COMPLETED` event can enter serial integration only with that verified review-ready witness:
integrate one completed Sesión at a time. Main
may integrate that already-produced commit, then record planning and closure evidence through
`chanks-7-session-doc`, then delegate retirement to `chanks-3-despacho-herdr`. Delete the marker
only after verified serial integration and stage-5 closure, never merely on COMPLETED. Preserve
marker/evidence on BLOCKED, FAILED, ambiguous, orphaned, or not-yet-closed outcomes; stop rather
than discard unverifiable evidence. An integration conflict stops and escalates without resolution.
BLOCKED and FAILED preserve the worker and worktree and report
the worker evidence; no polling, retry, state, correction, or inferred completion follows. A disconnected
worker or absent Main preserves the worktree and candidate and does not create a retry,
support, or cross-runtime path.

For the contractual two-worker journey: terminal A integrates, closes through `chanks-7-session-doc`,
and retires through `chanks-3-despacho-herdr`; terminal B enters integration only after A completes
serial integration, closure, and retirement.

## Human-Activated Reconstruction

Human-activated reconstruction uses only exact Git, Radar, Herdr, and Intercom readbacks. A confirmed
terminal plus exact readbacks authorizes integration and closure only for that already-dispatched
assignment. Never authorize a new dispatch, retry, changed mapping, or inferred completion. It creates no
durable reconstruction record and never auto-resumes.

## Cimiento Interventions And File-Level Parallel

Sesiones in one Zona advance on their own files only when every fingerprint is complete,
current against the same integrated base, and disjoint. Sharing a Zona is not a conflict, and a
shared Cimiento is a condition of coordinated intervention, **not a veto** on both Sesiones'
own work. An **unknown fingerprint** never enables parallel: what was not declared is not read
as empty and not read as safe.

Before touching Cimientos, the worker requests the **complete coherent set** it needs, bound to
its Sesión, its worker and the current integrated base. Main grants that set **granted whole or
not at all**, with no overlap on any file. Partial grants are refused on purpose: accumulating
them is what produces a **circular wait**, where two workers each hold half of what the other
needs. A live set is never widened silently — release it and request the complete one again.

Each intervention runs on the full current integrated base and preserves its own valid work. A
loose Cimiento copied in its place is not that base.

Release happens only after **confirmed integration** under the delivery flow, **never by
finished local editing or worker silence**. Conflict, scope change, base change, disconnection
or missing evidence stop the affected intervention: a stop **preserves the work and the
evidence** and carries **no automatic retry, remapping, permission, release, or resumption**. A
human resolves it, and the grant is kept meanwhile rather than handed to someone else half
written.

**Main coordinates and integrates.** It does not inspect to issue a second technical judgement,
correct code, or rerun the worker's tests. The effective controls are consumed from the Chanks
core, never reimplemented here, and the refusal is an absence rather than a message: a Sesión
whose request was denied has no writable path to that file, so the write does not happen —
including from a process its command spawns.

This creates **no persistent queue**, **no artificial lock manager**, no other planning state,
no continuity storage, no receipts API and no technical executor. Radar acquires no live
reservation, and none of this evidence grants authority to itself. The Tower stays off.

Implemented by `agent-workflows/chanks/interventions.mjs`, proven in
`agent-workflows/tests/chanks/interventions.test.mjs`.

## Migration to Tower V1

This table maps manual evidence and choreography to future Tower V1 authority and capabilities. It does
not copy Tower procedures.

| Manual evidence/choreography | Tower V1 authority and capabilities |
| --- | --- |
| Human's complete exact approval | binding |
| Declared worker and Herdr readbacks | pool/lifecycle |
| Fire-and-forget delivery result | ack/retry |
| Inbound worker terminal evidence | terminality |
| Human reconstruction readbacks | checkpoint/replay |
| Serial integration, closure, and retirement evidence | delivery reconciliation |

## Output Contract

Return the exact approved mapping and only the confirmed handoff, verified review-ready witness,
or inbound terminal evidence. Include
the native/legacy resume discriminator as context but never synthesize ODD progress, completion,
authority, or a next assignment. Report whether a completed Session entered serial integration,
closure, or retirement; otherwise preserve and report worker evidence.

## References

- `../chanks-3-despacho-herdr/SKILL.md`
- `../chanks-7-session-doc/SKILL.md`
- `herdr` skill
