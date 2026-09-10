# Night Mode

The maintainer leaves — sleep, gym, a flight — and agents keep working to the edge
of their sealed scope. This file is the policy layer. It decides how far, on what
budget, and what happens to a question nobody is awake to answer.

> **Mode scope.** Everything here is policy and applies in both runtime modes. The
> `tower_*` calls named below are the `runtime_mode: tower` bindings; under
> `runtime_mode: standalone` substitute the file-based equivalents in
> `runtime-standalone.md` — same policy, different surface. Standalone is always
> tier A and always `unreachable`.

## Two layers, one seam

The Control Tower's continuation substrate is the MECHANISM: publish, claim, start,
attest, suspend, redeliver, poll, wake. It is deliberately policy-free — its own
proposal puts "one-unit policy", runbooks, and "policy scripts" out of scope, and
requires its contracts to be consumable "without Tower policy logic".

This skill is that policy. It never reimplements the mechanism.

| Layer | Owns |
|---|---|
| Continuation substrate | Advancing, suspending, resuming, cadence, wake |
| `unattended-implementation` | How far, what budget, what to do with a question, when to stop |

## Non-interference

Night mode is a **document producer, not a process**. It runs before the maintainer
leaves, emits two artifacts, and ends its turn. Nothing of it is live overnight.

It follows the same contract as `chanks-0-agente-soporte` (`../chanks-0-agente-soporte/references/contrato-no-interferencia.md`):

- Never call `tower_register`, `tower_set_state`, or `tower_acquire`. Reading
  `tower_status` and sending with `tower_send` is the whole Tower surface.
- Never relay a question. The active project's Tower authority owns attended relay;
  this skill only sets the policy an agent applies when no reader is available.
- Never plan (that is `chanks-0-agente-soporte`), never implement (that is `sdd-apply`),
  never deliver (that is the Tower and the maintainer, awake).
- Never write inside a repository worktree. Night artifacts live under
  `~/.local/state/control-tower/night/`.

## The two planes — do not conflate them

| Plane | Governs | Overnight |
|---|---|---|
| Legacy queue | The `git-delivery` token; one unit in `READY\|DELIVERING\|PR_OPEN` | Idle. Nothing is delivered asleep |
| Continuation | Autonomous advance across pre-approved Sesiones | Where the night happens; no single-slot invariant |

The single-`READY`-slot invariant serializes DELIVERY. It does not cap overnight
progress, and night mode must never try to occupy, reserve, or work around it.

## Tiers

Night mode degrades explicitly rather than pretending.

| Tier | Precondition | What the night does |
|---|---|---|
| **A — pre-flight only** | Continuation substrate not cut over | One sealed Sesión per agent. Cadence comes from the host loop. Pre-flight, parking, and wake report all apply |
| **B — full** | Continuation plane live | Agents advance across the chain of pre-approved Sesiones under the same policy |

Declare the tier in the night contract. Never claim tier B without a live
continuation plane; report tier A and say so.

## Pre-flight gates

Run all of them. Any failure is `NOT_READY` with the specific fix, never a bare no.

1. **Bounded scope.** Every Sesión admitted to the window is sealed, with positional
   `sesion_id`, exclusive path ownership, and no dependency on an unsealed Sesión.
2. **No open product decision.** Not "is one pending" but **"can one appear"**. A
   Sesión whose tasks contain an unresolved product choice does not enter the window.
3. **Window end.** `expires_at` is explicit and lands before the maintainer returns.
   Nothing starts that cannot finish inside the window.
4. **Budget.** A token/usage ceiling for the window and a stop condition on reaching
   it. Unbudgeted nights are how a monthly quota disappears while asleep.
5. **Reachability declared.** See below.
6. **Physical preconditions.** Machine will not suspend; no orphaned `git-delivery`
   holder from the previous session; every night agent has a distinct worktree.

## Reachability

Not an activity list — sleep and a flight are the same thing, and a gym with a phone
is not. The variable is answer latency.

| Value | Meaning | Question handling |
|---|---|---|
| `unreachable` | Nobody answers until the window ends | Park. Total silence |
| `delayed` | Answer in ~20–30 min | Park **and** notify |
| `live` | Maintainer present | Normal Tower relay; night mode does not apply |

Reachability lives in the night contract, **not** in a sealed Sesión contract. The
seal is immutable — any change makes a new contract needing renewed approval — and a
maintainer who goes to the gym at 19:00 and sleeps at 23:00 must not force a re-seal.

Loosening mid-window (`unreachable` → `delayed`) is free. Tightening is not: if any
part of the window is unreachable, declare the whole window `unreachable`. Never
admit scope leaning on a phone that will be silent at 02:00.

`delayed` requires a configured notification transport. Until the Telegram bot ships,
the relay's only destination is the maintainer's Main chat on the machine, so
`delayed` has nowhere to send. Requesting it without transport is `NOT_READY`.

## Parking

One mechanism, both modes. An agent that meets a question never stalls on it:

1. Compose the exact self-contained decision block required by the active project's instructions.
2. Append it to the night log at
   `~/.local/state/control-tower/night/<date>-<agent>.md`.
3. `tower_set_state(state: "WORKING", note: "parked: <one line>")` — the question is
   a finer phase, and finer phases travel in `note`. Do not use `WAITING_HUMAN`
   overnight: it is defined as work paused on a person, and it will pause until
   morning.
4. Continue with the next task in sealed scope that does not depend on the answer.
5. If nothing independent remains, close out that Sesión as parked and move to the
   next pre-approved one (tier B) or end cleanly (tier A).

Under tier B, parking maps onto the substrate's own suspension and redelivery
dispositions rather than a mechanism invented here.

When `delayed` and a transport exists, the block is also pushed to the maintainer. An
answer that arrives resumes that Sesión; an answer that does not changes nothing —
the agent is already working on something else.

## Wake report

One block per agent, composed by the agent and sent with `tower_send` when the window
closes. The Tower concatenates them in arrival order and adds nothing.

```text
NOCHE: <AGENT> — <WINDOW_START> a <WINDOW_END>

Cerrado: <SESION_IDS_WITH_CANDIDATE_STATE>
Estacionado: <N> preguntas — <LOG_PATH>
Bloqueado: <SESION_ID> — <ONE_LINE_CAUSE>
Presupuesto: <USED>/<CEILING>
Esperando semáforo: <SESION_IDS_FROZEN_UNCOMMITTED>
```

Nothing in the report is a delivery. Candidates stay frozen and uncommitted until the
maintainer, awake, gives the green light through the Tower.

## Failure modes

| Symptom | Meaning | Action |
|---|---|---|
| Agent `WAITING_HUMAN` at wake | It stalled instead of parking | Policy was not applied; fix the brief, not the agent |
| Budget hit before window end | Ceiling too low or scope too wide | Stop condition worked; re-scope, do not raise blindly |
| Second agent `BLOCKED` on a slot | Night mode touched the delivery plane | Contract violation — the night never occupies `READY` |
| Wake report missing an agent | Window ended without a close-out | Read the night log; never reconstruct it from the repo |
