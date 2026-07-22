// Control Tower — session waker.
//
// The half of the tower that cannot live in an MCP tool: bringing a parked
// agent back to life. Everything else — state, queue, locks — is in the store
// (control-tower/core.mjs) and reached through the tower_* MCP tools.
//
// Mechanism: `session.idle` marks the end of a turn. From there we poll the
// agent's queue; when a message shows up we consume it and feed it back in
// through `session.promptAsync`, which starts a new turn.
//
// Polling is not laziness. `session.idle` fires once, at the moment the turn
// ends, and a message that arrives while the agent is already parked produces
// no event at all — the sender writes into silence. Reacting only to the event
// works exactly when the message was already waiting, which is the one case a
// test writes by accident and the one case real usage never hits.
//
// ── Activation ──────────────────────────────────────────────────────────────
// The switch is a file, not an env var, because opencode is launched by herdr
// rather than by hand — there is no shell in between to export a variable. A
// file also flips on a LIVE session and needs no tooling to pull, which is
// what you want from a kill switch:
//
//   R=<repo>/Main/.git/control-tower
//   mkdir -p $R && touch $R/ACTIVE      # arm every agent in this repo
//   torre off                          # disarm through the writer barrier

import { appendFile, stat } from "node:fs/promises"
import { basename, join } from "node:path"

import * as tower from "../control-tower/core.mjs"

// Load-bearing, not polish: session.idle fires again after every wake, so a
// bug here is two processes talking to each other until the tokens run out.
//
// The guard is a rate, not a total. A runaway loop is many wakes in seconds; a
// long coordination session spreads the same count over hours and must never be
// punished for it. An orchestrator is the hub every agent reports to, so a
// lifetime cap always burns the busiest session first. We cap wakes inside a
// moving window and leave the lifetime count unbounded.
const MAX_WAKES = 15
const WAKE_WINDOW_MS = 5 * 60 * 1000

// How often a parked agent looks for mail. Cheap enough to be invisible,
// slow enough that a handoff still feels immediate.
const POLL_MS = 2000

const exists = async (path) => stat(path).then(() => true, () => false)

export const TowerSpikePlugin = async ({ client, worktree }) => {
  const agent = basename(worktree)

  let place
  try {
    place = tower.locate(worktree)
  } catch {
    return {} // not a git worktree — nothing to coordinate
  }

  const active = join(place.root, "ACTIVE")

  // Never console.log from here: the TUI renders plugin stdout inside the
  // prompt box, so a log line becomes text the user can accidentally send to
  // the model. Trace to a file instead — `tail -f` it when debugging.
  const log = (line) =>
    appendFile(join(place.root, "tower.log"), `${new Date().toISOString()} ${agent} ${line}\n`)
      .catch(() => {})

  // Native subagents live and die inside this session. The tower must never
  // see them, and we must never wake one by mistake.
  const childSessions = new Set()

  // Timestamps of recent wakes, oldest first, pruned to the window on every
  // check — its length is the current rate.
  let recentWakes = []
  let throttled = false
  let waking = false
  let poll = null

  const stopPolling = () => {
    if (poll) clearInterval(poll)
    poll = null
  }

  const check = async (sessionID) => {
    // Checked every tick, not at startup, so arming and disarming take effect
    // on a live session without relaunching it. It also gates opening the
    // database at all, so merely running opencode in a repo creates nothing.
    if (!(await exists(active))) return
    if (waking) return

    // The rate is checked BEFORE the queue is touched. `receive` consumes
    // inside its transaction, so reading first and refusing afterwards marks a
    // message delivered that nobody ever saw — the one loss the queue exists to
    // prevent. Refusing here leaves it pending and recoverable.
    const cutoff = Date.now() - WAKE_WINDOW_MS
    recentWakes = recentWakes.filter((at) => at > cutoff)
    if (recentWakes.length >= MAX_WAKES) {
      // Polling continues: the window drains by itself, so a burst recovers
      // without anyone stepping in. Log once per episode, not once per tick.
      if (!throttled) {
        throttled = true
        log(
          `TE NECESITA: ${MAX_WAKES} wakes within ${WAKE_WINDOW_MS / 60000} min — ` +
            "delivery paused, queue intact, resumes when the window drains",
        )
      }
      return
    }
    if (throttled) {
      throttled = false
      log("wake rate back under the limit — delivery resumed")
    }

    let message
    const handle = tower.open(worktree)
    try {
      message = tower.receive(handle)
    } catch (error) {
      log(`queue read failed — ${error.message}`)
      return
    } finally {
      handle.db?.close()
    }
    if (!message) return

    recentWakes.push(Date.now())
    waking = true
    // The new turn ends in its own session.idle, which restarts polling.
    stopPolling()
    log(`waking (${recentWakes.length}/${MAX_WAKES} in window) from ${message.sender}`)

    try {
      await client.session.promptAsync({
        path: { id: sessionID },
        body: {
          parts: [{ type: "text", text: `[torre · de ${message.sender}]\n\n${message.text}` }],
        },
      })
    } catch (error) {
      log(`wake failed — ${error}`)
    } finally {
      waking = false
    }
  }

  return {
    dispose: async () => stopPolling(),
    event: async ({ event }) => {
      const info = event?.properties?.info
      if (info?.id && info.parentID) childSessions.add(info.id)

      if (event?.type === "session.deleted") {
        stopPolling()
        return
      }

      if (event?.type !== "session.idle") return

      const sessionID = event.properties?.sessionID
      if (!sessionID || childSessions.has(sessionID)) return

      stopPolling()
      await check(sessionID)
      if (waking) return

      poll = setInterval(() => void check(sessionID), POLL_MS)
      poll.unref?.() // never hold the process open just to watch a queue
    },
  }
}
