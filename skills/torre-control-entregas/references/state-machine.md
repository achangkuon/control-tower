# Delivery State Machine

These are the only states the Tower accepts. The engine validates on write
(`core.mjs:144`) against the list in `core.mjs:24-35`, so a name outside it is a
thrown error, not an unknown value that gets stored anyway. This file is derived from
that list; if the two ever disagree, the code is right.

Canonical progression:

```text
PLANNED -> ASSIGNED -> WORKING -> READY -> DELIVERING -> PR_OPEN -> MERGED -> COMPLETE
```

`BLOCKED` and `WAITING_HUMAN` are lateral states. Read-only assignments return evidence and terminate without entering this machine.

| State | Entry evidence | Exit evidence | Token rule |
|---|---|---|---|
| `PLANNED` | Approved executable unit, scope, dependencies, tests, DB mode, and assigned worktree or pending verification | Brief delivered to the agent | No token |
| `ASSIGNED` | Agent received the brief and is verifying worktree, repository identity, and base | Context verified; allowed work starts | No token |
| `WORKING` | Agent is planning, implementing, testing, normalizing, or staging in its isolated worktree | Exact intended candidate complete, staged, tested, uncommitted | No token; independent units run concurrently |
| `READY` | Same frozen staged candidate; all source-mutating normalization done; required evidence green | Green light transfers the token and authorizes the exact commit | Waiting for token; no PR URL required |
| `DELIVERING` | Token received by transfer; exact candidate committed; push in progress | Push succeeds and a new PR may be opened | Holds token |
| `PR_OPEN` | New PR opened; an existing/open PR requires STOP and a distinct explicit correction handoff, never the normal delivery-green-light flow | Forge proves remote merge or explicit closure | Holds token; no second green light |
| `MERGED` | Remote forge proves merge SHA and target branch | DB proof if needed, otherwise global reconciliation | The holding agent releases the token now |
| `COMPLETE` | Closure evidence returned and reconciled | Terminal | No token |
| `BLOCKED` | Any unmet authority, conflict, failed gate, drift, or explicit decision state | Named unblock condition plus maintainer decision | Preserve current candidate/state and token ownership |
| `WAITING_HUMAN` | Work paused on a person's decision rather than a technical fault | The decision returns through the Tower relay (`tower_send`), never by a person entering the agent's session | Preserve current candidate/state and token ownership |

## Finer phases go in `note`, never in `state`

The engine takes ten states. Everything more granular — candidate staged, review running, awaiting a dependency, DB verification pending, tests failing and being fixed — travels in the free-text `note` of `tower_set_state` alongside a valid state. `tower_set_state(state: "WORKING", note: "candidato staged, corriendo suite")` is correct; `tower_set_state(state: "CANDIDATE_READY")` is rejected.

The same applies to reports sent with `tower_send`: the message body is free text, so a compact `STATUS:` block may use whatever vocabulary the handoff defines. Only the `state` field is constrained.

## Invariants

Exactly one unit may occupy `READY`, `DELIVERING`, or `PR_OPEN`. Other independent units stay `WORKING`. The Tower reserves the token, transfers it to the agent at the green light, and that agent holds it through `PR_OPEN` and releases it only after verified remote merge.

If a token holder becomes `BLOCKED`, never release or reassign silently. Tower asks the maintainer to choose `resume` or `abandon/cancel`. Resume requires exact candidate status and the named unblock proof. Cancellation records the candidate as non-deliverable, verifies no push or open PR remains, and only then advances the queue.

All source-mutating normalization happens before the candidate is declared `READY`. The candidate stays byte-exact from there through commit, push, PR, and merge. A DB verification pending after merge uses the independent `db-writer` semaphore and does not hold the Git token; carry it as `MERGED` with the pending proof named in `note`.
