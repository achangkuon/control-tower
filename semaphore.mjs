// Shared, repository-scoped legacy semaphore. The standalone V1 binary imports
// this module alone; continuation remains exclusively in core.mjs.
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { basename, join } from "node:path"

export const STATES = [
  "PLANNED", "ASSIGNED", "WORKING", "READY", "DELIVERING", "PR_OPEN",
  "MERGED", "BLOCKED", "WAITING_HUMAN", "COMPLETE",
]
export const LOCKS = ["git-delivery", "db-writer"]
export const INACTIVE_ERROR = "control tower is off for this repository; run `torre on` to enable it"
export const NEEDS_HUMAN = ["BLOCKED", "WAITING_HUMAN"]
const now = () => new Date().toISOString()

export const trace = (root, actor, line, flag = "") => {
  try {
    appendFileSync(join(root, "tower.log"), `${now()} ${actor} ${flag}${line}\n`)
  } catch {
    // A trace must never take down the operation it describes.
  }
}

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim()

/** Repo-scoped paths and this session's identity, derived from a directory. */
export const locate = (cwd) => {
  const commonDir = git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  const worktree = git(cwd, ["rev-parse", "--show-toplevel"])
  let branch = ""
  try {
    branch = git(cwd, ["branch", "--show-current"])
  } catch {
    // detached HEAD is not our problem here
  }
  return {
    root: join(commonDir, "control-tower"),
    // Identity is the worktree path, not its branch (which may change).
    name: basename(worktree),
    worktree,
    branch,
  }
}

export const isActive = ({ place }) => existsSync(join(place.root, "ACTIVE"))
export const assertActive = (handle) => {
  if (!isActive(handle)) throw new Error(INACTIVE_ERROR)
}

// Check ACTIVE again under SQLite's writer lock so deactivation cannot race a write.
const activeWrite = ({ db, place }, operation) => {
  assertActive({ place })
  return db.transaction(() => {
    assertActive({ place })
    return operation()
  }).immediate()
}

export const open = (cwd) => {
  const place = locate(cwd)
  const dbPath = join(place.root, "tower.db")
  if (!existsSync(dbPath) && !isActive({ place })) return { db: null, place }
  mkdirSync(place.root, { recursive: true })

  const db = new Database(dbPath)
  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA busy_timeout = 5000")
  db.run(`
    CREATE TABLE IF NOT EXISTS agent (
      name       TEXT PRIMARY KEY,
      role       TEXT NOT NULL,
      worktree   TEXT NOT NULL,
      branch     TEXT,
      state      TEXT NOT NULL,
      task       TEXT,
      note       TEXT,
      pr_url     TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS message (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient   TEXT NOT NULL,
      sender      TEXT NOT NULL,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS message_pending
      ON message (recipient, id) WHERE consumed_at IS NULL;
    CREATE TABLE IF NOT EXISTS lock (
      name        TEXT PRIMARY KEY,
      holder      TEXT,
      acquired_at TEXT
    );
  `)
  return { db, place }
}

export const register = ({ db, place }, role) => {
  activeWrite({ db, place }, () => {
    db.run(
      `INSERT INTO agent (name, role, worktree, branch, state, updated_at)
       VALUES (?, ?, ?, ?, 'PLANNED', ?)
       ON CONFLICT(name) DO UPDATE SET
         role = excluded.role,
         worktree = excluded.worktree,
         branch = excluded.branch,
         updated_at = excluded.updated_at`,
      [place.name, role, place.worktree, place.branch, now()],
    )
  })
  return status({ db, place })
}

export const setState = ({ db, place }, { state, task, note, prUrl }) => {
  assertActive({ place })
  if (!STATES.includes(state)) {
    throw new Error(`unknown state "${state}" — one of: ${STATES.join(", ")}`)
  }
  const changed = activeWrite({ db, place }, () =>
    db.run(
      `UPDATE agent SET
         state = ?,
         task = COALESCE(?, task),
         note = COALESCE(?, note),
         pr_url = COALESCE(?, pr_url),
         updated_at = ?
       WHERE name = ?`,
      [state, task ?? null, note ?? null, prUrl ?? null, now(), place.name],
    ),
  )
  if (changed.changes === 0) throw new Error(`"${place.name}" is not registered — call tower_register first`)
  trace(
    place.root,
    place.name,
    `→ ${state}${note ? ` · ${note}` : ""}`,
    NEEDS_HUMAN.includes(state) ? "TE NECESITA: " : "",
  )
  return status({ db, place })
}

export const send = ({ db, place }, { to, text }) => {
  activeWrite({ db, place }, () => {
    const known = db.query("SELECT 1 FROM agent WHERE name = ?").get(to)
    if (!known) {
      trace(place.root, place.name, `no existe el destinatario "${to}"`, "TE NECESITA: ")
      throw new Error(`no agent named "${to}" is registered`)
    }
    db.run(
      "INSERT INTO message (recipient, sender, text, created_at) VALUES (?, ?, ?, ?)",
      [to, place.name, text, now()],
    )
  })
  trace(place.root, place.name, `→ ${to}: ${text.split("\n")[0].slice(0, 90)}`)
  return { queued_for: to }
}

/** Atomically claim the oldest unread message. Returns null when the inbox is empty. */
export const receive = ({ db, place }) => {
  return activeWrite({ db, place }, () => {
    const next = db
      .query(
        `SELECT id, sender, text, created_at FROM message
         WHERE recipient = ? AND consumed_at IS NULL
         ORDER BY id LIMIT 1`,
      )
      .get(place.name)
    if (!next) return null
    db.run("UPDATE message SET consumed_at = ? WHERE id = ?", [now(), next.id])
    return next
  })
}

/** Atomically acquire the named lock; only registered agents may hold it. */
export const acquire = ({ db, place }, name) => {
  assertActive({ place })
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  const result = activeWrite({ db, place }, () => {
    const registered = db.query("SELECT 1 FROM agent WHERE name = ?").get(place.name)
    if (!registered) throw new Error(`"${place.name}" is not registered — call tower_register first`)
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (row?.holder && row.holder !== place.name) return { granted: false, holder: row.holder }
    db.run(
      `INSERT INTO lock (name, holder, acquired_at) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET holder = excluded.holder, acquired_at = excluded.acquired_at`,
      [name, place.name, now()],
    )
    return { granted: true, holder: place.name }
  })
  trace(place.root, place.name, result.granted ? `tomó el lock ${name}` : `esperando ${name}, lo tiene ${result.holder}`)
  return result
}

export const release = ({ db, place }, name) => {
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (!db) return { released: false, reason: "nobody holds it" }
  const give = db.transaction(() => {
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (!row?.holder) return { released: false, reason: "nobody holds it" }
    if (row.holder !== place.name) return { released: false, reason: `held by ${row.holder}` }
    db.run("UPDATE lock SET holder = NULL, acquired_at = NULL WHERE name = ?", [name])
    return { released: true }
  })
  const result = give.immediate()
  if (result.released) trace(place.root, place.name, `soltó el lock ${name}`)
  else trace(place.root, place.name, `no pudo soltar ${name}: ${result.reason}`, "TE NECESITA: ")
  return result
}

/** Transfer atomically: the lock is never unheld between owners. */
export const transfer = ({ db, place }, name, to) => {
  assertActive({ place })
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (to === place.name) throw new Error(`"${to}" already holds ${name}`)
  const result = activeWrite({ db, place }, () => {
    if (!db.query("SELECT 1 FROM agent WHERE name = ?").get(to)) {
      return { transferred: false, reason: `"${to}" is not registered` }
    }
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (!row?.holder) return { transferred: false, reason: "nobody holds it" }
    if (row.holder !== place.name) return { transferred: false, reason: `held by ${row.holder}` }
    db.run("UPDATE lock SET holder = ?, acquired_at = ? WHERE name = ?", [to, now(), name])
    return { transferred: true, holder: to }
  })
  if (result.transferred) trace(place.root, place.name, `pasó el lock ${name} a ${to}`)
  else trace(place.root, place.name, `no pudo pasar ${name} a ${to}: ${result.reason}`, "TE NECESITA: ")
  return result
}

/** Human-only recovery from a dead lock holder; never expose as a tower_* tool. */
export const forceRelease = ({ db, place }, name) => {
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (!db) return { released: false, reason: "nobody holds it" }
  const row = db.query("SELECT holder, acquired_at FROM lock WHERE name = ?").get(name)
  if (!row?.holder) return { released: false, reason: "nobody holds it" }
  db.run("UPDATE lock SET holder = NULL, acquired_at = NULL WHERE name = ?", [name])
  trace(place.root, "humano", `liberó ${name} a la fuerza (lo tenía ${row.holder})`, "TE NECESITA: ")
  return { released: true, was: row.holder, since: row.acquired_at }
}

/** Wait for guarded writers before disarming this repository. */
export const deactivate = ({ db, place }) => {
  const activePath = join(place.root, "ACTIVE")
  if (!db) {
    rmSync(activePath, { force: true })
    return { active: false }
  }
  const stop = db.transaction(() => {
    rmSync(activePath, { force: true })
    return { active: false }
  })
  const deadline = Date.now() + 5000
  let waitingLogged = false
  db.run("PRAGMA busy_timeout = 0")
  try {
    while (true) {
      try {
        return stop.immediate()
      } catch (error) {
        const busy = error?.code === "SQLITE_BUSY" || error?.message?.includes("database is locked")
        if (!busy) throw error
        if (!waitingLogged) {
          waitingLogged = true
          trace(place.root, "humano", "torre off waiting for an in-flight guarded operation")
        }
        if (Date.now() >= deadline) {
          throw new Error("torre off timed out waiting for an in-flight guarded operation")
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
      }
    }
  } finally {
    db.run("PRAGMA busy_timeout = 5000")
  }
}

/** The entire observed coordination state in one call. */
export const status = ({ db, place }) => ({
  active: isActive({ place }),
  you: place.name,
  agents: db
    ? db
        .query(
          `SELECT a.name, a.role, a.branch, a.state, a.task, a.note, a.pr_url,
                  (SELECT COUNT(*) FROM message m
                   WHERE m.recipient = a.name AND m.consumed_at IS NULL) AS pending
           FROM agent a ORDER BY a.role DESC, a.name`,
        )
        .all()
    : [],
  locks: db
    ? db.query("SELECT name, holder, acquired_at FROM lock WHERE holder IS NOT NULL").all()
    : [],
})
