import { describe, expect, test } from "bun:test"

import { PERMANENT_SEATS } from "../../workspace/seat-inventory.mjs"
import { POOL_SIZE, createSlotPool } from "../../workspace/slots.mjs"

const MAIN = "/p/Main"
const seatPath = (name) => `/p/Worktrees/${name}`
const base = "a".repeat(40)
const assignment = { role: "implementation", lane: "apply", branch: "feat/s9.1-seat-pool", base_sha: base }
const errorCode = (operation) => {
  try { operation() } catch (error) { return error.code }
  return null
}

const world = ({ present = PERMANENT_SEATS, dirty = [], unmerged = [] } = {}) => {
  const calls = []
  const entries = [
    { path: MAIN, branch: "master" },
    { path: seatPath("support-agent"), branch: "support/read-only" },
    ...present.map((name) => ({ path: seatPath(name), branch: `feat/s0.0-${name}` })),
  ]
  const git = (args) => {
    calls.push(args.join(" "))
    if (args[0] === "worktree" && args[1] === "list") {
      return entries.map(({ path, branch }) => `worktree ${path}\nHEAD ${base}\nbranch refs/heads/${branch}\n`).join("\n")
    }
    if (args[0] === "worktree" && args[1] === "add") return ""
    if (args[2] === "status") return dirty.includes(args[1]) ? " M a.txt\n" : ""
    if (args[2] === "cherry") return unmerged.includes(args[1]) ? `+ ${"b".repeat(40)}\n` : ""
    return ""
  }
  return { calls, pool: createSlotPool({ git, trunk: "master" }) }
}

describe("permanent seat pool", () => {
  test("is exactly the three permanent seats and takes its size from them", () => {
    expect(POOL_SIZE).toBe(3)
    expect(PERMANENT_SEATS).toHaveLength(POOL_SIZE)
  })

  test("lists every pool seat as free or occupied, and the occupancy reason", () => {
    const { pool } = world({ dirty: [seatPath("implementer-2")], unmerged: [seatPath("implementer-3")] })
    expect(pool.list(MAIN)).toEqual([
      { name: "implementer-1", path: seatPath("implementer-1"), branch: "feat/s0.0-implementer-1", free: true, blocked_by: null },
      { name: "implementer-2", path: seatPath("implementer-2"), branch: "feat/s0.0-implementer-2", free: false, blocked_by: "uncommitted-changes" },
      { name: "implementer-3", path: seatPath("implementer-3"), branch: "feat/s0.0-implementer-3", free: false, blocked_by: "unmerged-commits" },
    ])
  })

  test("reports a missing seat as absent instead of silently shrinking the pool", () => {
    const { pool } = world({ present: ["implementer-1", "implementer-3"] })
    const listed = pool.list(MAIN)
    expect(listed.map(({ name }) => name)).toEqual(PERMANENT_SEATS)
    expect(listed[1]).toEqual({ name: "implementer-2", path: seatPath("implementer-2"), branch: null, free: false, blocked_by: "absent" })
  })

  test("provisions only the missing seats and is idempotent on a complete pool", () => {
    const partial = world({ present: ["implementer-1"] })
    expect(partial.pool.ensure(MAIN)).toEqual({ created: ["implementer-2", "implementer-3"], present: ["implementer-1"] })
    expect(partial.calls.filter((call) => call.startsWith("worktree add"))).toEqual([
      `worktree add --detach ${seatPath("implementer-2")} master`,
      `worktree add --detach ${seatPath("implementer-3")} master`,
    ])

    const complete = world()
    expect(complete.pool.ensure(MAIN)).toEqual({ created: [], present: PERMANENT_SEATS })
    expect(complete.calls.some((call) => call.startsWith("worktree add"))).toBe(false)
  })

  test("never provisions, removes or rotates anything outside the pool", () => {
    const { calls, pool } = world({ present: [] })
    pool.ensure(MAIN)
    expect(calls.some((call) => /worktree (remove|move)|switch|checkout|branch -/.test(call))).toBe(false)
    expect(calls.filter((call) => call.startsWith("worktree add")).every((call) => /implementer-[123]/.test(call))).toBe(true)
  })

  test("assigns the first free seat deterministically, and repeats that choice", () => {
    const first = world({ dirty: [seatPath("implementer-1")] })
    const binding = first.pool.assign(MAIN, assignment)
    expect(binding).toEqual({
      seat: "implementer-2", path: seatPath("implementer-2"),
      role: "implementation", lane: "apply", branch: "feat/s9.1-seat-pool", base_sha: base,
    })
    expect(world({ dirty: [seatPath("implementer-1")] }).pool.assign(MAIN, assignment)).toEqual(binding)
  })

  test("does not specialize a seat: the same seat serves either role", () => {
    for (const [role, lane] of [["planning", "planning"], ["implementation", "apply"]]) {
      expect(world().pool.assign(MAIN, { ...assignment, role, lane }))
        .toMatchObject({ seat: "implementer-1", role, lane })
    }
  })

  test("honours an explicitly named seat and refuses an occupied or unknown one", () => {
    expect(world().pool.assign(MAIN, { ...assignment, seat: "implementer-3" })).toMatchObject({ seat: "implementer-3" })
    expect(errorCode(() => world({ dirty: [seatPath("implementer-3")] }).pool.assign(MAIN, { ...assignment, seat: "implementer-3" }))).toBe("CT_SEAT_OCCUPIED")
    for (const seat of ["support-agent", "Main", "nope"]) {
      expect(errorCode(() => world().pool.assign(MAIN, { ...assignment, seat }))).toBe("CT_SEAT_REJECTED")
    }
  })

  test("rejects a malformed branch, role, lane or base sha before choosing a seat", () => {
    const { calls, pool } = world()
    for (const invalid of [
      { branch: "seat-pool" }, { branch: "feat/seat-pool" }, { branch: "feat/s9.1_seat_pool" }, { branch: "" },
      { role: "review" }, { lane: "deliver" }, { base_sha: "short" }, { base_sha: undefined },
    ]) expect(errorCode(() => pool.assign(MAIN, { ...assignment, ...invalid }))).toBe("CT_SEAT_REJECTED")
    expect(calls.some((call) => call.startsWith("worktree add"))).toBe(false)
  })

  test("fails closed when every seat is occupied instead of creating a fourth", () => {
    const full = world({ dirty: PERMANENT_SEATS.map(seatPath) })
    expect(errorCode(() => full.pool.assign(MAIN, assignment))).toBe("CT_SEAT_OCCUPIED")
    expect(full.calls.some((call) => call.startsWith("worktree add"))).toBe(false)
  })

  test("leaves the manual recycler untouched: assignment never rotates a branch", () => {
    const { calls, pool } = world()
    pool.assign(MAIN, assignment)
    expect(calls.every((call) => call.includes("list") || call.includes("status") || call.includes("cherry"))).toBe(true)
  })
})
