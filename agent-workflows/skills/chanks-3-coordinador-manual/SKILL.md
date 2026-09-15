---
name: chanks-3-coordinador-manual
description: "Trigger: route one already human-approved Pi manual batch while the Torre is off, then accept its terminal evidence without owning worker execution."
license: Apache-2.0
metadata:
  author: emili
  version: "1.0"
---

## Activation Contract

This is the deliberate stateless Tranche 3 router and explicit Tower-off manual fallback after V1.
Load it only after one human approval binds the parallel count, exact LISTO Sesión IDs, and exact Pi
worker alias, exact Pi session ID, exact cwd/worktree, runtime, and kind for each Sesión. The approval is a complete batch, not a proposal:
it never selects, substitutes, reduces, expands, optimizes, or reorders.

Manual pre-V1 batches are Pi-only. Never load Tower skills, never read or write Tower state, never claim
Tower is running, or create provisional cross-runtime support. This skill owns no queue, roster, ledger,
state, approval persistence, or auto-resume.

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

A `COMPLETED` event can enter serial integration only: integrate one completed Sesión at a time. Main
may integrate that already-produced commit, then record planning and closure evidence through
`chanks-7-session-doc`, then delegate retirement to `chanks-3-despacho-herdr`. An integration conflict
stops and escalates without resolution. BLOCKED and FAILED preserve the worker and worktree and report
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

Return the exact approved mapping and only the confirmed handoff or inbound terminal evidence. Report
whether a completed Session entered serial integration, closure, or retirement; otherwise preserve and
report the worker evidence. Never synthesize progress, completion, authority, or a next assignment.

## References

- `../chanks-3-despacho-herdr/SKILL.md`
- `../chanks-7-session-doc/SKILL.md`
- `herdr` skill
