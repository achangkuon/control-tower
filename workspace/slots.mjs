import { basename, dirname, join } from "node:path"

import { PERMANENT_SEATS } from "./seat-inventory.mjs"

export const POOL_SIZE = PERMANENT_SEATS.length
export const SEAT_BRANCH_PATTERN = /^[a-z]+\/s\d+\.\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/
const ROLES = ["planning", "implementation"], LANES = ["planning", "apply"]
const fail = (code, message, details = {}) => { throw Object.assign(new Error(message), { code, ...details }) }
const parseWorktrees = (porcelain) => porcelain.split("\n\n").flatMap((block) => {
  const path = /^worktree (.+)$/m.exec(block)?.[1]
  return path ? [{ path, head: /^HEAD (.+)$/m.exec(block)?.[1] ?? null, branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? null }] : []
})
const binding = (value, materialize = false) => {
  if (!value || typeof value !== "object" || !ROLES.includes(value.role) || !LANES.includes(value.lane)) fail("CT_SEAT_REJECTED", "Assignment role and lane must match assignment-v1")
  if (typeof value.branch !== "string" || !SEAT_BRANCH_PATTERN.test(value.branch)) fail("CT_SEAT_REJECTED", "Seat branch must be <type>/s<session>-<slug>")
  if (typeof value.base_sha !== "string" || !/^[0-9a-f]{40}$/.test(value.base_sha)) fail("CT_SEAT_REJECTED", "Assignment needs an exact base sha")
  if (value.seat !== undefined && !PERMANENT_SEATS.includes(value.seat)) fail("CT_SEAT_REJECTED", `${value.seat} is not a pool seat`)
  if (materialize && (value.confirmed !== true || value.seat === undefined || Object.keys(value).sort().join(",") !== "base_sha,branch,confirmed,lane,role,seat")) fail("CT_SEAT_REJECTED", "Materialization requires one confirmed complete binding")
  return value
}

export const createSlotPool = ({ git, trunk = "master" } = {}) => {
  if (typeof git !== "function") throw new TypeError("A git port is required")
  const seatsRoot = (mainPath) => join(dirname(mainPath), "Worktrees")
  const entries = () => parseWorktrees(git(["worktree", "list", "--porcelain"]))
  const located = (mainPath) => {
    const found = new Map(entries().map((entry) => [basename(entry.path), entry]))
    return PERMANENT_SEATS.map((name) => ({ name, seat: found.get(name) ?? null, path: found.get(name)?.path ?? join(seatsRoot(mainPath), name) }))
  }
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
  const ref = (name) => (git(["for-each-ref", "--format=%(objectname)", `refs/heads/${name}`]) ?? "").trim()
  const snapshot = (mainPath, request, enforce = true) => {
    const all = entries(), seat = all.find(({ path }) => basename(path) === request.seat)
    if (!seat || !seat.branch) fail("CT_SEAT_OCCUPIED", `${request.seat} is not clean, attached, and free`)
    const old_ref = ref(seat.branch), status = (git(["-C", seat.path, "status", "--porcelain"]) ?? "").trim(), cherry = (git(["-C", seat.path, "cherry", trunk, seat.branch]) ?? "").trim()
    if (enforce && (status || cherry || seat.head !== old_ref)) fail("CT_SEAT_OCCUPIED", `${request.seat} is not clean, attached, and free`)
    let base
    try { base = (git(["-C", seat.path, "rev-parse", "--verify", `${request.base_sha}^{commit}`]) ?? "").trim() } catch { fail("CT_SEAT_BASE_INVALID", "Base sha does not resolve exactly") }
    if (base !== request.base_sha) fail("CT_SEAT_BASE_INVALID", "Base sha does not resolve exactly")
    const trunkOid = (git(["-C", mainPath, "rev-parse", "--verify", `refs/heads/${trunk}`]) ?? "").trim()
    if ((git(["for-each-ref", `--contains=${request.base_sha}`, "--format=%(refname)", `refs/heads/${trunk}`]) ?? "").trim()) fail("CT_SEAT_BASE_INVALID", "Base sha is contained by trunk")
    return { seat, old_ref, status, cherry, base, trunk: trunkOid, target: ref(request.branch), others: all.filter(({ path }) => path !== seat.path) }
  }
  const snapshotSafe = (mainPath, request) => {
    try {
      const all = entries(), seat = all.find(({ path }) => basename(path) === request.seat)
      if (!seat) return { seat: null, status: "", old_ref: "", target: "", others: all }
      return { seat, status: (git(["-C", seat.path, "status", "--porcelain"]) ?? "").trim(), old_ref: seat.branch ? ref(seat.branch) : "", target: ref(request.branch), others: all.filter(({ path }) => path !== seat.path) }
    } catch { return { unavailable: true } }
  }
  const restore = (mainPath, request, before) => {
    try {
      const observed = snapshotSafe(mainPath, request)
      if (observed.unavailable) return "preserved-partial"
      if (observed.seat?.branch === before.seat.branch && observed.seat?.head === before.seat.head && observed.status === "" && observed.old_ref === before.old_ref && observed.target === "") return "not-required"
      if (observed.status !== "" || ref(before.seat.branch) !== before.old_ref) return "preserved-partial"
      git(["-C", before.seat.path, "switch", before.seat.branch])
      const afterSwitch = snapshotSafe(mainPath, request)
      if (afterSwitch.unavailable || afterSwitch.seat?.branch !== before.seat.branch || afterSwitch.seat?.head !== before.seat.head || afterSwitch.status !== "" || afterSwitch.old_ref !== before.old_ref || afterSwitch.target !== request.base_sha || afterSwitch.others.some(({ branch }) => branch === request.branch)) return "preserved-partial"
      git(["update-ref", "-d", `refs/heads/${request.branch}`, request.base_sha])
      const restored = snapshotSafe(mainPath, request)
      return !restored.unavailable && restored.seat?.branch === before.seat.branch && restored.seat?.head === before.seat.head && restored.status === "" && restored.old_ref === before.old_ref && restored.target === "" ? "restored" : "preserved-partial"
    } catch { return "preserved-partial" }
  }
  const materialize = (mainPath, request) => {
    binding(request, true)
    if (ref(request.branch)) fail("CT_SEAT_BRANCH_EXISTS", `${request.branch} already exists`)
    const before = snapshot(mainPath, request)
    if (before.target) fail("CT_SEAT_BRANCH_EXISTS", `${request.branch} already exists`)
    const again = snapshot(mainPath, request, false)
    if (JSON.stringify(before) !== JSON.stringify(again)) fail("CT_SEAT_DRIFT", "Seat state changed before materialization", { before, observed: again })
    const postFailure = (code, observed) => {
      const rollback = restore(mainPath, request, before)
      fail(rollback === "preserved-partial" ? "CT_SEAT_ROLLBACK_FAILED" : code, `Seat ${request.seat}; displaced ${before.seat.branch}; requested ${request.branch}; rollback ${rollback}`, { before, observed, rollback })
    }
    try { git(["-C", before.seat.path, "switch", "--create", request.branch, "--no-track", request.base_sha]) } catch { postFailure("CT_SEAT_MUTATION_FAILED", snapshotSafe(mainPath, request)) }
    try {
      const after = snapshot(mainPath, request, false)
      const valid = after.seat?.branch === request.branch && after.seat?.head === request.base_sha && after.status === "" && after.base === before.base && after.trunk === before.trunk && ref(before.seat.branch) === before.old_ref && after.target === request.base_sha && JSON.stringify(after.others) === JSON.stringify(before.others)
      if (!valid) postFailure("CT_SEAT_POSTCONDITION_FAILED", after)
    } catch { postFailure("CT_SEAT_POSTCONDITION_FAILED", snapshotSafe(mainPath, request)) }
    return Object.freeze({ operation: "materializar", binding: { seat: request.seat, path: before.seat.path, role: request.role, lane: request.lane, branch: request.branch, base_sha: request.base_sha }, before: { branch: before.seat.branch, head: before.seat.head, clean: true }, after: { branch: request.branch, head: request.base_sha, clean: true }, preserved_ref: { branch: before.seat.branch, head: before.old_ref } })
  }
  return Object.freeze({
    list,
    ensure(mainPath) { const created = [], present = []; for (const { name, seat, path } of located(mainPath)) { if (seat !== null) present.push(name); else { git(["worktree", "add", "--detach", path, trunk]); created.push(name) } } return { created, present } },
    assign(mainPath, request = {}) { binding(request); const seats = list(mainPath), chosen = request.seat === undefined ? seats.find(({ free }) => free) : seats.find(({ name }) => name === request.seat); if (!chosen?.free) fail("CT_SEAT_OCCUPIED", request.seat === undefined ? "Every pool seat is occupied" : `${request.seat} is occupied by ${chosen?.blocked_by}`); return Object.freeze({ seat: chosen.name, path: chosen.path, role: request.role, lane: request.lane, branch: request.branch, base_sha: request.base_sha }) },
    materialize,
  })
}
