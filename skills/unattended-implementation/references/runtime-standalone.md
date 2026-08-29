# Standalone Runtime — unattended without the Control Tower

Temporary runtime for `runtime_mode: standalone`. It exists because the Tower is not
finished, and it is meant to be exercised and thrown away, not grown into a second Tower.

Sealing, the pre-flight gates in `night-mode.md`, and every semantic gate in
`sealing-and-routing.md` are **mode-independent** and apply here unchanged. This file
replaces only the parts that were Tower calls: state, parking, delivery, and wake.

## What replaces each Tower surface

| Tower surface | Standalone replacement |
|---|---|
| `tower_status` | Read `~/.local/state/unattended/<date>/window.json`; absent means no window is live |
| `tower_set_state` | Append one line to `~/.local/state/unattended/<date>/<agent>.state` |
| `tower_send` wake report | Write the block to `~/.local/state/unattended/<date>/wake-report.md` |
| `git-delivery` token | One lock file `~/.local/state/unattended/delivery.lock` holding `<agent>` and PID |
| Human decision relay | Park to the night log. There is no relay; `delayed` reachability is unavailable |

Never simulate a Tower call, and never write a `tower_*` result that did not happen.
State is files, and a missing file is a missing state — never an assumed one.

## Reachability

Only `unreachable` is available. `delayed` requires a notification transport that does
not exist in this mode, so requesting it is `NOT_READY`. Every question parks silently.

## Delivery ceiling — the only mode that delivers

`delivery_ceiling` is declared per window and never exceeds `draft-pr`.

| Ceiling | Authorized |
|---|---|
| `commit` | Commit on the Sesión's own branch inside its own worktree |
| `push` | The above, plus push that branch to origin |
| `draft-pr` | The above, plus open ONE draft PR per Sesión, base = the sealed base |

Never merge, never mark a PR ready for review, never touch `main`, never force-push,
never rebase a pushed branch, never tag, deploy, or mutate a database.

### The CI gate — check before push, every window

Push and draft PR are authorized only when the repository will not burn Actions minutes
unattended. Before any push, verify **one** of these holds and record which:

1. No workflow triggers on `pull_request` or on pushes to the Sesión's branch pattern; or
2. Every `pull_request` workflow is guarded by `if: github.event.pull_request.draft == false`
   or an equivalent draft guard; or
3. The maintainer declared `ci_allowed: true` for this specific window.

If none holds, **degrade to `commit`** for that Sesión, continue working, and name the
degradation in the wake report. Never ask, never wait, never push anyway.

## Correction and verification limits

Unchanged from the parent skill: at most two sealed-scope corrections before the final
required verification; its first failure is terminal `BLOCKED` for that Sesión only, with
zero retries. A `BLOCKED` Sesión is never pushed and never gets a PR — its work stays
committed on its branch as evidence.

## Parking

1. Compose the exact self-contained decision block required by the active project's instructions.
2. Append it to `~/.local/state/unattended/<date>/<agent>.md`.
3. Append `WORKING parked: <one line>` to the agent's `.state` file. Never a waiting state.
4. Continue with the next task in sealed scope that does not depend on the answer.
5. If nothing independent remains, close that Sesión as parked and end cleanly. There is
   no continuation plane in this mode — always tier A.

## Wake report

Written to `~/.local/state/unattended/<date>/wake-report.md` when the window closes.

```text
NOCHE STANDALONE: <AGENT> — <WINDOW_START> a <WINDOW_END>

Cerrado: <SESION_IDS> — <CEILING_REACHED_PER_SESION>
Ramas: <BRANCH> → <pushed|local> · PR: <URL|—>
CI: <gate_1|gate_2|gate_3|degradado a commit — razón>
Estacionado: <N> preguntas — <LOG_PATH>
Bloqueado: <SESION_ID> — <ONE_LINE_CAUSE>
Presupuesto: <USED>/<CEILING>
```

Nothing here is merged. Every draft PR waits for the maintainer, awake.

## Migrating off this file

When the Tower goes live, `runtime_mode` resolves to `tower` on its own and this file
stops loading. Delete it rather than reconciling the two: the Tower owns delivery through
`git-delivery`, and a standalone ceiling that survives alongside it is a second path to
production nobody is watching.
