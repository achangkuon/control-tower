import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { git as runGit } from "../helpers/git.mjs"
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
const roots = []
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }) })
const realGit = (cwd, args) => runGit(cwd, args, { encoding: "utf8" }).trim()
const realFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-seat-materialize-")), main = join(root, "Main"), worktrees = join(root, "Worktrees")
  roots.push(root); mkdirSync(main, { recursive: true }); mkdirSync(worktrees)
  realGit(main, ["init", "-q", "-b", "master"]); realGit(main, ["config", "user.email", "test@example.invalid"]); realGit(main, ["config", "user.name", "Tower Test"]); writeFileSync(join(main, "base.txt"), "base\n"); realGit(main, ["add", "."]); realGit(main, ["commit", "-qm", "base"])
  realGit(main, ["switch", "-qc", "feat/s9.10-source"]); writeFileSync(join(main, "side.txt"), "side\n"); realGit(main, ["add", "."]); realGit(main, ["commit", "-qm", "side"]); const base_sha = realGit(main, ["rev-parse", "HEAD"]); realGit(main, ["switch", "-q", "master"])
  for (const name of PERMANENT_SEATS) realGit(main, ["worktree", "add", "-q", "-b", `idle/${name}`, join(worktrees, name), "master"])
  const git = (args) => realGit(main, args), request = (branch) => ({ seat: "implementer-3", role: "implementation", lane: "apply", branch, base_sha, confirmed: true })
  return { main, worktrees, base_sha, git, request }
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

  test("materializes a real clean seat once and rejects dirty or existing targets without mutation", () => {
    const fixture = realFixture(), target = "feat/s9.10-materialized", seat = join(fixture.worktrees, "implementer-3")
    const before = realGit(seat, ["rev-parse", "HEAD"]), result = createSlotPool({ git: fixture.git }).materialize(fixture.main, fixture.request(target))
    expect(result.after).toEqual({ branch: target, head: fixture.base_sha, clean: true })
    expect(realGit(seat, ["branch", "--show-current"])).toBe(target)
    expect(realGit(seat, ["rev-parse", "HEAD"])).toBe(fixture.base_sha)
    expect(realGit(fixture.main, ["rev-parse", "idle/implementer-3"])).toBe(before)
    expect(errorCode(() => createSlotPool({ git: fixture.git }).materialize(fixture.main, fixture.request(target)))).toBe("CT_SEAT_BRANCH_EXISTS")

    const dirty = realFixture(), dirtySeat = join(dirty.worktrees, "implementer-3")
    writeFileSync(join(dirtySeat, "dirty.txt"), "dirty\n")
    expect(errorCode(() => createSlotPool({ git: dirty.git }).materialize(dirty.main, dirty.request("feat/s9.10-dirty")))).toBe("CT_SEAT_OCCUPIED")
    expect(realGit(dirtySeat, ["branch", "--show-current"])).toBe("idle/implementer-3")
    unlinkSync(join(dirtySeat, "dirty.txt"))
  })

  test("restores only the operation-created unchanged target after a failed postcondition", () => {
    const fixture = realFixture(), target = "feat/s9.10-restore", seat = join(fixture.worktrees, "implementer-3"), calls = []; let listings = 0
    const oldRef = realGit(fixture.main, ["rev-parse", "idle/implementer-3"])
    const faultyGit = (args) => {
      calls.push(args.join(" "))
      const output = fixture.git(args)
      return args[0] === "worktree" && args[1] === "list" && ++listings === 3
        ? output.replace(`branch refs/heads/${target}`, "branch refs/heads/idle/implementer-3") : output
    }
    expect(errorCode(() => createSlotPool({ git: faultyGit }).materialize(fixture.main, fixture.request(target)))).toBe("CT_SEAT_POSTCONDITION_FAILED")
    expect(realGit(seat, ["branch", "--show-current"])).toBe("idle/implementer-3")
    expect(realGit(fixture.main, ["rev-parse", "idle/implementer-3"])).toBe(oldRef)
    expect(realGit(fixture.main, ["for-each-ref", "--format=%(refname)", `refs/heads/${target}`])).toBe("")
    expect(calls.some((call) => /\b(reset|clean|stash|force)\b/.test(call))).toBe(false)
  })

  test("detects real drift and preserves an unexpected post-switch commit", () => {
    const drift = realFixture(), driftSeat = join(drift.worktrees, "implementer-3"); let listings = 0
    const driftingGit = (args) => { if (args[0] === "worktree" && args[1] === "list" && ++listings === 2) writeFileSync(join(driftSeat, "drift.txt"), "drift\n"); return drift.git(args) }
    expect(errorCode(() => createSlotPool({ git: driftingGit }).materialize(drift.main, drift.request("feat/s9.10-drift")))).toBe("CT_SEAT_DRIFT")
    expect(realGit(driftSeat, ["branch", "--show-current"])).toBe("idle/implementer-3")

    const partial = realFixture(), partialSeat = join(partial.worktrees, "implementer-3"), target = "feat/s9.10-partial"
    const oldRef = realGit(partial.main, ["rev-parse", "idle/implementer-3"])
    let committed = false
    const committingGit = (args) => { const output = partial.git(args); if (args[2] === "switch" && !committed) { committed = true; writeFileSync(join(partialSeat, "unexpected.txt"), "preserve\n"); realGit(partialSeat, ["add", "."]); realGit(partialSeat, ["commit", "-qm", "unexpected"]) } return output }
    expect(errorCode(() => createSlotPool({ git: committingGit }).materialize(partial.main, partial.request(target)))).toBe("CT_SEAT_ROLLBACK_FAILED")
    expect(realGit(partial.main, ["rev-parse", target])).not.toBe(partial.base_sha)
    expect(realGit(partial.main, ["rev-parse", "idle/implementer-3"])).toBe(oldRef)
  })

  test("refuses a mismatched seat HEAD and cherry-only drift before switching", () => {
    for (const kind of ["head", "cherry"]) {
      const fixture = realFixture(), target = `feat/s9.10-${kind}-drift`, calls = []
      let listings = 0, cherries = 0
      const faultyGit = (args) => {
        calls.push(args.join(" "))
        const output = fixture.git(args)
        if (args[0] === "worktree" && args[1] === "list") {
          listings += 1
          if (kind === "head") return output.replace(/(worktree .*implementer-3\n)HEAD .+$/m, `$1HEAD ${"f".repeat(40)}`)
        }
        if (kind === "cherry" && args[2] === "cherry" && ++cherries === 2) return `+ ${fixture.base_sha}\n`
        return output
      }
      expect(errorCode(() => createSlotPool({ git: faultyGit }).materialize(fixture.main, fixture.request(target)))).toBe(kind === "head" ? "CT_SEAT_OCCUPIED" : "CT_SEAT_DRIFT")
      expect(calls.filter((call) => call.includes(" switch --create "))).toEqual([])
      expect(listings).toBeGreaterThanOrEqual(1)
    }
  })

  test("returns typed preservation diagnostics when post-switch or recovery observation fails", () => {
    for (const failure of ["post", "recovery"]) {
      const fixture = realFixture(), target = `feat/s9.10-${failure}-observation`, calls = []
      let listings = 0
      const faultyGit = (args) => {
        calls.push(args.join(" "))
        if (args[0] === "worktree" && args[1] === "list" && (++listings === 3 && failure === "post" || listings >= 4 && failure === "recovery")) throw new Error(`${failure}-observation-failed`)
        const output = fixture.git(args)
        return failure === "recovery" && args[0] === "worktree" && args[1] === "list" && listings === 3
          ? output.replace(`branch refs/heads/${target}`, "branch refs/heads/idle/implementer-3") : output
      }
      try {
        createSlotPool({ git: faultyGit }).materialize(fixture.main, fixture.request(target))
        throw new Error("expected typed materialization failure")
      } catch (error) {
        const rollback = failure === "post" ? "restored" : "preserved-partial"
        expect(error.code).toBe(failure === "post" ? "CT_SEAT_POSTCONDITION_FAILED" : "CT_SEAT_ROLLBACK_FAILED")
        expect(error.rollback).toBe(rollback)
        expect(error.message).toBe(`Seat implementer-3; displaced idle/implementer-3; requested ${target}; rollback ${rollback}`)
      }
      expect(calls.filter((call) => call.includes(" switch --create "))).toHaveLength(1)
    }
  })

  test("maps an unresolved exact base to the typed rejection before switching", () => {
    const fixture = realFixture(), target = "feat/s9.10-unresolved", calls = []
    const faultyGit = (args) => {
      calls.push(args.join(" "))
      if (args[2] === "rev-parse" && args.at(-1).includes("^{commit}")) throw new Error("unknown revision")
      return fixture.git(args)
    }
    expect(errorCode(() => createSlotPool({ git: faultyGit }).materialize(fixture.main, { ...fixture.request(target), base_sha: "f".repeat(40) }))).toBe("CT_SEAT_BASE_INVALID")
    expect(calls.filter((call) => call.includes(" switch --create "))).toEqual([])
  })

  test("refuses detached and unmerged seats, then diagnoses a rejected switch safely", () => {
    for (const state of ["detached", "unmerged"]) {
      const fixture = realFixture(), seat = join(fixture.worktrees, "implementer-3"), target = `feat/s9.10-${state}`
      if (state === "detached") realGit(seat, ["switch", "--detach", "-q"])
      else { writeFileSync(join(seat, "ahead.txt"), "ahead\n"); realGit(seat, ["add", "."]); realGit(seat, ["commit", "-qm", "ahead"]) }
      expect(errorCode(() => createSlotPool({ git: fixture.git }).materialize(fixture.main, fixture.request(target)))).toBe("CT_SEAT_OCCUPIED")
      expect(realGit(fixture.main, ["for-each-ref", "--format=%(refname)", `refs/heads/${target}`])).toBe("")
    }
    const fixture = realFixture(), target = "feat/s9.10-switch-failure", calls = []
    const faultyGit = (args) => { calls.push(args.join(" ")); if (args[2] === "switch") throw new Error("switch rejected"); return fixture.git(args) }
    try { createSlotPool({ git: faultyGit }).materialize(fixture.main, fixture.request(target)) } catch (error) {
      expect(error.code).toBe("CT_SEAT_MUTATION_FAILED")
      expect(error.message).toBe(`Seat implementer-3; displaced idle/implementer-3; requested ${target}; rollback not-required`)
    }
    expect(calls.some((call) => /\b(reset|clean|stash|force)\b/.test(call))).toBe(false)
  })

  test("preserves uncertainty for target, displaced-ref, and other-worktree postcondition drift", () => {
    for (const kind of ["target", "displaced", "other"]) {
      const fixture = realFixture(), target = `feat/s9.10-${kind}-post`, old = realGit(fixture.main, ["rev-parse", "idle/implementer-3"])
      let switched = false
      const faultyGit = (args) => {
        const output = fixture.git(args)
        if (args[2] === "switch") switched = true
        if (switched && kind === "target" && args[0] === "for-each-ref" && args.at(-1) === `refs/heads/${target}`) return "f".repeat(40)
        if (switched && kind === "displaced" && args[2] === "status") realGit(fixture.main, ["update-ref", "refs/heads/idle/implementer-3", fixture.base_sha])
        if (switched && kind === "other" && args[0] === "worktree" && args[1] === "list") return output.replace("branch refs/heads/idle/implementer-2", `branch refs/heads/${target}`)
        return output
      }
      expect(errorCode(() => createSlotPool({ git: faultyGit }).materialize(fixture.main, fixture.request(target)))).toBe("CT_SEAT_ROLLBACK_FAILED")
      expect(realGit(fixture.main, ["rev-parse", "idle/implementer-3"])).toBe(kind === "displaced" ? fixture.base_sha : old)
    }
  })
})
