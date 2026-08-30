import { basename, dirname, join } from "node:path"

import { PERMANENT_SEATS } from "./seat-inventory.mjs"

// S9.1 — the pool is fixed and its seats are permanent: they are not created or destroyed per
// Session, they exist and get recycled. Occupancy is DERIVED from the worktree, never persisted,
// so this module introduces no Main authority, no SQLite and no public API. Rotating a branch
// stays with `jornada.sh --reciclar`; assignment here only chooses a seat and names the binding.
export const POOL_SIZE = PERMANENT_SEATS.length
// `<tipo>/s<sesión>-<slug>`, per contract point 5 — e.g. `feat/s1.3-idempotent-delivery`.
export const SEAT_BRANCH_PATTERN = /^[a-z]+\/s\d+\.\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/
const ROLES = ["planning", "implementation"], LANES = ["planning", "apply"]

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const parseWorktrees = (porcelain) => porcelain.split("\n\n").flatMap((block) => {
  const path = /^worktree (.+)$/m.exec(block)?.[1]
  return path ? [{ path, branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? null }] : []
})

export const createSlotPool = ({ git, trunk = "master" } = {}) => {
  if (typeof git !== "function") throw new TypeError("A git port is required")
  const seatsRoot = (mainPath) => join(dirname(mainPath), "Worktrees")
  const located = (mainPath) => {
    const found = new Map(parseWorktrees(git(["worktree", "list", "--porcelain"])).map((entry) => [basename(entry.path), entry]))
    return PERMANENT_SEATS.map((name) => ({ name, seat: found.get(name) ?? null, path: found.get(name)?.path ?? join(seatsRoot(mainPath), name) }))
  }
  // A seat is free only when nothing would be lost by rotating it. Uncommitted work outranks
  // unmerged commits: it is the only state git cannot recover on its own.
  const occupancy = ({ seat, path }) => {
    if (seat === null) return "absent"
    if (seat.branch === null) return "detached-head"
    if ((git(["-C", path, "status", "--porcelain"]) ?? "").trim() !== "") return "uncommitted-changes"
    if ((git(["-C", path, "cherry", trunk, seat.branch]) ?? "").trim() !== "") return "unmerged-commits"
    return null
  }
  const list = (mainPath) => located(mainPath).map((entry) => {
    const blocked = occupancy(entry)
    return { name: entry.name, path: entry.path, branch: entry.seat?.branch ?? null, free: blocked === null, blocked_by: blocked }
  })

  return Object.freeze({
    list,
    ensure(mainPath) {
      const created = [], present = []
      for (const { name, seat, path } of located(mainPath)) {
        if (seat !== null) { present.push(name); continue }
        // Detached on the trunk: a fresh seat carries no branch until Main assigns one.
        git(["worktree", "add", "--detach", path, trunk])
        created.push(name)
      }
      return { created, present }
    },
    assign(mainPath, { seat, role, lane, branch, base_sha } = {}) {
      if (!ROLES.includes(role) || !LANES.includes(lane)) fail("CT_SEAT_REJECTED", "Assignment role and lane must match assignment-v1")
      if (typeof branch !== "string" || !SEAT_BRANCH_PATTERN.test(branch)) fail("CT_SEAT_REJECTED", "Seat branch must be <type>/s<session>-<slug>")
      if (typeof base_sha !== "string" || !/^[0-9a-f]{40}$/.test(base_sha)) fail("CT_SEAT_REJECTED", "Assignment needs an exact base sha")
      if (seat !== undefined && !PERMANENT_SEATS.includes(seat)) fail("CT_SEAT_REJECTED", `${seat} is not a pool seat`)
      const seats = list(mainPath)
      // Deterministic by construction: the pool order is fixed, so the first free seat is stable.
      const chosen = seat === undefined ? seats.find(({ free }) => free) : seats.find(({ name }) => name === seat)
      if (!chosen?.free) fail("CT_SEAT_OCCUPIED", seat === undefined ? "Every pool seat is occupied" : `${seat} is occupied by ${chosen?.blocked_by}`)
      return Object.freeze({ seat: chosen.name, path: chosen.path, role, lane, branch, base_sha })
    },
  })
}
